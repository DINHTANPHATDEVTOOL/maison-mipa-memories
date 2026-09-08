-- ==============================================================================
-- Maison MIPA Memories - Booking Persistence, Catalog, Availability & Anti-Double-Booking Schema
-- Migration: 20260908000002_booking_persistence_schema.sql
-- Description: Establishes catalog, bookings, addons, assignments, exclusion constraints, and RPCs
-- ==============================================================================

-- 1. Enable btree_gist extension for interval overlap exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Catalog: Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  image TEXT,
  badge TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Catalog: Packages
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  deposit_amount BIGINT NOT NULL CHECK (deposit_amount >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  concepts_count INTEGER NOT NULL DEFAULT 1,
  edited_photos_count INTEGER NOT NULL DEFAULT 10,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommended BOOLEAN NOT NULL DEFAULT false,
  popular_tag TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_service_package_slug UNIQUE (service_id, slug)
);

-- 4. Catalog: Addons
CREATE TABLE IF NOT EXISTS public.addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price BIGINT NOT NULL CHECK (price >= 0),
  duration_minutes INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  category TEXT NOT NULL CHECK (category IN ('makeup', 'styling', 'time', 'concept', 'album', 'edit')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Catalog: Studio Rooms
CREATE TABLE IF NOT EXISTS public.studio_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  capacity INTEGER NOT NULL DEFAULT 6,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Employees (linked directly to profiles)
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role TEXT NOT NULL CHECK (staff_role IN ('PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST', 'MANAGER', 'ADMIN')),
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.0,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  shift_schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Promotions / Vouchers
CREATE TABLE IF NOT EXISTS public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount BIGINT NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  min_order BIGINT NOT NULL DEFAULT 0,
  max_discount BIGINT,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  usage_limit INTEGER NOT NULL DEFAULT 100,
  usage_count INTEGER NOT NULL DEFAULT 0,
  applicable_service_id UUID REFERENCES public.services(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Bookings Core Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.profiles(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  package_id UUID NOT NULL REFERENCES public.packages(id),
  studio_room_id UUID NOT NULL REFERENCES public.studio_rooms(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  booking_status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT' CHECK (booking_status IN (
    'DRAFT', 'PENDING_PAYMENT', 'DEPOSIT_PAID', 'CONFIRMED', 'CHECKED_IN',
    'SHOOTING', 'SHOOT_COMPLETED', 'EDITING', 'READY_FOR_REVIEW',
    'DELIVERED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'
  )),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN (
    'UNPAID', 'DEPOSIT_PAID', 'FULLY_PAID', 'REFUNDED'
  )),
  subtotal BIGINT NOT NULL CHECK (subtotal >= 0),
  addon_total BIGINT NOT NULL DEFAULT 0 CHECK (addon_total >= 0),
  discount_total BIGINT NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
  total_amount BIGINT NOT NULL CHECK (total_amount >= 0),
  deposit_amount BIGINT NOT NULL CHECK (deposit_amount >= 0),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  occasion TEXT,
  customer_note TEXT,
  staff_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_booking_duration CHECK (end_at > start_at)
);

-- Anti-Double-Booking Exclusion Constraint:
-- Enforces that no two non-cancelled bookings can overlap in the same studio room.
-- Half-open interval '[)' allows adjacent bookings (e.g. 10:00-11:00 and 11:00-12:00) without collision.
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS prevent_double_booking;

