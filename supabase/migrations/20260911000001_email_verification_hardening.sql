-- ==============================================================================
-- Maison MIPA Memories - Migration #7: Email Verification Hardening (#17 P0 Hotfix)
-- Migration: 20260911000001_email_verification_hardening.sql
-- Description:
--   1. Enforces mandatory email verification for all new registered profiles.
--   2. New profiles start with status='PENDING_VERIFICATION' when email_confirmed_at IS NULL.
--   3. Adds trigger on auth.users (email_confirmed_at) to transition PENDING_VERIFICATION -> ACTIVE.
--   4. Guarantees SUSPENDED and DISABLED accounts are NEVER reactivated by verification.
--   5. Hardens protected RLS and RPCs (create_booking, create_deposit_payment, bookings,
--      payments) so PENDING_VERIFICATION users cannot perform protected operations.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Hardened handle_new_user Trigger Function
-- Automatically assigns PENDING_VERIFICATION unless email is already confirmed
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial_status TEXT;
BEGIN
  -- If email_confirmed_at is already set (e.g. invited user or auto-confirmed), set ACTIVE, otherwise PENDING_VERIFICATION
  IF NEW.email_confirmed_at IS NOT NULL THEN
    v_initial_status := 'ACTIVE';
  ELSE
    v_initial_status := 'PENDING_VERIFICATION';
  END IF;

  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'CUSTOMER',
    v_initial_status,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = CASE WHEN public.profiles.full_name = '' THEN EXCLUDED.full_name ELSE public.profiles.full_name END,
    phone = CASE WHEN public.profiles.phone IS NULL OR public.profiles.phone = '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
    -- NEVER reactivate SUSPENDED or DISABLED accounts
    status = CASE
      WHEN public.profiles.status IN ('SUSPENDED', 'DISABLED') THEN public.profiles.status
      WHEN NEW.email_confirmed_at IS NOT NULL THEN 'ACTIVE'
      ELSE public.profiles.status
    END,
    updated_at = timezone('utc'::text, now());

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. Trigger on auth.users to Transition PENDING_VERIFICATION -> ACTIVE
-- Strictly ignores SUSPENDED or DISABLED accounts
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Trigger when email_confirmed_at is newly populated
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET
      status = 'ACTIVE',
      updated_at = timezone('utc'::text, now())
    WHERE id = NEW.id
      AND status = 'PENDING_VERIFICATION'; -- STRICT: NEVER overwrite SUSPENDED or DISABLED
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- ------------------------------------------------------------------------------
-- 3. Data Alignment for Existing Profiles
-- Align existing profiles with their authoritative auth.users confirmation state
-- ------------------------------------------------------------------------------
-- If confirmed in auth.users, promote PENDING_VERIFICATION -> ACTIVE
UPDATE public.profiles p
SET status = 'ACTIVE', updated_at = timezone('utc'::text, now())
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NOT NULL
  AND p.status = 'PENDING_VERIFICATION';

-- If unconfirmed in auth.users and not suspended/disabled, demote to PENDING_VERIFICATION
UPDATE public.profiles p
SET status = 'PENDING_VERIFICATION', updated_at = timezone('utc'::text, now())
FROM auth.users u
WHERE p.id = u.id
  AND u.email_confirmed_at IS NULL
  AND p.status NOT IN ('SUSPENDED', 'DISABLED');

-- ------------------------------------------------------------------------------
-- 4. Hardened RLS Policies: Block PENDING_VERIFICATION from Protected Data
-- ------------------------------------------------------------------------------

-- Bookings SELECT: Only ACTIVE accounts (or staff/management with ACTIVE status) can view
DROP POLICY IF EXISTS "Customers view own bookings" ON public.bookings;
CREATE POLICY "Customers view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    public.get_auth_user_status() = 'ACTIVE' AND
    (
      customer_id = auth.uid() OR
      public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
      (
        public.get_auth_role() = 'STAFF' AND (
          EXISTS (
            SELECT 1 FROM public.booking_assignments a
            WHERE a.booking_id = bookings.id AND a.employee_id = auth.uid()
          ) OR
          (
            public.get_auth_staff_role() = 'RECEPTIONIST' AND
            date_trunc('day', start_at) = date_trunc('day', timezone('utc'::text, now()))
          )
        )
      )
    )
  );

