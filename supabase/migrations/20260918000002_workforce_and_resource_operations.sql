-- ==============================================================================
-- MAISON MIPA MEMORIES - STUDIO OPERATIONS V2 FORWARD MIGRATION
-- Workforce Scheduling + Staff Availability + Leave + Booking Crew Planner
-- Equipment / Prop Inventory + Resource Reservation + Maintenance + Operations Calendar
-- ==============================================================================

-- 1. EXTEND EXISTING TABLES
-- ------------------------------------------------------------------------------

-- Extend employees with working hours and operational notes
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS default_working_hours JSONB DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- Extend bookings with production due dates and readiness indicators
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS editing_due_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_due_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS crew_status TEXT DEFAULT 'CREW_INCOMPLETE' CHECK (crew_status IN ('CREW_READY', 'CREW_INCOMPLETE', 'CREW_CONFLICT')),
ADD COLUMN IF NOT EXISTS resource_status TEXT DEFAULT 'RESOURCE_INCOMPLETE' CHECK (resource_status IN ('RESOURCE_READY', 'RESOURCE_INCOMPLETE', 'RESOURCE_CONFLICT'));


-- 2. WORKFORCE SCHEDULING & SKILLS
-- ------------------------------------------------------------------------------

-- Staff Skills Catalog
CREATE TABLE IF NOT EXISTS public.staff_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- PHOTOGRAPHY, MAKEUP, EDITING, LIGHTING, STYLING
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Employee Skill Mapping
CREATE TABLE IF NOT EXISTS public.employee_skills (
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.staff_skills(id) ON DELETE CASCADE,
  proficiency_level TEXT DEFAULT 'STANDARD' CHECK (proficiency_level IN ('BASIC', 'STANDARD', 'EXPERT')),
  certified_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (employee_id, skill_id)
);

