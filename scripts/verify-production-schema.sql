-- ==============================================================================
-- Maison MIPA Memories - Production Database Schema Verification Script
-- Project Reference: dkvkhysnabhtbbuvommu
--
-- Instructions for Owner:
-- 1. Run `npx supabase db push` to apply all migrations.
-- 2. Open Supabase Dashboard -> SQL Editor (https://supabase.com/dashboard/project/dkvkhysnabhtbbuvommu/sql).
-- 3. Paste and RUN this script.
-- 4. Verify that ALL rows output 'PASS' in the status column.
-- ==============================================================================

WITH required_tables AS (
  SELECT unnest(ARRAY[
    'profiles',
    'services',
    'packages',
    'addons',
    'studio_rooms',
    'employees',
    'promotions',
    'bookings',
    'booking_addons',
    'booking_assignments',
    'audit_logs',
    'otp_challenges',
    'payments',
    'payment_settings',
    'notification_outbox',
    'staff_tasks',
    'concepts',
    'portfolio_collections',
    'portfolio_photos',
    'booking_concepts'
  ]::text[]) AS table_name
),
table_checks AS (
  SELECT
    'TABLE' AS check_type,
    rt.table_name AS item_name,
    CASE WHEN t.table_name IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE WHEN t.table_name IS NOT NULL
      THEN 'Table exists in schema public'
      ELSE 'MISSING TABLE! Run migrations 1..6'
    END AS details
  FROM required_tables rt
  LEFT JOIN information_schema.tables t
    ON t.table_schema = 'public' AND t.table_name = rt.table_name
),
rls_checks AS (
  SELECT
    'RLS' AS check_type,
    rt.table_name AS item_name,
    CASE WHEN c.relrowsecurity THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE WHEN c.relrowsecurity
      THEN 'Row Level Security is ENABLED'
      ELSE 'SECURITY RISK: RLS is disabled on table'
    END AS details
  FROM required_tables rt
  JOIN pg_catalog.pg_class c ON c.relname = rt.table_name
  JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
),
required_functions AS (
  SELECT unnest(ARRAY[
    'get_auth_role',
    'handle_new_user',
    'prevent_role_escalation',
    'get_auth_user_status',
    'get_auth_staff_role',
    'create_booking',
    'update_booking_status',
    'assign_booking_staff',
    'create_deposit_payment',
    'mark_transfer_submitted',
    'confirm_manual_payment',
    'admin_save_payment_settings',
    'admin_update_user_role_and_status',
    'publish_portfolio_collection',
    'enqueue_shoot_reminder'
  ]::text[]) AS function_name
),
function_checks AS (
  SELECT
    'RPC_FUNCTION' AS check_type,
    rf.function_name AS item_name,
    CASE WHEN p.proname IS NOT NULL THEN 'PASS' ELSE 'FAIL' END AS status,
    CASE WHEN p.proname IS NOT NULL
      THEN 'Function exists in public schema'
      ELSE 'MISSING RPC! Run migrations 1..6'
    END AS details
  FROM required_functions rf
  LEFT JOIN pg_catalog.pg_proc p
    ON p.proname = rf.function_name
    AND p.pronamespace = (SELECT oid FROM pg_catalog.pg_namespace WHERE nspname = 'public')
),
constraint_checks AS (
  SELECT
    'CONSTRAINT' AS check_type,
    'prevent_double_booking' AS item_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'prevent_double_booking'
    ) THEN 'PASS' ELSE 'FAIL' END AS status,
    'PostgreSQL exclusion constraint for anti-double-booking' AS details
  UNION ALL
  SELECT
    'SEQUENCE' AS check_type,
    'payos_order_code_seq' AS item_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'S' AND c.relname = 'payos_order_code_seq' AND n.nspname = 'public'
    ) THEN 'PASS' ELSE 'FAIL' END AS status,
    'Sequence for unique payOS integer orderCode' AS details
  UNION ALL
  SELECT
    'COLUMN' AS check_type,
    'payments.order_code' AS item_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'order_code'
    ) THEN 'PASS' ELSE 'FAIL' END AS status,
    'Unique integer order_code column for payOS tracking' AS details
  UNION ALL
  SELECT
    'EXTENSION' AS check_type,
    'btree_gist' AS item_name,
    CASE WHEN EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'
    ) THEN 'PASS' ELSE 'FAIL' END AS status,
    'Extension required for timestamp/room interval exclusion' AS details
)
SELECT * FROM table_checks
UNION ALL
SELECT * FROM rls_checks
UNION ALL
SELECT * FROM function_checks
UNION ALL
SELECT * FROM constraint_checks
ORDER BY check_type, item_name;
