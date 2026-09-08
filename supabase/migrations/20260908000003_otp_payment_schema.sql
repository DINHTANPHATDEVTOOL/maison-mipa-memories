-- ==============================================================================
-- Maison MIPA Memories - OTP Challenges & Deposit Payment Infrastructure
-- Migration: 20260908000003_otp_payment_schema.sql
-- Description: Establishes secure server-side OTP storage, payment tracking,
--              authoritative deposit calculation, and idempotent confirmation.
-- ==============================================================================

-- 1. Table: otp_challenges (Secure server-side OTP verification with rate limits & attempt locks)
CREATE TABLE IF NOT EXISTS public.otp_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  phone_hash TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('LOGIN', 'REGISTER', 'VERIFY_PHONE', 'SENSITIVE_ACTION')),
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '5 minutes'),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  resend_after TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '60 seconds'),
  consumed_at TIMESTAMPTZ,
  ip_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone ON public.otp_challenges(phone);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone_hash ON public.otp_challenges(phone_hash);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_expires ON public.otp_challenges(expires_at);

-- 2. Table: payments (Tracks deposit & service payments with backend-enforced amounts)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL DEFAULT 'DEPOSIT' CHECK (payment_type IN ('DEPOSIT', 'FULL_PAYMENT', 'ADDON', 'REMAINING')),
  method TEXT NOT NULL DEFAULT 'BANK_TRANSFER' CHECK (method IN ('BANK_TRANSFER', 'VIETQR', 'MOMO', 'CASH', 'CARD')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED')),
  amount BIGINT NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  provider TEXT NOT NULL DEFAULT 'MANUAL_BANK_TRANSFER',
  provider_reference TEXT,
  idempotency_key TEXT UNIQUE,
  transfer_reference TEXT NOT NULL UNIQUE,
  transfer_submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transfer_ref ON public.payments(transfer_reference);

-- ==============================================================================
-- 3. Row Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.otp_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- otp_challenges: Strictly server-side access (service_role only). Public/customer cannot read otp_hash.
CREATE POLICY "Service role manages otp_challenges" ON public.otp_challenges
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- payments Policies:
-- CUSTOMER: can read payments for own bookings
CREATE POLICY "Customers read own booking payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'))
    )
  );

-- STAFF & MANAGEMENT: view payments
CREATE POLICY "Staff and management view payments" ON public.payments
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'));

-- Only MANAGER and ADMIN can update payment status (Confirm manual payment or process refund)
CREATE POLICY "Management updates payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Service role full access for Edge Functions & webhooks
CREATE POLICY "Service role manages payments" ON public.payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);


-- ==============================================================================
-- 4. Stored Procedure / RPC: Create Deposit Payment (Backend-Authoritative Amount)
-- ==============================================================================
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

  -- 3. Check for existing PENDING payment within validity (idempotency)
  SELECT * INTO v_existing_payment
  FROM public.payments
  WHERE booking_id = p_booking_id
    AND status = 'PENDING'
    AND (expired_at IS NULL OR expired_at > now())
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    SELECT to_jsonb(p.*) INTO v_result FROM public.payments p WHERE p.id = v_existing_payment.id;
    RETURN v_result;
  END IF;

  -- 4. Authoritative amount: Always derived from bookings.deposit_amount (Customer CANNOT dictate amount)
  -- Generate unique transfer reference: MIPA-<booking_code>-<short_rand>
  v_transfer_ref := 'MIPA ' || replace(v_booking.booking_code, 'MIPA-', '') || ' ' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 4));

  INSERT INTO public.payments (
    booking_id,
    payment_type,
    method,
    status,
    amount,
    currency,
    provider,
    transfer_reference,
    expired_at,
    metadata
  )
  VALUES (
    p_booking_id,
    'DEPOSIT',
    p_method,
    'PENDING',
    v_booking.deposit_amount,
    'VND',
    CASE WHEN p_method = 'VIETQR' THEN 'VIETQR' ELSE 'MANUAL_BANK_TRANSFER' END,
    v_transfer_ref,
    timezone('utc'::text, now()) + INTERVAL '24 hours',
    jsonb_build_object('booking_code', v_booking.booking_code)
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

  SELECT to_jsonb(p.*) INTO v_result FROM public.payments p WHERE p.id = v_new_payment_id;
  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 5. Stored Procedure: Mark Transfer Submitted ("Tôi đã chuyển khoản")
-- Does NOT mark payment as PAID; records customer transfer intent for review.
-- ==============================================================================
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
    'TRANSFER_SUBMITTED',
    jsonb_build_object('submitted_at', now())
  );

  SELECT to_jsonb(p.*) INTO v_result FROM public.payments p WHERE p.id = p_payment_id;
  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 6. Stored Procedure: Confirm Manual Payment (Manager/Admin Authority Only)
-- Transaction-safe & Idempotent transition to PAID + updates booking deposit status
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.confirm_manual_payment(
  p_payment_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_payment RECORD;
  v_booking RECORD;
  v_result JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only managers and administrators can confirm payments.' USING ERRCODE = '42501';
  END IF;

  -- Lock payment row for update to prevent concurrent race conditions
  SELECT * INTO v_payment FROM public.payments WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment record not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency check: If already PAID, return current state safely without duplicate charges
  IF v_payment.status = 'PAID' THEN
    SELECT to_jsonb(p.*) INTO v_result FROM public.payments p WHERE p.id = p_payment_id;
    RETURN v_result;
  END IF;

  -- Mark payment as PAID
  UPDATE public.payments
  SET
    status = 'PAID',
    paid_at = timezone('utc'::text, now()),
    metadata = metadata || jsonb_build_object('confirmed_by', auth.uid(), 'note', p_note),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_payment_id;

  -- Update booking payment status in the exact same transaction
  UPDATE public.bookings
  SET
    payment_status = 'DEPOSIT_PAID',
    booking_status = CASE 
      WHEN booking_status = 'PENDING_PAYMENT' THEN 'CONFIRMED'
      ELSE booking_status
    END,
    staff_note = CASE 
      WHEN p_note IS NOT NULL THEN COALESCE(staff_note || E'\n', '') || '[Xác nhận cọc]: ' || p_note
      ELSE staff_note
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = v_payment.booking_id;

  -- Immutable Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  )
  VALUES (
    auth.uid(),
    'PAYMENT',
    p_payment_id::text,
    'CONFIRM_PAYMENT',
    jsonb_build_object('status', v_payment.status),
    jsonb_build_object('status', 'PAID', 'amount', v_payment.amount, 'note', p_note)
  );

  SELECT to_jsonb(p.*) INTO v_result FROM public.payments p WHERE p.id = p_payment_id;
  RETURN v_result;
END;
$$;