-- Bookings INSERT: Only ACTIVE accounts can create bookings
DROP POLICY IF EXISTS "Customers insert own bookings" ON public.bookings;
CREATE POLICY "Customers insert own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_auth_user_status() = 'ACTIVE' AND
    (customer_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  );

-- Payments SELECT: Only ACTIVE accounts can read payments
DROP POLICY IF EXISTS "Customers read own booking payments" ON public.payments;
CREATE POLICY "Customers read own booking payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    public.get_auth_user_status() = 'ACTIVE' AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'))
    )
  );

-- Booking Addons SELECT: Only ACTIVE accounts can read booking addons
DROP POLICY IF EXISTS "Users read own booking addons" ON public.booking_addons;
CREATE POLICY "Users read own booking addons" ON public.booking_addons
  FOR SELECT TO authenticated
  USING (
    public.get_auth_user_status() = 'ACTIVE' AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        b.customer_id = auth.uid() OR
        public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
      )
    )
  );

-- Booking Concepts SELECT: Only ACTIVE accounts can read booking concepts
DROP POLICY IF EXISTS "Customers and Staff can view booking concepts" ON public.booking_concepts;
CREATE POLICY "Customers and Staff can view booking concepts" ON public.booking_concepts
  FOR SELECT TO authenticated
  USING (
    public.get_auth_user_status() = 'ACTIVE' AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        b.customer_id = auth.uid() OR
        public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 5. Hardened RPC: create_booking (Active Status & Verification Enforcement)
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
  v_caller_id UUID;
  v_customer_id UUID;
  v_caller_role TEXT;
  v_pkg RECORD;
  v_studio RECORD;
  v_service RECORD;
  v_total_duration INTEGER;
  v_end_at TIMESTAMPTZ;
  v_addon_total BIGINT := 0;
  v_subtotal BIGINT := 0;
  v_discount_total BIGINT := 0;
  v_total_amount BIGINT := 0;
  v_deposit_amount BIGINT := 0;
  v_promo RECORD;
  v_booking_code TEXT;
  v_new_booking_id UUID;
  v_addon_id UUID;
  v_cust_name TEXT;
  v_cust_phone TEXT;
  v_cust_email TEXT;
  v_result JSONB;
  v_concept_record RECORD;
  v_concept_id UUID;
  v_primary_concept_id UUID := NULL;
  v_concept_idx INTEGER := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required to create booking.' USING ERRCODE = '42501';
  END IF;

  -- Security Gate: Require verified ACTIVE account
  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Tài khoản chưa được xác thực email hoặc không hoạt động. Vui lòng xác thực tài khoản trước khi đặt lịch.' USING ERRCODE = '42501';
  END IF;

  v_customer_id := v_caller_id;
  v_caller_role := public.get_auth_role();

  -- 1. Validate Service
  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive service specified.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Validate Package & Service association
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND service_id = p_service_id AND active = true;
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

      IF v_concept_record.service_id IS NOT NULL AND v_concept_record.service_id != p_service_id THEN
        RAISE EXCEPTION 'Concept "%" does not belong to the selected service.', v_concept_record.name USING ERRCODE = 'P0003';
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

  -- 5. Calculate Duration & End Time
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_total_duration + v_addon_total::INTEGER;
    v_addon_total := 0;
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- 6. Calculate Server-Authoritative Pricing
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;

  -- Validate Voucher if provided
  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) != '' THEN
    SELECT * INTO v_promo FROM public.promotions
    WHERE code = UPPER(trim(p_voucher_code)) AND active = true;

    IF FOUND THEN
      IF (v_promo.start_at IS NULL OR v_promo.start_at <= now()) AND
         (v_promo.end_at IS NULL OR v_promo.end_at >= now()) AND
         (v_promo.usage_limit > v_promo.usage_count) AND
         (v_subtotal >= v_promo.min_order) THEN

        IF v_promo.discount_percent > 0 THEN
          v_discount_total := ROUND(v_subtotal * (v_promo.discount_percent / 100.0));
        ELSIF v_promo.discount_amount > 0 THEN
          v_discount_total := v_promo.discount_amount;
        END IF;

        IF v_promo.max_discount IS NOT NULL AND v_discount_total > v_promo.max_discount THEN
          v_discount_total := v_promo.max_discount;
        END IF;

        UPDATE public.promotions SET usage_count = usage_count + 1 WHERE id = v_promo.id;
      END IF;
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := COALESCE(v_pkg.deposit_amount, ROUND(v_total_amount * 0.3));

  -- 7. Customer details resolution
  SELECT full_name, phone, email INTO v_cust_name, v_cust_phone, v_cust_email
  FROM public.profiles WHERE id = v_customer_id;

  v_cust_name := COALESCE(p_customer_name, v_cust_name, 'Khách Hàng MIPA');
  v_cust_phone := COALESCE(p_customer_phone, v_cust_phone, '');
  v_cust_email := COALESCE(p_customer_email, v_cust_email, '');

  -- 8. Generate Booking Code
  v_booking_code := 'MIPA-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));

  -- 9. Insert Booking record
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
    customer_name,
    customer_phone,
    customer_email,
    occasion,
    customer_note
  ) VALUES (
    v_booking_code,
    v_customer_id,
    p_service_id,
    p_package_id,
    v_primary_concept_id,
    p_studio_room_id,
    p_start_at,
    v_end_at,
    'PENDING_PAYMENT',
    'UNPAID',
    v_subtotal,
    v_addon_total,
    v_discount_total,
    v_total_amount,
    v_deposit_amount,
    v_cust_name,
    v_cust_phone,
    v_cust_email,
    p_occasion,
    p_customer_note
  )
  RETURNING id INTO v_new_booking_id;

  -- 10. Insert Booking Addons (Quantity, unit_price, line_total)
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    INSERT INTO public.booking_addons (
      booking_id,
      addon_id,
      quantity,
      unit_price,
      line_total
    )
    SELECT
      v_new_booking_id,
      id,
      1,
      price,
      price
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  -- 11. Insert Booking Concepts
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_concept_idx := v_concept_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order)
      VALUES (v_new_booking_id, v_concept_id, v_concept_idx);
    END LOOP;
  END IF;

  -- 12. Create initial Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  ) VALUES (
    v_caller_id,
    'BOOKING',
    v_new_booking_id::text,
    'CREATE_BOOKING',
    NULL,
    jsonb_build_object(
      'booking_code', v_booking_code,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'concept_id', v_primary_concept_id,
      'concept_ids', p_concept_ids,
      'start_at', p_start_at,
      'end_at', v_end_at
    )
  );

  -- 13. Return Created Booking Details
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
    'occasion', b.occasion,
    'customer_note', b.customer_note,
    'created_at', b.created_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Hardened RPC: create_deposit_payment (Active Status & Verification Enforcement)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_deposit_payment(
  p_booking_id UUID,
  p_method TEXT DEFAULT 'BANK_TRANSFER'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_booking RECORD;
  v_existing_payment RECORD;
  v_transfer_ref TEXT;
  v_new_payment_id UUID;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required to create payment.' USING ERRCODE = '42501';
  END IF;

  -- Security Gate: Require verified ACTIVE account
  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Tài khoản chưa được xác thực email hoặc không hoạt động. Vui lòng xác thực tài khoản trước khi thanh toán.' USING ERRCODE = '42501';
  END IF;

  -- 1. Load booking & check ownership or management privileges
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.customer_id != v_caller_id AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: You do not own this booking.' USING ERRCODE = '42501';
  END IF;

  -- 2. Check if booking is already paid
  IF v_booking.payment_status = 'DEPOSIT_PAID' OR v_booking.payment_status = 'FULLY_PAID' THEN
    RAISE EXCEPTION 'This booking has already been paid.' USING ERRCODE = '22023';
  END IF;

  -- 3. Check for existing PENDING payment
  SELECT * INTO v_existing_payment
  FROM public.payments
  WHERE booking_id = p_booking_id AND status = 'PENDING'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing_payment.id,
      'booking_id', v_existing_payment.booking_id,
      'amount', v_existing_payment.amount,
      'status', v_existing_payment.status,
      'payment_method', v_existing_payment.payment_method,
      'transfer_reference', v_existing_payment.transfer_reference,
      'qr_code_url', v_existing_payment.qr_code_url,
      'created_at', v_existing_payment.created_at
    );
  END IF;

  -- 4. Create Transfer Reference & Insert new PENDING payment
  v_transfer_ref := v_booking.booking_code;

  INSERT INTO public.payments (
    booking_id,
    amount,
    status,
    payment_method,
    transfer_reference
  )
  VALUES (
    p_booking_id,
    v_booking.deposit_amount,
    'PENDING',
    p_method,
    v_transfer_ref
  )
  RETURNING id INTO v_new_payment_id;

  -- 5. Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'PAYMENT',
    v_new_payment_id::text,
    'CREATE_DEPOSIT_PAYMENT',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'amount', v_booking.deposit_amount,
      'transfer_reference', v_transfer_ref
    )
  );

  -- 6. Return Created Payment
  SELECT jsonb_build_object(
    'id', p.id,
    'booking_id', p.booking_id,
    'amount', p.amount,
    'status', p.status,
    'payment_method', p.payment_method,
    'transfer_reference', p.transfer_reference,
    'qr_code_url', p.qr_code_url,
    'created_at', p.created_at
  ) INTO v_result
  FROM public.payments p
  WHERE p.id = v_new_payment_id;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Hardened prevent_role_escalation Function: Prevent status escalation
