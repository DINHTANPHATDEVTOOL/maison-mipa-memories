-- ==============================================================================
-- Maison MIPA Memories - Booking Flow V2 Forward Migration
-- Migration: 20260917000001_consultation_first_booking_flow.sql
--
-- Features:
-- 1. Adds CONSULTATION_REQUESTED and CONSULTING booking statuses.
-- 2. Adds manual deposit fields (deposit_confirmed_at, deposit_confirmed_by, deposit_note).
-- 3. Rebase Google Drive delivery schema (booking_deliveries table, RLS, functions).
-- 4. Updates create_booking: inserts as CONSULTATION_REQUESTED, does not block slot.
-- 5. Updates get_studio_booked_slots: ignores consultation requests, blocks only confirmed/operational.
-- 6. Adds update_booking_consultation RPC: allowed for Manager/Admin to chốt details.
-- 7. Adds confirm_booking_deposit RPC: atomic deposit confirmation, concurrency-safe overlap check,
--    enqueues confirmation email, enqueues Google Drive workspace creation intent.
-- 8. Updates update_booking_status RPC with valid consultation state machine transitions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Status Check Constraint & Manual Deposit Columns on public.bookings
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_booking_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_status_check CHECK (booking_status IN (
  'CONSULTATION_REQUESTED',
  'CONSULTING',
  'CONFIRMED',
  'CHECKED_IN',
  'SHOOTING',
  'SHOOT_COMPLETED',
  'EDITING',
  'READY_FOR_REVIEW',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RESCHEDULED',
  -- Legacy statuses preserved for backward compatibility
  'DRAFT',
  'PENDING_PAYMENT',
  'DEPOSIT_PAID'
));

ALTER TABLE public.bookings ALTER COLUMN booking_status SET DEFAULT 'CONSULTATION_REQUESTED';

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_confirmed_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_confirmed_by UUID REFERENCES public.profiles(id) DEFAULT NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS deposit_note TEXT DEFAULT NULL;

-- ------------------------------------------------------------------------------
-- 2. Google Drive Delivery Schema (Rebased from PR #21 Hardened Model)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  drive_permission_id TEXT,
  shared_with_email TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_CREATED' CHECK (status IN (
    'NOT_CREATED',
    'CREATING',
    'READY_FOR_UPLOAD',
    'SHARING',
    'READY_FOR_CUSTOMER',
    'ERROR',
    'NEEDS_RECONCILE',
    'REVOKED'
  )),
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_attempt_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_deliveries_booking ON public.booking_deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_status ON public.booking_deliveries(status);

ALTER TABLE public.booking_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Service role manages booking_deliveries" ON public.booking_deliveries
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Managers and Admins view all booking deliveries" ON public.booking_deliveries;
CREATE POLICY "Managers and Admins view all booking deliveries" ON public.booking_deliveries
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

DROP POLICY IF EXISTS "Managers and Admins mutate booking deliveries" ON public.booking_deliveries;
CREATE POLICY "Managers and Admins mutate booking deliveries" ON public.booking_deliveries
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- Synchronize booking_deliveries changes back to bookings table
CREATE OR REPLACE FUNCTION public.sync_booking_delivery_to_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET
    drive_folder_id = NEW.drive_folder_id,
    drive_folder_url = NEW.drive_folder_url,
    drive_ready_for_customer = (NEW.status = 'READY_FOR_CUSTOMER'),
    drive_shared_at = CASE
      WHEN NEW.status = 'READY_FOR_CUSTOMER' AND drive_shared_at IS NULL THEN timezone('utc'::text, now())
      ELSE drive_shared_at
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = NEW.booking_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_delivery ON public.booking_deliveries;
CREATE TRIGGER trg_sync_booking_delivery
AFTER INSERT OR UPDATE ON public.booking_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.sync_booking_delivery_to_booking();