-- Staff Weekly Working Hours Schedule (Asia/Ho_Chi_Minh)
-- Day of week: 1 = Monday, ..., 7 = Sunday
CREATE TABLE IF NOT EXISTS public.staff_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_day_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_shift_times CHECK (is_day_off = true OR end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_staff_working_hours_emp_day ON public.staff_working_hours(employee_id, day_of_week);

-- Staff Leave Requests
CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'PERSONAL', 'UNPAID', 'OTHER')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  manager_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_leave_range CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_emp_range ON public.staff_leave_requests(employee_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_staff_leave_status ON public.staff_leave_requests(status);

-- Staff Shifts (Ad-hoc scheduling overriding default hours)
CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  studio_room_id UUID REFERENCES public.studio_rooms(id),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  shift_type TEXT NOT NULL DEFAULT 'REGULAR' CHECK (shift_type IN ('REGULAR', 'OVERTIME', 'ON_CALL', 'EVENT')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_shift_range CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_staff_shifts_emp_time ON public.staff_shifts(employee_id, start_at, end_at);

-- Booking Crew Requirements Templates (Per service/package)
CREATE TABLE IF NOT EXISTS public.booking_crew_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST', 'ASSISTANT', 'MANAGER')),
  required_count INTEGER NOT NULL DEFAULT 1 CHECK (required_count > 0),
  is_optional BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);


-- 3. EQUIPMENT, PROPS & RESOURCE INVENTORY
-- ------------------------------------------------------------------------------

-- Resource Categories
CREATE TABLE IF NOT EXISTS public.resource_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Studio Resources (Equipment, Props, Wardrobe, Consumables)
CREATE TABLE IF NOT EXISTS public.studio_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.resource_categories(id),
  asset_code TEXT UNIQUE NOT NULL, -- e.g. CAM-001, LENS-014, WARD-002
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT, -- Internal only, hidden from guests/customers
  is_serialized BOOLEAN NOT NULL DEFAULT true,
  quantity_total INTEGER NOT NULL DEFAULT 1 CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 1 CHECK (quantity_available >= 0),
  reorder_threshold INTEGER DEFAULT 0 CHECK (reorder_threshold >= 0),
  unit TEXT DEFAULT 'cái',
  current_location TEXT NOT NULL DEFAULT 'Studio Storage' CHECK (
    current_location IN ('Studio A', 'Studio B', 'Studio Storage', 'Makeup Room', 'Offsite', 'Repair Vendor', 'Dry Cleaning')
  ),
  condition TEXT NOT NULL DEFAULT 'EXCELLENT' CHECK (
    condition IN ('NEW', 'EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'DAMAGED')
  ),
  cleaning_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    cleaning_status IN ('AVAILABLE', 'IN_USE', 'NEEDS_CLEANING', 'CLEANING')
  ),
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (
    status IN ('AVAILABLE', 'RESERVED', 'IN_USE', 'MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED')
  ),
  purchase_date DATE,
  purchase_cost BIGINT CHECK (purchase_cost IS NULL OR purchase_cost >= 0), -- Internal only
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_studio_resources_code ON public.studio_resources(asset_code);
CREATE INDEX IF NOT EXISTS idx_studio_resources_cat_status ON public.studio_resources(category_id, status);
CREATE INDEX IF NOT EXISTS idx_studio_resources_loc ON public.studio_resources(current_location);

-- Resource Reservations for Bookings
CREATE TABLE IF NOT EXISTS public.booking_resource_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.studio_resources(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  reserved_from TIMESTAMPTZ NOT NULL,
  reserved_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'RESERVED' CHECK (status IN ('RESERVED', 'CHECKED_OUT', 'RETURNED', 'CANCELLED')),
  reserved_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT valid_res_range CHECK (reserved_until > reserved_from)
);

CREATE INDEX IF NOT EXISTS idx_resource_res_booking ON public.booking_resource_reservations(booking_id);
CREATE INDEX IF NOT EXISTS idx_resource_res_resource_range ON public.booking_resource_reservations(resource_id, reserved_from, reserved_until);

-- Physical Equipment Handoffs (Check-out & Return Audit)
CREATE TABLE IF NOT EXISTS public.booking_resource_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.booking_resource_reservations(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.studio_resources(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  checked_out_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  checked_out_by UUID REFERENCES public.profiles(id),
  received_by_staff UUID NOT NULL REFERENCES public.profiles(id),
  condition_before TEXT NOT NULL DEFAULT 'GOOD',
  returned_at TIMESTAMPTZ,
  returned_by_staff UUID REFERENCES public.profiles(id),
  received_return_by UUID REFERENCES public.profiles(id),
  condition_after TEXT,
  damage_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_resource_handoffs_booking ON public.booking_resource_handoffs(booking_id);

-- Resource Maintenance & Repairs
CREATE TABLE IF NOT EXISTS public.resource_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.studio_resources(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('SCHEDULED_CLEANING', 'SENSOR_CLEANING', 'REPAIR', 'FIRMWARE_UPDATE', 'INSPECTION')),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  vendor_name TEXT,
  cost BIGINT CHECK (cost IS NULL OR cost >= 0),
  status TEXT NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  notes TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_resource_maint_resource ON public.resource_maintenance(resource_id, status);

-- Equipment Damage & Incident Reports
CREATE TABLE IF NOT EXISTS public.resource_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.studio_resources(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id),
  reported_by UUID NOT NULL REFERENCES public.profiles(id),
  severity TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'REPAIRED', 'RETIRED')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_resource_incidents_status ON public.resource_incidents(status);


-- 4. CONCURRENCY-SAFE SECURITY DEFINER RPCS
-- ------------------------------------------------------------------------------

-- A. Assign Staff with Overlap & Leave Check and Advisory Lock
CREATE OR REPLACE FUNCTION public.assign_booking_staff_v2(
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
  v_overlap_assignment RECORD;
  v_leave RECORD;
  v_new_id UUID;
BEGIN
  -- Verify caller role
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

  IF v_emp.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Employee account is not active.' USING ERRCODE = 'P0003';
  END IF;

  v_start := COALESCE(p_start_at, v_booking.start_at);
  v_end := COALESCE(p_end_at, v_booking.end_at);

  IF v_end <= v_start THEN
    RAISE EXCEPTION 'Invalid assignment interval: end time must be after start time.' USING ERRCODE = '22023';
  END IF;

  -- Acquire transaction-level advisory lock on employee ID to prevent concurrent double-booking
  PERFORM pg_advisory_xact_lock(hashtext('staff_assign_' || p_employee_id::text));

  -- Check for approved leave overlap
  SELECT * INTO v_leave
  FROM public.staff_leave_requests
  WHERE employee_id = p_employee_id
    AND status = 'APPROVED'
    AND tstzrange(start_at, end_at, '[)') && tstzrange(v_start, v_end, '[)')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict_type', 'LEAVE_CONFLICT',
      'error', 'Nhân viên đang có lịch nghỉ phép đã duyệt trong khoảng thời gian này.',
      'leave_id', v_leave.id,
      'leave_start', v_leave.start_at,
      'leave_end', v_leave.end_at
    );
  END IF;

  -- Check for overlapping confirmed booking assignment (excluding current booking)
  SELECT ba.*, b.booking_code INTO v_overlap_assignment
  FROM public.booking_assignments ba
  JOIN public.bookings b ON b.id = ba.booking_id
  WHERE ba.employee_id = p_employee_id
    AND ba.booking_id != p_booking_id
    AND b.booking_status NOT IN ('CANCELLED')
    AND tstzrange(ba.start_at, ba.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'conflict_type', 'BOOKING_OVERLAP',
      'error', 'Nhân viên đã được phân công ca chụp trùng giờ: ' || v_overlap_assignment.booking_code,
      'conflict_booking_id', v_overlap_assignment.booking_id,
      'conflict_booking_code', v_overlap_assignment.booking_code,
      'conflict_start', v_overlap_assignment.start_at,
      'conflict_end', v_overlap_assignment.end_at
    );
  END IF;

  -- Remove prior assignment for the same role on this booking
  DELETE FROM public.booking_assignments
  WHERE booking_id = p_booking_id AND assignment_role = p_assignment_role;

  -- Insert new assignment
  INSERT INTO public.booking_assignments (
    booking_id,
    employee_id,
    assignment_role,
    start_at,
    end_at
  ) VALUES (
    p_booking_id,
    p_employee_id,
    p_assignment_role,
    v_start,
    v_end
  ) RETURNING id INTO v_new_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  ) VALUES (
    auth.uid(),
    'booking_assignments',
    v_new_id::text,
    'ASSIGN_STAFF',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'employee_id', p_employee_id,
      'role', p_assignment_role,
      'start_at', v_start,
      'end_at', v_end
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_new_id,
    'booking_id', p_booking_id,
    'employee_id', p_employee_id,
    'role', p_assignment_role,
    'start_at', v_start,
    'end_at', v_end
  );
END;
$$;


-- B. Approve Staff Leave with Assignment Conflict Check
CREATE OR REPLACE FUNCTION public.approve_staff_leave(
  p_leave_id UUID,
  p_manager_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_leave RECORD;
  v_conflict RECORD;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only managers and administrators can approve leave.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_leave FROM public.staff_leave_requests WHERE id = p_leave_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Prevent staff approving own leave even if manager
  IF v_leave.employee_id = auth.uid() THEN
    RAISE EXCEPTION 'Conflict of interest: Staff members cannot approve their own leave request.' USING ERRCODE = '42501';
  END IF;

  -- Acquire lock on employee
  PERFORM pg_advisory_xact_lock(hashtext('staff_leave_' || v_leave.employee_id::text));

  -- Check if employee has active confirmed booking assignments during the leave window
  SELECT ba.*, b.booking_code INTO v_conflict
  FROM public.booking_assignments ba
  JOIN public.bookings b ON b.id = ba.booking_id
  WHERE ba.employee_id = v_leave.employee_id
    AND b.booking_status NOT IN ('CANCELLED')
    AND tstzrange(ba.start_at, ba.end_at, '[)') && tstzrange(v_leave.start_at, v_leave.end_at, '[)')
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Không thể duyệt đơn nghỉ vì nhân viên đang được phân công booking: ' || v_conflict.booking_code,
      'conflict_booking_code', v_conflict.booking_code,
      'conflict_booking_id', v_conflict.booking_id,
      'conflict_start', v_conflict.start_at,
      'conflict_end', v_conflict.end_at
    );
  END IF;

  UPDATE public.staff_leave_requests
  SET status = 'APPROVED',
      approved_by = auth.uid(),
      approved_at = timezone('utc'::text, now()),
      manager_note = COALESCE(p_manager_note, manager_note),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_leave_id;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  ) VALUES (
    auth.uid(),
    'staff_leave_requests',
    p_leave_id::text,
    'APPROVE_LEAVE',
    jsonb_build_object('leave_id', p_leave_id, 'employee_id', v_leave.employee_id, 'manager_note', p_manager_note)
  );

  RETURN jsonb_build_object('success', true, 'leave_id', p_leave_id, 'status', 'APPROVED');
