-- ==============================================================================
-- Maison MIPA Memories - Migration #19: Consultation-First Booking Flow & Manual Deposit
-- Migration: 20260917000001_consultation_first_booking_flow.sql
-- Description:
--   - Adds CONSULTATION_REQUESTED and CONSULTING booking statuses
--   - Adds manual deposit tracking columns to public.bookings
--   - Safely updates prevent_double_booking exclusion constraint so consultation
--     requests do NOT block studio slots (multiple requests allowed for same slot)
--   - Updates get_studio_booked_slots RPC to only treat confirmed/operational rows as busy
--   - Updates create_booking RPC to default to CONSULTATION_REQUESTED without blocking slots
--   - Implements update_booking_consultation RPC for Manager/Admin negotiation
--   - Implements atomic confirm_booking_deposit RPC with concurrency-safe slot protection
--   - Enqueues rich confirmation email and Drive delivery intent upon deposit confirmation
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Status Check Constraint & Manual Deposit Columns
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_booking_status_check CHECK (
  booking_status IN (
    'DRAFT', 'PENDING_PAYMENT', 'DEPOSIT_PAID', 'CONFIRMED', 'CHECKED_IN',
    'SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW',
    'DELIVERED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED',
    'CONSULTATION_REQUESTED', 'CONSULTING'
  )
);

ALTER TABLE public.bookings
ALTER COLUMN booking_status SET DEFAULT 'CONSULTATION_REQUESTED';

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS deposit_note TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_deposit_confirmed_at ON public.bookings(deposit_confirmed_at);

-- ------------------------------------------------------------------------------
-- 2. Anti-Double-Booking Exclusion Constraint: Only Operational Bookings Block
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS prevent_double_booking;