ALTER TABLE public.bookings
ADD CONSTRAINT prevent_double_booking
EXCLUDE USING gist (
  studio_room_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (booking_status NOT IN ('CANCELLED'));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_studio_time ON public.bookings(studio_room_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(booking_status);
CREATE INDEX IF NOT EXISTS idx_bookings_code ON public.bookings(booking_code);

-- 9. Booking Addons (Snapshot of addon pricing at time of booking)
CREATE TABLE IF NOT EXISTS public.booking_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.addons(id),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price BIGINT NOT NULL CHECK (unit_price >= 0),
  line_total BIGINT NOT NULL CHECK (line_total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_addons_booking ON public.booking_addons(booking_id);

-- 10. Booking Assignments (Staff assigned to shooting/makeup/edit)
CREATE TABLE IF NOT EXISTS public.booking_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.profiles(id),
  assignment_role TEXT NOT NULL CHECK (assignment_role IN (
    'PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST', 'MANAGER', 'ADMIN'
  )),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_booking_assignments_booking ON public.booking_assignments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_assignments_employee ON public.booking_assignments(employee_id);

-- 11. Audit Logs (Immutable append-only)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.profiles(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);

-- ==============================================================================
-- 12. Row Level Security (RLS) Configuration
-- ==============================================================================

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Catalog Policies: Public read for active catalog items
CREATE POLICY "Public read active services" ON public.services FOR SELECT USING (active = true);
CREATE POLICY "Public read active packages" ON public.packages FOR SELECT USING (active = true);
CREATE POLICY "Public read active addons" ON public.addons FOR SELECT USING (active = true);
CREATE POLICY "Public read active studios" ON public.studio_rooms FOR SELECT USING (active = true);
CREATE POLICY "Public read active promotions" ON public.promotions FOR SELECT USING (active = true);
CREATE POLICY "Public read active employees" ON public.employees FOR SELECT USING (active = true);

-- Catalog Management: Staff and management full access to catalog
CREATE POLICY "Management catalog services" ON public.services FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Management catalog packages" ON public.packages FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Management catalog addons" ON public.addons FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Management catalog studios" ON public.studio_rooms FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Management promotions" ON public.promotions FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Bookings Policies
-- CUSTOMER: can view own bookings
CREATE POLICY "Customers view own bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'));

-- CUSTOMER: can insert own booking
CREATE POLICY "Customers insert own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Only STAFF/MANAGER/ADMIN can update booking status & notes
CREATE POLICY "Staff and management update bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'));

-- Booking Addons Policies
CREATE POLICY "Users read own booking addons" ON public.booking_addons
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'))
    )
  );

CREATE POLICY "Insert booking addons with booking" ON public.booking_addons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (b.customer_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN'))
    )
  );

-- Booking Assignments Policies
CREATE POLICY "Staff and management read assignments" ON public.booking_assignments
  FOR SELECT TO authenticated
  USING (
    employee_id = auth.uid() OR
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') OR
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.customer_id = auth.uid())
  );

CREATE POLICY "Management manage assignments" ON public.booking_assignments
  FOR ALL TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Audit Logs Policies: Append-only
CREATE POLICY "Management view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

