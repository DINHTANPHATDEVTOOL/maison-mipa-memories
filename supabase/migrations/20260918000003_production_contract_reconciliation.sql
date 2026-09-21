-- ==============================================================================
-- Migration 25: Production Contract Reconciliation & Fail-Closed Hardening
-- Date: 2026-09-18
-- Target: Reconciles TypeScript runtime, PostgreSQL RPC signatures, table columns,
-- and multi-person crew planning across Workforce, Inventory, and CRM domains.
-- ==============================================================================

-- 1. TABLE COLUMN RECONCILIATION
-- ------------------------------------------------------------------------------

-- A. staff_skills: ensure 'active' boolean flag exists
ALTER TABLE public.staff_skills 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

-- B. staff_working_hours: ensure explicit business timezone exists
ALTER TABLE public.staff_working_hours 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';

-- C. resource_categories: ensure active and is_consumable flags exist
ALTER TABLE public.resource_categories 
ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN NOT NULL DEFAULT false;

-- D. studio_resources: ensure next_maintenance_date and props_metadata exist
ALTER TABLE public.studio_resources 
ADD COLUMN IF NOT EXISTS next_maintenance_date DATE,
ADD COLUMN IF NOT EXISTS props_metadata JSONB DEFAULT '{}'::jsonb;

-- E. booking_assignments: ensure notes and slot_index exist for multi-person crew
ALTER TABLE public.booking_assignments 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS slot_index INTEGER DEFAULT 1;

-- F. booking_assignments idempotency & multi-crew uniqueness
-- Ensures an employee cannot be duplicated for the same role on the same booking,
-- but permits multiple DISTINCT employees for the same role (e.g., 2 photographers).
CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_assignments_booking_emp_role 
ON public.booking_assignments(booking_id, employee_id, assignment_role);


-- 2. CANONICAL RPC RECONCILIATION
-- ------------------------------------------------------------------------------

-- A. assign_booking_staff_v2: Canonical signature with p_notes and multi-crew support
CREATE OR REPLACE FUNCTION public.assign_booking_staff_v2(
  p_booking_id UUID,
  p_employee_id UUID,
  p_assignment_role TEXT,
  p_start_at TIMESTAMPTZ DEFAULT NULL,
  p_end_at TIMESTAMPTZ DEFAULT NULL,
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
  v_emp RECORD;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_overlap_assignment RECORD;
  v_leave RECORD;
  v_new_id UUID;
BEGIN
  -- 1. Verify caller privilege
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access Denied: Only managers and administrators can assign staff.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify booking exists
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Verify employee exists and is active
  SELECT * INTO v_emp FROM public.profiles WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_emp.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Employee account is not active.' USING ERRCODE = 'P0003';
  END IF;

  -- 4. Calculate effective start/end interval
  v_start := COALESCE(p_start_at, v_booking.start_at);
  v_end := COALESCE(p_end_at, v_booking.end_at);

  IF v_end <= v_start THEN
    RAISE EXCEPTION 'Invalid assignment interval: end time must be after start time.' USING ERRCODE = '22023';
  END IF;

  -- 5. Transaction-level advisory lock on employee ID to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('staff_assign_' || p_employee_id::text));

  -- 6. Check for approved leave overlap
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

  -- 7. Check for overlapping confirmed booking assignment on OTHER bookings
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

  -- 8. Multi-person crew support:
  -- Only remove prior assignment if the SAME employee is already assigned to this role (idempotent update).
  -- Do NOT delete all assignments sharing the role (which would break 2-photographer or multi-assistant setups).
  DELETE FROM public.booking_assignments
  WHERE booking_id = p_booking_id
    AND employee_id = p_employee_id
    AND assignment_role = p_assignment_role;

  -- 9. Insert new assignment
  INSERT INTO public.booking_assignments (
    booking_id,
    employee_id,
    assignment_role,
    start_at,
    end_at,
    notes
  ) VALUES (
    p_booking_id,
    p_employee_id,
    p_assignment_role,
    v_start,
    v_end,
    p_notes
  ) RETURNING id INTO v_new_id;

  -- 10. Audit log entry
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
      'end_at', v_end,
      'notes', p_notes
    )
  );

  -- 11. Return authoritative result with both root keys and nested assignment
  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_new_id,
    'booking_id', p_booking_id,
    'employee_id', p_employee_id,
    'role', p_assignment_role,
    'assignment_role', p_assignment_role,
    'start_at', v_start,
    'end_at', v_end,
    'notes', p_notes,
    'assignment', jsonb_build_object(
      'id', v_new_id,
      'booking_id', p_booking_id,
      'employee_id', p_employee_id,
      'assignment_role', p_assignment_role,
      'start_at', v_start,
      'end_at', v_end,
      'notes', p_notes
    )
  );