END;
$$;


-- C. Reject Staff Leave
CREATE OR REPLACE FUNCTION public.reject_staff_leave(
  p_leave_id UUID,
  p_manager_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_leave RECORD;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only managers and administrators can reject leave.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_leave FROM public.staff_leave_requests WHERE id = p_leave_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.staff_leave_requests
  SET status = 'REJECTED',
      approved_by = auth.uid(),
      approved_at = timezone('utc'::text, now()),
      manager_note = COALESCE(p_manager_note, manager_note),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_leave_id;

  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  ) VALUES (
    auth.uid(),
    'staff_leave_requests',
    p_leave_id::text,
    'REJECT_LEAVE',
    jsonb_build_object('leave_id', p_leave_id, 'employee_id', v_leave.employee_id, 'manager_note', p_manager_note)
  );

  RETURN jsonb_build_object('success', true, 'leave_id', p_leave_id, 'status', 'REJECTED');
END;
$$;


-- D. Concurrency-Safe Resource Reservation
CREATE OR REPLACE FUNCTION public.reserve_booking_resource(
  p_booking_id UUID,
  p_resource_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_reserved_from TIMESTAMPTZ DEFAULT NULL,
  p_reserved_until TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_booking RECORD;
  v_resource RECORD;
  v_from TIMESTAMPTZ;
  v_until TIMESTAMPTZ;
  v_existing_overlap_count INTEGER;
  v_overlap_res RECORD;
  v_new_id UUID;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_resource FROM public.studio_resources WHERE id = p_resource_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_resource.status IN ('MAINTENANCE', 'DAMAGED', 'LOST', 'RETIRED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Thiết bị đang ở trạng thái ' || v_resource.status || ', không thể giữ chỗ.'
    );
  END IF;

  v_from := COALESCE(p_reserved_from, v_booking.start_at);
  v_until := COALESCE(p_reserved_until, v_booking.end_at);

  IF v_until <= v_from THEN
    RAISE EXCEPTION 'Invalid reservation range: end time must be after start time.' USING ERRCODE = '22023';
  END IF;

  -- Acquire advisory lock on resource
  PERFORM pg_advisory_xact_lock(hashtext('resource_lock_' || p_resource_id::text));

  IF v_resource.is_serialized THEN
    -- Serialized item: only 1 reservation allowed in overlapping time window
    SELECT brr.*, b.booking_code INTO v_overlap_res
    FROM public.booking_resource_reservations brr
    JOIN public.bookings b ON b.id = brr.booking_id
    WHERE brr.resource_id = p_resource_id
      AND brr.booking_id != p_booking_id
      AND brr.status IN ('RESERVED', 'CHECKED_OUT')
      AND tstzrange(brr.reserved_from, brr.reserved_until, '[)') && tstzrange(v_from, v_until, '[)')
    LIMIT 1;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', false,
        'conflict_type', 'RESOURCE_OVERLAP',
        'error', 'Thiết bị ' || v_resource.asset_code || ' đã được đặt trước cho booking ' || v_overlap_res.booking_code,
        'conflict_booking_code', v_overlap_res.booking_code,
        'conflict_from', v_overlap_res.reserved_from,
        'conflict_until', v_overlap_res.reserved_until
      );
    END IF;
  ELSE
    -- Quantity item: check if sum of overlapping reservations + requested > quantity_total
    SELECT COALESCE(SUM(quantity), 0) INTO v_existing_overlap_count
    FROM public.booking_resource_reservations
    WHERE resource_id = p_resource_id
      AND booking_id != p_booking_id
      AND status IN ('RESERVED', 'CHECKED_OUT')
      AND tstzrange(reserved_from, reserved_until, '[)') && tstzrange(v_from, v_until, '[)');

    IF (v_existing_overlap_count + p_quantity) > v_resource.quantity_total THEN
      RETURN jsonb_build_object(
        'success', false,
        'conflict_type', 'CAPACITY_EXCEEDED',
        'error', 'Không đủ số lượng khả dụng trong khung giờ này (Đang đặt: ' || v_existing_overlap_count || ', Tổng: ' || v_resource.quantity_total || ').'
      );
    END IF;
  END IF;

  -- Upsert reservation for booking & resource
  INSERT INTO public.booking_resource_reservations (
    booking_id,
    resource_id,
    quantity,
    reserved_from,
    reserved_until,
    status,
    reserved_by,
    notes
  ) VALUES (
    p_booking_id,
    p_resource_id,
    p_quantity,
    v_from,
    v_until,
    'RESERVED',
    auth.uid(),
    p_notes
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'reservation_id', v_new_id,
    'resource_id', p_resource_id,
    'asset_code', v_resource.asset_code,
    'quantity', p_quantity
  );