CREATE POLICY "Authenticated create audit logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ==============================================================================
-- 13. Stored Procedure / RPC: Transaction-Safe Authoritative Create Booking
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_booking(
  p_service_id UUID,
  p_package_id UUID,
  p_studio_room_id UUID,
  p_start_at TIMESTAMPTZ,
  p_addon_ids UUID[] DEFAULT '{}',
  p_voucher_code TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_occasion TEXT DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_customer_id UUID;
  v_caller_role TEXT;
  v_pkg RECORD;
  v_studio RECORD;
  v_service RECORD;
  v_total_duration INTEGER;
  v_end_at TIMESTAMPTZ;
  v_addon_record RECORD;
  v_addon_total BIGINT := 0;
  v_subtotal BIGINT := 0;
  v_discount_total BIGINT := 0;
  v_total_amount BIGINT := 0;
  v_deposit_amount BIGINT := 0;
  v_promo RECORD;
  v_booking_code TEXT;
  v_new_booking_id UUID;
  v_addon_id UUID;
  v_cust_name TEXT;
  v_cust_phone TEXT;
  v_cust_email TEXT;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required to create booking.' USING ERRCODE = '42501';
  END IF;

  v_customer_id := v_caller_id;
  v_caller_role := public.get_auth_role();

  -- 1. Validate Service
  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive service specified.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Validate Package & Service association
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND service_id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package specified for the selected service.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validate Studio Room
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = p_studio_room_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio room not found or currently inactive.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Calculate Duration & End Time
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_total_duration + v_addon_total::INTEGER;
    v_addon_total := 0; -- reset for price calculation
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- 5. Calculate Server-Authoritative Pricing (Single Source of Truth)
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;

  -- Validate Voucher if provided
  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) != '' THEN
    SELECT * INTO v_promo FROM public.promotions
    WHERE code = UPPER(trim(p_voucher_code)) AND active = true;

    IF FOUND THEN
      IF (v_promo.start_at IS NULL OR v_promo.start_at <= now()) AND
         (v_promo.end_at IS NULL OR v_promo.end_at >= now()) AND
         (v_promo.usage_limit > v_promo.usage_count) AND
         (v_subtotal >= v_promo.min_order) THEN
        
        IF v_promo.discount_percent > 0 THEN
          v_discount_total := ROUND(v_subtotal * (v_promo.discount_percent / 100.0));
        ELSIF v_promo.discount_amount > 0 THEN
          v_discount_total := v_promo.discount_amount;
        END IF;

        IF v_promo.max_discount IS NOT NULL AND v_discount_total > v_promo.max_discount THEN
          v_discount_total := v_promo.max_discount;
        END IF;

        -- Update usage count
        UPDATE public.promotions SET usage_count = usage_count + 1 WHERE id = v_promo.id;
      END IF;
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := COALESCE(v_pkg.deposit_amount, ROUND(v_total_amount * 0.3));

  -- 6. Customer details resolution
  SELECT 
    COALESCE(p_customer_name, full_name, 'Khách Hàng MIPA'),
    COALESCE(p_customer_phone, phone, ''),
    COALESCE(p_customer_email, email, '')
  INTO v_cust_name, v_cust_phone, v_cust_email
  FROM public.profiles
  WHERE id = v_customer_id;

  -- 7. Generate Collision-Resistant Unique Booking Code: MIPA-YYMMDD-XXXX
  v_booking_code := 'MIPA-' || to_char(p_start_at, 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 4));

  -- 8. Insert Booking with Anti-Double-Booking Exclusion Check
  -- If overlapping slot exists, prevent_double_booking raises 23P01 exclusion_violation
  BEGIN
    INSERT INTO public.bookings (
      booking_code,
      customer_id,
      service_id,
      package_id,
      studio_room_id,
      start_at,
      end_at,
      booking_status,
      payment_status,
      subtotal,
      addon_total,
      discount_total,
      total_amount,
      deposit_amount,
      customer_name,
      customer_phone,
      customer_email,
      occasion,
      customer_note
    )
    VALUES (
      v_booking_code,
      v_customer_id,
      p_service_id,
      p_package_id,
      p_studio_room_id,
      p_start_at,
      v_end_at,
      'PENDING_PAYMENT',
      'UNPAID',
      v_subtotal,
      v_addon_total,
      v_discount_total,
      v_total_amount,
      v_deposit_amount,
      v_cust_name,
      v_cust_phone,
      v_cust_email,
      p_occasion,
      p_customer_note
    )
    RETURNING id INTO v_new_booking_id;
  EXCEPTION
    WHEN exclusion_violation THEN
      RAISE EXCEPTION 'Studio room % is already booked for this time interval (% - %). Please select another slot.',
        v_studio.name, p_start_at, v_end_at USING ERRCODE = '23P01';
  END;

  -- 9. Insert Addons Snapshots
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    FOR v_addon_record IN
      SELECT id, price FROM public.addons WHERE id = ANY(p_addon_ids) AND active = true
    LOOP
      INSERT INTO public.booking_addons (
        booking_id,
        addon_id,
        quantity,
        unit_price,
        line_total
      )
      VALUES (
        v_new_booking_id,
        v_addon_record.id,
        1,
        v_addon_record.price,
        v_addon_record.price
      );
    END LOOP;
  END IF;

  -- 10. Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_caller_id,
    'BOOKING',
    v_new_booking_id::text,
    'CREATE_BOOKING',
    jsonb_build_object(
      'booking_code', v_booking_code,
      'total_amount', v_total_amount,
      'start_at', p_start_at,
      'end_at', v_end_at
    )
  );

  -- Return created booking info
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
    'created_at', b.created_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 14. Stored Procedure: Update Booking Status with State Machine & Audit
-- ==============================================================================
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
  v_old_status TEXT;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := public.get_auth_role();

  IF v_caller_role NOT IN ('STAFF', 'MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only staff or management can update booking status.' USING ERRCODE = '42501';
  END IF;

  SELECT booking_status INTO v_old_status FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Validate forbidden state transitions (e.g., Cannot revert COMPLETED to DRAFT)
  IF v_old_status = 'COMPLETED' AND p_new_status IN ('DRAFT', 'PENDING_PAYMENT') THEN
    RAISE EXCEPTION 'Illegal state transition from COMPLETED to %', p_new_status USING ERRCODE = '22023';
  END IF;

  IF v_old_status = 'CANCELLED' AND p_new_status != 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot update a cancelled booking.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET 
    booking_status = p_new_status,
    staff_note = CASE 
      WHEN p_staff_note IS NOT NULL THEN COALESCE(staff_note || E'\n', '') || '[' || to_char(now(), 'YYYY-MM-DD HH24:MI') || ']: ' || p_staff_note
      ELSE staff_note
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Audit log
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
    jsonb_build_object('status', v_old_status),
    jsonb_build_object('status', p_new_status, 'note', p_staff_note)
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 15. Stored Procedure: Assign Staff with Audit
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.assign_booking_staff(
  p_booking_id UUID,
  p_employee_id UUID,
  p_assignment_role TEXT,
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
  v_booking RECORD;
  v_emp RECORD;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_new_assignment_id UUID;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only managers and administrators can assign staff.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_emp FROM public.profiles WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee profile not found.' USING ERRCODE = 'P0002';
  END IF;

  v_start := COALESCE(p_start_at, v_booking.start_at);
  v_end := COALESCE(p_end_at, v_booking.end_at);

  -- Remove prior assignment for the same role on this booking to prevent duplicate assignment
  DELETE FROM public.booking_assignments
  WHERE booking_id = p_booking_id AND assignment_role = p_assignment_role;

  INSERT INTO public.booking_assignments (
    booking_id,
    employee_id,
    assignment_role,
    start_at,
    end_at
  )
  VALUES (
    p_booking_id,
    p_employee_id,
    p_assignment_role,
    v_start,
    v_end
  )
  RETURNING id INTO v_new_assignment_id;

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
    'BOOKING_ASSIGNMENT',
    v_new_assignment_id::text,
    'ASSIGN_STAFF',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'employee_id', p_employee_id,
      'role', p_assignment_role
    )
  );

  RETURN jsonb_build_object(
    'id', v_new_assignment_id,
    'booking_id', p_booking_id,
    'employee_id', p_employee_id,
    'assignment_role', p_assignment_role,
    'start_at', v_start,
    'end_at', v_end
  );
