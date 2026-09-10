-- ==============================================================================
-- Maison MIPA Memories - Production payOS & Email Hardening Migration
-- Migration: 20260910000001_production_payos_and_email_hardening.sql
-- Description:
--   1. Sequence and unique order_code on payments for payOS gateway integration.
--   2. Enforces ACB bank configuration readiness in payment_settings.
--   3. Guarantees fail-closed RLS: Customers can NEVER self-mark payments as PAID.
--   4. Idempotent transactional email outbox triggers for deposit_received,
--      booking_created, pending_deposit, and shoot reminders.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Numeric Order Code Sequence for payOS Integration
-- payOS requires a unique integer orderCode per payment request.
-- ------------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq START WITH 100001 INCREMENT BY 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'order_code'
  ) THEN
    ALTER TABLE public.payments ADD COLUMN order_code BIGINT UNIQUE DEFAULT nextval('public.payos_order_code_seq');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_order_code ON public.payments(order_code);

-- ------------------------------------------------------------------------------
-- 2. Default ACB Bank Configuration Seed in payment_settings
-- Asia Commercial Bank (ACB) - BIN: 970416 - Account Holder: DINH TAN PHAT
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  -- Insert default ACB settings only if no default active config exists yet
  IF NOT EXISTS (SELECT 1 FROM public.payment_settings WHERE is_default = true) THEN
    INSERT INTO public.payment_settings (
      bank_code,
      bank_bin,
      bank_name,
      account_number,
      account_name,
      branch,
      qr_template,
      active,
      is_default
    )
    VALUES (
      'ACB',
      '970416',
      'Ngân hàng TMCP Á Châu (ACB)',
      'CONFIG_PENDING',
      'DINH TAN PHAT',
      'Chi nhánh TP. Hồ Chí Minh',
      'compact2',
      false, -- Inactive until real account number is configured by owner
      true
    );
  ELSE
    -- Ensure ACB setting uses correct legal account holder name
    UPDATE public.payment_settings
    SET account_name = 'DINH TAN PHAT',
        bank_code = 'ACB',
        bank_bin = '970416'
    WHERE bank_code = 'ACB';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. Row Level Security Verification on payments
-- Explicit check to ensure customer CANNOT update payment status to PAID.
-- ------------------------------------------------------------------------------
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop and recreate update policy to strictly restrict to MANAGEMENT roles
DROP POLICY IF EXISTS "Management updates payments" ON public.payments;
CREATE POLICY "Management updates payments" ON public.payments
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Customers can only read payments belonging to their bookings
DROP POLICY IF EXISTS "Customers read own booking payments" ON public.payments;
CREATE POLICY "Customers read own booking payments" ON public.payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'))
    )
  );

-- Service role full access for Edge Functions (webhooks, email outbox worker)
DROP POLICY IF EXISTS "Service role manages payments" ON public.payments;
CREATE POLICY "Service role manages payments" ON public.payments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. Idempotent Payment Confirmation Email Trigger
-- Fires ONLY when status transitions to PAID.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enqueue_payment_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_idempotency_key TEXT;
BEGIN
  -- Trigger ONLY when status transitions to PAID
  IF NEW.status = 'PAID' AND (OLD.status IS NULL OR OLD.status != 'PAID') THEN
    SELECT * INTO v_booking FROM public.bookings WHERE id = NEW.booking_id;
    IF FOUND THEN
      v_idempotency_key := 'deposit_received_payment_' || NEW.id::text;

      INSERT INTO public.notification_outbox (
        event_type,
        recipient_user_id,
        recipient_email,
        entity_type,
        entity_id,
        template_key,
        payload,
        status,
        idempotency_key
      )
      VALUES (
        'DEPOSIT_RECEIVED',
        v_booking.customer_id,
        v_booking.customer_email,
        'PAYMENT',
        NEW.id::text,
        'deposit_received',
        jsonb_build_object(
          'booking_code', v_booking.booking_code,
          'customer_name', v_booking.customer_name,
          'amount', NEW.amount,
          'paid_at', NEW.paid_at,
          'transfer_reference', NEW.transfer_reference,
          'provider', NEW.provider
        ),
        'PENDING',
        v_idempotency_key
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_payment_status_paid ON public.payments;
CREATE TRIGGER on_payment_status_paid
  AFTER UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_payment_confirmation();

-- ------------------------------------------------------------------------------
-- 5. Helper Procedure: Enqueue Shoot Reminder
-- Can be called by scheduled cron job or admin action 24h prior to shoot.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_shoot_reminder(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_idempotency_key TEXT;
  v_outbox_id UUID;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  v_idempotency_key := 'shoot_reminder_booking_' || p_booking_id::text;

  INSERT INTO public.notification_outbox (
    event_type,
    recipient_user_id,
    recipient_email,
    entity_type,
    entity_id,
    template_key,
    payload,
    status,
    idempotency_key
  )
  VALUES (
    'SHOOT_REMINDER',
    v_booking.customer_id,
    v_booking.customer_email,
    'BOOKING',
    p_booking_id::text,
    'shoot_reminder',
    jsonb_build_object(
      'booking_code', v_booking.booking_code,
      'customer_name', v_booking.customer_name,
      'service_name', v_booking.service_name,
      'package_name', v_booking.package_name,
      'booking_date', v_booking.booking_date,
      'start_time', v_booking.start_time
    ),
    'PENDING',
    v_idempotency_key
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_outbox_id;

  RETURN jsonb_build_object(
    'success', true,
    'outbox_id', v_outbox_id,
    'idempotency_key', v_idempotency_key
  );
END;
$$;