END;
$$;


-- D. Equipment Check-out Handoff
CREATE OR REPLACE FUNCTION public.checkout_booking_resource(
  p_reservation_id UUID,
  p_received_by_staff UUID,
  p_condition_before TEXT DEFAULT 'GOOD',
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_res RECORD;
  v_handoff_id UUID;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_res FROM public.booking_resource_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Insert handoff record
  INSERT INTO public.booking_resource_handoffs (
    reservation_id,
    resource_id,
    booking_id,
    checked_out_at,
    checked_out_by,
    received_by_staff,
    condition_before
  ) VALUES (
    p_reservation_id,
    v_res.resource_id,
    v_res.booking_id,
    timezone('utc'::text, now()),
    auth.uid(),
    p_received_by_staff,
    p_condition_before
  ) RETURNING id INTO v_handoff_id;

  -- Update reservation status
  UPDATE public.booking_resource_reservations
  SET status = 'CHECKED_OUT', updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id;

  -- Update resource status to IN_USE
  UPDATE public.studio_resources
  SET status = 'IN_USE', updated_at = timezone('utc'::text, now())
  WHERE id = v_res.resource_id;

  RETURN jsonb_build_object('success', true, 'handoff_id', v_handoff_id, 'status', 'CHECKED_OUT');
END;
$$;


-- E. Equipment Return Handoff
CREATE OR REPLACE FUNCTION public.return_booking_resource(
  p_reservation_id UUID,
  p_condition_after TEXT DEFAULT 'GOOD',
  p_damage_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_res RECORD;
  v_new_status TEXT := 'AVAILABLE';
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_res FROM public.booking_resource_reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Update handoff record
  UPDATE public.booking_resource_handoffs
  SET returned_at = timezone('utc'::text, now()),
      returned_by_staff = v_res.reserved_by,
      received_return_by = auth.uid(),
      condition_after = p_condition_after,
      damage_notes = p_damage_notes
  WHERE reservation_id = p_reservation_id AND returned_at IS NULL;

  -- Update reservation status
  UPDATE public.booking_resource_reservations
  SET status = 'RETURNED', updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id;

  -- If damaged, set resource status to DAMAGED and log incident
  IF p_condition_after IN ('DAMAGED', 'POOR') THEN
    v_new_status := 'DAMAGED';
    INSERT INTO public.resource_incidents (
      resource_id,
      booking_id,
      reported_by,
      severity,
      description
    ) VALUES (
      v_res.resource_id,
      v_res.booking_id,
      auth.uid(),
      'HIGH',
      COALESCE(p_damage_notes, 'Hư hỏng khi trả thiết bị.')
    );
  END IF;

  UPDATE public.studio_resources
  SET status = v_new_status, updated_at = timezone('utc'::text, now())
  WHERE id = v_res.resource_id;

  RETURN jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'new_status', v_new_status);
END;
$$;


-- F. Get Operations Calendar Events (Bookings, Staff, Rooms, Maintenance, Leave)
CREATE OR REPLACE FUNCTION public.get_operations_calendar_events(
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_bookings JSONB;
  v_staff_assignments JSONB;
  v_leaves JSONB;
  v_maintenance JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  -- 1. Bookings
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'type', 'BOOKING',
    'title', b.booking_code || ' — ' || s.name,
    'booking_code', b.booking_code,
    'customer_name', b.customer_name,
    'service_name', s.name,
    'room_name', sr.name,
    'room_code', sr.code,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'status', b.booking_status,
    'crew_status', b.crew_status,
    'resource_status', b.resource_status
  )), '[]'::jsonb) INTO v_bookings
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  LEFT JOIN public.studio_rooms sr ON sr.id = b.studio_room_id
  WHERE b.booking_status NOT IN ('CANCELLED')
    AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)');

  -- 2. Staff Assignments
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', ba.id,
    'type', 'STAFF_ASSIGNMENT',
    'employee_id', ba.employee_id,
    'employee_name', p.full_name,
    'role', ba.assignment_role,
    'booking_id', ba.booking_id,
    'start_at', ba.start_at,
    'end_at', ba.end_at
  )), '[]'::jsonb) INTO v_staff_assignments
  FROM public.booking_assignments ba
  JOIN public.profiles p ON p.id = ba.employee_id
  WHERE tstzrange(ba.start_at, ba.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)');

  -- 3. Approved Leaves
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', sl.id,
    'type', 'LEAVE',
    'employee_id', sl.employee_id,
    'employee_name', p.full_name,
    'leave_type', sl.leave_type,
    'start_at', sl.start_at,
    'end_at', sl.end_at,
    'status', sl.status
  )), '[]'::jsonb) INTO v_leaves
  FROM public.staff_leave_requests sl
  JOIN public.profiles p ON p.id = sl.employee_id
  WHERE sl.status = 'APPROVED'
    AND tstzrange(sl.start_at, sl.end_at, '[)') && tstzrange(p_start_at, p_end_at, '[)');

  -- 4. Resource Maintenance
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', rm.id,
    'type', 'MAINTENANCE',
    'resource_id', rm.resource_id,
    'resource_name', r.name,
    'asset_code', r.asset_code,
    'maintenance_type', rm.maintenance_type,
    'scheduled_at', rm.scheduled_at,
    'status', rm.status
  )), '[]'::jsonb) INTO v_maintenance
  FROM public.resource_maintenance rm
  JOIN public.studio_resources r ON r.id = rm.resource_id
  WHERE rm.scheduled_at >= p_start_at AND rm.scheduled_at <= p_end_at;

  RETURN jsonb_build_object(
    'bookings', v_bookings,
    'staff_assignments', v_staff_assignments,
    'leaves', v_leaves,
    'maintenance', v_maintenance
  );
