-- ==============================================================================
-- Maison MIPA Memories - Migration #23: Full Product Completion & Security Hardening
-- Migration: 20260917000005_full_product_completion_hardening.sql
-- Description:
--   1. Restricts direct table mutations on booking_photo_selections from customers.
--      Customer selection mutations MUST go through authoritative submit_photo_selection RPC.
--   2. Hardens submit_photo_selection RPC:
--      - Validates active authenticated actor.
--      - Validates ownership or management authorization.
--      - Locks booking row FOR UPDATE.
--      - Enforces selection limit derived from packages.edited_photos_count.
--      - Validates all proof IDs belong to booking, are active, and deduplicated.
--      - Idempotent replace & atomic transition to EDITING.
--      - Returns complete authoritative booking row JSONB.
--   3. Hardens update_booking_status with explicit transition matrix:
--      - Rejects generic transition to CONFIRMED (must use confirm_booking_deposit).
--      - Rejects generic transition to DELIVERED (must use drive-delivery MARK_READY).
--      - Strictly validates valid transitions per role.
--      - Returns complete authoritative booking row JSONB.
--   4. Normalizes all lifecycle RPCs to return complete authoritative booking row JSONB:
--      - check_in_booking
--      - start_booking_shoot
--      - complete_booking_shoot
--      - reopen_photo_selection
--      - request_booking_revision
--      - complete_booking_editing
--      - complete_booking (adds optional p_note parameter)
--   5. Adds unique index on notification_outbox(idempotency_key) for strict delivery email deduplication.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Selection Table RLS Hardening (Revoke customer direct mutation)
-- ------------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.booking_photo_selections FROM authenticated;
GRANT SELECT ON public.booking_photo_selections TO authenticated;
GRANT ALL ON public.booking_photo_selections TO service_role;

-- Drop customer mutation policy if present
DROP POLICY IF EXISTS "Customer manages photo selections during AWAITING_SELECTION" ON public.booking_photo_selections;

-- Ensure Customer can ONLY select own selections
DROP POLICY IF EXISTS "Customer reads own photo selections" ON public.booking_photo_selections;
CREATE POLICY "Customer reads own photo selections" ON public.booking_photo_selections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
    ) OR
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') OR
    public.is_root_owner()
  );

-- Management can view all selections
DROP POLICY IF EXISTS "Management view all selections" ON public.booking_photo_selections;
CREATE POLICY "Management view all selections" ON public.booking_photo_selections
  FOR SELECT TO authenticated
  USING (
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') OR
    public.is_root_owner()
  );

-- Service role has full access
DROP POLICY IF EXISTS "Service role manages selections" ON public.booking_photo_selections;
CREATE POLICY "Service role manages selections" ON public.booking_photo_selections
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. Unique Index on notification_outbox(idempotency_key)
-- ------------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_outbox_idempotency_unique
  ON public.notification_outbox(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ------------------------------------------------------------------------------
-- Helper function to fetch complete authoritative booking row as JSONB
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_authoritative_booking_jsonb(p_booking_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT row_to_json(b.*)::jsonb
  FROM (
    SELECT
      b.*,
      p.full_name AS customer_name,
      p.email AS customer_email,
      p.phone AS customer_phone,
      pkg.name AS package_name,
      pkg.edited_photos_count AS package_edited_photos_count,
      srv.name AS service_name,
      r.name AS studio_room_name,
      del.id AS delivery_id,
      del.status AS delivery_status,
      del.drive_folder_id,
      del.drive_folder_url,
      del.final_folder_id,
      del.final_folder_url,
      del.proof_file_count,
      del.final_file_count,
      COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', asg.id,
            'booking_id', asg.booking_id,
            'employee_id', asg.employee_id,
            'employee_name', COALESCE(emp_prof.full_name, emp.full_name, 'Chuyên Viên MIPA'),
            'assignment_role', asg.assignment_role,
            'start_at', asg.start_at,
            'end_at', asg.end_at
          )
        )
        FROM public.booking_assignments asg
        LEFT JOIN public.employees emp ON emp.id = asg.employee_id
        LEFT JOIN public.profiles emp_prof ON emp_prof.id = asg.employee_id
        WHERE asg.booking_id = b.id
      ), '[]'::jsonb) AS booking_assignments
    FROM public.bookings b
    LEFT JOIN public.profiles p ON p.id = b.customer_id
    LEFT JOIN public.packages pkg ON pkg.id = b.package_id
    LEFT JOIN public.services srv ON srv.id = b.service_id
    LEFT JOIN public.studio_rooms r ON r.id = b.studio_room_id
    LEFT JOIN public.booking_deliveries del ON del.booking_id = b.id
    WHERE b.id = p_booking_id
  ) b;
