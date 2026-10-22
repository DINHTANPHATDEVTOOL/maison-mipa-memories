-- ==============================================================================
-- Migration: 20261022000001_remediation_core_crm_financial_rpc_fixes.sql
-- Description: QA Remediation for MM-BUG-001, MM-BUG-002, MM-BUG-003, and MM-BUG-007
--   1. Fix MM-BUG-002: Harmonize booking_financial_transactions direction check constraint
--   2. Fix MM-BUG-007: Allow 'PASSWORD_RESET' purpose in otp_challenges
--   3. Fix MM-BUG-003: Ensure all CRM & task tables exist with full RLS and indexes
--   4. Fix MM-BUG-001: Correct confirm_booking_deposit RPC notification_outbox column contracts
--   5. Fix MM-BUG-003: Hardened get_crm_customers RPC with defensive joins and aggregates
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. FIX MM-BUG-002: booking_financial_transactions direction constraint
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_financial_transactions') THEN
    ALTER TABLE public.booking_financial_transactions 
      DROP CONSTRAINT IF EXISTS booking_financial_transactions_direction_check;

    ALTER TABLE public.booking_financial_transactions 
      ADD CONSTRAINT booking_financial_transactions_direction_check 
      CHECK (direction IN ('IN', 'OUT', 'INFLOW', 'OUTFLOW'));
  END IF;
END $$;

ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- ------------------------------------------------------------------------------
-- 2. FIX MM-BUG-007: otp_challenges purpose constraint
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'otp_challenges') THEN
    ALTER TABLE public.otp_challenges 
      DROP CONSTRAINT IF EXISTS otp_challenges_purpose_check;

    ALTER TABLE public.otp_challenges 
      ADD CONSTRAINT otp_challenges_purpose_check 
      CHECK (purpose IN ('LOGIN', 'REGISTER', 'VERIFY_PHONE', 'SENSITIVE_ACTION', 'PASSWORD_RESET'));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. FIX MM-BUG-003: Idempotent CRM Schema Definitions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_crm_profiles (
  customer_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  lifecycle_stage TEXT NOT NULL DEFAULT 'NEW' CHECK (lifecycle_stage IN ('NEW', 'LEAD', 'CONSULTATION', 'BOOKED', 'SHOOTING', 'EDITING', 'DELIVERED', 'COMPLETED', 'RETURNING', 'VIP', 'INACTIVE')),
  crm_owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acquisition_source TEXT DEFAULT 'WEBSITE',
  first_contact_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  last_contact_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  next_follow_up_at TIMESTAMPTZ,
  internal_summary TEXT,
  preferred_contact_method TEXT DEFAULT 'ZALO',
  customer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.crm_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#D4AF37',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.crm_customer_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.crm_tags(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(customer_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('NOTE', 'CALL', 'ZALO_MESSAGE', 'EMAIL', 'IN_PERSON_CONSULTATION', 'SYSTEM_EVENT')),
  channel TEXT NOT NULL DEFAULT 'ZALO' CHECK (channel IN ('PHONE', 'ZALO', 'FACEBOOK', 'EMAIL', 'ATELIER', 'SYSTEM')),
  subject TEXT,
  content TEXT NOT NULL,
  sentiment TEXT DEFAULT 'NEUTRAL' CHECK (sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'CONCERNED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.crm_follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.booking_status_history ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.booking_status_history ADD COLUMN IF NOT EXISTS actor_role TEXT;
ALTER TABLE public.booking_status_history ADD COLUMN IF NOT EXISTS changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.booking_status_history ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.booking_status_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Indexes for CRM tables
CREATE INDEX IF NOT EXISTS idx_crm_profiles_lifecycle ON public.customer_crm_profiles(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_customer ON public.crm_follow_up_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status_due ON public.crm_follow_up_tasks(status, due_at);
CREATE INDEX IF NOT EXISTS idx_crm_interactions_customer ON public.crm_interactions(customer_id);

-- Enable RLS
ALTER TABLE public.customer_crm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DO $$
BEGIN
  -- Staff/Manager CRM policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customer_crm_profiles' AND policyname = 'Staff manage CRM profiles') THEN
    CREATE POLICY "Staff manage CRM profiles" ON public.customer_crm_profiles
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_tags' AND policyname = 'Everyone reads tags') THEN
    CREATE POLICY "Everyone reads tags" ON public.crm_tags
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_customer_tags' AND policyname = 'Staff manage customer tags') THEN
    CREATE POLICY "Staff manage customer tags" ON public.crm_customer_tags
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_interactions' AND policyname = 'Staff manage interactions') THEN
    CREATE POLICY "Staff manage interactions" ON public.crm_interactions
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'crm_follow_up_tasks' AND policyname = 'Staff manage tasks') THEN
    CREATE POLICY "Staff manage tasks" ON public.crm_follow_up_tasks
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN')));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'booking_status_history' AND policyname = 'Staff manage status history') THEN
    CREATE POLICY "Staff manage status history" ON public.booking_status_history
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('STAFF', 'MANAGER', 'ADMIN')));
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. FIX MM-BUG-001: Correct confirm_booking_deposit RPC
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.confirm_booking_deposit(UUID, NUMERIC, TEXT, NUMERIC);

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
  v_booking RECORD;
  v_total_amount NUMERIC;
  v_pkg RECORD;
  v_service RECORD;
  v_studio RECORD;
  v_customer RECORD;
  v_concept_names TEXT[];
  v_addon_names TEXT[];
  v_idempotency_key TEXT;
