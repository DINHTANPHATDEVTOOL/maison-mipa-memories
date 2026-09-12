-- ==============================================================================
-- Maison MIPA Memories - Migration #17: Production Google Drive Customer Delivery
-- Migration: 20260912000001_booking_deliveries_google_drive.sql
-- Description:
--   - Creates public.booking_deliveries table for authoritative delivery lifecycle.
--   - Creates public.google_drive_oauth_states for CSRF-protected OAuth state tokens.
--   - Implements strict RLS policies isolating customer files, staff upload access,
--     and management controls.
--   - Provides helper RPCs for secure delivery queries and Resend notification outbox.
--   - Keeps bookings table compatibility columns in sync via trigger.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.booking_deliveries
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_CREATED' CHECK (status IN ('NOT_CREATED', 'CREATING', 'READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'ERROR', 'REVOKED')),
  customer_permission_id TEXT,
  share_email TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ready_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ready_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_reconciled_at TIMESTAMPTZ,
  last_error TEXT
);

-- Indexes for high performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_deliveries_booking_id ON public.booking_deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_status ON public.booking_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_folder_id ON public.booking_deliveries(drive_folder_id);

-- ------------------------------------------------------------------------------
-- 2. Table: public.google_drive_oauth_states (CSRF protection)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_drive_oauth_states (
  state TEXT PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gdrive_oauth_states_expires ON public.google_drive_oauth_states(expires_at);

-- ------------------------------------------------------------------------------
-- 3. Row Level Security (RLS) Policies
-- ------------------------------------------------------------------------------
ALTER TABLE public.booking_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_drive_oauth_states ENABLE ROW LEVEL SECURITY;

-- 3.1. Management full operational control
DROP POLICY IF EXISTS "Management full control on booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Management full control on booking_deliveries" ON public.booking_deliveries
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  )
  WITH CHECK (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  );

-- 3.2. Assigned staff read access (only when READY_FOR_UPLOAD or higher)
DROP POLICY IF EXISTS "Assigned staff read booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Assigned staff read booking_deliveries" ON public.booking_deliveries
  FOR SELECT TO authenticated
  USING (
    public.get_auth_role() = 'STAFF' AND
    public.get_auth_user_status() = 'ACTIVE' AND
    status IN ('READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'REVOKED') AND
    public.is_booking_assigned_to_staff(booking_id, auth.uid())
  );

-- 3.3. Customer read access (STRICT: ONLY own booking AND status = READY_FOR_CUSTOMER)
DROP POLICY IF EXISTS "Customer read own delivery when ready" ON public.booking_deliveries;
CREATE POLICY "Customer read own delivery when ready" ON public.booking_deliveries
  FOR SELECT TO authenticated
  USING (
    public.get_auth_role() = 'CUSTOMER' AND
    public.get_auth_user_status() = 'ACTIVE' AND
    status = 'READY_FOR_CUSTOMER' AND
    public.is_booking_customer(booking_id, auth.uid())
  );

-- 3.4. Service role full backend access
DROP POLICY IF EXISTS "Service role manages booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Service role manages booking_deliveries" ON public.booking_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- 3.5. OAuth states policies (Management + Service Role)
DROP POLICY IF EXISTS "Management manages oauth states" ON public.google_drive_oauth_states;
CREATE POLICY "Management manages oauth states" ON public.google_drive_oauth_states
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  )
  WITH CHECK (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  );

DROP POLICY IF EXISTS "Service role manages oauth states" ON public.google_drive_oauth_states;
CREATE POLICY "Service role manages oauth states" ON public.google_drive_oauth_states
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. Trigger: Sync booking_deliveries to bookings compatibility fields
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_booking_delivery_to_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET
    drive_folder_id = NEW.drive_folder_id,
    drive_folder_url = NEW.drive_folder_url,
    drive_ready_for_customer = (NEW.status = 'READY_FOR_CUSTOMER'),
    drive_shared_at = CASE
      WHEN NEW.status = 'READY_FOR_CUSTOMER' THEN COALESCE(NEW.ready_at, timezone('utc'::text, now()))
      ELSE drive_shared_at
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = NEW.booking_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_delivery ON public.booking_deliveries;
CREATE TRIGGER trg_sync_booking_delivery
AFTER INSERT OR UPDATE ON public.booking_deliveries
FOR EACH ROW
EXECUTE FUNCTION public.sync_booking_delivery_to_booking();