$$;

-- ------------------------------------------------------------------------------
-- 3. Authoritative RPC: submit_photo_selection
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_photo_selection(
  p_booking_id UUID,
  p_proof_ids UUID[],
  p_notes TEXT DEFAULT NULL
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
  v_package RECORD;
  v_effective_limit INTEGER;
  v_count INTEGER;
  v_valid_proofs_count INTEGER;
  v_deduped_ids UUID[];
  v_proof_id UUID;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  -- Lock booking row
  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Authorization check: customer must own the booking; or manager/admin
  IF v_caller_role = 'CUSTOMER' THEN
    IF v_booking.customer_id != v_caller_id THEN
      RAISE EXCEPTION 'Access Denied: You do not own this booking.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions to submit selection.' USING ERRCODE = '42501';
  END IF;

  -- Require AWAITING_SELECTION status
  IF v_booking.booking_status != 'AWAITING_SELECTION' THEN
    RAISE EXCEPTION 'Đơn đặt lịch không ở trạng thái chờ chọn ảnh (hiện tại: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- Determine authoritative selection limit (packages.edited_photos_count precedence)
  SELECT edited_photos_count INTO v_package
  FROM public.packages WHERE id = v_booking.package_id;

  v_effective_limit := COALESCE(
    v_booking.selection_limit,
    v_package.edited_photos_count,
    10
  );

  -- Deduplicate array of proof IDs
  SELECT ARRAY(SELECT DISTINCT unnest(p_proof_ids)) INTO v_deduped_ids;
  v_count := COALESCE(array_length(v_deduped_ids, 1), 0);

  IF v_count < 1 THEN
    RAISE EXCEPTION 'Vui lòng chọn ít nhất 1 ảnh để gửi hậu kỳ.' USING ERRCODE = '22023';
  END IF;

  IF v_count > v_effective_limit THEN
    RAISE EXCEPTION 'Selection count exceeds limit: Bạn đã chọn % ảnh, vượt quá giới hạn % ảnh cho phép.', v_count, v_effective_limit USING ERRCODE = '22023';
  END IF;

  -- Verify all proofs belong to this booking and are active
  SELECT COUNT(DISTINCT id) INTO v_valid_proofs_count
  FROM public.booking_proof_images
  WHERE booking_id = p_booking_id
    AND id = ANY(v_deduped_ids)
    AND active = true;

  IF v_valid_proofs_count != v_count THEN
    RAISE EXCEPTION 'Selected proof photos do not belong to booking: Một số ảnh chọn không hợp lệ hoặc không thuộc đơn này.' USING ERRCODE = '22023';
  END IF;

  -- Atomically persist selections (clear previous draft if any, then insert)
  DELETE FROM public.booking_photo_selections WHERE booking_id = p_booking_id;

  FOREACH v_proof_id IN ARRAY v_deduped_ids LOOP
    INSERT INTO public.booking_photo_selections (
      booking_id, proof_image_id, selected_by, selected_at, notes
    ) VALUES (
      p_booking_id, v_proof_id, v_caller_id, timezone('utc'::text, now()), p_notes
    );
  END LOOP;

  -- Update booking state
  UPDATE public.bookings
  SET booking_status = 'EDITING',
      selection_submitted_at = timezone('utc'::text, now()),
      selection_submitted_by = v_caller_id,
      selection_limit = v_effective_limit,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Write audit log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'SELECTION_SUBMITTED',
    jsonb_build_object('booking_status', 'AWAITING_SELECTION'),
    jsonb_build_object('booking_status', 'EDITING', 'selected_count', v_count, 'limit', v_effective_limit),
    timezone('utc'::text, now())
  );

  -- Create editor task idempotently
  INSERT INTO public.staff_tasks (
    booking_id, title, task_type, status, priority, description, created_at, updated_at
  ) VALUES (
    p_booking_id,
    'Post-production — ' || v_booking.booking_code,
    'EDITING',
    'PENDING',
    'HIGH',
    'Khách hàng đã hoàn tất chọn ' || v_count || ' ảnh cho bộ ảnh ' || v_booking.booking_code || '.',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  ON CONFLICT DO NOTHING;

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Authoritative RPC: check_in_booking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_in_booking(
  p_booking_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_staff_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role, status INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot check-in bookings.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role != 'RECEPTIONIST' AND NOT v_is_assigned AND v_caller_staff_role != 'MANAGER' THEN
      RAISE EXCEPTION 'Access Denied: Not authorized to check-in this booking.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'CONFIRMED' THEN
    RAISE EXCEPTION 'Invalid status transition: Only CONFIRMED bookings can be checked in (current: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'CHECKED_IN',
      staff_note = CASE WHEN p_note IS NOT NULL THEN p_note ELSE staff_note END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'BOOKING_CHECKED_IN',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'CHECKED_IN', 'note', p_note),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. Authoritative RPC: start_booking_shoot
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_booking_shoot(
  p_booking_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_staff_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role, status INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot start shoots.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role != 'PHOTOGRAPHER' AND NOT v_is_assigned AND v_caller_staff_role != 'MANAGER' THEN
      RAISE EXCEPTION 'Access Denied: Not authorized to start shoot for this booking.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'CHECKED_IN' THEN
    RAISE EXCEPTION 'Invalid status transition: Only CHECKED_IN bookings can begin shooting (current: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'SHOOTING',
      staff_note = CASE WHEN p_note IS NOT NULL THEN p_note ELSE staff_note END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'SHOOT_STARTED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'SHOOTING', 'note', p_note),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. Authoritative RPC: complete_booking_shoot
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_booking_shoot(
  p_booking_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_caller_staff_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role, status INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot complete shoots.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role != 'PHOTOGRAPHER' AND NOT v_is_assigned AND v_caller_staff_role != 'MANAGER' THEN
      RAISE EXCEPTION 'Access Denied: Not authorized to complete shoot for this booking.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'SHOOTING' THEN
    RAISE EXCEPTION 'Invalid status transition: Only SHOOTING bookings can be completed (current: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'SHOOT_COMPLETED',
      staff_note = CASE WHEN p_note IS NOT NULL THEN p_note ELSE staff_note END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'SHOOT_COMPLETED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'SHOOT_COMPLETED', 'note', p_note),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Authoritative RPC: reopen_photo_selection
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reopen_photo_selection(
  p_booking_id UUID,
  p_reason TEXT
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
BEGIN
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
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can reopen photo selection.' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Lý do mở lại chọn ảnh là bắt buộc.' USING ERRCODE = 'P0003';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status NOT IN ('EDITING', 'READY_FOR_REVIEW') THEN
    RAISE EXCEPTION 'Không thể mở lại chọn ảnh khi đơn đang ở trạng thái %.', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'AWAITING_SELECTION',
      staff_note = COALESCE(staff_note, '') || E'\n[Mở lại chọn ảnh]: ' || trim(p_reason),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'SELECTION_REOPENED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'AWAITING_SELECTION', 'reason', trim(p_reason)),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. Authoritative RPC: request_booking_revision
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_booking_revision(
  p_booking_id UUID,
  p_revision_notes TEXT
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
BEGIN
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
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can request revisions.' USING ERRCODE = '42501';
  END IF;

  IF p_revision_notes IS NULL OR trim(p_revision_notes) = '' THEN
    RAISE EXCEPTION 'Ghi chú yêu cầu chỉnh sửa là bắt buộc.' USING ERRCODE = 'P0003';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status != 'READY_FOR_REVIEW' THEN
    RAISE EXCEPTION 'Chỉ có thể yêu cầu chỉnh sửa khi đơn đang ở trạng thái READY_FOR_REVIEW (hiện tại: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'EDITING',
      revision_notes = trim(p_revision_notes),
      staff_note = COALESCE(staff_note, '') || E'\n[Yêu cầu chỉnh sửa]: ' || trim(p_revision_notes),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'REVISION_REQUESTED',
    jsonb_build_object('booking_status', 'READY_FOR_REVIEW'),
    jsonb_build_object('booking_status', 'EDITING', 'revision_notes', trim(p_revision_notes)),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. Authoritative RPC: complete_booking_editing
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_booking_editing(
  p_booking_id UUID,
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
  v_caller_staff_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_delivery RECORD;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role, status INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot complete editing.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role != 'EDITOR' AND NOT v_is_assigned AND v_caller_staff_role != 'MANAGER' THEN
      RAISE EXCEPTION 'Access Denied: Not authorized to complete editing for this booking.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'EDITING' THEN
    RAISE EXCEPTION 'Chỉ có thể hoàn tất hậu kỳ khi đơn ở trạng thái EDITING (hiện tại: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- Verify 03_FINAL has deliverables
  SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
  IF v_delivery IS NULL OR COALESCE(v_delivery.final_file_count, 0) <= 0 THEN
    RAISE EXCEPTION 'Chưa có ảnh hoàn thiện trong thư mục 03_FINAL. Vui lòng đồng bộ ảnh final trước khi duyệt.' USING ERRCODE = 'P0005';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'READY_FOR_REVIEW',
      staff_note = CASE WHEN p_staff_note IS NOT NULL THEN p_staff_note ELSE staff_note END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'EDITING_READY_FOR_REVIEW',
    jsonb_build_object('booking_status', 'EDITING'),
    jsonb_build_object('booking_status', 'READY_FOR_REVIEW', 'note', p_staff_note),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. Authoritative RPC: complete_booking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_booking(
  p_booking_id UUID,
  p_note TEXT DEFAULT NULL
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
BEGIN
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
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can mark booking as COMPLETED.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status != 'DELIVERED' THEN
    RAISE EXCEPTION 'Chỉ có thể đánh dấu hoàn tất khi đơn đã ở trạng thái DELIVERED (hiện tại: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'COMPLETED',
      staff_note = CASE WHEN p_note IS NOT NULL THEN p_note ELSE staff_note END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'BOOKING_COMPLETED',
    jsonb_build_object('booking_status', 'DELIVERED'),
    jsonb_build_object('booking_status', 'COMPLETED', 'note', p_note),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. Authoritative RPC: update_booking_status (Explicit State Machine Matrix)
-- ------------------------------------------------------------------------------
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
  v_caller_staff_role TEXT;
  v_caller_status TEXT;
  v_booking RECORD;
  v_delivery RECORD;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role, status INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role = 'CUSTOMER' THEN
    RAISE EXCEPTION 'Access Denied: Customers cannot update booking status directly.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- 1. Hardened Restrictions: CONFIRMED and DELIVERED cannot be set generically
  IF p_new_status = 'CONFIRMED' THEN
    RAISE EXCEPTION 'Xác nhận đơn đặt lịch phải thông qua quy trình xác nhận nhận cọc (confirm_booking_deposit).' USING ERRCODE = '42501';
  END IF;

  IF p_new_status = 'DELIVERED' THEN
    RAISE EXCEPTION 'Bàn giao bộ ảnh phải thông qua quy trình duyệt & bàn giao Google Drive (MARK_READY).' USING ERRCODE = '42501';
  END IF;

  -- 2. Terminal states check
  IF v_booking.booking_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Không thể chuyển trạng thái từ đơn đã kết thúc (% -> %).', v_booking.booking_status, p_new_status USING ERRCODE = '22023';
  END IF;

  -- 3. Check staff assignment
  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  -- 4. Explicit Transition Matrix
  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role = 'RECEPTIONIST' THEN
      IF v_booking.booking_status = 'CONFIRMED' AND p_new_status = 'CHECKED_IN' THEN
        -- Allowed check-in
      ELSE
        RAISE EXCEPTION 'Access Denied: Receptionist can only transition CONFIRMED -> CHECKED_IN.' USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'PHOTOGRAPHER' THEN
      IF NOT v_is_assigned AND v_caller_role != 'MANAGER' THEN
        RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
      END IF;

      IF v_booking.booking_status = 'CHECKED_IN' AND p_new_status = 'SHOOTING' THEN
        -- Start shoot
      ELSIF v_booking.booking_status = 'SHOOTING' AND p_new_status = 'SHOOT_COMPLETED' THEN
        -- Complete shoot
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid photographer transition.' USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'EDITOR' THEN
      IF NOT v_is_assigned AND v_caller_role != 'MANAGER' THEN
        RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
      END IF;

      IF v_booking.booking_status = 'EDITING' AND p_new_status = 'READY_FOR_REVIEW' THEN
        -- Check final deliverables
        SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
        IF v_delivery IS NULL OR COALESCE(v_delivery.final_file_count, 0) <= 0 THEN
          RAISE EXCEPTION 'Chưa có ảnh hoàn thiện trong thư mục 03_FINAL.' USING ERRCODE = 'P0005';
        END IF;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid editor transition.' USING ERRCODE = '42501';
      END IF;

    ELSE
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: You are not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
    END IF;

  ELSIF v_caller_role IN ('MANAGER', 'ADMIN') OR public.is_root_owner() THEN
    -- Explicit Manager/Admin Transition Matrix
    CASE v_booking.booking_status
      WHEN 'CONSULTATION_REQUESTED' THEN
        IF p_new_status NOT IN ('CONSULTING', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid transition from CONSULTATION_REQUESTED to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'CONSULTING' THEN
        IF p_new_status NOT IN ('CONSULTATION_REQUESTED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid transition from CONSULTING to %. (CONFIRMED requires confirm_booking_deposit)', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'CONFIRMED' THEN
        IF p_new_status NOT IN ('CHECKED_IN', 'RESCHEDULED', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid transition from CONFIRMED to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'CHECKED_IN' THEN
        IF p_new_status NOT IN ('SHOOTING', 'CANCELLED') THEN
          RAISE EXCEPTION 'Invalid transition from CHECKED_IN to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'SHOOTING' THEN
        IF p_new_status NOT IN ('SHOOT_COMPLETED') THEN
          RAISE EXCEPTION 'Invalid transition from SHOOTING to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'SHOOT_COMPLETED' THEN
        IF p_new_status = 'AWAITING_SELECTION' THEN
          -- Normal proof sync transition
        ELSIF p_new_status = 'EDITING' THEN
          -- Manager bypass selection
          IF p_staff_note IS NULL OR trim(p_staff_note) = '' THEN
            RAISE EXCEPTION 'Bỏ qua bước chọn ảnh cần có lý do trong ghi chú nhân viên.' USING ERRCODE = 'P0003';
          END IF;
        ELSE
          RAISE EXCEPTION 'Invalid transition from SHOOT_COMPLETED to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'AWAITING_SELECTION' THEN
        IF p_new_status = 'EDITING' THEN
          -- Manager bypass
          IF p_staff_note IS NULL OR trim(p_staff_note) = '' THEN
            RAISE EXCEPTION 'Bỏ qua bước chọn ảnh cần có lý do trong ghi chú nhân viên.' USING ERRCODE = 'P0003';
          END IF;
        ELSE
          RAISE EXCEPTION 'Invalid transition from AWAITING_SELECTION to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'EDITING' THEN
        IF p_new_status = 'READY_FOR_REVIEW' THEN
          SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
          IF v_delivery IS NULL OR COALESCE(v_delivery.final_file_count, 0) <= 0 THEN
            RAISE EXCEPTION 'Chưa có ảnh hoàn thiện trong thư mục 03_FINAL.' USING ERRCODE = 'P0005';
          END IF;
        ELSIF p_new_status = 'AWAITING_SELECTION' THEN
          IF p_staff_note IS NULL OR trim(p_staff_note) = '' THEN
            RAISE EXCEPTION 'Mở lại chọn ảnh cần có lý do trong ghi chú nhân viên.' USING ERRCODE = 'P0003';
          END IF;
        ELSE
          RAISE EXCEPTION 'Invalid transition from EDITING to %', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'READY_FOR_REVIEW' THEN
        IF p_new_status = 'EDITING' THEN
          -- Revision request
          IF p_staff_note IS NULL OR trim(p_staff_note) = '' THEN
            RAISE EXCEPTION 'Yêu cầu chỉnh sửa cần có ghi chú chi tiết.' USING ERRCODE = 'P0003';
          END IF;
        ELSE
          RAISE EXCEPTION 'Invalid transition from READY_FOR_REVIEW to %. (DELIVERED requires Drive delivery action)', p_new_status USING ERRCODE = '22023';
        END IF;

      WHEN 'DELIVERED' THEN
        IF p_new_status NOT IN ('COMPLETED') THEN
          RAISE EXCEPTION 'Invalid transition from DELIVERED to %', p_new_status USING ERRCODE = '22023';
        END IF;

      ELSE
        RAISE EXCEPTION 'Unknown current status: %', v_booking.booking_status USING ERRCODE = '22023';
    END CASE;

  ELSE
    RAISE EXCEPTION 'Access Denied: Unrecognized role.' USING ERRCODE = '42501';
  END IF;

  -- Apply update
  UPDATE public.bookings
  SET booking_status = p_new_status,
      staff_note = COALESCE(p_staff_note, staff_note),
      revision_notes = CASE WHEN v_booking.booking_status = 'READY_FOR_REVIEW' AND p_new_status = 'EDITING' THEN p_staff_note ELSE revision_notes END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Insert Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id,
    CASE
      WHEN p_new_status = 'CHECKED_IN' THEN 'BOOKING_CHECKED_IN'
      WHEN p_new_status = 'SHOOTING' THEN 'SHOOT_STARTED'
      WHEN p_new_status = 'SHOOT_COMPLETED' THEN 'SHOOT_COMPLETED'
      WHEN v_booking.booking_status = 'READY_FOR_REVIEW' AND p_new_status = 'EDITING' THEN 'REVISION_REQUESTED'
      WHEN v_booking.booking_status IN ('SHOOT_COMPLETED', 'AWAITING_SELECTION') AND p_new_status = 'EDITING' THEN 'SELECTION_SKIPPED'
      WHEN p_new_status = 'READY_FOR_REVIEW' THEN 'EDITING_READY_FOR_REVIEW'
      WHEN p_new_status = 'COMPLETED' THEN 'BOOKING_COMPLETED'
      ELSE 'BOOKING_STATUS_UPDATED'
    END,
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', p_new_status, 'staff_note', p_staff_note),
    timezone('utc'::text, now())
  );

  RETURN public.get_authoritative_booking_jsonb(p_booking_id);
END;
$$;

-- ------------------------------------------------------------------------------
-- 12. Function Grants
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.get_authoritative_booking_jsonb(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_photo_selection(UUID, UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_in_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_booking_shoot(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_shoot(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_photo_selection(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_booking_revision(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_editing(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_booking_status(UUID, TEXT, TEXT) TO authenticated, service_role;