BEGIN
  -- 1. Security check: Caller must be authenticated MANAGER or ADMIN, or root owner
  v_caller_id := auth.uid();
  v_caller_role := public.get_auth_role();

  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can confirm booking deposit.' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate input parameters
  IF p_booking_id IS NULL THEN
    RAISE EXCEPTION 'Booking ID cannot be null.' USING ERRCODE = '22023';
  END IF;

  IF p_deposit_amount IS NULL OR p_deposit_amount < 0 THEN
    RAISE EXCEPTION 'Deposit amount must be greater than or equal to zero.' USING ERRCODE = '22023';
  END IF;

  -- 3. Load target booking with strict FOR UPDATE row lock to serialize concurrent mutations
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking with ID % not found.', p_booking_id USING ERRCODE = 'P0002';
  END IF;

  -- 4. Check status transition: Allowed from consultation stages or already confirmed
  IF v_booking.booking_status NOT IN ('CONSULTATION_REQUESTED', 'CONSULTING', 'CONFIRMED', 'AWAITING_PAYMENT') THEN
    RAISE EXCEPTION 'Invalid status transition: Cannot confirm deposit for booking in status %.', v_booking.booking_status
      USING ERRCODE = '22000';
  END IF;

  -- 5. Calculate or accept overridden final total amount
  IF p_final_total IS NOT NULL AND p_final_total > 0 THEN
    v_total_amount := p_final_total;
  ELSE
    v_total_amount := COALESCE(v_booking.total_amount, v_booking.subtotal, 0);
  END IF;

  IF p_deposit_amount > v_total_amount THEN
    RAISE EXCEPTION 'Deposit amount (%) cannot exceed final total booking amount (%).', p_deposit_amount, v_total_amount
      USING ERRCODE = '22023';
  END IF;

  -- 6. Atomically update booking record
  UPDATE public.bookings
  SET booking_status = 'CONFIRMED',
      payment_status = CASE 
        WHEN p_deposit_amount >= v_total_amount THEN 'FULLY_PAID'
        WHEN p_deposit_amount > 0 THEN 'DEPOSIT_PAID'
        ELSE COALESCE(v_booking.payment_status, 'UNPAID')
      END,
      deposit_amount = p_deposit_amount,
      deposit_confirmed_at = timezone('utc'::text, now()),
      deposit_confirmed_by = v_caller_id,
      deposit_note = COALESCE(p_deposit_note, v_booking.deposit_note),
      total_amount = v_total_amount,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- 7. Status transition history is automatically captured by trg_bookings_status_history trigger

  -- 8. Transactionally write DEPOSIT transaction to internal financial ledger
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

  -- 9. Update or create customer CRM profile lifecycle stage
  INSERT INTO public.customer_crm_profiles (customer_id, lifecycle_stage, last_contact_at, updated_at)
  VALUES (v_booking.customer_id, 'BOOKED', timezone('utc'::text, now()), timezone('utc'::text, now()))
  ON CONFLICT (customer_id) DO UPDATE
    SET lifecycle_stage = CASE 
          WHEN customer_crm_profiles.lifecycle_stage = 'RETURNING' THEN 'RETURNING' 
          ELSE 'BOOKED' 
        END,
        last_contact_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now());

  -- 10. Write Audit Log
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

  -- 11. Load Associated Entities for Notification Outbox
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

  -- 12. Correct Notification Outbox Insert (Exact column mapping matching notification_outbox table)
  IF v_booking.customer_email IS NOT NULL AND v_booking.customer_email != '' THEN
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
    ) VALUES (
      'BOOKING_CONFIRMED',
      v_booking.customer_id,
      v_booking.customer_email,
      'BOOKING',
      p_booking_id::text,
      'booking_confirmed',
      jsonb_build_object(
        'booking_id', p_booking_id,
        'booking_code', v_booking.booking_code,
        'customer_name', COALESCE(v_booking.customer_name, v_customer.full_name, 'Quý khách'),
        'customer_email', v_booking.customer_email,
        'customer_phone', v_booking.customer_phone,
        'service_name', COALESCE(v_service.name, 'Dịch Vụ Studio'),
        'package_name', COALESCE(v_pkg.name, 'Gói Chụp Maison MIPA'),
        'studio_room_name', COALESCE(v_studio.name, 'Phòng Studio Atelier'),
        'concept_names', COALESCE(v_concept_names, '{}'::text[]),
        'addon_names', COALESCE(v_addon_names, '{}'::text[]),
        'booking_date', v_booking.start_at::date,
        'start_at', v_booking.start_at,
        'end_at', v_booking.end_at,
        'deposit_amount', p_deposit_amount,
        'total_amount', v_total_amount,
        'deposit_note', p_deposit_note
      ),
      v_idempotency_key,
      'PENDING',
      timezone('utc'::text, now())
    ) ON CONFLICT (idempotency_key) DO UPDATE
      SET payload = EXCLUDED.payload,
          status = 'PENDING';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'bookingId', p_booking_id,
    'bookingStatus', 'CONFIRMED',
    'depositAmount', p_deposit_amount,
    'totalAmount', v_total_amount,
    'message', 'Đã xác nhận đặt cọc và chốt lịch chụp thành công.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_booking_deposit(UUID, NUMERIC, TEXT, NUMERIC) TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. FIX MM-BUG-003: Defensive get_crm_customers RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_crm_customers(
  p_search TEXT DEFAULT NULL,
  p_lifecycle TEXT DEFAULT NULL,
  p_tag_slug TEXT DEFAULT NULL,
  p_repeat_only BOOLEAN DEFAULT FALSE,
  p_overdue_only BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_total_count INT;
  v_customers JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Manager or Admin role required.' USING ERRCODE = '42501';
  END IF;

  WITH customer_base AS (
    SELECT 
      p.id AS customer_id,
      p.full_name,
      p.email,
      p.phone,
      p.status AS account_status,
      COALESCE(c_stat.first_booked_at, p.created_at) AS first_seen_at,
      c_stat.last_booked_at,
      COALESCE(c_stat.total_bookings, 0) AS total_bookings,
      COALESCE(c_stat.confirmed_bookings, 0) AS confirmed_bookings,
      COALESCE(c_stat.completed_bookings, 0) AS completed_bookings,
      COALESCE(c_stat.total_spent, 0.0) AS total_spent,
      COALESCE(c_stat.outstanding_balance, 0.0) AS outstanding_balance,
      CASE 
        WHEN COALESCE(c_stat.completed_bookings, 0) >= 2 THEN 'VIP_REPEAT'
        WHEN COALESCE(c_stat.completed_bookings, 0) = 1 THEN 'ACTIVE_POST_SHOOT'
        WHEN COALESCE(c_stat.confirmed_bookings, 0) >= 1 THEN 'BOOKED_UPCOMING'
        WHEN COALESCE(c_stat.total_bookings, 0) >= 1 THEN 'LEAD_CONSULTING'
        ELSE 'NEW_INQUIRY'
      END AS lifecycle_stage,
      COALESCE(c_tasks.overdue_count, 0) AS overdue_tasks_count,
      COALESCE(c_tasks.today_count, 0) AS today_tasks_count
    FROM public.profiles p
    LEFT JOIN (
      SELECT 
        customer_id,
        MIN(created_at) AS first_booked_at,
        MAX(created_at) AS last_booked_at,
        COUNT(id) AS total_bookings,
        COUNT(id) FILTER (WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')) AS confirmed_bookings,
        COUNT(id) FILTER (WHERE booking_status IN ('DELIVERED', 'COMPLETED')) AS completed_bookings,
        SUM(COALESCE(subtotal, 0) - COALESCE(discount_total, 0)) FILTER (WHERE booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')) AS total_spent,
        SUM(GREATEST(0, (COALESCE(subtotal, 0) - COALESCE(discount_total, 0)) - COALESCE(deposit_amount, 0))) FILTER (WHERE payment_status != 'FULLY_PAID' AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')) AS outstanding_balance
      FROM public.bookings
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    ) c_stat ON c_stat.customer_id = p.id
    LEFT JOIN (
      SELECT 
        customer_id,
        COUNT(id) FILTER (WHERE status IN ('TODO', 'IN_PROGRESS') AND due_at < now()) AS overdue_count,
        COUNT(id) FILTER (WHERE status IN ('TODO', 'IN_PROGRESS') AND date_trunc('day', due_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) AS today_count
      FROM public.crm_follow_up_tasks
      GROUP BY customer_id
    ) c_tasks ON c_tasks.customer_id = p.id
    WHERE p.role = 'CUSTOMER'
      AND (p_search IS NULL OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%' OR p.phone ILIKE '%' || p_search || '%')
      AND (NOT COALESCE(p_repeat_only, FALSE) OR COALESCE(c_stat.completed_bookings, 0) >= 2)
      AND (NOT COALESCE(p_overdue_only, FALSE) OR COALESCE(c_tasks.overdue_count, 0) > 0)
  ),
  filtered_customers AS (
    SELECT *
    FROM customer_base
    WHERE (p_lifecycle IS NULL OR lifecycle_stage = p_lifecycle)
  )
  SELECT 
    COUNT(*),
    COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', customer_id,
        'fullName', full_name,
        'email', email,
        'phone', phone,
        'accountStatus', account_status,
        'lifecycleStage', lifecycle_stage,
        'firstSeenAt', first_seen_at,
        'lastBookingAt', last_booked_at,
        'totalBookings', total_bookings,
        'confirmedBookings', confirmed_bookings,
        'completedBookings', completed_bookings,
        'totalSpent', total_spent,
        'actualCashReceived', total_spent - outstanding_balance,
        'outstandingBalance', outstanding_balance,
        'overdueTasksCount', overdue_tasks_count,
        'todayTasksCount', today_tasks_count,
        'tags', '[]'::jsonb
      )
      ORDER BY last_booked_at DESC NULLS LAST, customer_id DESC
    ), '[]'::jsonb)
  INTO v_total_count, v_customers
  FROM (
    SELECT * FROM filtered_customers
    ORDER BY last_booked_at DESC NULLS LAST, customer_id DESC
    LIMIT COALESCE(p_limit, 20)
    OFFSET COALESCE(p_offset, 0)
  ) limited;

  RETURN jsonb_build_object(
    'totalCount', COALESCE(v_total_count, 0),
    'customers', COALESCE(v_customers, '[]'::jsonb),
    'page', (COALESCE(p_offset, 0) / GREATEST(COALESCE(p_limit, 20), 1)) + 1,
    'pageSize', COALESCE(p_limit, 20)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_customers(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_customers(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, INT) TO anon;