END;
$$;

-- ==============================================================================
-- 16. Reproducible Catalog Initial Seed Data
-- ==============================================================================

-- Services
INSERT INTO public.services (id, slug, name, description, icon, image, badge, display_order)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'couple', 'Couple Photography', 'Lưu giữ khoảnh khắc ngọt ngào, ấm áp & tự nhiên của hai bạn trong không gian studio thơ mộng.', 'Heart', 'https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?auto=format&fit=crop&w=800&q=80', 'Yêu thích nhất', 1),
  ('c0000000-0000-0000-0000-000000000002', 'wedding', 'Pre-Wedding & Studio Wedding', 'Bộ ảnh cưới tinh tế, sang trọng mang phong cách Châu Âu lãng mạn & cổ điển.', 'Sparkles', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', 'Premium', 2),
  ('c0000000-0000-0000-0000-000000000003', 'family', 'Family & Generational', 'Kỷ niệm gia đình ấm áp, lưu giữ nụ cười và sự gắn kết qua từng thế hệ.', 'Users', 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80', NULL, 3),
  ('c0000000-0000-0000-0000-000000000004', 'baby', 'Baby & Newborn Memories', 'Ghi lại những bước chân đầu đời, thiên thần nhỏ với đạo cụ & trang phục an toàn.', 'Smile', 'https://images.unsplash.com/photo-1544126592-807ade215a0c?auto=format&fit=crop&w=800&q=80', NULL, 4),
  ('c0000000-0000-0000-0000-000000000005', 'portrait', 'Personal Portrait & Concept', 'Chân dung nghệ thuật cá nhân, tôn vinh nét đẹp & thần thái độc bản của riêng bạn.', 'Camera', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', NULL, 5),
  ('c0000000-0000-0000-0000-000000000006', 'birthday', 'Birthday & Event Celebration', 'Khung hình sinh nhật lung linh với bóng bay, bánh kem và phông nền trang trí độc quyền.', 'Gift', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80', NULL, 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  badge = EXCLUDED.badge;

-- Packages (seeded under Couple service c0000000-0000-0000-0000-000000000001)
INSERT INTO public.packages (id, service_id, slug, name, description, price, deposit_amount, duration_minutes, concepts_count, edited_photos_count, features, recommended, popular_tag, display_order)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'pkg_basic', 'MIPA BASIC', 'Gói chụp cơ bản cho cặp đôi lưu giữ cảm xúc ban đầu', 1290000, 387000, 60, 1, 10, '["60 phút chụp hình tận tâm", "1 Concept trang trí Studio tùy chọn", "10 Ảnh chỉnh sửa mịn da & tone màu pastel", "Tặng toàn bộ file ảnh gốc chất lượng cao", "1 Photographer chuyên nghiệp hỗ trợ pose dáng", "Trang phục 1 bộ tự chọn tại Studio"]'::jsonb, false, NULL, 1),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'pkg_signature', 'MIPA SIGNATURE', 'Gói chụp signature bao gồm makeup chuyên nghiệp & 2 concept cao cấp', 2490000, 747000, 120, 2, 20, '["120 phút chụp thoải mái không vội vã", "2 Concept độc quyền cao cấp", "Bao gồm Gói Trang điểm & Làm tóc chuyên nghiệp", "20 Ảnh chỉnh sửa hậu kỳ kĩ lưỡng", "Tặng 01 Khung ảnh để bàn gỗ cao cấp 15x21cm", "Tặng toàn bộ file ảnh gốc full HD", "Trang phục 2 bộ tự chọn"]'::jsonb, true, 'Được đặt nhiều nhất', 2),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'pkg_premium', 'MIPA PREMIUM LUXURY', 'Trải nghiệm chụp ảnh đẳng cấp với 3 concept và album photobook cao cấp', 3990000, 1197000, 180, 3, 30, '["180 phút trọn vẹn trong phòng Studio riêng", "3 Concept sang trọng tự do sáng tạo", "Trang điểm + Đổi 2 kiểu tóc theo concept", "30 Ảnh chỉnh sửa hiệu ứng điện ảnh đặc biệt", "01 Album photobook mở phẳng cao cấp (20x30cm)", "Tặng video ngắn Slideshow kỷ niệm 4K", "Hỗ trợ toàn bộ hoa tươi & đạo cụ thiết kế riêng"]'::jsonb, false, 'VIP Experience', 3)
ON CONFLICT (service_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  deposit_amount = EXCLUDED.deposit_amount,
  duration_minutes = EXCLUDED.duration_minutes,
  features = EXCLUDED.features;

-- Addons
INSERT INTO public.addons (id, slug, name, description, price, duration_minutes, category)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'add_makeup', 'Trang điểm & Làm tóc chuyên nghiệp', 'Chuyên viên Makeup theo phong cách Hàn Quốc/Châu Âu mỏng nhẹ, tôn nét đẹp tự nhiên.', 400000, 30, 'makeup'),
  ('e0000000-0000-0000-0000-000000000002', 'add_hair', 'Đổi kiểu tóc phụ (Hair Styling)', 'Thay đổi kiểu tóc tương ứng với concept thứ 2 hoặc 3.', 200000, 15, 'styling'),
  ('e0000000-0000-0000-0000-000000000003', 'add_concept', 'Thêm 01 Concept trang trí studio', 'Tăng thêm 1 bối cảnh & ánh sáng nghệ thuật khác biệt.', 300000, 30, 'concept'),
  ('e0000000-0000-0000-0000-000000000004', 'add_time', 'Thêm 30 phút chụp bổ sung', 'Dành nhiều thời gian hơn để bắt trọn từng cảm xúc thả lỏng.', 250000, 30, 'time'),
  ('e0000000-0000-0000-0000-000000000005', 'add_album', 'In Album PhotoBook cao cấp (20x20cm)', 'Mặt ảnh ép lụa chống nước, bìa da tinh tế dập nổi logo Maison MIPA.', 500000, 0, 'album'),
  ('e0000000-0000-0000-0000-000000000006', 'add_express', 'Dịch vụ Chỉnh ảnh hỏa tốc (24h)', 'Ưu tiên chỉnh sửa hoàn thành trong 24 giờ sau buổi chụp.', 350000, 0, 'edit')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  duration_minutes = EXCLUDED.duration_minutes;

-- Studio Rooms
INSERT INTO public.studio_rooms (id, slug, code, name, description, image, capacity)
VALUES
  ('f0000000-0000-0000-0000-000000000001', 'room_01', 'ROOM_01', 'Maison Room 01 (Warm French)', 'Phòng chụp chủ đạo tone vàng kem, rèm lụa bồng bềnh, kiến trúc vòm cửa Pháp cổ kính & sofa nhung.', '/studio.png', 6),
  ('f0000000-0000-0000-0000-000000000002', 'room_02', 'ROOM_02', 'Maison Room 02 (Vintage Loft)', 'Không gian gạch mộc, ánh sáng tự nhiên rực rỡ, tông nâu trầm ấm thích hợp ảnh Concept & Vintage.', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80', 5),
  ('f0000000-0000-0000-0000-000000000003', 'garden', 'GARDEN', 'Outdoor Maison Garden', 'Khu sân vườn rợp cây xanh, cỏ lau tự nhiên & góc tiệc trà chiều lãng mạn ngoài trời.', 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', 10)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image = EXCLUDED.image,
  capacity = EXCLUDED.capacity;

-- Promotions
INSERT INTO public.promotions (code, discount_percent, min_order, usage_limit)
VALUES
  ('MIPA20', 20.00, 1000000, 500),
  ('SUMMERMEMORY', 10.00, 500000, 1000)
ON CONFLICT (code) DO UPDATE SET
  discount_percent = EXCLUDED.discount_percent,
  min_order = EXCLUDED.min_order;