END;
$$;


-- G. Get Daily Operations Board ("Hôm nay" & "Chuẩn bị ngày mai")
CREATE OR REPLACE FUNCTION public.get_daily_operations_board(
  p_target_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_today_start TIMESTAMPTZ;
  v_today_end TIMESTAMPTZ;
  v_tomorrow_start TIMESTAMPTZ;
  v_tomorrow_end TIMESTAMPTZ;
  v_today_bookings JSONB;
  v_tomorrow_prep JSONB;
  v_active_shoots JSONB;
  v_overdue_editing JSONB;
  v_pending_returns JSONB;
BEGIN
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  v_today_start := (p_target_date || ' 00:00:00+07')::TIMESTAMPTZ;
  v_today_end := (p_target_date || ' 23:59:59.999+07')::TIMESTAMPTZ;

  v_tomorrow_start := ((p_target_date + 1) || ' 00:00:00+07')::TIMESTAMPTZ;
  v_tomorrow_end := ((p_target_date + 1) || ' 23:59:59.999+07')::TIMESTAMPTZ;

  -- Today Bookings
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'service_name', s.name,
    'room_name', sr.name,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'status', b.booking_status,
    'crew_status', b.crew_status,
    'resource_status', b.resource_status
  )), '[]'::jsonb) INTO v_today_bookings
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  LEFT JOIN public.studio_rooms sr ON sr.id = b.studio_room_id
  WHERE b.booking_status NOT IN ('CANCELLED')
    AND b.start_at >= v_today_start AND b.start_at <= v_today_end;

  -- Tomorrow Prep Checklist
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_name', b.customer_name,
    'service_name', s.name,
    'room_name', sr.name,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'photographer_ready', EXISTS (SELECT 1 FROM public.booking_assignments WHERE booking_id = b.id AND assignment_role = 'PHOTOGRAPHER'),
    'makeup_ready', EXISTS (SELECT 1 FROM public.booking_assignments WHERE booking_id = b.id AND assignment_role = 'MAKEUP'),
    'resources_reserved_count', (SELECT COUNT(*) FROM public.booking_resource_reservations WHERE booking_id = b.id AND status = 'RESERVED'),
    'drive_ready', EXISTS (SELECT 1 FROM public.booking_deliveries WHERE booking_id = b.id AND status != 'NOT_CREATED')
  )), '[]'::jsonb) INTO v_tomorrow_prep
  FROM public.bookings b
  JOIN public.services s ON s.id = b.service_id
  LEFT JOIN public.studio_rooms sr ON sr.id = b.studio_room_id
  WHERE b.booking_status NOT IN ('CANCELLED')
    AND b.start_at >= v_tomorrow_start AND b.start_at <= v_tomorrow_end;

  -- Overdue Editing
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_name', b.customer_name,
    'editing_due_at', b.editing_due_at,
    'status', b.booking_status,
    'editor_name', p.full_name
  )), '[]'::jsonb) INTO v_overdue_editing
  FROM public.bookings b
  LEFT JOIN public.booking_assignments ba ON ba.booking_id = b.id AND ba.assignment_role = 'EDITOR'
  LEFT JOIN public.profiles p ON p.id = ba.employee_id
  WHERE b.booking_status IN ('AWAITING_SELECTION', 'EDITING')
    AND b.editing_due_at IS NOT NULL
    AND b.editing_due_at < timezone('utc'::text, now());

  -- Pending Equipment Returns
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'handoff_id', brh.id,
    'resource_name', r.name,
    'asset_code', r.asset_code,
    'booking_code', b.booking_code,
    'staff_name', p.full_name,
    'checked_out_at', brh.checked_out_at
  )), '[]'::jsonb) INTO v_pending_returns
  FROM public.booking_resource_handoffs brh
  JOIN public.studio_resources r ON r.id = brh.resource_id
  JOIN public.bookings b ON b.id = brh.booking_id
  JOIN public.profiles p ON p.id = brh.received_by_staff
  WHERE brh.returned_at IS NULL;

  RETURN jsonb_build_object(
    'target_date', p_target_date,
    'today_bookings', v_today_bookings,
    'tomorrow_prep', v_tomorrow_prep,
    'overdue_editing', v_overdue_editing,
    'pending_returns', v_pending_returns
  );