ALTER TABLE public.bookings
ADD CONSTRAINT prevent_double_booking
EXCLUDE USING gist (
  studio_room_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (booking_status IN (
  'CONFIRMED',
  'CHECKED_IN',
  'SHOOTING',
  'SHOOT_COMPLETED',
  'EDITING',
  'READY_FOR_REVIEW',
  'DELIVERED'
));

-- ------------------------------------------------------------------------------
-- 3. Availability RPC: Returns Only Authoritative Confirmed Booked Slots
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
    AND b.booking_status IN (
      'CONFIRMED',
      'CHECKED_IN',
      'SHOOTING',
      'SHOOT_COMPLETED',
      'EDITING',
      'READY_FOR_REVIEW',
      'DELIVERED',
      'DEPOSIT_PAID'
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

  -- Note: In consultation-first flow, preferred slot is NOT authoritatively reserved yet.
  -- Multiple consultation requests may request the same preferred slot.

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
  v_deposit_amount := ROUND(v_total_amount * 0.30); -- Estimated 30% deposit reference

  -- 7. Generate Booking Code
  v_booking_code := 'MIPA-' || to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));

  -- 8. Insert Booking Record (Status: CONSULTATION_REQUESTED, payment_status: UNPAID)
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

  -- 11. Audit Log Entry
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    new_data
  )
  VALUES (
    v_customer_id,
    'CUSTOMER',
    'BOOKING_CONSULTATION_REQUESTED',
    'BOOKING',
    v_new_booking_id::text,
    jsonb_build_object(
      'booking_code', v_booking_code,
      'service_id', p_service_id,
      'package_id', p_package_id,
      'studio_room_id', p_studio_room_id,
      'start_at', p_start_at,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'booking_status', 'CONSULTATION_REQUESTED'
    )
  );

  -- 12. Return Authoritative Domain Representation
  SELECT to_jsonb(b.*) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_booking(UUID, UUID, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[]) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. Consultation Editor RPC: update_booking_consultation
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_booking_consultation(
  p_booking_id UUID,
  p_service_id UUID DEFAULT NULL,
  p_package_id UUID DEFAULT NULL,
  p_studio_room_id UUID DEFAULT NULL,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_concept_ids UUID[] DEFAULT NULL,
  p_addon_ids UUID[] DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL,
  p_staff_note TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
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
  v_service_id UUID;
  v_package_id UUID;
  v_studio_room_id UUID;
  v_start_at TIMESTAMPTZ;
  v_end_at TIMESTAMPTZ;
  v_addon_total NUMERIC(12, 2) := 0;
  v_subtotal NUMERIC(12, 2) := 0;
  v_discount_total NUMERIC(12, 2) := 0;
  v_total_amount NUMERIC(12, 2) := 0;
  v_deposit_amount NUMERIC(12, 2) := 0;
  v_total_duration INTEGER := 0;
  v_concept_id UUID;
  v_primary_concept_id UUID := NULL;
  v_idx INTEGER := 0;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Manager, Admin, or Root Owner can update consultation.' USING ERRCODE = '42501';
  END IF;

  -- Lock booking row
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking % not found.', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status NOT IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN
    RAISE EXCEPTION 'Cannot edit booking consultation in status % (must be CONSULTATION_REQUESTED or CONSULTING).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  v_service_id := COALESCE(p_service_id, v_booking.service_id);
  v_package_id := COALESCE(p_package_id, v_booking.package_id);
  v_studio_room_id := COALESCE(p_studio_room_id, v_booking.studio_room_id);
  v_start_at := COALESCE(p_start_at, v_booking.start_at);

  -- Validate package & service
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = v_package_id AND (service_id = v_service_id OR service_id IS NULL) AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package or package not active for service.' USING ERRCODE = 'P0002';
  END IF;

  -- Validate studio
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = v_studio_room_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio room not found or inactive.' USING ERRCODE = 'P0002';
  END IF;

  -- Calculate duration
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_addon_total
    FROM public.addons WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_total_duration + v_addon_total::INTEGER;
    v_addon_total := 0;
  END IF;

  v_end_at := v_start_at + (v_total_duration * INTERVAL '1 minute');

  -- Calculate pricing
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons WHERE id = ANY(p_addon_ids) AND active = true;
  ELSE
    v_addon_total := v_booking.addon_total;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;
  v_discount_total := LEAST(v_subtotal, v_booking.discount_total);
  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := ROUND(v_total_amount * 0.30);

  -- Update booking
  UPDATE public.bookings
  SET service_id = v_service_id,
      package_id = v_package_id,
      studio_room_id = v_studio_room_id,
      start_at = v_start_at,
      end_at = v_end_at,
      subtotal = v_subtotal,
      addon_total = v_addon_total,
      discount_total = v_discount_total,
      total_amount = v_total_amount,
      deposit_amount = v_deposit_amount,
      customer_note = COALESCE(p_customer_note, v_booking.customer_note),
      staff_note = COALESCE(p_staff_note, v_booking.staff_note),
      booking_status = CASE WHEN p_status IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN p_status ELSE v_booking.booking_status END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Update addons if provided
  IF p_addon_ids IS NOT NULL THEN
    DELETE FROM public.booking_addons WHERE booking_id = p_booking_id;
    IF array_length(p_addon_ids, 1) > 0 THEN
      INSERT INTO public.booking_addons (booking_id, addon_id, quantity, unit_price, line_total)
      SELECT p_booking_id, a.id, 1, a.price, a.price
      FROM public.addons a
      WHERE a.id = ANY(p_addon_ids) AND a.active = true;
    END IF;
  END IF;

  -- Update concepts if provided
  IF p_concept_ids IS NOT NULL THEN
    DELETE FROM public.booking_concepts WHERE booking_id = p_booking_id;
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_idx := v_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order, display_order)
      VALUES (p_booking_id, v_concept_id, v_idx, v_idx);
      IF v_primary_concept_id IS NULL THEN
        v_primary_concept_id := v_concept_id;
      END IF;
    END LOOP;
    IF v_primary_concept_id IS NOT NULL THEN
      UPDATE public.bookings SET concept_id = v_primary_concept_id WHERE id = p_booking_id;
    END IF;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    v_caller_id,
    v_caller_role,
    'BOOKING_CONSULTATION_UPDATED',
    'BOOKING',
    p_booking_id::text,
    to_jsonb(v_booking),
    jsonb_build_object(
      'service_id', v_service_id,
      'package_id', v_package_id,
      'total_amount', v_total_amount,
      'status', CASE WHEN p_status IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN p_status ELSE v_booking.booking_status END
    )
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_consultation(UUID, UUID, UUID, UUID, TIMESTAMPTZ, UUID[], UUID[], TEXT, TEXT, TEXT) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. Authoritative Deposit Confirmation RPC: confirm_booking_deposit
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_booking_deposit(
  p_booking_id UUID,
  p_deposit_amount NUMERIC(12, 2),
  p_deposit_note TEXT DEFAULT NULL,
  p_final_total NUMERIC(12, 2) DEFAULT NULL
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
  v_service RECORD;
  v_studio RECORD;
  v_customer RECORD;
  v_total_amount NUMERIC(12, 2);
  v_remaining_balance NUMERIC(12, 2);
  v_idempotency_key TEXT;
  v_concept_names TEXT[] := '{}';
  v_addon_names TEXT[] := '{}';
  v_result JSONB;
BEGIN
  -- 1. Authentication & Actor Active Verification
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  -- 2. Strictly MANAGER, ADMIN, or root owner only
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Manager, Admin, or Root Owner can confirm booking deposit.' USING ERRCODE = '42501';
  END IF;

  -- 3. Row-Lock Booking
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Require status in CONSULTATION_REQUESTED or CONSULTING
  IF v_booking.booking_status NOT IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN
    RAISE EXCEPTION 'Cannot confirm deposit for booking in status % (must be CONSULTATION_REQUESTED or CONSULTING).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- 5. Determine Authoritative Total
  IF p_final_total IS NOT NULL AND p_final_total > 0 THEN
    v_total_amount := p_final_total;
  ELSE
    v_total_amount := v_booking.total_amount;
  END IF;

  -- 6. Validate Deposit Amount
  IF p_deposit_amount IS NULL OR p_deposit_amount < 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than or equal to 0.' USING ERRCODE = '22023';
  END IF;

  IF p_deposit_amount > v_total_amount THEN
    RAISE EXCEPTION 'Deposit amount (%) cannot exceed total amount (%).', p_deposit_amount, v_total_amount USING ERRCODE = '22023';
  END IF;

  v_remaining_balance := GREATEST(0, v_total_amount - p_deposit_amount);

  -- 7. Concurrency-Safe Slot Protection & Overlap Verification
  PERFORM id FROM public.studio_rooms WHERE id = v_booking.studio_room_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE studio_room_id = v_booking.studio_room_id
      AND id != v_booking.id
      AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED')
      AND tstzrange(start_at, end_at, '[)') && tstzrange(v_booking.start_at, v_booking.end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Khung giờ phòng studio đã có lịch đặt chính thức từ trước. Không thể xác nhận cọc cho khung giờ này.' USING ERRCODE = '23P01';
  END IF;

  -- 8. Mutate Booking State to CONFIRMED
  UPDATE public.bookings
  SET booking_status = 'CONFIRMED',
      payment_status = CASE WHEN p_deposit_amount >= v_total_amount THEN 'FULLY_PAID' ELSE 'DEPOSIT_PAID' END,
      deposit_amount = p_deposit_amount,
      total_amount = v_total_amount,
      deposit_confirmed_at = timezone('utc'::text, now()),
      deposit_confirmed_by = v_caller_id,
      deposit_note = p_deposit_note,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- 9. Write Audit Log
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    v_caller_id,
    v_caller_role,
    'BOOKING_DEPOSIT_CONFIRMED',
    'BOOKING',
    p_booking_id::text,
    jsonb_build_object(
      'booking_status', v_booking.booking_status,
      'deposit_amount', v_booking.deposit_amount,
      'total_amount', v_booking.total_amount
    ),
    jsonb_build_object(
      'booking_status', 'CONFIRMED',
      'deposit_amount', p_deposit_amount,
      'total_amount', v_total_amount,
      'deposit_confirmed_by', v_caller_id,
      'deposit_note', p_deposit_note
    )
  );

  -- 10. Load Associated Entities for Notification Outbox
  SELECT * INTO v_pkg FROM public.packages WHERE id = v_booking.package_id;
  SELECT * INTO v_service FROM public.services WHERE id = v_booking.service_id;
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = v_booking.studio_room_id;
  SELECT * INTO v_customer FROM public.profiles WHERE id = v_booking.customer_id;

  SELECT ARRAY_AGG(c.name) INTO v_concept_names
  FROM public.booking_concepts bc
  JOIN public.concepts c ON c.id = bc.concept_id
  WHERE bc.booking_id = p_booking_id;

  SELECT ARRAY_AGG(a.name) INTO v_addon_names
  FROM public.booking_addons ba
  JOIN public.addons a ON a.id = ba.addon_id
  WHERE ba.booking_id = p_booking_id;

  -- 11. Enqueue Confirmed Email into notification_outbox
  v_idempotency_key := 'booking-confirmed:' || p_booking_id::text;

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
      'customerName', COALESCE(v_booking.customer_name, v_customer.full_name, 'Quý khách'),
      'customerPhone', v_booking.customer_phone,
      'customerEmail', v_booking.customer_email,
      'serviceName', COALESCE(v_service.name, 'Dịch Vụ Studio'),
      'packageName', COALESCE(v_pkg.name, 'Gói Chụp Maison MIPA'),
      'conceptNames', COALESCE(v_concept_names, '{}'::text[]),
      'addonNames', COALESCE(v_addon_names, '{}'::text[]),
      'date', to_char(v_booking.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD'),
      'startTime', to_char(v_booking.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI'),
      'endTime', to_char(v_booking.end_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI'),
      'startAt', to_char(v_booking.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI Ngày DD/MM/YYYY'),
      'studioName', COALESCE(v_studio.name, 'Maison Studio Room'),
      'durationMinutes', COALESCE(v_pkg.duration_minutes, 60),
      'totalAmount', v_total_amount,
      'depositAmount', p_deposit_amount,
      'remainingBalance', v_remaining_balance,
      'customerNote', v_booking.customer_note,
      'staffNote', v_booking.staff_note,
      'depositNote', p_deposit_note
    ),
    v_idempotency_key,
    'PENDING',
    timezone('utc'::text, now())
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- 12. Enqueue / Provision Drive Intent in booking_deliveries (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_deliveries') THEN
    INSERT INTO public.booking_deliveries (
      booking_id,
      provider,
      status,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      p_booking_id,
      'GOOGLE_DRIVE',
      'NOT_CREATED',
      v_caller_id,
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (booking_id) DO UPDATE
    SET status = CASE WHEN public.booking_deliveries.status IN ('NOT_CREATED', 'ERROR') THEN 'NOT_CREATED' ELSE public.booking_deliveries.status END,
        updated_at = timezone('utc'::text, now());
  END IF;

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_deposit(UUID, NUMERIC, TEXT, NUMERIC) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. Update update_booking_status RPC: Enforce Deposit Confirmation Authority
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

  SELECT role, staff_role, status
  INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Your account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  -- ABAC Checks
  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot directly mutate operational booking status.' USING ERRCODE = '42501';

  ELSIF v_caller_role = 'STAFF' THEN
    IF p_new_status IN ('DEPOSIT_PAID', 'PENDING_PAYMENT', 'CANCELLED', 'CONFIRMED', 'CONSULTATION_REQUESTED', 'CONSULTING') THEN
      RAISE EXCEPTION 'Access Denied: Staff cannot mutate payment, consultation or confirmation state.' USING ERRCODE = '42501';
    END IF;

    IF v_caller_staff_role = 'RECEPTIONIST' THEN
      IF v_booking.booking_status = 'CONFIRMED' AND p_new_status = 'CHECKED_IN' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Receptionist can only transition CONFIRMED -> CHECKED_IN.' USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'PHOTOGRAPHER' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Photographer is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
      IF v_booking.booking_status = 'CHECKED_IN' AND p_new_status = 'SHOOTING' THEN
        NULL;
      ELSIF v_booking.booking_status = 'SHOOTING' AND p_new_status = 'SHOOT_COMPLETED' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid photographer transition.' USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'EDITOR' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Editor is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
      IF v_booking.booking_status = 'SHOOT_COMPLETED' AND p_new_status = 'EDITING' THEN
        NULL;
      ELSIF v_booking.booking_status = 'EDITING' AND p_new_status = 'READY_FOR_REVIEW' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid editor transition.' USING ERRCODE = '42501';
      END IF;

    ELSE
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
    END IF;

  ELSIF v_caller_role IN ('MANAGER', 'ADMIN') OR public.is_root_owner() THEN
    -- Transition to CONFIRMED must happen through confirm_booking_deposit RPC
    IF p_new_status = 'CONFIRMED' AND v_booking.booking_status IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN
      RAISE EXCEPTION 'Xác nhận đơn đặt lịch từ trạng thái tư vấn phải thông qua quy trình xác nhận nhận cọc (confirm_booking_deposit).' USING ERRCODE = '42501';
    END IF;

    IF v_booking.booking_status = 'COMPLETED' AND p_new_status IN ('DRAFT', 'PENDING_PAYMENT', 'CONSULTATION_REQUESTED', 'CONSULTING') THEN
      RAISE EXCEPTION 'Illegal state transition from COMPLETED to %', p_new_status USING ERRCODE = '22023';
    END IF;

  ELSE
    RAISE EXCEPTION 'Access Denied: Unrecognized role.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET booking_status = p_new_status,
      staff_note = COALESCE(p_staff_note, staff_note),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    v_caller_id,
    v_caller_role,
    'BOOKING_STATUS_UPDATED',
    'BOOKING',
    p_booking_id::text,
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', p_new_status, 'staff_note', p_staff_note)
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_booking_status(UUID, TEXT, TEXT) TO authenticated;
