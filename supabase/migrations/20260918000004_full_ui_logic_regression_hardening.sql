-- ==============================================================================
-- Maison MIPA Memories — Full UI & Logic Regression Hardening V4
-- Chronological Migration: 20260918000004_full_ui_logic_regression_hardening.sql
-- 
-- 1. assign_booking_staff_v2:
--    - Block CUSTOMER assignment as crew (fail-closed)
--    - Validate staff_role compatibility with p_assignment_role
--    - Validate p_assignment_role is an allowed domain role
-- 2. get_available_staff_for_booking:
--    - Strictly enforce staff_role match (remove Manager/Admin automatic role bypass)
--    - Enforce working hours (Asia/Ho_Chi_Minh ISO DOW 1..7) and shift schedules
--    - Precedence: approved leave > explicit shift > booking overlap > working hours
-- 3. checkout_booking_resource:
--    - Strict state transition: RESERVED -> CHECKED_OUT only (reject RETURNED, CANCELLED, etc.)
--    - Validate receiver is active staff (not customer)
--    - Prevent duplicate active handoff (idempotency)
--    - Quantity-aware accounting for serialized vs quantity pool assets
--    - Block checkout for assets in active maintenance
-- 4. return_booking_resource:
--    - Strict state transition: CHECKED_OUT -> RETURNED only (reject un-checked-out or re-return)
--    - Require exactly one active handoff (returned_at IS NULL)
--    - Canonical actor support: p_returned_by_staff UUID
--    - Isolated damage accounting: serialized item becomes DAMAGED, quantity pool adjusts capacity
-- ==============================================================================

-- 0. Reconcile booking_resource_handoffs columns for schema parity
ALTER TABLE public.booking_resource_handoffs
  ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS handoff_type TEXT DEFAULT 'CHECKOUT',
  ADD COLUMN IF NOT EXISTS condition_state TEXT DEFAULT 'GOOD',
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- 1. assign_booking_staff_v2 Hardening
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

  -- 2. Validate domain assignment role
  IF p_assignment_role NOT IN ('PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST', 'ASSISTANT', 'MANAGER') THEN
    RAISE EXCEPTION 'Invalid assignment role: %', p_assignment_role USING ERRCODE = '22023';
  END IF;

  -- 3. Verify booking exists
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Verify employee exists, is active, and is NOT a customer
  SELECT * INTO v_emp FROM public.profiles WHERE id = p_employee_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Employee profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_emp.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Employee account is not active.' USING ERRCODE = 'P0003';
  END IF;

  IF v_emp.role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Invalid staff assignment: Customer cannot be assigned as crew.' USING ERRCODE = '42501';
  END IF;

  -- 5. Staff role compatibility check
  -- Authority to assign does NOT grant authority to perform every specialized operational role
  IF p_assignment_role != 'ASSISTANT' AND v_emp.staff_role IS DISTINCT FROM p_assignment_role THEN
    -- If employee has no staff_role or staff_role does not match the specialized role
    RAISE EXCEPTION 'Staff role incompatibility: Employee with staff role "%" is not qualified for assignment role "%".',
      COALESCE(v_emp.staff_role, 'NONE'), p_assignment_role USING ERRCODE = '22023';
  END IF;

  -- 6. Calculate effective start/end interval
  v_start := COALESCE(p_start_at, v_booking.start_at);
  v_end := COALESCE(p_end_at, v_booking.end_at);

  IF v_end <= v_start THEN
    RAISE EXCEPTION 'Invalid assignment interval: end time must be after start time.' USING ERRCODE = '22023';
  END IF;

  -- 7. Transaction-level advisory lock on employee ID to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('staff_assign_' || p_employee_id::text));

  -- 8. Check for approved leave overlap
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

  -- 9. Check for overlapping confirmed booking assignment on OTHER bookings
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

  -- 10. Multi-person crew support: Idempotent replacement for this employee & role
  DELETE FROM public.booking_assignments
  WHERE booking_id = p_booking_id
    AND employee_id = p_employee_id
    AND assignment_role = p_assignment_role;

  -- 11. Insert new assignment
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

  -- 12. Audit log entry
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