END;
$$;


-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------------------------

ALTER TABLE public.staff_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_working_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_crew_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_incidents ENABLE ROW LEVEL SECURITY;

-- Read policies
CREATE POLICY "Public read skills" ON public.staff_skills FOR SELECT USING (true);
CREATE POLICY "Staff read employee skills" ON public.employee_skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read working hours" ON public.staff_working_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read shifts" ON public.staff_shifts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read crew requirements" ON public.booking_crew_requirements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read resource categories" ON public.resource_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff read studio resources" ON public.studio_resources FOR SELECT TO authenticated USING (
  public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
);

-- Leave requests: Staff read own; Manager/Admin read all
CREATE POLICY "Staff read own leave" ON public.staff_leave_requests FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR public.get_auth_role() IN ('MANAGER', 'ADMIN')
);
CREATE POLICY "Staff create own leave" ON public.staff_leave_requests FOR INSERT TO authenticated WITH CHECK (
  employee_id = auth.uid() AND status = 'REQUESTED'
);

-- Resource reservations & handoffs: Staff read; Manager/Admin full
CREATE POLICY "Staff read reservations" ON public.booking_resource_reservations FOR SELECT TO authenticated USING (
  public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
);
CREATE POLICY "Staff read handoffs" ON public.booking_resource_handoffs FOR SELECT TO authenticated USING (
  public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
);

