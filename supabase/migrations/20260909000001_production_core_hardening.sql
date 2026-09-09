-- ==============================================================================
-- Maison MIPA Memories - Production Core Hardening Migration
-- Migration: 20260909000001_production_core_hardening.sql
-- Description:
--   - Real Bank & VietQR Payment Settings table & RLS
--   - Idempotent Notification Outbox & Event-driven Email Trigger
--   - Staff Tasks table for Makeup / Specialized operational roles
--   - ABAC Booking Assignments enforcement & Drive delivery fields
--   - Strict Server-Side Booking State Machine RPC with staff_role checks
--   - Customer acknowledgement RPCs (schedule confirmation, shoot ack, reschedule/cancel requests)
--   - Admin role, status, and payment configuration management RPCs
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Real Business Payment Settings Table (VietQR Configuration)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_code TEXT NOT NULL,
  bank_bin TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  branch TEXT,
  qr_template TEXT NOT NULL DEFAULT 'compact2',
  active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

-- Public & authenticated can read active payment settings for rendering VietQR
CREATE POLICY "Public read active payment settings" ON public.payment_settings
  FOR SELECT USING (active = true);

-- Only Admin can update or insert payment settings
CREATE POLICY "Admin manage payment settings" ON public.payment_settings
  FOR ALL TO authenticated
  USING (public.get_auth_role() = 'ADMIN')
  WITH CHECK (public.get_auth_role() = 'ADMIN');