-- Strictly prevents users from altering their own account status to ACTIVE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- If neither role nor status is being modified, allow update
  IF OLD.role = NEW.role AND OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Allow internal operations / service role / background admin
  IF current_setting('request.jwt.claim.role', true) IN ('service_role', 'supabase_admin') OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verify if current caller is ADMIN in profiles table
  SELECT role INTO caller_role FROM public.profiles WHERE id = auth.uid();

  IF caller_role != 'ADMIN' THEN
    IF OLD.role != NEW.role THEN
      RAISE EXCEPTION 'Access Denied: Only administrators are authorized to modify user roles.'
        USING ERRCODE = '42501';
    END IF;
    IF OLD.status != NEW.status THEN
      RAISE EXCEPTION 'Access Denied: Users cannot modify their own account status.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. Hardened RPCs: request_booking_cancel & mark_transfer_submitted Status Checks
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_booking_cancel(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
BEGIN
  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account not active or email not verified.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.customer_id != auth.uid() AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET
    cancel_requested_at = timezone('utc'::text, now()),
    cancel_requested_reason = p_reason,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_transfer_submitted(
  p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payment RECORD;
  v_booking RECORD;
  v_result JSONB;
BEGIN
  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account not active or email not verified.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = v_payment.booking_id;
  IF v_booking.customer_id != auth.uid() AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.payments
  SET 
    transfer_submitted_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_payment_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    auth.uid(),
    'PAYMENT',
    p_payment_id::text,
    'MARK_TRANSFER_SUBMITTED',
    jsonb_build_object(
      'booking_id', v_payment.booking_id,
      'submitted_at', timezone('utc'::text, now())
    )
  );

  SELECT jsonb_build_object(
    'id', p.id,
    'booking_id', p.booking_id,
    'amount', p.amount,
    'status', p.status,
    'payment_method', p.payment_method,
    'transfer_reference', p.transfer_reference,
    'transfer_submitted_at', p.transfer_submitted_at,
    'qr_code_url', p.qr_code_url,
    'created_at', p.created_at
  ) INTO v_result
  FROM public.payments p
  WHERE p.id = p_payment_id;

  RETURN v_result;
END;
$$;