-- Manager & Admin full write access policies
CREATE POLICY "Manager manage skills" ON public.staff_skills FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage employee skills" ON public.employee_skills FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage working hours" ON public.staff_working_hours FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage shifts" ON public.staff_shifts FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage leave requests" ON public.staff_leave_requests FOR UPDATE TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage crew requirements" ON public.booking_crew_requirements FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage resource categories" ON public.resource_categories FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage studio resources" ON public.studio_resources FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage reservations" ON public.booking_resource_reservations FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage handoffs" ON public.booking_resource_handoffs FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage maintenance" ON public.resource_maintenance FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));
CREATE POLICY "Manager manage incidents" ON public.resource_incidents FOR ALL TO authenticated USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));


-- 6. INITIAL SEEDS
-- ------------------------------------------------------------------------------

-- Default Staff Skills
INSERT INTO public.staff_skills (code, name, category, description) VALUES
  ('PORTRAIT_NATURAL', 'Chân dung Ánh sáng Tự nhiên', 'PHOTOGRAPHY', 'Kỹ thuật nắm bắt cảm xúc với ánh sáng tự nhiên Pháp.'),
  ('STUDIO_EDITORIAL', 'Chụp Studio Editorial & Fashion', 'PHOTOGRAPHY', 'Set ánh sáng High-Fashion, điều chỉnh dáng người mẫu.'),
  ('WEDDING_CEREMONY', 'Chụp Lễ Cưới & Tiệc Cưới', 'PHOTOGRAPHY', 'Nắm bắt khoảnh khắc thiêng liêng và ảnh phóng sự cưới.'),
  ('FAMILY_BABY', 'Chụp Ảnh Gia Đình & Em Bé', 'PHOTOGRAPHY', 'Tương tác vui vẻ với trẻ nhỏ và gia đình nhiều thế hệ.'),
  ('MAKEUP_BRIDAL', 'Trang Điểm Cô Dâu Cao Cấp', 'MAKEUP', 'Layout makeup tự nhiên trong trẻo kiểu Pháp bền màu cả ngày.'),
  ('MAKEUP_EDITORIAL', 'Trang Điểm Thời Trang & Nghệ Thuật', 'MAKEUP', 'Layout phá cách cho Lookbook và Editorial.'),
  ('COLOR_GRADING', 'Color Grading Cinematic tone Ấm', 'EDITING', 'Xử lý màu sắc hoài niệm đặc trưng của Maison MIPA.'),
  ('HIGH_END_RETOUCH', 'Chỉnh Sửa Da & Hậu Kỳ Cao Cấp', 'EDITING', 'Xử lý chi tiết da giữ nguyên kết cấu texture chân thật.')