-- Service role full access
CREATE POLICY "Service role manages payment settings" ON public.payment_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. Notification Outbox Table (Event-driven, Idempotent, Server-Only)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  recipient_user_id UUID REFERENCES public.profiles(id),
  recipient_email TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  provider_message_id TEXT,
  last_error TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status_next ON public.notification_outbox(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_outbox_recipient ON public.notification_outbox(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON public.notification_outbox(idempotency_key);

ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;

-- Customers and Staff can view their own notifications
CREATE POLICY "Users read own notifications" ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Service role full management (for Edge Function email processor)
CREATE POLICY "Service role manages notification outbox" ON public.notification_outbox
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. Staff Tasks Table (Makeup, Styling, Prep Tasks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('MAKEUP', 'STYLING', 'PROP_PREP', 'RETOUCH')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_staff_tasks_booking ON public.staff_tasks(booking_id);
CREATE INDEX IF NOT EXISTS idx_staff_tasks_employee ON public.staff_tasks(employee_id);

ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read own tasks" ON public.staff_tasks
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY "Staff update own tasks" ON public.staff_tasks
  FOR UPDATE TO authenticated
  USING (employee_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (employee_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Management manage staff tasks" ON public.staff_tasks
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- ------------------------------------------------------------------------------
-- 4. Extend Bookings Table with Acknowledgement, Request & Drive Fields
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS customer_schedule_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_shoot_ack_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_requested_date TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_requested_slot TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_requested_reason TEXT,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_requested_reason TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_folder_url TEXT,
  ADD COLUMN IF NOT EXISTS drive_shared_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS drive_ready_for_customer BOOLEAN NOT NULL DEFAULT false;

-- ------------------------------------------------------------------------------
-- 5. Helper Function: Get Current User Account Status & Staff Role
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_auth_user_status()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_staff_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT staff_role FROM public.profiles WHERE id = auth.uid();
$$;

-- ------------------------------------------------------------------------------
-- 6. Updated RLS Policies on Bookings (Enforcing Status & Scope Isolation)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers view own bookings" ON public.bookings;
CREATE POLICY "Customers view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    -- Deny suspended or disabled accounts
    public.get_auth_user_status() NOT IN ('SUSPENDED', 'DISABLED') AND
    (
      -- Customer views own
      customer_id = auth.uid() OR
      -- Manager & Admin view all
      public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
      -- Staff views if assigned
      (
        public.get_auth_role() = 'STAFF' AND (
          EXISTS (
            SELECT 1 FROM public.booking_assignments a
            WHERE a.booking_id = bookings.id AND a.employee_id = auth.uid()
          ) OR
          -- Receptionist can view today's schedule
          (
            public.get_auth_staff_role() = 'RECEPTIONIST' AND
            date_trunc('day', start_at) = date_trunc('day', timezone('utc'::text, now()))
          )
        )
      )
    )
  );

-- ------------------------------------------------------------------------------
-- 7. Authoritative Booking State Machine RPC with ABAC Authority
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

  -- ============================================================================
  -- ABAC Role & Transition Authorization Matrix
  -- ============================================================================
  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot directly mutate operational booking status.' USING ERRCODE = '42501';

  ELSIF v_caller_role = 'STAFF' THEN
    -- Staff can NEVER set payment statuses or cancel bookings
    IF p_new_status IN ('DEPOSIT_PAID', 'PENDING_PAYMENT', 'CANCELLED') THEN
      RAISE EXCEPTION 'Access Denied: Staff cannot mutate payment or cancellation state.' USING ERRCODE = '42501';
    END IF;

    -- RECEPTIONIST: can only check-in confirmed bookings
    IF v_caller_staff_role = 'RECEPTIONIST' THEN
      IF v_booking.booking_status = 'CONFIRMED' AND p_new_status = 'CHECKED_IN' THEN
        -- Allowed
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Receptionist can only transition CONFIRMED -> CHECKED_IN.' USING ERRCODE = '42501';
      END IF;

    -- PHOTOGRAPHER: can only start and complete assigned shoots
    ELSIF v_caller_staff_role = 'PHOTOGRAPHER' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Photographer is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;

      IF v_booking.booking_status = 'CHECKED_IN' AND p_new_status = 'SHOOTING' THEN
        -- Allowed
        NULL;
      ELSIF v_booking.booking_status = 'SHOOTING' AND p_new_status = 'SHOOT_COMPLETED' THEN
        -- Allowed
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid photographer transition from % to %.', v_booking.booking_status, p_new_status USING ERRCODE = '42501';
      END IF;

    -- EDITOR: can only receive and finish review for assigned bookings
    ELSIF v_caller_staff_role = 'EDITOR' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Editor is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;

      IF v_booking.booking_status = 'SHOOT_COMPLETED' AND p_new_status = 'EDITING' THEN
        -- Allowed
        NULL;
      ELSIF v_booking.booking_status = 'EDITING' AND p_new_status = 'READY_FOR_REVIEW' THEN
        -- Allowed
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid editor transition from % to %.', v_booking.booking_status, p_new_status USING ERRCODE = '42501';
      END IF;

    -- MAKEUP: Cannot mutate main booking state (uses staff_tasks instead)
    ELSIF v_caller_staff_role = 'MAKEUP' THEN
      RAISE EXCEPTION 'Access Denied: Makeup artists manage tasks via staff_tasks, not booking main status.' USING ERRCODE = '42501';

    ELSE
      -- Generic unassigned or unrecognized staff role
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
    END IF;

  ELSIF v_caller_role IN ('MANAGER', 'ADMIN') THEN
    -- Validate state machine graph validity
    IF v_booking.booking_status = 'COMPLETED' AND p_new_status IN ('DRAFT', 'PENDING_PAYMENT') THEN
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
    jsonb_build_object('status', p_new_status, 'staff_role', v_caller_staff_role, 'note', p_staff_note)
  );

  -- Return updated record
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'package_id', b.package_id,
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
    'staff_note', b.staff_note,
    'customer_schedule_confirmed_at', b.customer_schedule_confirmed_at,
    'customer_shoot_ack_at', b.customer_shoot_ack_at,
    'drive_folder_url', b.drive_folder_url,
    'drive_ready_for_customer', b.drive_ready_for_customer,
    'created_at', b.created_at,
    'updated_at', b.updated_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. Customer Acknowledgement & Request RPCs
-- ------------------------------------------------------------------------------
-- Customer Schedule Acknowledgement ("Xác nhận lịch chụp")
CREATE OR REPLACE FUNCTION public.acknowledge_customer_schedule(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.customer_id != auth.uid() AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: You do not own this booking.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET customer_schedule_confirmed_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- Customer Shoot Completion Acknowledgement ("Xác nhận đã chụp xong")
CREATE OR REPLACE FUNCTION public.acknowledge_customer_shoot(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.customer_id != auth.uid() AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: You do not own this booking.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET customer_shoot_ack_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- Customer Reschedule Request
CREATE OR REPLACE FUNCTION public.request_booking_reschedule(
  p_booking_id UUID,
  p_new_date TEXT,
  p_new_slot TEXT,
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
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.customer_id != auth.uid() AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET
    reschedule_requested_at = timezone('utc'::text, now()),
    reschedule_requested_date = p_new_date,
    reschedule_requested_slot = p_new_slot,
    reschedule_requested_reason = p_reason,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- Customer Cancellation Request
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

-- ------------------------------------------------------------------------------
-- 9. Staff Tasks Update RPC (For Makeup, Styling, etc.)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_staff_task_status(
  p_task_id UUID,
  p_new_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_task RECORD;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_task FROM public.staff_tasks WHERE id = p_task_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_task.employee_id != v_caller_id AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: You can only update your own tasks.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.staff_tasks
  SET
    status = p_new_status,
    notes = COALESCE(p_notes, notes),
    updated_at = timezone('utc'::text, now())
  WHERE id = p_task_id;

  SELECT to_jsonb(t.*) INTO v_result FROM public.staff_tasks t WHERE t.id = p_task_id;
  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. Admin Mutation RPCs (User Role & Status, Payment Settings)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_user_role_and_status(
  p_user_id UUID,
  p_new_role TEXT,
  p_new_staff_role TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT 'ACTIVE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_old_profile RECORD;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := public.get_auth_role();

  IF v_caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can update user roles and statuses.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_old_profile FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.profiles
  SET
    role = p_new_role,
    staff_role = p_new_staff_role,
    status = p_new_status,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_user_id;

  -- Maintain employees table sync
  IF p_new_role = 'STAFF' AND p_new_staff_role IS NOT NULL THEN
    INSERT INTO public.employees (id, staff_role, active)
    VALUES (p_user_id, p_new_staff_role, (p_new_status = 'ACTIVE'))
    ON CONFLICT (id) DO UPDATE
    SET
      staff_role = EXCLUDED.staff_role,
      active = (p_new_status = 'ACTIVE'),
      updated_at = timezone('utc'::text, now());
  END IF;

  -- Append Audit Log
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
    'USER_ROLE',
    p_user_id::text,
    'ADMIN_UPDATE_USER',
    jsonb_build_object('role', v_old_profile.role, 'staff_role', v_old_profile.staff_role, 'status', v_old_profile.status),
    jsonb_build_object('role', p_new_role, 'staff_role', p_new_staff_role, 'status', p_new_status)
  );

  SELECT to_jsonb(p.*) INTO v_result FROM public.profiles p WHERE p.id = p_user_id;
  RETURN v_result;
END;
$$;

-- Admin Save Payment Settings RPC
CREATE OR REPLACE FUNCTION public.admin_save_payment_settings(
  p_bank_code TEXT,
  p_bank_bin TEXT,
  p_bank_name TEXT,
  p_account_number TEXT,
  p_account_name TEXT,
  p_branch TEXT DEFAULT NULL,
  p_qr_template TEXT DEFAULT 'compact2'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_setting_id UUID;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := public.get_auth_role();

  IF v_caller_role != 'ADMIN' THEN
    RAISE EXCEPTION 'Access Denied: Only administrators can update payment settings.' USING ERRCODE = '42501';
  END IF;

  -- Deactivate previous default settings
  UPDATE public.payment_settings SET is_default = false WHERE is_default = true;

  -- Insert new active setting
  INSERT INTO public.payment_settings (
    bank_code,
    bank_bin,
    bank_name,
    account_number,
    account_name,
    branch,
    qr_template,
    active,
    is_default,
    updated_by
  )
  VALUES (
    upper(trim(p_bank_code)),
    trim(p_bank_bin),
    trim(p_bank_name),
    trim(p_account_number),
    upper(trim(p_account_name)),
    p_branch,
    p_qr_template,
    true,
    true,
    v_caller_id
  )
  RETURNING id INTO v_setting_id;

  -- Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'PAYMENT_SETTINGS',
    v_setting_id::text,
    'UPDATE_BANK_CONFIG',
    jsonb_build_object(
      'bank_code', p_bank_code,
      'account_number', p_account_number,
      'account_name', p_account_name
    )
  );

  SELECT to_jsonb(s.*) INTO v_result FROM public.payment_settings s WHERE s.id = v_setting_id;
  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. Event-Driven Notification Enqueue Trigger Functions
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
          'transfer_reference', NEW.transfer_reference
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

-- Trigger for booking events (Booking created / pending deposit)
CREATE OR REPLACE FUNCTION public.trg_enqueue_booking_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idempotency_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_idempotency_key := 'booking_created_' || NEW.id::text;
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
      'BOOKING_CREATED',
      NEW.customer_id,
      NEW.customer_email,
      'BOOKING',
      NEW.id::text,
      'booking_created',
      jsonb_build_object(
        'booking_code', NEW.booking_code,
        'customer_name', NEW.customer_name,
        'total_amount', NEW.total_amount,
        'deposit_amount', NEW.deposit_amount,
        'start_at', NEW.start_at
      ),
      'PENDING',
      v_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created_notification ON public.bookings;
CREATE TRIGGER on_booking_created_notification
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_booking_events();