-- 2. get_available_staff_for_booking Hardening
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
  v_dow INTEGER;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  v_start := v_booking.start_at;
  v_end := v_booking.end_at;

  -- Vietnam timezone (Asia/Ho_Chi_Minh) ISO DOW (1 = Monday, ..., 7 = Sunday)
  v_dow := EXTRACT(ISODOW FROM (v_start AT TIME ZONE 'Asia/Ho_Chi_Minh'))::integer;
  v_start_time := (v_start AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;
  v_end_time := (v_end AT TIME ZONE 'Asia/Ho_Chi_Minh')::time;

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
      AND p.role != 'CUSTOMER'
      AND p.status = 'ACTIVE'
      -- Strict role qualification: Manager/Admin cannot substitute specialized roles without qualification
      AND (
        p_assignment_role IS NULL 
        OR p.staff_role = p_assignment_role 
        OR (p_assignment_role = 'ASSISTANT' AND p.staff_role IN ('PHOTOGRAPHER', 'MAKEUP', 'RECEPTIONIST', 'ASSISTANT'))
      )
  ),
  leaves AS (
    SELECT 
      slr.employee_id,
      slr.reason
    FROM public.staff_leave_requests slr
    WHERE slr.status = 'APPROVED'
      AND tstzrange(slr.start_at, slr.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  overlaps AS (
    SELECT 
      ba.employee_id,
      b.booking_code
    FROM public.booking_assignments ba
    JOIN public.bookings b ON b.id = ba.booking_id
    WHERE ba.booking_id != p_booking_id
      AND b.booking_status NOT IN ('CANCELLED')
      AND tstzrange(ba.start_at, ba.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  shifts AS (
    SELECT 
      ss.employee_id,
      ss.shift_type
    FROM public.staff_shifts ss
    WHERE tstzrange(ss.start_at, ss.end_at, '[)') && tstzrange(v_start, v_end, '[)')
  ),
  working_hours AS (
    SELECT 
      swh.employee_id,
      swh.start_time,
      swh.end_time,
      swh.is_day_off
    FROM public.staff_working_hours swh
    WHERE swh.day_of_week = v_dow
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
    -- Precedence: Leave > Shifts > Overlap > Working Hours
    CASE 
      WHEN l.employee_id IS NOT NULL THEN false
      WHEN o.employee_id IS NOT NULL THEN false
      WHEN sh.employee_id IS NOT NULL THEN true
      WHEN wh.employee_id IS NOT NULL AND wh.is_day_off = true THEN false
      WHEN wh.employee_id IS NOT NULL AND (v_start_time < wh.start_time OR v_end_time > wh.end_time) THEN false
      ELSE true
    END AS is_available,
    CASE 
      WHEN l.employee_id IS NOT NULL THEN 'Có lịch nghỉ phép đã duyệt'
      WHEN o.employee_id IS NOT NULL THEN 'Đã có ca chụp trùng giờ: ' || o.booking_code
      WHEN wh.employee_id IS NOT NULL AND wh.is_day_off = true THEN 'Ngày nghỉ định kỳ'
      WHEN wh.employee_id IS NOT NULL AND (v_start_time < wh.start_time OR v_end_time > wh.end_time) THEN 'Ngoài khung giờ làm việc tiêu chuẩn'
      ELSE NULL
    END AS unavailability_reason,
    COALESCE(sa.skills, ARRAY[]::TEXT[]) AS matching_skills
  FROM emp_pool ep
  LEFT JOIN leaves l ON l.employee_id = ep.id
  LEFT JOIN overlaps o ON o.employee_id = ep.id
  LEFT JOIN shifts sh ON sh.employee_id = ep.id
  LEFT JOIN working_hours wh ON wh.employee_id = ep.id
  LEFT JOIN skills_agg sa ON sa.employee_id = ep.id
  ORDER BY is_available DESC, ep.full_name ASC;
END;
$$;


-- 3. checkout_booking_resource Hardening
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
  v_resource RECORD;
  v_receiver RECORD;
  v_active_handoff RECORD;
  v_active_maint RECORD;
  v_handoff_id UUID;
BEGIN
  -- 1. Verify caller privilege
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify reservation exists and lock it
  SELECT * INTO v_res 
  FROM public.booking_resource_reservations 
  WHERE id = p_reservation_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. State machine transition check: RESERVED -> CHECKED_OUT only
  IF v_res.status = 'CHECKED_OUT' THEN
    RAISE EXCEPTION 'Resource is already checked out.' USING ERRCODE = '22000';
  END IF;

  IF v_res.status = 'RETURNED' THEN
    RAISE EXCEPTION 'Cannot checkout already returned reservation.' USING ERRCODE = '22000';
  END IF;

  IF v_res.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot checkout cancelled reservation.' USING ERRCODE = '22000';
  END IF;

  IF v_res.status != 'RESERVED' THEN
    RAISE EXCEPTION 'Invalid reservation status for checkout: %', v_res.status USING ERRCODE = '22000';
  END IF;

  -- 4. Verify receiver is an active staff profile (CUSTOMER forbidden)
  SELECT * INTO v_receiver FROM public.profiles WHERE id = p_received_by_staff;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff receiver profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_receiver.status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Staff receiver account is not active.' USING ERRCODE = 'P0003';
  END IF;

  IF v_receiver.role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Customer cannot receive studio equipment.' USING ERRCODE = '42501';
  END IF;

  -- 5. Verify resource exists, is usable, and lock it
  SELECT * INTO v_resource 
  FROM public.studio_resources 
  WHERE id = v_res.resource_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resource not found in inventory.' USING ERRCODE = 'P0002';
  END IF;

  IF v_resource.status IN ('DAMAGED', 'LOST', 'RETIRED') THEN
    RAISE EXCEPTION 'Resource cannot be checked out due to status: %', v_resource.status USING ERRCODE = '22000';
  END IF;

  IF v_resource.is_serialized AND v_resource.status = 'MAINTENANCE' THEN
    RAISE EXCEPTION 'Resource is currently under maintenance.' USING ERRCODE = '22000';
  END IF;

  -- 6. Check active maintenance conflict
  SELECT id INTO v_active_maint 
  FROM public.resource_maintenance 
  WHERE resource_id = v_res.resource_id AND status = 'IN_PROGRESS' 
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'Resource is currently undergoing active maintenance.' USING ERRCODE = '22000';
  END IF;

  -- 7. Idempotency check: Ensure no active unreturned handoff exists for this reservation
  SELECT id INTO v_active_handoff 
  FROM public.booking_resource_handoffs 
  WHERE reservation_id = p_reservation_id AND returned_at IS NULL 
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'An active handoff record already exists for this reservation.' USING ERRCODE = '23505';
  END IF;

  -- 8. Quantity & Status Accounting
  IF v_resource.is_serialized THEN
    UPDATE public.studio_resources
    SET status = 'IN_USE',
        quantity_available = GREATEST(0, quantity_available - v_res.quantity),
        updated_at = timezone('utc'::text, now())
    WHERE id = v_res.resource_id;
  ELSE
    IF v_resource.quantity_available < v_res.quantity THEN
      RAISE EXCEPTION 'Insufficient resource quantity available in inventory (requested %, available %).',
        v_res.quantity, v_resource.quantity_available USING ERRCODE = '22000';
    END IF;

    UPDATE public.studio_resources
    SET quantity_available = quantity_available - v_res.quantity,
        status = CASE WHEN quantity_available - v_res.quantity = 0 THEN 'IN_USE' ELSE status END,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_res.resource_id;
  END IF;

  -- 9. Insert handoff record
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

  -- 10. Update reservation status
  UPDATE public.booking_resource_reservations
  SET status = 'CHECKED_OUT', updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id;

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


-- 4. return_booking_resource Hardening
CREATE OR REPLACE FUNCTION public.return_booking_resource(
  p_reservation_id UUID,
  p_condition_after TEXT DEFAULT 'GOOD',
  p_damage_notes TEXT DEFAULT NULL,
  p_is_damaged BOOLEAN DEFAULT false,
  p_damage_severity TEXT DEFAULT NULL,
  p_damage_description TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_returned_by_staff UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_res RECORD;
  v_resource RECORD;
  v_handoff RECORD;
  v_returned_by UUID;
  v_new_status TEXT := 'AVAILABLE';
  v_effective_notes TEXT;
BEGIN
  -- 1. Verify caller privilege
  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN', 'STAFF') THEN
    RAISE EXCEPTION 'Access Denied: Insufficient privileges.' USING ERRCODE = '42501';
  END IF;

  -- 2. Verify reservation exists and lock it
  SELECT * INTO v_res 
  FROM public.booking_resource_reservations 
  WHERE id = p_reservation_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. State machine transition check: CHECKED_OUT -> RETURNED only
  IF v_res.status = 'RETURNED' THEN
    RAISE EXCEPTION 'Reservation has already been returned.' USING ERRCODE = '22000';
  END IF;

  IF v_res.status = 'RESERVED' THEN
    RAISE EXCEPTION 'Reservation was never checked out.' USING ERRCODE = '22000';
  END IF;

  IF v_res.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot return cancelled reservation.' USING ERRCODE = '22000';
  END IF;

  IF v_res.status != 'CHECKED_OUT' THEN
    RAISE EXCEPTION 'Invalid reservation status for return: %', v_res.status USING ERRCODE = '22000';
  END IF;

  -- 4. Active handoff check: Find active handoff for this reservation
  SELECT * INTO v_handoff 
  FROM public.booking_resource_handoffs 
  WHERE reservation_id = p_reservation_id AND returned_at IS NULL 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No active handoff record found for this reservation.' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Canonical returning actor
  v_returned_by := COALESCE(p_returned_by_staff, v_handoff.received_by_staff, v_res.reserved_by);
  v_effective_notes := COALESCE(p_damage_notes, p_damage_description, p_notes);

  -- 6. Close the handoff record
  UPDATE public.booking_resource_handoffs
  SET returned_at = timezone('utc'::text, now()),
      returned_by_staff = v_returned_by,
      received_return_by = auth.uid(),
      condition_after = p_condition_after,
      damage_notes = v_effective_notes
  WHERE id = v_handoff.id;

  -- 7. Update reservation status to RETURNED
  UPDATE public.booking_resource_reservations
  SET status = 'RETURNED', updated_at = timezone('utc'::text, now())
  WHERE id = p_reservation_id;

  -- 8. Lock resource and update condition / availability
  SELECT * INTO v_resource 
  FROM public.studio_resources 
  WHERE id = v_res.resource_id 
  FOR UPDATE;

  IF p_is_damaged OR p_condition_after IN ('DAMAGED', 'POOR') THEN
    v_new_status := 'DAMAGED';

    -- Create damage incident audit
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

    IF v_resource.is_serialized THEN
      UPDATE public.studio_resources
      SET status = 'DAMAGED',
          condition = 'DAMAGED',
          updated_at = timezone('utc'::text, now())
      WHERE id = v_res.resource_id;
    ELSE
      -- Pool quantity accounting: One or more damaged units are quarantined
      UPDATE public.studio_resources
      SET quantity_available = LEAST(quantity_total, quantity_available + GREATEST(0, v_res.quantity - 1)),
          status = CASE WHEN quantity_available = 0 AND quantity_total > 0 THEN 'DAMAGED' ELSE 'AVAILABLE' END,
          condition = CASE WHEN quantity_available = 0 THEN 'DAMAGED' ELSE condition END,
          updated_at = timezone('utc'::text, now())
      WHERE id = v_res.resource_id;
    END IF;
  ELSE
    -- Good condition return
    IF v_resource.is_serialized THEN
      UPDATE public.studio_resources
      SET status = 'AVAILABLE',
          condition = p_condition_after,
          quantity_available = LEAST(quantity_total, quantity_available + v_res.quantity),
          updated_at = timezone('utc'::text, now())
      WHERE id = v_res.resource_id;
    ELSE
      UPDATE public.studio_resources
      SET status = 'AVAILABLE',
          condition = p_condition_after,
          quantity_available = LEAST(quantity_total, quantity_available + v_res.quantity),
          updated_at = timezone('utc'::text, now())
      WHERE id = v_res.resource_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'handoff_id', v_handoff.id,
    'status', 'RETURNED',
    'resource_status', v_new_status,
    'handoff', jsonb_build_object(
      'id', v_handoff.id,
      'reservation_id', p_reservation_id,
      'resource_id', v_res.resource_id,
      'booking_id', v_res.booking_id,
      'employee_id', v_returned_by,
      'returned_by_staff', v_returned_by,
      'received_return_by', auth.uid(),
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

-- 5. GRANTS
GRANT EXECUTE ON FUNCTION public.assign_booking_staff_v2(UUID, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_staff_for_booking(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.checkout_booking_resource(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.return_booking_resource(UUID, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.assign_booking_staff_v2 IS 'Assigns staff to booking with strict customer exclusion and staff role qualification';
COMMENT ON FUNCTION public.get_available_staff_for_booking IS 'Authoritative staff availability with working hours (ISO DOW 1..7) and shift schedules';
COMMENT ON FUNCTION public.checkout_booking_resource IS 'Checks out booking resource with strict state machine (RESERVED only) and serialized vs quantity accounting';
COMMENT ON FUNCTION public.return_booking_resource IS 'Returns booking resource with strict state machine (CHECKED_OUT only), active handoff requirement, and isolated damage accounting';