-- Secure reader RPC for deliveries
CREATE OR REPLACE FUNCTION public.get_booking_delivery_secure(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_delivery RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 1. Management sees all operational fields
  IF v_caller_role IN ('MANAGER', 'ADMIN') OR public.is_root_owner() THEN
    RETURN to_jsonb(v_delivery);
  END IF;

  -- 2. Staff view
  IF v_caller_role = 'STAFF' THEN
    RETURN jsonb_build_object(
      'id', v_delivery.id,
      'booking_id', v_delivery.booking_id,
      'provider', v_delivery.provider,
      'drive_folder_id', v_delivery.drive_folder_id,
      'drive_folder_url', v_delivery.drive_folder_url,
      'status', v_delivery.status,
      'ready_at', v_delivery.ready_at,
      'created_at', v_delivery.created_at,
      'updated_at', v_delivery.updated_at
    );
  END IF;

  -- 3. Customer view (ONLY own booking & ONLY when READY_FOR_CUSTOMER)
  IF v_caller_role = 'CUSTOMER' THEN
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = p_booking_id AND customer_id = v_caller_id) THEN
      RAISE EXCEPTION 'Access Denied: Not your booking.' USING ERRCODE = '42501';
    END IF;

    IF v_delivery.status != 'READY_FOR_CUSTOMER' THEN
      RETURN jsonb_build_object(
        'id', v_delivery.id,
        'booking_id', v_delivery.booking_id,
        'status', v_delivery.status,
        'updated_at', v_delivery.updated_at
      );
    END IF;

    RETURN jsonb_build_object(
      'id', v_delivery.id,
      'booking_id', v_delivery.booking_id,
      'status', v_delivery.status,
      'drive_folder_url', v_delivery.drive_folder_url,
      'ready_at', v_delivery.ready_at
    );
  END IF;

  RAISE EXCEPTION 'Access Denied: Unrecognized role.' USING ERRCODE = '42501';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_delivery_secure(UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. Update get_studio_booked_slots RPC (Ignore Consultation Requests)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_studio_booked_slots(
  p_studio_room_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
BEGIN
  v_day_start := (p_date::text || ' 00:00:00+07')::timestamptz;
  v_day_end := ((p_date + 1)::text || ' 00:00:00+07')::timestamptz;

  RETURN QUERY
  SELECT b.start_at, b.end_at
  FROM public.bookings b
  WHERE b.studio_room_id = p_studio_room_id
    -- Authoritative occupied statuses only: CONSULTATION_REQUESTED & CONSULTING do NOT block slots
    AND b.booking_status IN (
      'CONFIRMED',
      'CHECKED_IN',
      'SHOOTING',
      'SHOOT_COMPLETED',
      'EDITING',
      'READY_FOR_REVIEW',
      'DELIVERED',
      'DEPOSIT_PAID' -- Legacy confirmed deposit status
    )
    AND b.start_at < v_day_end
    AND b.end_at > v_day_start
  ORDER BY b.start_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_studio_booked_slots(UUID, DATE) TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. Authoritative create_booking RPC (Consultation-First)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_booking(
  p_service_id UUID,
  p_package_id UUID,
  p_studio_room_id UUID,
  p_start_at TIMESTAMPTZ,
  p_addon_ids UUID[] DEFAULT '{}',
  p_voucher_code TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_occasion TEXT DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL,
  p_concept_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_pkg RECORD;
  v_studio RECORD;
  v_concept_record RECORD;
  v_concept_id UUID;
  v_primary_concept_id UUID := NULL;
  v_promo RECORD;
  v_addon_total NUMERIC(12, 2) := 0;
  v_subtotal NUMERIC(12, 2) := 0;
  v_discount_total NUMERIC(12, 2) := 0;
  v_total_amount NUMERIC(12, 2) := 0;
  v_deposit_amount NUMERIC(12, 2) := 0;
  v_total_duration INTEGER := 0;
  v_end_at TIMESTAMPTZ;
  v_booking_code TEXT;
  v_new_booking_id UUID;
  v_result JSONB;
  v_idx INTEGER := 0;
BEGIN
  -- 1. Auth & Status Validation
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User must be authenticated to create a booking.' USING ERRCODE = '42501';
  END IF;

  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Tài khoản chưa được xác thực email hoặc không hoạt động. Vui lòng kiểm tra hộp thư và xác thực tài khoản trước khi đặt lịch.' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate Package & Service association
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND (service_id = p_service_id OR service_id IS NULL) AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package specified for the selected service.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validate Concepts & Enforce Package concepts_count Limit
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    IF array_length(p_concept_ids, 1) > v_pkg.concepts_count THEN
      RAISE EXCEPTION 'Package concept limit exceeded. Selected: %, Allowed: %',
        array_length(p_concept_ids, 1), v_pkg.concepts_count USING ERRCODE = 'P0003';
    END IF;

    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      SELECT * INTO v_concept_record FROM public.concepts WHERE id = v_concept_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Concept % not found.', v_concept_id USING ERRCODE = 'P0002';
      END IF;

      IF NOT v_concept_record.active OR NOT v_concept_record.bookable THEN
        RAISE EXCEPTION 'Concept "%" is currently inactive or non-bookable.', v_concept_record.name USING ERRCODE = 'P0003';
      END IF;

      IF v_primary_concept_id IS NULL THEN
        v_primary_concept_id := v_concept_id;
      END IF;
    END LOOP;
  END IF;

  -- 4. Validate Studio Room
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = p_studio_room_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio room not found or currently inactive.' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Calculate Duration & End Time (Package + Valid Addons)
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_total_duration + v_addon_total::INTEGER;
    v_addon_total := 0;
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- NOTE ON AVAILABILITY: Consultation requests do NOT lock the studio room slot.
  -- Multiple consultation requests may share the requested slot until a manager confirms deposit.

  -- 6. Calculate Server-Authoritative Estimated Pricing & Validate Promotion Voucher
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;

  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) != '' THEN
    SELECT * INTO v_promo FROM public.promotions
    WHERE code = UPPER(trim(p_voucher_code)) AND active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promotion voucher code "%" is invalid or inactive.', p_voucher_code USING ERRCODE = 'P0004';
    END IF;

    IF v_promo.start_at IS NOT NULL AND now() < v_promo.start_at THEN
      RAISE EXCEPTION 'Promotion voucher code has not started yet.' USING ERRCODE = 'P0004';
    END IF;
    IF v_promo.end_at IS NOT NULL AND now() > v_promo.end_at THEN
      RAISE EXCEPTION 'Promotion voucher code has expired.' USING ERRCODE = 'P0004';
    END IF;
    IF v_promo.usage_limit IS NOT NULL AND COALESCE(v_promo.usage_count, 0) >= v_promo.usage_limit THEN
      RAISE EXCEPTION 'Promotion voucher usage limit has been reached.' USING ERRCODE = 'P0004';
    END IF;
    IF v_subtotal < v_promo.min_order THEN
      RAISE EXCEPTION 'Subtotal does not meet minimum order requirement of % for voucher.', v_promo.min_order USING ERRCODE = 'P0004';
    END IF;
    IF v_promo.applicable_service_id IS NOT NULL AND v_promo.applicable_service_id != p_service_id THEN
      RAISE EXCEPTION 'Promotion voucher is not applicable to the selected service.' USING ERRCODE = 'P0004';
    END IF;

    IF v_promo.discount_percent > 0 THEN
      v_discount_total := ROUND(v_subtotal * (v_promo.discount_percent / 100.0));
    ELSIF v_promo.discount_amount > 0 THEN
      v_discount_total := v_promo.discount_amount;
    END IF;

    IF v_promo.max_discount IS NOT NULL AND v_promo.max_discount > 0 THEN
      v_discount_total := LEAST(v_discount_total, v_promo.max_discount);
    END IF;

    v_discount_total := LEAST(v_subtotal, GREATEST(0, v_discount_total));

    UPDATE public.promotions
    SET usage_count = COALESCE(usage_count, 0) + 1, updated_at = timezone('utc'::text, now())
    WHERE id = v_promo.id;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := ROUND(v_total_amount * 0.30); -- 30% estimated deposit

  -- 7. Generate Booking Code
  v_booking_code := 'MIPA-' || to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));

  -- 8. Insert Booking Record with CONSULTATION_REQUESTED status
  INSERT INTO public.bookings (
    booking_code,
    customer_id,
    service_id,
    package_id,
    concept_id,
    studio_room_id,
    start_at,
    end_at,
    booking_status,
    payment_status,
    subtotal,
    addon_total,
    discount_total,
    total_amount,
    deposit_amount,
    voucher_code,
    customer_name,
    customer_phone,
    customer_email,
    occasion,
    customer_note,
    created_at,
    updated_at
  )
  VALUES (
    v_booking_code,
    v_customer_id,
    p_service_id,
    p_package_id,
    v_primary_concept_id,
    p_studio_room_id,
    p_start_at,
    v_end_at,
    'CONSULTATION_REQUESTED',
    'UNPAID',
    v_subtotal,
    v_addon_total,
    v_discount_total,
    v_total_amount,
    v_deposit_amount,
    p_voucher_code,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_occasion,
    p_customer_note,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_new_booking_id;

  -- 9. Insert Booking Addons
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    INSERT INTO public.booking_addons (booking_id, addon_id, quantity, unit_price, line_total)
    SELECT v_new_booking_id, a.id, 1, a.price, a.price
    FROM public.addons a
    WHERE a.id = ANY(p_addon_ids) AND a.active = true;
  END IF;

  -- 10. Insert Booking Concepts
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_idx := v_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order, display_order)
      VALUES (v_new_booking_id, v_concept_id, v_idx, v_idx);
    END LOOP;
  END IF;

  -- 11. Audit Trail
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_customer_id,
    'BOOKING',
    v_new_booking_id::text,
    'CREATE_CONSULTATION_REQUEST',
    jsonb_build_object(
      'booking_code', v_booking_code,
      'service_id', p_service_id,
      'package_id', p_package_id,
      'concept_ids', p_concept_ids,
      'studio_room_id', p_studio_room_id,
      'start_at', p_start_at,
      'end_at', v_end_at,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'status', 'CONSULTATION_REQUESTED'
    )
  );

  -- 12. Return JSON Representation
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'package_id', b.package_id,
    'concept_id', b.concept_id,
    'studio_room_id', b.studio_room_id,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'booking_status', b.booking_status,
    'payment_status', b.payment_status,
    'subtotal', b.subtotal,
    'addon_total', b.addon_total,
    'discount_total', b.discount_total,
    'total_amount', b.total_amount,
    'deposit_amount', b.deposit_amount,
    'voucher_code', b.voucher_code,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'customer_email', b.customer_email,
    'occasion', b.occasion,
    'customer_note', b.customer_note,
    'created_at', b.created_at,
    'updated_at', b.updated_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(UUID, UUID, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[]) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Authoritative update_booking_consultation RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_booking_consultation(
  p_booking_id UUID,
  p_service_id UUID,
  p_package_id UUID,
  p_studio_room_id UUID,
  p_start_at TIMESTAMPTZ,
  p_addon_ids UUID[] DEFAULT '{}',
  p_concept_ids UUID[] DEFAULT '{}',
  p_total_amount NUMERIC DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL,
  p_staff_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_pkg RECORD;
  v_studio RECORD;
  v_concept_record RECORD;
  v_concept_id UUID;
  v_primary_concept_id UUID := NULL;
  v_addon_total NUMERIC(12, 2) := 0;
  v_subtotal NUMERIC(12, 2) := 0;
  v_final_total NUMERIC(12, 2) := 0;
  v_total_duration INTEGER := 0;
  v_end_at TIMESTAMPTZ;
  v_idx INTEGER := 0;
  v_result JSONB;
BEGIN
  -- 1. Actor Authentication & Role Validation
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Managers and Admins can update consultation details.' USING ERRCODE = '42501';
  END IF;

  -- 2. Lock and Validate Booking Status
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status NOT IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN
    RAISE EXCEPTION 'Cannot update consultation for booking in status %.', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- 3. Validate Service & Package
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND (service_id = p_service_id OR service_id IS NULL) AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package specified for the selected service.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Validate Concepts
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      SELECT * INTO v_concept_record FROM public.concepts WHERE id = v_concept_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Concept % not found.', v_concept_id USING ERRCODE = 'P0002';
      END IF;
      IF v_primary_concept_id IS NULL THEN
        v_primary_concept_id := v_concept_id;
      END IF;
    END LOOP;
  END IF;

  -- 5. Validate Studio Room
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = p_studio_room_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio room not found or inactive.' USING ERRCODE = 'P0002';
  END IF;

  -- 6. Calculate Duration and End Time
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0), COALESCE(SUM(price), 0)
    INTO v_total_duration, v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_pkg.duration_minutes + v_total_duration;
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- 7. Determine Final Authoritative Price
  v_subtotal := v_pkg.price + v_addon_total;
  IF p_total_amount IS NOT NULL AND p_total_amount >= 0 THEN
    v_final_total := p_total_amount;
  ELSE
    v_final_total := v_subtotal;
  END IF;

  -- 8. Update Booking Record
  UPDATE public.bookings
  SET
    service_id = p_service_id,
    package_id = p_package_id,
    concept_id = v_primary_concept_id,
    studio_room_id = p_studio_room_id,
    start_at = p_start_at,
    end_at = v_end_at,
    subtotal = v_subtotal,
    addon_total = v_addon_total,
    total_amount = v_final_total,
    deposit_amount = ROUND(v_final_total * 0.30),
    customer_note = COALESCE(p_customer_note, customer_note),
    staff_note = CASE
      WHEN p_staff_note IS NOT NULL THEN COALESCE(staff_note || E'\n', '') || '[' || v_caller_role || ']: ' || p_staff_note
      ELSE staff_note
    END,
    booking_status = 'CONSULTING',
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- 9. Replace Addons
  DELETE FROM public.booking_addons WHERE booking_id = p_booking_id;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    INSERT INTO public.booking_addons (booking_id, addon_id, quantity, unit_price, line_total)
    SELECT p_booking_id, a.id, 1, a.price, a.price
    FROM public.addons a
    WHERE a.id = ANY(p_addon_ids) AND a.active = true;
  END IF;

  -- 10. Replace Concepts
  DELETE FROM public.booking_concepts WHERE booking_id = p_booking_id;
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_idx := v_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order, display_order)
      VALUES (p_booking_id, v_concept_id, v_idx, v_idx);
    END LOOP;
  END IF;

  -- 11. Write Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'BOOKING',
    p_booking_id::text,
    'CONSULTATION_UPDATED',
    jsonb_build_object(
      'service_id', p_service_id,
      'package_id', p_package_id,
      'concept_ids', p_concept_ids,
      'studio_room_id', p_studio_room_id,
      'start_at', p_start_at,
      'end_at', v_end_at,
      'total_amount', v_final_total,
      'status', 'CONSULTING'
    )
  );

  -- 12. Return Updated Booking
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'package_id', b.package_id,
    'concept_id', b.concept_id,
    'studio_room_id', b.studio_room_id,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'booking_status', b.booking_status,
    'payment_status', b.payment_status,
    'subtotal', b.subtotal,
    'addon_total', b.addon_total,
    'discount_total', b.discount_total,
    'total_amount', b.total_amount,
    'deposit_amount', b.deposit_amount,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'customer_email', b.customer_email,
    'customer_note', b.customer_note,
    'staff_note', b.staff_note,
    'created_at', b.created_at,
    'updated_at', b.updated_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_consultation(UUID, UUID, UUID, UUID, TIMESTAMPTZ, UUID[], UUID[], NUMERIC, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. Authoritative confirm_booking_deposit RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_booking_deposit(
  p_booking_id UUID,
  p_deposit_amount NUMERIC,
  p_deposit_note TEXT DEFAULT NULL,
  p_final_total NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_studio RECORD;
  v_service RECORD;
  v_pkg RECORD;
  v_final_total NUMERIC(12, 2);
  v_result JSONB;
BEGIN
  -- 1. Actor Authentication & Status Check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  -- 2. Authorization: Manager, Admin, or Root Owner Only
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Managers and Admins can confirm deposits and lock bookings.' USING ERRCODE = '42501';
  END IF;

  -- 3. SELECT booking FOR UPDATE (Row Lock)
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Validate Booking Status: Must be CONSULTATION_REQUESTED or CONSULTING
  IF v_booking.booking_status NOT IN ('CONSULTATION_REQUESTED', 'CONSULTING', 'PENDING_PAYMENT') THEN
    RAISE EXCEPTION 'Cannot confirm deposit for booking in status %.', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- 5. Determine Total and Validate Deposit Amount
  IF p_final_total IS NOT NULL AND p_final_total >= 0 THEN
    v_final_total := p_final_total;
  ELSE
    v_final_total := v_booking.total_amount;
  END IF;

  IF p_deposit_amount < 0 THEN
    RAISE EXCEPTION 'Deposit amount cannot be negative.' USING ERRCODE = '22023';
  END IF;

  IF p_deposit_amount > v_final_total THEN
    RAISE EXCEPTION 'Deposit amount (%) cannot exceed total booking amount (%).', p_deposit_amount, v_final_total USING ERRCODE = '22023';
  END IF;

  -- 6. Validate Studio Room Active
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = v_booking.studio_room_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio room not found or currently inactive.' USING ERRCODE = 'P0002';
  END IF;

  -- 7. CONCURRENCY-SAFE STUDIO SLOT OVERLAP LOCK & CHECK
  PERFORM id FROM public.studio_rooms WHERE id = v_booking.studio_room_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE studio_room_id = v_booking.studio_room_id
      AND id != p_booking_id
      AND booking_status IN (
        'CONFIRMED',
        'CHECKED_IN',
        'SHOOTING',
        'SHOOT_COMPLETED',
        'EDITING',
        'READY_FOR_REVIEW',
        'DELIVERED',
        'DEPOSIT_PAID'
      )
      AND tstzrange(start_at, end_at, '[)') && tstzrange(v_booking.start_at, v_booking.end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Studio room is already booked for the selected time slot.' USING ERRCODE = '23P01';
  END IF;

  -- 8. Apply Confirmation Updates to Booking
  UPDATE public.bookings
  SET
    booking_status = 'CONFIRMED',
    total_amount = v_final_total,
    deposit_amount = p_deposit_amount,
    deposit_confirmed_at = timezone('utc'::text, now()),
    deposit_confirmed_by = v_caller_id,
    deposit_note = p_deposit_note,
    staff_note = CASE
      WHEN p_deposit_note IS NOT NULL THEN COALESCE(staff_note || E'\n', '') || '[' || v_caller_role || ' CỌC]: ' || p_deposit_note
      ELSE staff_note
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- 9. Enqueue Rich Confirmation Email into notification_outbox (Idempotent)
  SELECT name INTO v_service FROM public.services WHERE id = v_booking.service_id;
  SELECT name INTO v_pkg FROM public.packages WHERE id = v_booking.package_id;

  INSERT INTO public.notification_outbox (
    event_type,
    recipient_user_id,
    recipient_email,
    entity_type,
    entity_id,
    template_key,
    payload,
    idempotency_key,
    status,
    created_at
  )
  VALUES (
    'BOOKING_CONFIRMED',
    v_booking.customer_id,
    v_booking.customer_email,
    'BOOKING',
    p_booking_id::text,
    'booking_confirmed',
    jsonb_build_object(
      'bookingCode', v_booking.booking_code,
      'customerName', v_booking.customer_name,
      'customerPhone', v_booking.customer_phone,
      'customerEmail', v_booking.customer_email,
      'serviceName', COALESCE(v_service.name, 'Dịch vụ Studio'),
      'packageName', COALESCE(v_pkg.name, 'Gói chụp Maison MIPA'),
      'studioName', v_studio.name,
      'startAt', v_booking.start_at,
      'endAt', v_booking.end_at,
      'totalAmount', v_final_total,
      'depositAmount', p_deposit_amount,
      'remainingAmount', GREATEST(0, v_final_total - p_deposit_amount),
      'depositNote', p_deposit_note
    ),
    'booking-confirmed:' || p_booking_id::text,
    'PENDING',
    timezone('utc'::text, now())
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- 10. Provision Google Drive Delivery Intent (Status: NOT_CREATED)
  INSERT INTO public.booking_deliveries (
    booking_id,
    provider,
    status,
    created_at,
    updated_at
  )
  VALUES (
    p_booking_id,
    'GOOGLE_DRIVE',
    'NOT_CREATED',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (booking_id) DO NOTHING;

  -- 11. Write Audit Logs
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'BOOKING',
    p_booking_id::text,
    'DEPOSIT_CONFIRMED',
    jsonb_build_object(
      'deposit_amount', p_deposit_amount,
      'total_amount', v_final_total,
      'deposit_note', p_deposit_note,
      'confirmed_by', v_caller_id
    )
  );

  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'BOOKING',
    p_booking_id::text,
    'BOOKING_CONFIRMED',
    jsonb_build_object(
      'status', 'CONFIRMED',
      'studio_room_id', v_booking.studio_room_id,
      'start_at', v_booking.start_at,
      'end_at', v_booking.end_at
    )
  );

  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'BOOKING',
    p_booking_id::text,
    'DRIVE_PROVISION_REQUESTED',
    jsonb_build_object(
      'status', 'NOT_CREATED',
      'provider', 'GOOGLE_DRIVE'
    )
  );

  -- 12. Return Authoritative Booking Representation
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'package_id', b.package_id,
    'concept_id', b.concept_id,
    'studio_room_id', b.studio_room_id,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'booking_status', b.booking_status,
    'payment_status', b.payment_status,
    'subtotal', b.subtotal,
    'addon_total', b.addon_total,
    'discount_total', b.discount_total,
    'total_amount', b.total_amount,
    'deposit_amount', b.deposit_amount,
    'deposit_confirmed_at', b.deposit_confirmed_at,
    'deposit_confirmed_by', b.deposit_confirmed_by,
    'deposit_note', b.deposit_note,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'customer_email', b.customer_email,
    'occasion', b.occasion,
    'customer_note', b.customer_note,
    'staff_note', b.staff_note,
    'created_at', b.created_at,
    'updated_at', b.updated_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_deposit(UUID, NUMERIC, TEXT, NUMERIC) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. Update update_booking_status RPC with Consultation State Machine Transitions
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_booking_status(
  p_booking_id UUID,
  p_new_status TEXT,
  p_staff_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_staff_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_is_assigned BOOLEAN := false;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  -- Verify caller account status
  SELECT role, staff_role, status
  INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Access Denied: Your account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  -- Load booking
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Check if caller is assigned to this booking
  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  -- ABAC Role & Transition Authorization Matrix
  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot directly mutate operational booking status.' USING ERRCODE = '42501';

  ELSIF v_caller_role = 'STAFF' THEN
    IF p_new_status IN ('DEPOSIT_PAID', 'PENDING_PAYMENT', 'CANCELLED', 'CONFIRMED') THEN
      RAISE EXCEPTION 'Access Denied: Staff cannot mutate payment, cancellation or confirmation state.' USING ERRCODE = '42501';
    END IF;

    -- RECEPTIONIST: check-in confirmed bookings or start consultation
    IF v_caller_staff_role = 'RECEPTIONIST' THEN
      IF v_booking.booking_status = 'CONFIRMED' AND p_new_status = 'CHECKED_IN' THEN
        NULL;
      ELSIF v_booking.booking_status = 'CONSULTATION_REQUESTED' AND p_new_status = 'CONSULTING' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Receptionist can only transition CONFIRMED -> CHECKED_IN or CONSULTATION_REQUESTED -> CONSULTING.' USING ERRCODE = '42501';
      END IF;

    -- PHOTOGRAPHER: start and complete assigned shoots
    ELSIF v_caller_staff_role = 'PHOTOGRAPHER' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Photographer is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;

      IF v_booking.booking_status = 'CHECKED_IN' AND p_new_status = 'SHOOTING' THEN
        NULL;
      ELSIF v_booking.booking_status = 'SHOOTING' AND p_new_status = 'SHOOT_COMPLETED' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid photographer transition from % to %.', v_booking.booking_status, p_new_status USING ERRCODE = '42501';
      END IF;

    -- EDITOR: editing & review readiness
    ELSIF v_caller_staff_role = 'EDITOR' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Editor is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;

      IF v_booking.booking_status = 'SHOOT_COMPLETED' AND p_new_status = 'EDITING' THEN
        NULL;
      ELSIF v_booking.booking_status = 'EDITING' AND p_new_status = 'READY_FOR_REVIEW' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid editor transition from % to %.', v_booking.booking_status, p_new_status USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'MAKEUP' THEN
      RAISE EXCEPTION 'Access Denied: Makeup artists manage tasks via staff_tasks, not booking main status.' USING ERRCODE = '42501';

    ELSE
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
    END IF;

  ELSIF v_caller_role IN ('MANAGER', 'ADMIN') OR public.is_root_owner() THEN
    -- Direct transition to CONFIRMED without deposit is prohibited
    IF p_new_status = 'CONFIRMED' AND v_booking.deposit_confirmed_at IS NULL AND v_booking.booking_status != 'DEPOSIT_PAID' THEN
      RAISE EXCEPTION 'Direct transition to CONFIRMED requires confirm_booking_deposit RPC.' USING ERRCODE = '22023';
    END IF;

    IF v_booking.booking_status = 'COMPLETED' AND p_new_status IN ('DRAFT', 'PENDING_PAYMENT', 'CONSULTATION_REQUESTED') THEN
      RAISE EXCEPTION 'Illegal state transition from COMPLETED to %', p_new_status USING ERRCODE = '22023';
    END IF;
    IF v_booking.booking_status = 'CANCELLED' AND p_new_status NOT IN ('CANCELLED', 'CONFIRMED') THEN
      RAISE EXCEPTION 'Cannot update cancelled booking without reactivation.' USING ERRCODE = '22023';
    END IF;

  ELSE
    RAISE EXCEPTION 'Access Denied: Unknown role.' USING ERRCODE = '42501';
  END IF;

  -- Apply status transition
  UPDATE public.bookings
  SET
    booking_status = p_new_status,
    staff_note = CASE
      WHEN p_staff_note IS NOT NULL THEN COALESCE(staff_note || E'\n', '') || '[' || v_caller_role || ']: ' || p_staff_note
      ELSE staff_note
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    v_caller_id,
    'BOOKING',
    p_booking_id::text,
    'UPDATE_STATUS',
    jsonb_build_object('status', v_booking.booking_status),
    jsonb_build_object('status', p_new_status, 'staff_note', p_staff_note)
  );

  SELECT to_jsonb(b.*) INTO v_result
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_status(UUID, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. Production Google Drive Delivery Schema & Intent Triggers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_drive_integrations (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  account_email TEXT,
  root_folder_id TEXT,
  refresh_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.google_drive_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only on google_drive_integrations" ON public.google_drive_integrations;
CREATE POLICY "Service role only on google_drive_integrations" ON public.google_drive_integrations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.google_drive_oauth_states (
  state TEXT PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gdrive_oauth_states_expires ON public.google_drive_oauth_states(expires_at);

ALTER TABLE public.google_drive_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only on google_drive_oauth_states" ON public.google_drive_oauth_states;
CREATE POLICY "Service role only on google_drive_oauth_states" ON public.google_drive_oauth_states
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.booking_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE' CHECK (provider IN ('GOOGLE_DRIVE')),
  status TEXT NOT NULL DEFAULT 'NOT_CREATED' CHECK (status IN ('NOT_CREATED', 'CREATING', 'READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'ERROR', 'REVOKED')),
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  last_attempted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  customer_notified_at TIMESTAMPTZ,
  customer_notified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_deliveries_booking_id ON public.booking_deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_status ON public.booking_deliveries(status);

ALTER TABLE public.booking_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Management full access on booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Management full access on booking_deliveries" ON public.booking_deliveries
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  )
  WITH CHECK (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  );

DROP POLICY IF EXISTS "Service role full access on booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Service role full access on booking_deliveries" ON public.booking_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger: On booking CONFIRMED (or higher), ensure delivery row exists
CREATE OR REPLACE FUNCTION public.handle_booking_confirmed_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED') THEN
    INSERT INTO public.booking_deliveries (
      booking_id,
      provider,
      status,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'GOOGLE_DRIVE',
      'NOT_CREATED',
      auth.uid(),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_delivery_intent ON public.bookings;
CREATE TRIGGER trg_booking_delivery_intent
AFTER INSERT OR UPDATE OF booking_status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_confirmed_delivery();

-- Helper RPC: Role-Safe Secure Delivery Reader
CREATE OR REPLACE FUNCTION public.get_booking_delivery_secure(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_delivery RECORD;
  v_is_customer BOOLEAN := false;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 1. Management sees all operational fields
  IF v_caller_role IN ('MANAGER', 'ADMIN') OR public.is_root_owner() THEN
    RETURN to_jsonb(v_delivery);
  END IF;

  -- 2. Staff sees upload folder if assigned and ready for upload or higher
  IF v_caller_role = 'STAFF' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.booking_assignments
      WHERE booking_id = p_booking_id AND employee_id = v_caller_id
    ) INTO v_is_assigned;

    IF NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
    END IF;

    IF v_delivery.status NOT IN ('READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'REVOKED') THEN
      RETURN jsonb_build_object(
        'id', v_delivery.id,
        'booking_id', v_delivery.booking_id,
        'status', v_delivery.status,
        'created_at', v_delivery.created_at,
        'updated_at', v_delivery.updated_at
      );
    END IF;

    RETURN jsonb_build_object(
      'id', v_delivery.id,
      'booking_id', v_delivery.booking_id,
      'provider', v_delivery.provider,
      'drive_folder_id', v_delivery.drive_folder_id,
      'drive_folder_url', v_delivery.drive_folder_url,
      'status', v_delivery.status,
      'ready_at', v_delivery.ready_at,
      'created_at', v_delivery.created_at,
      'updated_at', v_delivery.updated_at
    );
  END IF;

  -- 3. Customer view (ONLY own booking & ONLY when READY_FOR_CUSTOMER)
  IF v_caller_role = 'CUSTOMER' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = p_booking_id AND customer_id = v_caller_id
    ) INTO v_is_customer;

    IF NOT v_is_customer THEN
      RAISE EXCEPTION 'Access Denied: Not your booking.' USING ERRCODE = '42501';
    END IF;

    IF v_delivery.status != 'READY_FOR_CUSTOMER' THEN
      RETURN jsonb_build_object(
        'id', v_delivery.id,
        'booking_id', v_delivery.booking_id,
        'status', v_delivery.status,
        'updated_at', v_delivery.updated_at
      );
    END IF;

    RETURN jsonb_build_object(
      'id', v_delivery.id,
      'booking_id', v_delivery.booking_id,
      'status', v_delivery.status,
      'drive_folder_url', v_delivery.drive_folder_url,
      'ready_at', v_delivery.ready_at
    );
  END IF;

  RAISE EXCEPTION 'Access Denied: Unrecognized role.' USING ERRCODE = '42501';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_delivery_secure(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking_delivery_secure(UUID) TO service_role;

-- Enqueue Function for Drive Delivery Ready
CREATE OR REPLACE FUNCTION public.enqueue_drive_delivery_email(
  p_booking_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_customer RECORD;
  v_delivery RECORD;
  v_outbox_id UUID;
  v_idempotency_key TEXT;
BEGIN
  SELECT * INTO v_delivery
  FROM public.booking_deliveries
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking delivery record not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_delivery.status != 'READY_FOR_CUSTOMER' THEN
    RAISE EXCEPTION 'Cannot enqueue delivery notification: delivery status is % (must be READY_FOR_CUSTOMER).', v_delivery.status USING ERRCODE = '22023';
  END IF;

  SELECT b.id, b.booking_code, b.customer_id, b.service_id, b.package_id, b.start_at
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.id, p.full_name, p.email, p.status
  INTO v_customer
  FROM public.profiles p
  WHERE p.id = v_booking.customer_id;

  IF NOT FOUND OR v_customer.email IS NULL OR v_customer.email = '' THEN
    RAISE EXCEPTION 'Customer email not available for delivery notification.' USING ERRCODE = '22023';
  END IF;

  IF v_customer.status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Customer account is %; notification aborted.', v_customer.status USING ERRCODE = '22023';
  END IF;

  v_idempotency_key := 'drive-delivery-ready:' || p_booking_id::text;

  INSERT INTO public.notification_outbox (
    event_type,
    recipient_user_id,
    recipient_email,
    entity_type,
    entity_id,
    template_key,
    payload,
    idempotency_key,
    status,
    created_at
  ) VALUES (
    'DRIVE_DELIVERY_READY',
    v_customer.id,
    v_customer.email,
    'BOOKING',
    p_booking_id::text,
    'drive_delivery_ready',
    jsonb_build_object(
      'customerName', COALESCE(v_customer.full_name, 'Quý khách'),
      'bookingCode', v_booking.booking_code,
      'accountUrl', 'https://maisonmipa.io.vn/account',
      'readyAt', timezone('utc'::text, now())
    ),
    v_idempotency_key,
    'PENDING',
    timezone('utc'::text, now())
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_outbox_id;

  RETURN v_outbox_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enqueue_drive_delivery_email(UUID, UUID) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.enqueue_drive_delivery_email(UUID, UUID) TO service_role;
