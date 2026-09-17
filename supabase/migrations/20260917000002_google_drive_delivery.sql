-- ==============================================================================
-- Maison MIPA Memories - Migration #20: Production Google Drive Customer Delivery
-- Migration: 20260917000002_google_drive_delivery.sql
-- Description:
--   - Creates public.booking_deliveries table for authoritative delivery lifecycle.
--   - Creates public.google_drive_integrations for server-side encrypted token storage.
--   - Creates public.google_drive_oauth_states for CSRF-protected OAuth state tokens.
--   - Adds database trigger on bookings to authoritatively create delivery intent on CONFIRMED.
--   - Implements strict RLS policies isolating customer files, staff upload access,
--     and management controls. Denies raw table SELECT to customer and normal staff.
--   - Provides helper RPCs for secure delivery queries and Resend notification outbox.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Table: public.google_drive_integrations (Server-side token & config storage)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_drive_integrations (
  id TEXT PRIMARY KEY DEFAULT 'primary',
  account_email TEXT,
  root_folder_id TEXT,
  refresh_token TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.google_drive_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only on google_drive_integrations" ON public.google_drive_integrations;
CREATE POLICY "Service role only on google_drive_integrations" ON public.google_drive_integrations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. Table: public.google_drive_oauth_states (CSRF protection)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.google_drive_oauth_states (
  state TEXT PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_gdrive_oauth_states_expires ON public.google_drive_oauth_states(expires_at);

ALTER TABLE public.google_drive_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin manages oauth states" ON public.google_drive_oauth_states;
CREATE POLICY "Admin manages oauth states" ON public.google_drive_oauth_states
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() = 'ADMIN' AND
    public.get_auth_user_status() = 'ACTIVE'
  )
  WITH CHECK (
    public.get_auth_role() = 'ADMIN' AND
    public.get_auth_user_status() = 'ACTIVE'
  );

DROP POLICY IF EXISTS "Service role manages oauth states" ON public.google_drive_oauth_states;
CREATE POLICY "Service role manages oauth states" ON public.google_drive_oauth_states
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. Table: public.booking_deliveries
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'GOOGLE_DRIVE',
  drive_folder_id TEXT,
  drive_folder_url TEXT,
  status TEXT NOT NULL DEFAULT 'NOT_CREATED' CHECK (status IN ('NOT_CREATED', 'CREATING', 'READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER', 'ERROR', 'REVOKED', 'NEEDS_RECONCILE')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_deliveries_booking_id ON public.booking_deliveries(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_status ON public.booking_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_booking_deliveries_folder_id ON public.booking_deliveries(drive_folder_id);

ALTER TABLE public.booking_deliveries ENABLE ROW LEVEL SECURITY;

-- Deny raw table access to customer & staff by default
DROP POLICY IF EXISTS "Management full access on booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Management full access on booking_deliveries" ON public.booking_deliveries
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  )
  WITH CHECK (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') AND
    public.get_auth_user_status() = 'ACTIVE'
  );

DROP POLICY IF EXISTS "Service role full access on booking_deliveries" ON public.booking_deliveries;
CREATE POLICY "Service role full access on booking_deliveries" ON public.booking_deliveries
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. Authoritative Intent Trigger on Bookings (CONFIRMED triggers Drive intent)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_booking_confirmed_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.booking_status IN ('CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED') THEN
    INSERT INTO public.booking_deliveries (
      booking_id,
      provider,
      status,
      created_by,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      'GOOGLE_DRIVE',
      'NOT_CREATED',
      auth.uid(),
      timezone('utc'::text, now()),
      timezone('utc'::text, now())
    )
    ON CONFLICT (booking_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_delivery_intent ON public.bookings;
CREATE TRIGGER trg_booking_delivery_intent
AFTER INSERT OR UPDATE OF booking_status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_confirmed_delivery();

-- ------------------------------------------------------------------------------
-- 5. Helper Function: Role-Safe Secure Delivery Reader
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

  -- 1. Management sees all operational fields
  IF v_caller_role IN ('MANAGER', 'ADMIN') OR public.is_root_owner() THEN
    RETURN to_jsonb(v_delivery);
  END IF;

  -- 2. Staff sees upload folder if assigned and ready for upload or higher
  IF v_caller_role = 'STAFF' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.booking_assignments
      WHERE booking_id = p_booking_id AND employee_id = v_caller_id
    ) INTO v_is_assigned;

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
    SELECT EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = p_booking_id AND customer_id = v_caller_id
    ) INTO v_is_customer;

    IF NOT v_is_customer THEN
      RAISE EXCEPTION 'Access Denied: Not your booking.' USING ERRCODE = '42501';
    END IF;

    IF v_delivery.status != 'READY_FOR_CUSTOMER' THEN
      RETURN jsonb_build_object(
        'id', v_delivery.id,
        'booking_id', v_delivery.booking_id,
        'status', v_delivery.status,
        'updated_at', v_delivery.updated_at
      );
    END IF;

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
GRANT EXECUTE ON FUNCTION public.get_booking_delivery_secure(UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 6. Locked Enqueue Function for Drive Delivery Ready
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
  v_delivery RECORD;
  v_outbox_id UUID;
  v_idempotency_key TEXT;
BEGIN
  SELECT * INTO v_delivery
  FROM public.booking_deliveries
  WHERE booking_id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking delivery record not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_delivery.status != 'READY_FOR_CUSTOMER' THEN
    RAISE EXCEPTION 'Cannot enqueue delivery notification: delivery status is % (must be READY_FOR_CUSTOMER).', v_delivery.status USING ERRCODE = '22023';
  END IF;

  SELECT b.id, b.booking_code, b.customer_id, b.service_id, b.package_id, b.start_at
  INTO v_booking
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.id, p.full_name, p.email, p.status
  INTO v_customer
  FROM public.profiles p
  WHERE p.id = v_booking.customer_id;

  IF NOT FOUND OR v_customer.email IS NULL OR v_customer.email = '' THEN
    RAISE EXCEPTION 'Customer email not available for delivery notification.' USING ERRCODE = '22023';
  END IF;

  IF v_customer.status IN ('SUSPENDED', 'DISABLED') THEN
    RAISE EXCEPTION 'Customer account is %; notification aborted.', v_customer.status USING ERRCODE = '22023';
  END IF;

  v_idempotency_key := 'drive-delivery-ready:' || p_booking_id::text;

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

REVOKE EXECUTE ON FUNCTION public.enqueue_drive_delivery_email(UUID, UUID) FROM authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.enqueue_drive_delivery_email(UUID, UUID) TO service_role;