END;
$$;


-- B. checkout_booking_resource: Canonical signature with p_received_by_staff & return object
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

  IF v_res.status = 'CHECKED_OUT' THEN
    RAISE EXCEPTION 'Resource is already checked out.' USING ERRCODE = '22000';
  END IF;

  -- Insert handoff record
  INSERT INTO public.booking_resource_handoffs (
    reservation_id,
    resource_id,
    booking_id,
    checked_out_at,
    checked_out_by,
    received_by_staff,
    condition_before,
    damage_notes
  ) VALUES (
    p_reservation_id,
    v_res.resource_id,
    v_res.booking_id,
    timezone('utc'::text, now()),
    auth.uid(),
    p_received_by_staff,
    p_condition_before,
    p_notes
  ) RETURNING id INTO v_handoff_id;

  -- Update reservation status
  UPDATE public.booking_resource_reservations
  SET status = 'CHECKED_OUT', updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id;

  -- Update resource status to IN_USE
  UPDATE public.studio_resources
  SET status = 'IN_USE', updated_at = timezone('utc'::text, now())
  WHERE id = v_res.resource_id;

  RETURN jsonb_build_object(
    'success', true,
    'handoff_id', v_handoff_id,
    'status', 'CHECKED_OUT',
    'handoff', jsonb_build_object(
      'id', v_handoff_id,
      'reservation_id', p_reservation_id,
      'resource_id', v_res.resource_id,
      'booking_id', v_res.booking_id,
      'employee_id', p_received_by_staff,
      'received_by_staff', p_received_by_staff,
      'handoff_type', 'CHECKOUT',
      'condition_before', p_condition_before,
      'condition_state', p_condition_before,
      'actor_id', auth.uid(),
      'notes', p_notes,
      'created_at', timezone('utc'::text, now())
    )
  );
END;
$$;


-- C. return_booking_resource: Canonical signature with damage tracking & return object
CREATE OR REPLACE FUNCTION public.return_booking_resource(
  p_reservation_id UUID,
  p_condition_after TEXT DEFAULT 'GOOD',
  p_damage_notes TEXT DEFAULT NULL,
  p_is_damaged BOOLEAN DEFAULT false,
  p_damage_severity TEXT DEFAULT NULL,
  p_damage_description TEXT DEFAULT NULL,
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
  v_new_status TEXT := 'AVAILABLE';
  v_effective_notes TEXT;
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

  v_effective_notes := COALESCE(p_damage_notes, p_damage_description, p_notes);

  -- Update handoff record
  UPDATE public.booking_resource_handoffs
  SET returned_at = timezone('utc'::text, now()),
      returned_by_staff = v_res.reserved_by,
      received_return_by = auth.uid(),
      condition_after = p_condition_after,
      damage_notes = v_effective_notes
  WHERE reservation_id = p_reservation_id AND returned_at IS NULL
  RETURNING id INTO v_handoff_id;

  -- Update reservation status
  UPDATE public.booking_resource_reservations
  SET status = 'RETURNED', updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id;

  -- If damaged, set resource status to DAMAGED and log incident
  IF p_is_damaged OR p_condition_after IN ('DAMAGED', 'POOR') THEN
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
      COALESCE(p_damage_severity, 'MEDIUM'),
      COALESCE(v_effective_notes, 'Hư hỏng ghi nhận khi thu hồi thiết bị')
    );
  END IF;

  UPDATE public.studio_resources
  SET status = v_new_status,
      condition = CASE WHEN v_new_status = 'DAMAGED' THEN 'DAMAGED' ELSE p_condition_after END,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_res.resource_id;

  RETURN jsonb_build_object(
    'success', true,
    'handoff_id', v_handoff_id,
    'status', 'RETURNED',
    'resource_status', v_new_status,
    'handoff', jsonb_build_object(
      'id', v_handoff_id,
      'reservation_id', p_reservation_id,
      'resource_id', v_res.resource_id,
      'booking_id', v_res.booking_id,
      'employee_id', v_res.reserved_by,
      'handoff_type', 'RETURN',
      'condition_after', p_condition_after,
      'condition_state', p_condition_after,
      'damage_notes', v_effective_notes,
      'actor_id', auth.uid(),
      'created_at', timezone('utc'::text, now())
    )
  );
