-- ==============================================================================
-- Maison MIPA Memories - Database Migration #12
-- File: 20260911000006_fix_payments_columns_and_availability_rpc.sql
--
-- Features:
-- 1. Add payment_method and qr_code_url columns to public.payments table for full compatibility.
-- 2. Update create_deposit_payment and mark_transfer_submitted RPCs to handle both method
--    and payment_method seamlessly.
-- 3. Create get_studio_booked_slots RPC (SECURITY DEFINER) so customers can view
--    which time slots are occupied on a given date without leaking personal data.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add payment_method and qr_code_url columns to payments table
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

-- Populate existing rows where payment_method is null
UPDATE public.payments
SET payment_method = method
WHERE payment_method IS NULL AND method IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. Update create_deposit_payment RPC
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
  v_new_payment_id UUID;
  v_transfer_ref TEXT;
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
      'method', COALESCE(v_existing_payment.method, v_existing_payment.payment_method, p_method),
      'payment_method', COALESCE(v_existing_payment.payment_method, v_existing_payment.method, p_method),
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
    method,
    payment_method,
    transfer_reference
  )
  VALUES (
    p_booking_id,
    v_booking.deposit_amount,
    'PENDING',
    COALESCE(p_method, 'BANK_TRANSFER'),
    COALESCE(p_method, 'BANK_TRANSFER'),
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
      'transfer_reference', v_transfer_ref,
      'method', p_method
    )
  );

  -- 6. Return Created Payment
  SELECT jsonb_build_object(
    'id', p.id,
    'booking_id', p.booking_id,
    'amount', p.amount,
    'status', p.status,
    'method', p.method,
    'payment_method', COALESCE(p.payment_method, p.method),
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
-- 3. Update mark_transfer_submitted RPC
-- ------------------------------------------------------------------------------
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
    'method', p.method,
    'payment_method', COALESCE(p.payment_method, p.method),
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

-- ------------------------------------------------------------------------------
-- 4. Create get_studio_booked_slots RPC
-- Returns occupied intervals for a given studio and date without leaking private data
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
    AND b.booking_status NOT IN ('CANCELLED')
    AND b.start_at < v_day_end
    AND b.end_at > v_day_start
  ORDER BY b.start_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_studio_booked_slots(UUID, DATE) TO anon, authenticated, service_role;