ON CONFLICT (code) DO NOTHING;

-- Default Resource Categories
INSERT INTO public.resource_categories (code, name, description, icon, display_order) VALUES
  ('CAMERA_BODY', 'Thân Máy Ảnh (Camera Body)', 'Máy ảnh Full-frame chuyên nghiệp', 'Camera', 1),
  ('LENS', 'Ống Kính (Lenses)', 'Ống kính tiêu cự cố định và zoom cao cấp', 'Disc', 2),
  ('LIGHTING', 'Hệ Thống Đèn & Ánh Sáng', 'Đèn strobe, continuous và phụ kiện tản sáng', 'Sun', 3),
  ('MODIFIER', 'Softbox & Dụng Cụ Tản Sáng', 'Octabox, dù phản xạ, lưới tổ ong', 'Sliders', 4),
  ('TRIPOD_GIMBAL', 'Chân Máy & Chống Rung (Tripod/Gimbal)', 'Chân máy carbon, c-stand và gimbal ổn định', 'Maximize2', 5),
  ('BACKDROP', 'Phông Nền (Backdrops)', 'Phông giấy màu, phông vải loang và phông canvas', 'Layers', 6),
  ('PROP', 'Đạo Cụ Studio (Props)', 'Bàn ghế cổ điển, hoa tươi, sách báo Pháp', 'Sparkles', 7),
  ('WARDROBE', 'Trang Phục & Váy Cưới (Wardrobe)', 'Váy cưới thiết kế, vest chú rể, phụ kiện thời trang', 'Shirt', 8),
  ('CONSUMABLE', 'Vật Tư Tiêu Hao (Consumables)', 'Pin, giấy in ảnh, bông trang điểm', 'Package', 9)
ON CONFLICT (code) DO NOTHING;
