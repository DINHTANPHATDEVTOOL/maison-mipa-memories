-- ==============================================================================
-- Maison MIPA Memories - Migration: Fix CRM, BI, & Finance RPC Signatures
-- 1. Align get_crm_customers with 7-argument frontend signature
-- 2. Ensure booking_financial_transactions table, indexes, and RLS exist
-- 3. Ensure get_crm_dashboard_summary signature and permissions
-- 4. Reload PostgREST schema cache
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Financial Ledger Table: booking_financial_transactions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  customer_id UUID,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEPOSIT', 'FINAL_PAYMENT', 'ADDON_SETTLEMENT', 'REFUND', 'ADJUSTMENT')),
  direction TEXT NOT NULL CHECK (direction IN ('INFLOW', 'OUTFLOW')),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'BANK_TRANSFER' CHECK (payment_method IN ('BANK_TRANSFER', 'CASH', 'GATEWAY_PAYOS', 'POS')),
  reference_code TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  recorded_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_booking ON public.booking_financial_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_customer ON public.booking_financial_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_received_at ON public.booking_financial_transactions(received_at);
CREATE INDEX IF NOT EXISTS idx_fin_tx_type_dir ON public.booking_financial_transactions(transaction_type, direction);

ALTER TABLE public.booking_financial_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'booking_financial_transactions' 
    AND policyname = 'Manager and Admin manage financial transactions'
  ) THEN
    CREATE POLICY "Manager and Admin manage financial transactions" ON public.booking_financial_transactions
      FOR ALL TO authenticated
      USING (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner())
      WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR public.is_root_owner());
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. RPC: get_crm_customers (7 Parameters matching frontend crmService.ts)
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
        SUM(GREATEST(0, (COALESCE(subtotal, 0) - COALESCE(discount_total, 0)) - COALESCE(deposit_amount, 0))) FILTER (WHERE payment_status != 'FULL_PAID' AND booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')) AS outstanding_balance
      FROM public.bookings
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    ) c_stat ON c_stat.customer_id = p.id
    LEFT JOIN (
      SELECT 
        customer_id,
        COUNT(id) FILTER (WHERE status = 'PENDING' AND due_at < now()) AS overdue_count,
        COUNT(id) FILTER (WHERE status = 'PENDING' AND date_trunc('day', due_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = date_trunc('day', now() AT TIME ZONE 'Asia/Ho_Chi_Minh')) AS today_count
      FROM public.customer_crm_tasks
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
        'full_name', full_name,
        'email', email,
        'phone', phone,
        'account_status', account_status,
        'lifecycle_stage', lifecycle_stage,
        'first_seen_at', first_seen_at,
        'last_booked_at', last_booked_at,
        'total_bookings', total_bookings,
        'completed_bookings', completed_bookings,
        'total_spent', total_spent,
        'outstanding_balance', outstanding_balance,
        'overdue_tasks_count', overdue_tasks_count,
        'today_tasks_count', today_tasks_count
      )
    ), '[]'::jsonb)
  INTO v_total_count, v_customers
  FROM (
    SELECT *
    FROM filtered_customers
    ORDER BY last_booked_at DESC NULLS LAST
    LIMIT COALESCE(p_limit, 20)
    OFFSET GREATEST(0, COALESCE(p_offset, 0))
  ) paginated;

  RETURN jsonb_build_object(
    'total_count', COALESCE(v_total_count, 0),
    'customers', COALESCE(v_customers, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_customers(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_crm_customers(TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, INT) TO anon;

-- ------------------------------------------------------------------------------
-- 3. Reload PostgREST Schema Cache
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
