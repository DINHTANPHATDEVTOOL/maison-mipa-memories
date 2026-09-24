-- ==============================================================================
-- Maison MIPA Memories - Migration #23: CRM & Business Intelligence V1
-- Description:
--   1. Customer CRM Profiles (customer_crm_profiles)
--   2. Operational Tags (crm_tags, crm_customer_tags)
--   3. Interaction Timeline (crm_interactions)
--   4. Follow-up Task System (crm_follow_up_tasks)
--   5. Booking Status History (booking_status_history)
--   6. Internal Financial Ledger (booking_financial_transactions)
--   7. Strict RLS (Zero customer access to CRM & Finance; Manager/Admin authorization)
--   8. Server-Authoritative Aggregations & Analytics RPCs (Asia/Ho_Chi_Minh timezone)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Customer CRM Profiles Table
-- Extends profiles(id) without duplicating name, email, or phone.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_crm_profiles (
  customer_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  crm_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  lifecycle_stage TEXT NOT NULL DEFAULT 'NEW' CHECK (
    lifecycle_stage IN ('NEW', 'CONSULTATION', 'QUALIFIED', 'BOOKED', 'ACTIVE', 'DELIVERED', 'RETURNING', 'INACTIVE')
  ),
  acquisition_source TEXT,
  first_contact_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_contact_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  next_follow_up_at TIMESTAMPTZ,
  internal_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_crm_profiles_lifecycle ON public.customer_crm_profiles(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_profiles_owner ON public.customer_crm_profiles(crm_owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_profiles_next_follow_up ON public.customer_crm_profiles(next_follow_up_at);

-- ------------------------------------------------------------------------------
-- 2. Operational Tags
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#C6A45F',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.crm_customer_tags (
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (customer_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_cust_tags_customer ON public.crm_customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_cust_tags_tag ON public.crm_customer_tags(tag_id);

-- Seed default initial tags if not present
INSERT INTO public.crm_tags (name, color, description)
VALUES 
  ('Khách quen', '#C6A45F', 'Khách hàng đã hoàn thành từ 2 booking trở lên'),
  ('VIP', '#E0C287', 'Khách hàng có tổng chi tiêu cao hoặc dịch vụ Signature'),
  ('Couple', '#D1C4B7', 'Khách hàng quan tâm gói ảnh đôi / cưới'),
  ('Gia đình', '#A39385', 'Khách hàng gia đình hoặc có em bé'),
  ('Cần follow-up', '#D97706', 'Khách hàng yêu cầu tư vấn cần liên hệ lại'),
  ('Tiềm năng quay lại', '#10B981', 'Khách hàng hài lòng cao sau buổi chụp')
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 3. CRM Interaction Timeline
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  interaction_type TEXT NOT NULL CHECK (
    interaction_type IN (
      'CONSULTATION_CALL', 'ZALO', 'PHONE_CALL', 'EMAIL', 
      'IN_PERSON', 'FOLLOW_UP', 'BOOKING_DISCUSSION', 
      'CUSTOMER_REQUEST', 'INTERNAL_NOTE'
    )
  ),
  channel TEXT NOT NULL DEFAULT 'PHONE' CHECK (
    channel IN ('PHONE', 'ZALO', 'EMAIL', 'IN_PERSON', 'OTHER')
  ),
  outcome TEXT,
  summary TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer ON public.crm_interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_booking ON public.crm_interactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_occurred_at ON public.crm_interactions(occurred_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Follow-up Task System
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.crm_follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  type TEXT NOT NULL DEFAULT 'FOLLOW_UP' CHECK (
    type IN ('CONSULTATION', 'FOLLOW_UP', 'PAYMENT_REMINDER', 'SELECTION_REMINDER', 'FEEDBACK', 'SPECIAL_OCCASION')
  ),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (
    status IN ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED')
  ),
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (
    priority IN ('LOW', 'NORMAL', 'HIGH')
  ),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_customer ON public.crm_follow_up_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_assigned_to ON public.crm_follow_up_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due_at ON public.crm_follow_up_tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON public.crm_follow_up_tasks(status);

-- ------------------------------------------------------------------------------
-- 5. Booking Status History Table
-- Authoritative server record of status transitions for cohort and duration analytics.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_b_status_history_booking ON public.booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_b_status_history_changed_at ON public.booking_status_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_b_status_history_transition ON public.booking_status_history(from_status, to_status);

-- Trigger to record booking status transitions automatically
CREATE OR REPLACE FUNCTION public.trg_record_booking_status_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.booking_status_history (
      booking_id, from_status, to_status, actor_id, actor_role, reason, changed_at
    ) VALUES (
      NEW.id,
      NULL,
      NEW.booking_status,
      auth.uid(),
      (SELECT role FROM public.profiles WHERE id = auth.uid()),
      'Initial booking creation',
      timezone('utc'::text, now())
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.booking_status IS DISTINCT FROM NEW.booking_status THEN
    INSERT INTO public.booking_status_history (
      booking_id, from_status, to_status, actor_id, actor_role, reason, changed_at
    ) VALUES (
      NEW.id,
      OLD.booking_status,
      NEW.booking_status,
      auth.uid(),
      (SELECT role FROM public.profiles WHERE id = auth.uid()),
      COALESCE(NEW.staff_note, 'Status transition'),
      timezone('utc'::text, now())
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_status_history ON public.bookings;
CREATE TRIGGER trg_bookings_status_history
  AFTER INSERT OR UPDATE OF booking_status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_record_booking_status_history();

-- Backfill initial status history for existing bookings
INSERT INTO public.booking_status_history (booking_id, from_status, to_status, changed_at)
SELECT b.id, NULL, b.booking_status, b.created_at
FROM public.bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_status_history bsh WHERE bsh.booking_id = b.id
);

-- ------------------------------------------------------------------------------
-- 6. Internal Financial Ledger (booking_financial_transactions)
-- Distinguishes BOOKING_VALUE from actual CASH_RECEIVED.
-- Strictly internal staff/admin ledger; NO customer payment gateway.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (
    transaction_type IN ('DEPOSIT', 'BALANCE', 'ADDITIONAL_CHARGE', 'REFUND', 'ADJUSTMENT')
  ),
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL DEFAULT 'BANK_TRANSFER' CHECK (
    method IN ('CASH', 'BANK_TRANSFER', 'OTHER')
  ),
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  reference_note TEXT,
  idempotency_key TEXT UNIQUE,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_booking ON public.booking_financial_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_customer ON public.booking_financial_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_received_at ON public.booking_financial_transactions(received_at);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type_dir ON public.booking_financial_transactions(transaction_type, direction);

-- Backfill existing confirmed deposits into financial ledger with deterministic idempotency keys
INSERT INTO public.booking_financial_transactions (
  booking_id,
  customer_id,
  transaction_type,
  direction,
  amount,
  method,
  received_at,
  reference_note,
  idempotency_key,
  recorded_by,
  created_at
)
SELECT 
  b.id,
  b.customer_id,
  'DEPOSIT',
  'IN',
  b.deposit_amount,
  'BANK_TRANSFER',
  COALESCE(b.deposit_confirmed_at, b.updated_at, b.created_at),
  COALESCE(b.deposit_note, 'Xác nhận đặt cọc'),
  'booking-deposit:' || b.id::text,
  COALESCE(b.deposit_confirmed_by, b.customer_id),
  COALESCE(b.deposit_confirmed_at, b.created_at)
FROM public.bookings b
WHERE b.deposit_amount > 0
  AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')
ON CONFLICT (idempotency_key) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Configuration
-- ------------------------------------------------------------------------------
ALTER TABLE public.customer_crm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_financial_transactions ENABLE ROW LEVEL SECURITY;

-- CUSTOMER: ZERO ACCESS to all CRM tables
-- MANAGER & ADMIN: Full access

-- customer_crm_profiles
CREATE POLICY "Manager and Admin manage crm profiles" ON public.customer_crm_profiles
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- crm_tags
CREATE POLICY "Manager and Admin manage crm tags" ON public.crm_tags
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- crm_customer_tags
CREATE POLICY "Manager and Admin manage customer tags" ON public.crm_customer_tags
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- crm_interactions
CREATE POLICY "Manager and Admin manage crm interactions" ON public.crm_interactions
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- crm_follow_up_tasks
-- Staff can view/update tasks assigned to them; Managers/Admins have full access
CREATE POLICY "Staff read own assigned follow up tasks" ON public.crm_follow_up_tasks
  FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid() 
    OR public.get_auth_role() IN ('MANAGER', 'ADMIN') 
    OR public.is_root_owner()
  );

CREATE POLICY "Staff update own assigned follow up tasks" ON public.crm_follow_up_tasks
  FOR UPDATE TO authenticated
  USING (
    assigned_to = auth.uid() 
    OR public.get_auth_role() IN ('MANAGER', 'ADMIN') 
    OR public.is_root_owner()
  )
  WITH CHECK (
    assigned_to = auth.uid() 
    OR public.get_auth_role() IN ('MANAGER', 'ADMIN') 
    OR public.is_root_owner()
  );

CREATE POLICY "Manager and Admin insert follow up tasks" ON public.crm_follow_up_tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

CREATE POLICY "Manager and Admin delete follow up tasks" ON public.crm_follow_up_tasks
  FOR DELETE TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- booking_status_history
CREATE POLICY "Manager and Admin read status history" ON public.booking_status_history
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- booking_financial_transactions
CREATE POLICY "Manager and Admin manage financial transactions" ON public.booking_financial_transactions
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());

-- ------------------------------------------------------------------------------
-- 8. Enhanced confirm_booking_deposit: Writes directly to Financial Ledger
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

  -- 9. Transactionally write exactly ONE DEPOSIT transaction to internal financial ledger
  IF p_deposit_amount > 0 THEN
    INSERT INTO public.booking_financial_transactions (
      booking_id,
      customer_id,
      transaction_type,
      direction,
      amount,
      method,
      received_at,
      reference_note,
      idempotency_key,
      recorded_by,
      created_at
    ) VALUES (
      p_booking_id,
      v_booking.customer_id,
      'DEPOSIT',
      'IN',
      p_deposit_amount,
      'BANK_TRANSFER',
      timezone('utc'::text, now()),
      COALESCE(p_deposit_note, 'Xác nhận cọc'),
      'booking-deposit:' || p_booking_id::text,
      v_caller_id,
      timezone('utc'::text, now())
    ) ON CONFLICT (idempotency_key) DO UPDATE
      SET amount = EXCLUDED.amount,
          reference_note = EXCLUDED.reference_note,
          updated_at = timezone('utc'::text, now());
  END IF;

  -- 10. Update or create customer CRM profile lifecycle stage
  INSERT INTO public.customer_crm_profiles (customer_id, lifecycle_stage, last_contact_at, updated_at)
  VALUES (v_booking.customer_id, 'BOOKED', timezone('utc'::text, now()), timezone('utc'::text, now()))
  ON CONFLICT (customer_id) DO UPDATE
    SET lifecycle_stage = CASE 
          WHEN customer_crm_profiles.lifecycle_stage = 'RETURNING' THEN 'RETURNING' 
          ELSE 'BOOKED' 
        END,
        last_contact_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now());

  -- 11. Write Audit Log
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

  -- 12. Load Associated Entities for Notification Outbox
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

  -- 13. Enqueue Notification
  INSERT INTO public.notification_outbox (
    booking_id,
    recipient_email,
    recipient_name,
    event_type,
    subject,
    payload,
    status
  ) VALUES (
    p_booking_id,
    v_booking.customer_email,
    v_booking.customer_name,
    'BOOKING_CONFIRMED',
    'Maison MIPA Memories — Xác Nhận Lịch Chụp Thành Công',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'booking_code', v_booking.booking_code,
      'customer_name', v_booking.customer_name,
      'customer_email', v_booking.customer_email,
      'customer_phone', v_booking.customer_phone,
      'service_name', COALESCE(v_service.name, v_booking.service_id),
      'package_name', COALESCE(v_pkg.name, v_booking.package_id),
      'studio_room_name', COALESCE(v_studio.name, v_booking.studio_room_id),
      'booking_date', v_booking.booking_date,
      'start_time', v_booking.start_time,
      'end_time', v_booking.end_time,
      'deposit_amount', p_deposit_amount,
      'total_amount', v_total_amount,
      'remaining_balance', v_remaining_balance,
      'concepts', COALESCE(v_concept_names, '{}'::TEXT[]),
      'addons', COALESCE(v_addon_names, '{}'::TEXT[]),
      'deposit_confirmed_at', timezone('utc'::text, now())
    ),
    'PENDING'
  );

  v_result := jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'booking_code', v_booking.booking_code,
    'booking_status', 'CONFIRMED',
    'deposit_amount', p_deposit_amount,
    'total_amount', v_total_amount,
    'remaining_balance', v_remaining_balance
  );

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: record_booking_payment_receipt (Staff/Admin Internal Only)
-- Records final balance payments, adjustments, or refunds.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_booking_payment_receipt(
  p_booking_id UUID,
  p_transaction_type TEXT,
  p_direction TEXT,
  p_amount NUMERIC(12, 2),
  p_method TEXT DEFAULT 'BANK_TRANSFER',
  p_reference_note TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
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
  v_net_cash NUMERIC(12, 2);
  v_remaining NUMERIC(12, 2);
  v_tx_id UUID;
  v_key TEXT;
BEGIN
  -- 1. Auth check
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
    RAISE EXCEPTION 'Access Denied: Only Manager, Admin, or Root Owner can record payments.' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate params
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be strictly greater than 0.' USING ERRCODE = '22023';
  END IF;

  IF p_transaction_type NOT IN ('DEPOSIT', 'BALANCE', 'ADDITIONAL_CHARGE', 'REFUND', 'ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid transaction type: %', p_transaction_type USING ERRCODE = '22023';
  END IF;

  IF p_direction NOT IN ('IN', 'OUT') THEN
    RAISE EXCEPTION 'Invalid direction: %', p_direction USING ERRCODE = '22023';
  END IF;

  -- Lock booking
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  v_key := COALESCE(p_idempotency_key, gen_random_uuid()::text);

  -- Insert ledger entry
  INSERT INTO public.booking_financial_transactions (
    booking_id,
    customer_id,
    transaction_type,
    direction,
    amount,
    method,
    received_at,
    reference_note,
    idempotency_key,
    recorded_by
  ) VALUES (
    p_booking_id,
    v_booking.customer_id,
    p_transaction_type,
    p_direction,
    p_amount,
    COALESCE(p_method, 'BANK_TRANSFER'),
    timezone('utc'::text, now()),
    p_reference_note,
    v_key,
    v_caller_id
  ) RETURNING id INTO v_tx_id;

  -- Calculate new net cash for this booking
  SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE -amount END), 0)
  INTO v_net_cash
  FROM public.booking_financial_transactions
  WHERE booking_id = p_booking_id;

  v_remaining := GREATEST(0, v_booking.total_amount - v_net_cash);

  -- If net cash meets or exceeds total, mark FULLY_PAID
  IF v_net_cash >= v_booking.total_amount THEN
    UPDATE public.bookings
    SET payment_status = 'FULLY_PAID',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_booking_id;
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    v_caller_id,
    v_caller_role,
    'PAYMENT_RECEIPT_RECORDED',
    'FINANCIAL_TRANSACTION',
    v_tx_id::text,
    jsonb_build_object('booking_id', p_booking_id, 'prev_payment_status', v_booking.payment_status),
    jsonb_build_object(
      'transaction_id', v_tx_id,
      'type', p_transaction_type,
      'amount', p_amount,
      'direction', p_direction,
      'net_cash', v_net_cash,
      'remaining_balance', v_remaining
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'booking_id', p_booking_id,
    'net_cash_received', v_net_cash,
    'remaining_balance', v_remaining
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. RPC: get_crm_customers (Paginated Customer CRM Directory)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_crm_customers(
  p_search TEXT DEFAULT NULL,
  p_lifecycle TEXT DEFAULT NULL,
  p_tag_id UUID DEFAULT NULL,
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_offset INT;
  v_total_count INT;
  v_customers JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_offset := GREATEST(0, (COALESCE(p_page, 1) - 1) * COALESCE(p_limit, 20));

  WITH customer_base AS (
    SELECT 
      p.id AS customer_id,
      p.full_name,
      p.email,
      p.phone,
      p.status AS account_status,
      COALESCE(c.lifecycle_stage, 'NEW') AS lifecycle_stage,
      c.crm_owner_id,
      c.acquisition_source,
      COALESCE(c.first_contact_at, p.created_at) AS first_contact_at,
      COALESCE(c.last_contact_at, p.created_at) AS last_contact_at,
      c.next_follow_up_at,
      c.internal_summary
    FROM public.profiles p
    LEFT JOIN public.customer_crm_profiles c ON c.customer_id = p.id
    WHERE p.role = 'CUSTOMER'
      AND (
        p_search IS NULL OR p_search = '' OR
        p.full_name ILIKE '%' || p_search || '%' OR
        p.email ILIKE '%' || p_search || '%' OR
        p.phone ILIKE '%' || p_search || '%'
      )
      AND (p_lifecycle IS NULL OR p_lifecycle = '' OR COALESCE(c.lifecycle_stage, 'NEW') = p_lifecycle)
      AND (
        p_tag_id IS NULL OR EXISTS (
          SELECT 1 FROM public.crm_customer_tags ct WHERE ct.customer_id = p.id AND ct.tag_id = p_tag_id
        )
      )
  ),
  aggregated AS (
    SELECT 
      cb.*,
      COALESCE(COUNT(b.id), 0) AS total_bookings,
      COALESCE(COUNT(b.id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0) AS confirmed_bookings,
      COALESCE(COUNT(b.id) FILTER (WHERE b.booking_status = 'COMPLETED'), 0) AS completed_bookings,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0) AS confirmed_booking_value,
      COALESCE((
        SELECT SUM(CASE WHEN direction = 'IN' THEN amount ELSE -amount END)
        FROM public.booking_financial_transactions ft
        WHERE ft.customer_id = cb.customer_id
      ), 0) AS cash_received,
      (
        SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
        FROM public.crm_customer_tags ct
        JOIN public.crm_tags t ON t.id = ct.tag_id
        WHERE ct.customer_id = cb.customer_id
      ) AS tags,
      (
        SELECT MAX(b_last.start_at)
        FROM public.bookings b_last
        WHERE b_last.customer_id = cb.customer_id
      ) AS last_booking_date,
      (
        SELECT MIN(b_next.start_at)
        FROM public.bookings b_next
        WHERE b_next.customer_id = cb.customer_id
          AND b_next.start_at >= timezone('utc'::text, now())
          AND b_next.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING')
      ) AS upcoming_booking_date
    FROM customer_base cb
    LEFT JOIN public.bookings b ON b.customer_id = cb.customer_id
    GROUP BY 
      cb.customer_id, cb.full_name, cb.email, cb.phone, cb.account_status,
      cb.lifecycle_stage, cb.crm_owner_id, cb.acquisition_source,
      cb.first_contact_at, cb.last_contact_at, cb.next_follow_up_at, cb.internal_summary
  )
  SELECT 
    COUNT(*) INTO v_total_count 
  FROM aggregated;

  SELECT jsonb_agg(
    jsonb_build_object(
      'customerId', a.customer_id,
      'fullName', a.full_name,
      'email', a.email,
      'phone', a.phone,
      'accountStatus', a.account_status,
      'lifecycleStage', CASE 
        WHEN a.confirmed_bookings > 1 THEN 'RETURNING'
        WHEN a.confirmed_bookings = 1 THEN 'BOOKED'
        ELSE a.lifecycle_stage
      END,
      'acquisitionSource', a.acquisition_source,
      'firstContactAt', a.first_contact_at,
      'lastContactAt', a.last_contact_at,
      'nextFollowUpAt', a.next_follow_up_at,
      'totalBookings', a.total_bookings,
      'confirmedBookings', a.confirmed_bookings,
      'completedBookings', a.completed_bookings,
      'confirmedBookingValue', a.confirmed_booking_value,
      'cashReceived', a.cash_received,
      'outstandingBalance', GREATEST(0, a.confirmed_booking_value - a.cash_received),
      'isReturning', (a.confirmed_bookings > 1),
      'lastBookingDate', a.last_booking_date,
      'upcomingBookingDate', a.upcoming_booking_date,
      'tags', COALESCE(a.tags, '[]'::jsonb)
    )
  ) INTO v_customers
  FROM (
    SELECT * FROM aggregated
    ORDER BY last_contact_at DESC
    LIMIT p_limit OFFSET v_offset
  ) a;

  RETURN jsonb_build_object(
    'customers', COALESCE(v_customers, '[]'::jsonb),
    'total', COALESCE(v_total_count, 0),
    'page', p_page,
    'limit', p_limit
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. RPC: get_customer_360 (Complete Customer 360 Profile)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_customer_360(p_customer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_profile RECORD;
  v_crm RECORD;
  v_bookings JSONB;
  v_interactions JSONB;
  v_financial_history JSONB;
  v_follow_ups JSONB;
  v_tags JSONB;
  v_top_services JSONB;
  v_top_concepts JSONB;
  v_total_bookings INT;
  v_confirmed_bookings INT;
  v_completed_bookings INT;
  v_cancelled_bookings INT;
  v_confirmed_val NUMERIC(12, 2);
  v_cash_in NUMERIC(12, 2);
  v_cash_out NUMERIC(12, 2);
  v_net_cash NUMERIC(12, 2);
  v_outstanding NUMERIC(12, 2);
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_customer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Customer not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_crm FROM public.customer_crm_profiles WHERE customer_id = p_customer_id;

  -- 1. Bookings summary
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')),
    COUNT(*) FILTER (WHERE booking_status = 'COMPLETED'),
    COUNT(*) FILTER (WHERE booking_status = 'CANCELLED'),
    COALESCE(SUM(total_amount) FILTER (WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0)
  INTO 
    v_total_bookings, v_confirmed_bookings, v_completed_bookings, v_cancelled_bookings, v_confirmed_val
  FROM public.bookings
  WHERE customer_id = p_customer_id;

  -- 2. Financial transactions
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE direction = 'IN'), 0),
    COALESCE(SUM(amount) FILTER (WHERE direction = 'OUT'), 0)
  INTO v_cash_in, v_cash_out
  FROM public.booking_financial_transactions
  WHERE customer_id = p_customer_id;

  v_net_cash := v_cash_in - v_cash_out;
  v_outstanding := GREATEST(0, v_confirmed_val - v_net_cash);

  -- 3. Bookings list
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'bookingCode', b.booking_code,
      'bookingDate', b.booking_date,
      'startTime', b.start_time,
      'endTime', b.end_time,
      'bookingStatus', b.booking_status,
      'paymentStatus', b.payment_status,
      'totalAmount', b.total_amount,
      'depositAmount', b.deposit_amount,
      'serviceName', s.name,
      'packageName', p.name,
      'createdAt', b.created_at
    ) ORDER BY b.created_at DESC
  ) INTO v_bookings
  FROM public.bookings b
  LEFT JOIN public.services s ON s.id = b.service_id
  LEFT JOIN public.packages p ON p.id = b.package_id
  WHERE b.customer_id = p_customer_id;

  -- 4. Interactions
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'interactionType', i.interaction_type,
      'channel', i.channel,
      'outcome', i.outcome,
      'summary', i.summary,
      'occurredAt', i.occurred_at,
      'actorName', act.full_name
    ) ORDER BY i.occurred_at DESC
  ) INTO v_interactions
  FROM public.crm_interactions i
  LEFT JOIN public.profiles act ON act.id = i.actor_id
  WHERE i.customer_id = p_customer_id;

  -- 5. Financial history
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ft.id,
      'bookingId', ft.booking_id,
      'transactionType', ft.transaction_type,
      'direction', ft.direction,
      'amount', ft.amount,
      'method', ft.method,
      'receivedAt', ft.received_at,
      'referenceNote', ft.reference_note,
      'recordedByName', rec.full_name
    ) ORDER BY ft.received_at DESC
  ) INTO v_financial_history
  FROM public.booking_financial_transactions ft
  LEFT JOIN public.profiles rec ON rec.id = ft.recorded_by
  WHERE ft.customer_id = p_customer_id;

  -- 6. Follow-up tasks
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'type', t.type,
      'title', t.title,
      'description', t.description,
      'dueAt', t.due_at,
      'status', t.status,
      'priority', t.priority,
      'assignedToName', ass.full_name
    ) ORDER BY t.due_at ASC
  ) INTO v_follow_ups
  FROM public.crm_follow_up_tasks t
  LEFT JOIN public.profiles ass ON ass.id = t.assigned_to
  WHERE t.customer_id = p_customer_id;

  -- 7. Tags
  SELECT jsonb_agg(
    jsonb_build_object('id', tag.id, 'name', tag.name, 'color', tag.color)
  ) INTO v_tags
  FROM public.crm_customer_tags ct
  JOIN public.crm_tags tag ON tag.id = ct.tag_id
  WHERE ct.customer_id = p_customer_id;

  -- 8. Preferences
  SELECT jsonb_agg(jsonb_build_object('serviceName', s.name, 'count', sub.cnt))
  INTO v_top_services
  FROM (
    SELECT service_id, COUNT(*) as cnt
    FROM public.bookings
    WHERE customer_id = p_customer_id
    GROUP BY service_id
    ORDER BY cnt DESC LIMIT 3
  ) sub
  JOIN public.services s ON s.id = sub.service_id;

  SELECT jsonb_agg(jsonb_build_object('conceptName', c.name, 'count', sub.cnt))
  INTO v_top_concepts
  FROM (
    SELECT bc.concept_id, COUNT(*) as cnt
    FROM public.booking_concepts bc
    JOIN public.bookings b ON b.id = bc.booking_id
    WHERE b.customer_id = p_customer_id
    GROUP BY bc.concept_id
    ORDER BY cnt DESC LIMIT 3
  ) sub
  JOIN public.concepts c ON c.id = sub.concept_id;

  RETURN jsonb_build_object(
    'customer', jsonb_build_object(
      'id', v_profile.id,
      'fullName', v_profile.full_name,
      'email', v_profile.email,
      'phone', v_profile.phone,
      'status', v_profile.status,
      'lifecycleStage', CASE 
        WHEN v_confirmed_bookings > 1 THEN 'RETURNING'
        WHEN v_confirmed_bookings = 1 THEN 'BOOKED'
        ELSE COALESCE(v_crm.lifecycle_stage, 'NEW')
      END,
      'acquisitionSource', v_crm.acquisition_source,
      'firstContactAt', COALESCE(v_crm.first_contact_at, v_profile.created_at),
      'lastContactAt', COALESCE(v_crm.last_contact_at, v_profile.created_at),
      'internalSummary', v_crm.internal_summary
    ),
    'metrics', jsonb_build_object(
      'totalBookings', v_total_bookings,
      'confirmedBookings', v_confirmed_bookings,
      'completedBookings', v_completed_bookings,
      'cancelledBookings', v_cancelled_bookings,
      'confirmedBookingValue', v_confirmed_val,
      'cashReceived', v_net_cash,
      'outstandingBalance', v_outstanding,
      'isReturning', (v_confirmed_bookings > 1)
    ),
    'bookings', COALESCE(v_bookings, '[]'::jsonb),
    'interactions', COALESCE(v_interactions, '[]'::jsonb),
    'financialHistory', COALESCE(v_financial_history, '[]'::jsonb),
    'followUps', COALESCE(v_follow_ups, '[]'::jsonb),
    'tags', COALESCE(v_tags, '[]'::jsonb),
    'preferences', jsonb_build_object(
      'topServices', COALESCE(v_top_services, '[]'::jsonb),
      'topConcepts', COALESCE(v_top_concepts, '[]'::jsonb)
    )
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 12. RPC: get_crm_dashboard_summary (Executive Business KPI Summary)
-- Date filtering computed in Asia/Ho_Chi_Minh timezone.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_crm_dashboard_summary(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_consultation_requested INT;
  v_consulting INT;
  v_confirmed INT;
  v_completed INT;
  v_cancelled INT;
  v_confirmed_val NUMERIC(12, 2);
  v_deposits_confirmed NUMERIC(12, 2);
  v_cash_received NUMERIC(12, 2);
  v_outstanding NUMERIC(12, 2);
  v_new_customers INT;
  v_returning_customers INT;
  v_upcoming_shoots INT;
  v_overdue_jobs INT;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());

  -- Booking status counts created/active in period
  SELECT 
    COUNT(*) FILTER (WHERE booking_status = 'CONSULTATION_REQUESTED'),
    COUNT(*) FILTER (WHERE booking_status = 'CONSULTING'),
    COUNT(*) FILTER (WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')),
    COUNT(*) FILTER (WHERE booking_status = 'COMPLETED'),
    COUNT(*) FILTER (WHERE booking_status = 'CANCELLED'),
    COALESCE(SUM(total_amount) FILTER (WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0),
    COALESCE(SUM(deposit_amount) FILTER (WHERE deposit_amount > 0 AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0)
  INTO 
    v_consultation_requested, v_consulting, v_confirmed, v_completed, v_cancelled,
    v_confirmed_val, v_deposits_confirmed
  FROM public.bookings
  WHERE created_at >= v_start AND created_at <= v_end;

  -- Authoritative Cash Received in period from financial ledger
  SELECT COALESCE(SUM(CASE WHEN direction = 'IN' THEN amount ELSE -amount END), 0)
  INTO v_cash_received
  FROM public.booking_financial_transactions
  WHERE received_at >= v_start AND received_at <= v_end;

  v_outstanding := GREATEST(0, v_confirmed_val - v_cash_received);

  -- Customer cohorts in period
  SELECT 
    COUNT(DISTINCT customer_id) FILTER (WHERE cnt = 1),
    COUNT(DISTINCT customer_id) FILTER (WHERE cnt > 1)
  INTO v_new_customers, v_returning_customers
  FROM (
    SELECT customer_id, COUNT(*) as cnt
    FROM public.bookings
    WHERE created_at <= v_end
      AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')
    GROUP BY customer_id
  ) sub;

  -- Upcoming shoots (next 7 days from now)
  SELECT COUNT(*)
  INTO v_upcoming_shoots
  FROM public.bookings
  WHERE booking_status = 'CONFIRMED'
    AND start_at >= now()
    AND start_at <= now() + interval '7 days';

  -- Overdue jobs (scheduled end_at has passed but not delivered/completed)
  SELECT COUNT(*)
  INTO v_overdue_jobs
  FROM public.bookings
  WHERE end_at < now()
    AND booking_status IN ('CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW');

  RETURN jsonb_build_object(
    'periodStart', v_start,
    'periodEnd', v_end,
    'timezone', 'Asia/Ho_Chi_Minh',
    'kpis', jsonb_build_object(
      'consultationRequested', v_consultation_requested,
      'consulting', v_consulting,
      'confirmed', v_confirmed,
      'completed', v_completed,
      'cancelled', v_cancelled,
      'confirmedBookingValue', v_confirmed_val,
      'depositsConfirmed', v_deposits_confirmed,
      'cashReceived', v_cash_received,
      'outstandingBalance', v_outstanding,
      'newCustomers', v_new_customers,
      'returningCustomers', v_returning_customers,
      'upcomingShoots', v_upcoming_shoots,
      'overdueJobs', v_overdue_jobs
    )
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 13. RPC: get_booking_funnel_metrics (Cohort-Based Funnel)
-- Tracks bookings created in [p_start_at, p_end_at] through each stage.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booking_funnel_metrics(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_total_cohort INT;
  v_c_requested INT;
  v_c_consulting INT;
  v_c_confirmed INT;
  v_c_shoot_completed INT;
  v_c_delivered INT;
  v_c_completed INT;
  v_c_cancelled INT;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());

  -- Total cohort: all bookings initiated in time range
  SELECT COUNT(*) INTO v_total_cohort
  FROM public.bookings
  WHERE created_at >= v_start AND created_at <= v_end;

  -- Distinct cohort bookings that reached each stage (via status history or current state)
  SELECT 
    COUNT(DISTINCT b.id) FILTER (WHERE bsh.to_status = 'CONSULTATION_REQUESTED' OR b.booking_status = 'CONSULTATION_REQUESTED'),
    COUNT(DISTINCT b.id) FILTER (WHERE bsh.to_status = 'CONSULTING' OR b.booking_status IN ('CONSULTING', 'CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')),
    COUNT(DISTINCT b.id) FILTER (WHERE bsh.to_status = 'CONFIRMED' OR b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')),
    COUNT(DISTINCT b.id) FILTER (WHERE bsh.to_status = 'SHOOT_COMPLETED' OR b.booking_status IN ('SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')),
    COUNT(DISTINCT b.id) FILTER (WHERE bsh.to_status = 'DELIVERED' OR b.booking_status IN ('DELIVERED', 'COMPLETED')),
    COUNT(DISTINCT b.id) FILTER (WHERE bsh.to_status = 'COMPLETED' OR b.booking_status = 'COMPLETED'),
    COUNT(DISTINCT b.id) FILTER (WHERE b.booking_status = 'CANCELLED')
  INTO 
    v_c_requested, v_c_consulting, v_c_confirmed, v_c_shoot_completed, v_c_delivered, v_c_completed, v_c_cancelled
  FROM public.bookings b
  LEFT JOIN public.booking_status_history bsh ON bsh.booking_id = b.id
  WHERE b.created_at >= v_start AND b.created_at <= v_end;

  RETURN jsonb_build_object(
    'periodStart', v_start,
    'periodEnd', v_end,
    'totalCohort', v_total_cohort,
    'stages', jsonb_build_array(
      jsonb_build_object(
        'stage', 'CONSULTATION_REQUESTED',
        'label', 'Yêu Cầu Tư Vấn',
        'count', COALESCE(v_c_requested, v_total_cohort),
        'conversionRate', CASE WHEN v_total_cohort > 0 THEN 100.0 ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'CONSULTING',
        'label', 'Đang Tư Vấn',
        'count', COALESCE(v_c_consulting, 0),
        'conversionRate', CASE WHEN v_total_cohort > 0 THEN ROUND((v_c_consulting::NUMERIC / v_total_cohort) * 100, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'CONFIRMED',
        'label', 'Đã Xác Nhận Đặt Lịch',
        'count', COALESCE(v_c_confirmed, 0),
        'conversionRate', CASE WHEN v_total_cohort > 0 THEN ROUND((v_c_confirmed::NUMERIC / v_total_cohort) * 100, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'SHOOT_COMPLETED',
        'label', 'Đã Chụp Xong',
        'count', COALESCE(v_c_shoot_completed, 0),
        'conversionRate', CASE WHEN v_c_confirmed > 0 THEN ROUND((v_c_shoot_completed::NUMERIC / v_c_confirmed) * 100, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'DELIVERED',
        'label', 'Đã Trả Ảnh',
        'count', COALESCE(v_c_delivered, 0),
        'conversionRate', CASE WHEN v_c_confirmed > 0 THEN ROUND((v_c_delivered::NUMERIC / v_c_confirmed) * 100, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'COMPLETED',
        'label', 'Hoàn Thành Trọn Vẹn',
        'count', COALESCE(v_c_completed, 0),
        'conversionRate', CASE WHEN v_c_confirmed > 0 THEN ROUND((v_c_completed::NUMERIC / v_c_confirmed) * 100, 1) ELSE 0.0 END
      )
    ),
    'cancelledCount', v_c_cancelled,
    'consultationToConfirmedRate', CASE WHEN v_total_cohort > 0 THEN ROUND((v_c_confirmed::NUMERIC / v_total_cohort) * 100, 1) ELSE 0.0 END,
    'confirmedToCompletedRate', CASE WHEN v_c_confirmed > 0 THEN ROUND((v_c_completed::NUMERIC / v_c_confirmed) * 100, 1) ELSE 0.0 END
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 14. RPC: get_service_performance
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_service_performance(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_services JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());

  WITH service_stats AS (
    SELECT 
      s.id AS service_id,
      s.name AS service_name,
      COALESCE(COUNT(b.id), 0) AS requests_count,
      COALESCE(COUNT(b.id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0) AS confirmed_count,
      COALESCE(COUNT(b.id) FILTER (WHERE b.booking_status = 'COMPLETED'), 0) AS completed_count,
      COALESCE(SUM(b.total_amount) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')), 0) AS confirmed_booking_value,
      COALESCE(SUM(b.total_amount), 0) AS total_amount,
      CASE 
        WHEN COUNT(b.id) > 0 THEN 
          ROUND((COUNT(b.id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'))::NUMERIC / COUNT(b.id)) * 100, 1)
        ELSE 0.0 
      END AS conversion_rate
    FROM public.services s
    LEFT JOIN public.bookings b ON b.service_id = s.id AND b.created_at >= v_start AND b.created_at <= v_end
    GROUP BY s.id, s.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'serviceId', service_id,
      'serviceName', service_name,
      'requestsCount', requests_count,
      'confirmedCount', confirmed_count,
      'completedCount', completed_count,
      'confirmedBookingValue', confirmed_booking_value,
      'conversionRate', conversion_rate
    ) ORDER BY total_amount DESC
  ) INTO v_services
  FROM service_stats;

  RETURN COALESCE(v_services, '[]'::jsonb);
END;
$$;

-- ------------------------------------------------------------------------------
-- 15. RPC: get_concept_performance
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_concept_performance(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_concepts JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());

  WITH concept_stats AS (
    SELECT
      c.id AS concept_id,
      c.name AS concept_name,
      COUNT(bc.concept_id) AS times_selected,
      COUNT(bc.concept_id) FILTER (WHERE b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')) AS confirmed_bookings,
      COUNT(bc.concept_id) FILTER (WHERE b.booking_status = 'COMPLETED') AS completed_bookings
    FROM public.concepts c
    JOIN public.booking_concepts bc ON bc.concept_id = c.id
    JOIN public.bookings b ON b.id = bc.booking_id AND b.created_at >= v_start AND b.created_at <= v_end
    GROUP BY c.id, c.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'conceptId', concept_id,
      'conceptName', concept_name,
      'timesSelected', times_selected,
      'confirmedBookings', confirmed_bookings,
      'completedBookings', completed_bookings
    ) ORDER BY times_selected DESC
  ) INTO v_concepts
  FROM concept_stats;

  RETURN COALESCE(v_concepts, '[]'::jsonb);
END;
$$;

-- ------------------------------------------------------------------------------
-- 16. RPC: get_studio_utilization_metrics
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_studio_utilization_metrics(
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_days NUMERIC;
  v_studios JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  v_start := COALESCE(p_start_at, timezone('Asia/Ho_Chi_Minh', date_trunc('month', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')));
  v_end := COALESCE(p_end_at, now());
  v_days := GREATEST(1, EXTRACT(EPOCH FROM (v_end - v_start)) / 86400);

  WITH studio_stats AS (
    SELECT
      sr.id AS studio_id,
      sr.name AS studio_name,
      ROUND(COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_at - b.start_at)) / 3600), 0)::NUMERIC, 1) AS booked_hours,
      ROUND((v_days * 12)::NUMERIC, 1) AS operating_hours_total,
      ROUND(LEAST(100.0, (COALESCE(SUM(EXTRACT(EPOCH FROM (b.end_at - b.start_at)) / 3600), 0) / (v_days * 12)) * 100)::NUMERIC, 1) AS utilization_percent
    FROM public.studio_rooms sr
    LEFT JOIN public.bookings b ON b.studio_room_id = sr.id 
      AND b.start_at >= v_start AND b.start_at <= v_end
      AND b.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')
    GROUP BY sr.id, sr.name
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'studioId', studio_id,
      'studioName', studio_name,
      'bookedHours', booked_hours,
      'operatingHoursTotal', operating_hours_total,
      'utilizationPercent', utilization_percent
    ) ORDER BY utilization_percent DESC
  ) INTO v_studios
  FROM studio_stats;

  RETURN COALESCE(v_studios, '[]'::jsonb);
END;
$$;