END;
$$;


-- D. get_available_staff_for_booking: Server-Authoritative Staff Availability
CREATE OR REPLACE FUNCTION public.get_available_staff_for_booking(
  p_booking_id UUID,
  p_assignment_role TEXT DEFAULT NULL
)
RETURNS TABLE (
  employee_id UUID,
  full_name TEXT,
  email TEXT,
  staff_role TEXT,
  status TEXT,
  is_available BOOLEAN,
  unavailability_reason TEXT,
  matching_skills TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  v_start := v_booking.start_at;
  v_end := v_booking.end_at;

  RETURN QUERY
  WITH emp_pool AS (
    SELECT 
      p.id,
      p.full_name,
      p.email,
      p.staff_role,
      p.status
    FROM public.profiles p
    WHERE p.role IN ('STAFF', 'MANAGER', 'ADMIN')
      AND p.status = 'ACTIVE'
      AND (p_assignment_role IS NULL OR p.staff_role = p_assignment_role OR p.role IN ('MANAGER', 'ADMIN'))
  ),
  leaves AS (
    SELECT 
      slr.employee_id,
      slr.reason
    FROM public.staff_leave_requests slr
    WHERE slr.status = 'APPROVED'
      AND tstzrange(slr.start_at, slr.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  booking_conflicts AS (
    SELECT 
      ba.employee_id,
      b.booking_code
    FROM public.booking_assignments ba
    JOIN public.bookings b ON b.id = ba.booking_id
    WHERE ba.booking_id != p_booking_id
      AND b.booking_status NOT IN ('CANCELLED')
      AND tstzrange(ba.start_at, ba.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  skills_agg AS (
    SELECT 
      es.employee_id,
      array_agg(ss.code) AS skills
    FROM public.employee_skills es
    JOIN public.staff_skills ss ON ss.id = es.skill_id
    GROUP BY es.employee_id
  )
  SELECT 
    ep.id AS employee_id,
    ep.full_name,
    ep.email,
    COALESCE(ep.staff_role, 'STAFF') AS staff_role,
    ep.status,
    CASE 
      WHEN l.employee_id IS NOT NULL THEN false
      WHEN bc.employee_id IS NOT NULL THEN false
      ELSE true
    END AS is_available,
    CASE 
      WHEN l.employee_id IS NOT NULL THEN 'Có lịch nghỉ phép đã duyệt'
      WHEN bc.employee_id IS NOT NULL THEN 'Đã có ca chụp trùng giờ: ' || bc.booking_code
      ELSE NULL
    END AS unavailability_reason,
    COALESCE(sa.skills, ARRAY[]::TEXT[]) AS matching_skills
  FROM emp_pool ep
  LEFT JOIN leaves l ON l.employee_id = ep.id
  LEFT JOIN booking_conflicts bc ON bc.employee_id = ep.id
  LEFT JOIN skills_agg sa ON sa.employee_id = ep.id
  ORDER BY is_available DESC, ep.full_name ASC;
END;
$$;

-- 3. PERMISSIONS & RPC GRANTS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.assign_booking_staff_v2(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_booking_resource(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_booking_resource(UUID, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_staff_for_booking(UUID, TEXT) TO authenticated;

-- Comment for schema introspection and audit
COMMENT ON FUNCTION public.assign_booking_staff_v2(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) IS 'Assigns staff to booking with multi-crew support and concurrency safety';
COMMENT ON FUNCTION public.checkout_booking_resource(UUID, UUID, TEXT, TEXT) IS 'Performs physical checkout handoff of reserved equipment';
COMMENT ON FUNCTION public.return_booking_resource(UUID, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT) IS 'Performs equipment return and logs condition and damage';
COMMENT ON FUNCTION public.get_available_staff_for_booking(UUID, TEXT) IS 'Authoritatively determines available staff for a booking interval';