-- ------------------------------------------------------------------------------
-- 5. Helper Function: Secure Booking Delivery Reader
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_booking_delivery_secure(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_status TEXT;
  v_delivery RECORD;
  v_is_customer BOOLEAN := false;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 1. Management sees all fields
  IF v_caller_role IN ('MANAGER', 'ADMIN') THEN
    RETURN to_jsonb(v_delivery);
  END IF;

  -- 2. Staff sees upload folder if assigned and ready
  IF v_caller_role = 'STAFF' THEN
    v_is_assigned := public.is_booking_assigned_to_staff(p_booking_id, v_caller_id);
    IF NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
    END IF;

    IF v_delivery.status NOT IN ('READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'REVOKED') THEN
      RETURN jsonb_build_object(
        'id', v_delivery.id,
        'booking_id', v_delivery.booking_id,
        'status', v_delivery.status,
        'created_at', v_delivery.created_at,
        'updated_at', v_delivery.updated_at
      );
    END IF;

    -- Strip customer permission id from staff view
    RETURN jsonb_build_object(
      'id', v_delivery.id,
      'booking_id', v_delivery.booking_id,
      'provider', v_delivery.provider,
      'drive_folder_id', v_delivery.drive_folder_id,
      'drive_folder_url', v_delivery.drive_folder_url,
      'status', v_delivery.status,
      'ready_at', v_delivery.ready_at,
      'created_at', v_delivery.created_at,
      'updated_at', v_delivery.updated_at
    );
  END IF;

  -- 3. Customer view (ONLY own booking & ONLY when READY_FOR_CUSTOMER)
  IF v_caller_role = 'CUSTOMER' THEN
    v_is_customer := public.is_booking_customer(p_booking_id, v_caller_id);
    IF NOT v_is_customer THEN
      RAISE EXCEPTION 'Access Denied: Not your booking.' USING ERRCODE = '42501';
    END IF;

    IF v_delivery.status != 'READY_FOR_CUSTOMER' THEN
      -- Customer sees delivery status, but NEVER the drive URL or internal IDs
      RETURN jsonb_build_object(
        'id', v_delivery.id,
        'booking_id', v_delivery.booking_id,
        'status', v_delivery.status,
        'updated_at', v_delivery.updated_at
      );
    END IF;

    -- When READY_FOR_CUSTOMER, return customer-facing drive url, but mask permission id
    RETURN jsonb_build_object(
      'id', v_delivery.id,
      'booking_id', v_delivery.booking_id,
      'status', v_delivery.status,
      'drive_folder_url', v_delivery.drive_folder_url,
      'ready_at', v_delivery.ready_at
    );
  END IF;

  RAISE EXCEPTION 'Access Denied: Unrecognized role.' USING ERRCODE = '42501';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_booking_delivery_secure(UUID) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. Helper Function: Enqueue Notification Outbox for Drive Delivery Ready
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_drive_delivery_email(
  p_booking_id UUID,
  p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_customer RECORD;
  v_outbox_id UUID;
  v_idempotency_key TEXT;
BEGIN
  -- Load booking
  SELECT b.id, b.booking_code, b.customer_id, b.service_id, b.package_id, b.start_at
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Load customer
  SELECT p.id, p.full_name, p.email, p.status
  INTO v_customer
  FROM public.profiles p
  WHERE p.id = v_booking.customer_id;

  IF NOT FOUND OR v_customer.email IS NULL OR v_customer.email = '' THEN
    RAISE EXCEPTION 'Customer email not available for delivery notification.' USING ERRCODE = '22023';
  END IF;

  v_idempotency_key := 'drive-delivery-ready:' || p_booking_id;

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
    'DRIVE_DELIVERY_READY',
    v_customer.id,
    v_customer.email,
    'BOOKING',
    p_booking_id::text,
    'drive_delivery_ready',
    jsonb_build_object(
      'customerName', COALESCE(v_customer.full_name, 'Quý khách'),
      'bookingCode', v_booking.booking_code,
      'accountUrl', 'https://maisonmipa.io.vn/account',
      'readyAt', timezone('utc'::text, now())
    ),
    v_idempotency_key,
    'PENDING',
    timezone('utc'::text, now())
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_outbox_id;

  RETURN v_outbox_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_drive_delivery_email(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_drive_delivery_email(UUID, UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 7. Backfill existing completed bookings into booking_deliveries
-- ------------------------------------------------------------------------------
INSERT INTO public.booking_deliveries (
  booking_id,
  provider,
  drive_folder_id,
  drive_folder_url,
  status,
  ready_at,
  created_at,
  updated_at
)
SELECT
  b.id,
  'GOOGLE_DRIVE',
  b.drive_folder_id,
  b.drive_folder_url,
  CASE
    WHEN b.drive_ready_for_customer = true THEN 'READY_FOR_CUSTOMER'
    WHEN b.drive_folder_url IS NOT NULL AND b.drive_folder_url != '' THEN 'READY_FOR_UPLOAD'
    WHEN b.booking_status IN ('SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED') THEN 'NOT_CREATED'
    ELSE 'NOT_CREATED'
  END,
  b.drive_shared_at,
  COALESCE(b.created_at, timezone('utc'::text, now())),
  timezone('utc'::text, now())
FROM public.bookings b
WHERE NOT EXISTS (
  SELECT 1 FROM public.booking_deliveries bd WHERE bd.booking_id = b.id
)
ON CONFLICT (booking_id) DO NOTHING;
