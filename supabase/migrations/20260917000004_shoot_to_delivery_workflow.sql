-- ==============================================================================
-- Maison MIPA Memories - Migration #22: Shoot to Delivery Workflow V1
-- Migration: 20260917000004_shoot_to_delivery_workflow.sql
-- Description:
--   - Adds AWAITING_SELECTION status to bookings table.
--   - Adds photo selection metadata columns to bookings.
--   - Adds raw_folder_id, proofs_folder_id, final_folder_id, and asset counts to booking_deliveries.
--   - Creates booking_proof_images table for Google Drive indexed proof photos.
--   - Creates booking_photo_selections table for customer selected retouch photos.
--   - Implements authoritative RPCs:
--       * check_in_booking
--       * start_booking_shoot
--       * complete_booking_shoot
--       * submit_photo_selection
--       * reopen_photo_selection
--       * request_booking_revision
--       * complete_booking_editing
--       * complete_booking
--   - Updates update_booking_status to support AWAITING_SELECTION and manager selection skip.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Update Booking Status Constraint to include AWAITING_SELECTION
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS bookings_booking_status_check;

ALTER TABLE public.bookings
ADD CONSTRAINT bookings_booking_status_check CHECK (
  booking_status IN (
    'DRAFT', 'PENDING_PAYMENT', 'DEPOSIT_PAID', 'CONFIRMED', 'CHECKED_IN',
    'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW',
    'DELIVERED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED',
    'CONSULTATION_REQUESTED', 'CONSULTING'
  )
);

-- ------------------------------------------------------------------------------
-- 2. Add Selection & Delivery Metadata Columns to Bookings
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS selection_limit INTEGER;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS selection_submitted_at TIMESTAMPTZ;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS selection_submitted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS revision_notes TEXT;

CREATE INDEX IF NOT EXISTS idx_bookings_selection_submitted_at ON public.bookings(selection_submitted_at);

-- ------------------------------------------------------------------------------
-- 3. Extend booking_deliveries with Subfolder IDs & Counts
-- ------------------------------------------------------------------------------
ALTER TABLE public.booking_deliveries
ADD COLUMN IF NOT EXISTS raw_folder_id TEXT;

ALTER TABLE public.booking_deliveries
ADD COLUMN IF NOT EXISTS proofs_folder_id TEXT;

ALTER TABLE public.booking_deliveries
ADD COLUMN IF NOT EXISTS final_folder_id TEXT;

ALTER TABLE public.booking_deliveries
ADD COLUMN IF NOT EXISTS final_folder_url TEXT;

ALTER TABLE public.booking_deliveries
ADD COLUMN IF NOT EXISTS proof_file_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.booking_deliveries
ADD COLUMN IF NOT EXISTS final_file_count INTEGER NOT NULL DEFAULT 0;

-- ------------------------------------------------------------------------------
-- 4. Table: public.booking_proof_images
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_proof_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  width INTEGER,
  height INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  preview_url TEXT,
  thumbnail_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (booking_id, drive_file_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_proofs_booking_id ON public.booking_proof_images(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_proofs_active ON public.booking_proof_images(active);

ALTER TABLE public.booking_proof_images ENABLE ROW LEVEL SECURITY;

-- Customer can read active proof images for their own booking
DROP POLICY IF EXISTS "Customer reads own booking proofs" ON public.booking_proof_images;
CREATE POLICY "Customer reads own booking proofs" ON public.booking_proof_images
  FOR SELECT TO authenticated
  USING (
    active = true AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.booking_status IN ('AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED')
    )
  );

-- Staff/Manager/Admin can read all proofs
DROP POLICY IF EXISTS "Staff and management read booking proofs" ON public.booking_proof_images;
CREATE POLICY "Staff and management read booking proofs" ON public.booking_proof_images
  FOR SELECT TO authenticated
  USING (
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') OR
    public.is_root_owner()
  );

-- Management can insert/update/delete proofs
DROP POLICY IF EXISTS "Management manage booking proofs" ON public.booking_proof_images;
CREATE POLICY "Management manage booking proofs" ON public.booking_proof_images
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner()
  )
  WITH CHECK (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner()
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role manages booking proofs" ON public.booking_proof_images;
CREATE POLICY "Service role manages booking proofs" ON public.booking_proof_images
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 5. Table: public.booking_photo_selections
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_photo_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  proof_image_id UUID NOT NULL REFERENCES public.booking_proof_images(id) ON DELETE CASCADE,
  selected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  notes TEXT,
  UNIQUE (booking_id, proof_image_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_selections_booking_id ON public.booking_photo_selections(booking_id);
CREATE INDEX IF NOT EXISTS idx_photo_selections_proof_id ON public.booking_photo_selections(proof_image_id);

ALTER TABLE public.booking_photo_selections ENABLE ROW LEVEL SECURITY;

-- Customer can read and mutate selections for their own booking when AWAITING_SELECTION
DROP POLICY IF EXISTS "Customer reads own photo selections" ON public.booking_photo_selections;
CREATE POLICY "Customer reads own photo selections" ON public.booking_photo_selections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Customer manages photo selections during AWAITING_SELECTION" ON public.booking_photo_selections;
CREATE POLICY "Customer manages photo selections during AWAITING_SELECTION" ON public.booking_photo_selections
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.booking_status = 'AWAITING_SELECTION'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND b.customer_id = auth.uid()
        AND b.booking_status = 'AWAITING_SELECTION'
    )
  );

-- Staff and management can read selections
DROP POLICY IF EXISTS "Staff and management read photo selections" ON public.booking_photo_selections;
CREATE POLICY "Staff and management read photo selections" ON public.booking_photo_selections
  FOR SELECT TO authenticated
  USING (
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') OR
    public.is_root_owner()
  );

-- Management can manage selections
DROP POLICY IF EXISTS "Management manage photo selections" ON public.booking_photo_selections;
CREATE POLICY "Management manage photo selections" ON public.booking_photo_selections
  FOR ALL TO authenticated
  USING (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner()
  )
  WITH CHECK (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner()
  );

-- Service role full access
DROP POLICY IF EXISTS "Service role manages photo selections" ON public.booking_photo_selections;
CREATE POLICY "Service role manages photo selections" ON public.booking_photo_selections
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 6. Authoritative RPC: check_in_booking
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

  -- Role authorization
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
      staff_note = COALESCE(p_note, staff_note),
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

  RETURN jsonb_build_object('success', true, 'booking_status', 'CHECKED_IN');
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. Authoritative RPC: start_booking_shoot
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
    RAISE EXCEPTION 'Access Denied: Customers cannot start shooting.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  -- Role authorization
  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role = 'PHOTOGRAPHER' AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: Photographer is not assigned to this booking.' USING ERRCODE = '42501';
    ELSIF v_caller_staff_role NOT IN ('PHOTOGRAPHER', 'MANAGER', 'ADMIN') AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: Not authorized to start shoot.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'CHECKED_IN' THEN
    RAISE EXCEPTION 'Invalid status transition: Only CHECKED_IN bookings can start shooting (current: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'SHOOTING',
      staff_note = COALESCE(p_note, staff_note),
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

  RETURN jsonb_build_object('success', true, 'booking_status', 'SHOOTING');
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. Authoritative RPC: complete_booking_shoot
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
    RAISE EXCEPTION 'Access Denied: Customers cannot complete shoot.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  -- Role authorization
  IF v_caller_role = 'STAFF' THEN
    IF v_caller_staff_role = 'PHOTOGRAPHER' AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: Photographer is not assigned to this booking.' USING ERRCODE = '42501';
    ELSIF v_caller_staff_role NOT IN ('PHOTOGRAPHER', 'MANAGER', 'ADMIN') AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: Not authorized to complete shoot.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'SHOOTING' THEN
    RAISE EXCEPTION 'Invalid status transition: Only SHOOTING bookings can be marked complete (current: %).', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'SHOOT_COMPLETED',
      staff_note = COALESCE(p_note, staff_note),
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

  RETURN jsonb_build_object('success', true, 'booking_status', 'SHOOT_COMPLETED');
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. Authoritative RPC: submit_photo_selection
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_photo_selection(
  p_booking_id UUID,
  p_selected_proof_ids UUID[],
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
  v_pkg RECORD;
  v_limit INTEGER;
  v_selected_count INTEGER;
  v_proof_id UUID;
  v_assigned_editor_id UUID;
  v_unique_count INTEGER;
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

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Verify ownership or manager/admin
  IF v_caller_role = 'CUSTOMER' AND v_booking.customer_id != v_caller_id THEN
    RAISE EXCEPTION 'Access Denied: You do not own this booking.' USING ERRCODE = '42501';
  END IF;

  -- Idempotency check: if already EDITING and has selections, check if exact same call
  IF v_booking.booking_status = 'EDITING' AND v_booking.selection_submitted_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'booking_status', 'EDITING',
      'idempotent', true,
      'selection_count', cardinality(p_selected_proof_ids)
    );
  END IF;

  IF v_booking.booking_status != 'AWAITING_SELECTION' THEN
    RAISE EXCEPTION 'Cannot submit selections: Booking is in status "%", expected "AWAITING_SELECTION".', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- Determine authoritative selection limit
  SELECT * INTO v_pkg FROM public.packages WHERE id = v_booking.package_id;
  v_limit := COALESCE(v_booking.selection_limit, v_pkg.edited_photos_count, 10);

  -- Validate selection array
  v_selected_count := cardinality(p_selected_proof_ids);
  IF v_selected_count IS NULL OR v_selected_count = 0 THEN
    RAISE EXCEPTION 'Vui lòng chọn ít nhất 1 ảnh trước khi gửi.' USING ERRCODE = 'P0003';
  END IF;

  -- Prevent duplicates in input array
  SELECT COUNT(DISTINCT elem) INTO v_unique_count FROM unnest(p_selected_proof_ids) AS elem;
  IF v_unique_count != v_selected_count THEN
    RAISE EXCEPTION 'Danh sách ảnh chọn chứa ảnh trùng lặp.' USING ERRCODE = 'P0003';
  END IF;

  -- Server-side selection limit enforcement
  IF v_selected_count > v_limit THEN
    RAISE EXCEPTION 'Vượt quá số lượng ảnh được chọn (đã chọn % / tối đa % ảnh).', v_selected_count, v_limit USING ERRCODE = 'P0003';
  END IF;

  -- Verify all proofs belong to this booking and are active
  IF EXISTS (
    SELECT 1 FROM unnest(p_selected_proof_ids) AS pid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.booking_proof_images p
      WHERE p.id = pid AND p.booking_id = p_booking_id AND p.active = true
    )
  ) THEN
    RAISE EXCEPTION 'Một hoặc nhiều ảnh chọn không hợp lệ hoặc không thuộc đơn đặt lịch này.' USING ERRCODE = 'P0003';
  END IF;

  -- Persist selections idempotently
  DELETE FROM public.booking_photo_selections WHERE booking_id = p_booking_id;

  FOREACH v_proof_id IN ARRAY p_selected_proof_ids LOOP
    INSERT INTO public.booking_photo_selections (
      booking_id, proof_image_id, selected_by, selected_at, notes
    ) VALUES (
      p_booking_id, v_proof_id, v_caller_id, timezone('utc'::text, now()), p_notes
    );
  END LOOP;

  -- Update booking state to EDITING
  UPDATE public.bookings
  SET booking_status = 'EDITING',
      selection_limit = v_limit,
      selection_submitted_at = timezone('utc'::text, now()),
      selection_submitted_by = v_caller_id,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Find assigned editor to create or update staff task
  SELECT employee_id INTO v_assigned_editor_id
  FROM public.booking_assignments
  WHERE booking_id = p_booking_id AND assignment_role = 'EDITOR'
  LIMIT 1;

  IF v_assigned_editor_id IS NOT NULL THEN
    INSERT INTO public.staff_tasks (
      booking_id, employee_id, task_type, title, status, notes
    ) VALUES (
      p_booking_id, v_assigned_editor_id, 'RETOUCH',
      'Hậu kỳ ' || v_selected_count || ' ảnh — ' || v_booking.booking_code,
      'TODO', p_notes
    );
  END IF;

  -- Audit log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'SELECTION_SUBMITTED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object(
      'booking_status', 'EDITING',
      'selected_count', v_selected_count,
      'selection_limit', v_limit
    ),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_status', 'EDITING',
    'selection_count', v_selected_count,
    'selection_limit', v_limit
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. Authoritative RPC: reopen_photo_selection
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
  v_booking RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can reopen customer selection.' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Lý do mở lại chọn ảnh là bắt buộc.' USING ERRCODE = 'P0003';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status NOT IN ('EDITING', 'READY_FOR_REVIEW') THEN
    RAISE EXCEPTION 'Cannot reopen selection for booking in status "%".' , v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'AWAITING_SELECTION',
      staff_note = COALESCE(staff_note || E'\n', '') || '[MỞ LẠI CHỌN ẢNH]: ' || p_reason,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'SELECTION_REOPENED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'AWAITING_SELECTION', 'reason', p_reason),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object('success', true, 'booking_status', 'AWAITING_SELECTION');
END;
$$;

-- ------------------------------------------------------------------------------
-- 11. Authoritative RPC: request_booking_revision
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
  v_booking RECORD;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can request revision.' USING ERRCODE = '42501';
  END IF;

  IF p_revision_notes IS NULL OR trim(p_revision_notes) = '' THEN
    RAISE EXCEPTION 'Ghi chú yêu cầu chỉnh sửa là bắt buộc.' USING ERRCODE = 'P0003';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status != 'READY_FOR_REVIEW' THEN
    RAISE EXCEPTION 'Cannot request revision: Booking status is "%", expected "READY_FOR_REVIEW".', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'EDITING',
      revision_notes = p_revision_notes,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Update existing editor task if present
  UPDATE public.staff_tasks
  SET status = 'IN_PROGRESS',
      notes = COALESCE(notes || E'\n', '') || '[YÊU CẦU CHỈNH SỬA]: ' || p_revision_notes,
      updated_at = timezone('utc'::text, now())
  WHERE booking_id = p_booking_id AND task_type = 'RETOUCH';

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'REVISION_REQUESTED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'EDITING', 'revision_notes', p_revision_notes),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object('success', true, 'booking_status', 'EDITING');
END;
$$;

-- ------------------------------------------------------------------------------
-- 12. Authoritative RPC: complete_booking_editing
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_booking_editing(
  p_booking_id UUID,
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
  v_caller_staff_role TEXT;
  v_booking RECORD;
  v_delivery RECORD;
  v_is_assigned BOOLEAN := false;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role INTO v_caller_role, v_caller_staff_role FROM public.profiles WHERE id = v_caller_id;

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
    IF v_caller_staff_role = 'EDITOR' AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: Editor is not assigned to this booking.' USING ERRCODE = '42501';
    ELSIF v_caller_staff_role NOT IN ('EDITOR', 'MANAGER', 'ADMIN') AND NOT v_is_assigned THEN
      RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'EDITING' THEN
    RAISE EXCEPTION 'Cannot complete editing: Booking is in status "%", expected "EDITING".', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  -- Fail-closed check: Final files must exist
  SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
  IF v_delivery IS NULL OR COALESCE(v_delivery.final_file_count, 0) <= 0 THEN
    RAISE EXCEPTION 'Chưa có ảnh hoàn thiện trong thư mục 03_FINAL. Vui lòng tải ảnh lên Google Drive và đồng bộ trước khi gửi duyệt.' USING ERRCODE = 'P0005';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'READY_FOR_REVIEW',
      staff_note = COALESCE(p_notes, staff_note),
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Update editor task status to DONE
  UPDATE public.staff_tasks
  SET status = 'DONE',
      updated_at = timezone('utc'::text, now())
  WHERE booking_id = p_booking_id AND task_type = 'RETOUCH';

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'EDITING_READY_FOR_REVIEW',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'READY_FOR_REVIEW', 'final_file_count', v_delivery.final_file_count),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object('success', true, 'booking_status', 'READY_FOR_REVIEW');
END;
$$;

-- ------------------------------------------------------------------------------
-- 13. Authoritative RPC: complete_booking
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_booking(
  p_booking_id UUID
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
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Allow customer acknowledgement or management completion
  IF v_caller_role = 'CUSTOMER' AND v_booking.customer_id != v_caller_id THEN
    RAISE EXCEPTION 'Access Denied: You do not own this booking.' USING ERRCODE = '42501';
  ELSIF v_caller_role NOT IN ('CUSTOMER', 'MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Insufficient permissions.' USING ERRCODE = '42501';
  END IF;

  IF v_booking.booking_status != 'DELIVERED' THEN
    RAISE EXCEPTION 'Cannot complete booking: Booking is in status "%", expected "DELIVERED".', v_booking.booking_status USING ERRCODE = '22023';
  END IF;

  UPDATE public.bookings
  SET booking_status = 'COMPLETED',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', p_booking_id, 'BOOKING_COMPLETED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'COMPLETED'),
    timezone('utc'::text, now())
  );

  RETURN jsonb_build_object('success', true, 'booking_status', 'COMPLETED');
END;
$$;

-- ------------------------------------------------------------------------------
-- 14. Update public.update_booking_status for Workflow V1 Support
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
  v_is_assigned BOOLEAN := false;
  v_delivery RECORD;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, staff_role, status
  INTO v_caller_role, v_caller_staff_role, v_caller_status
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Your account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.booking_assignments
    WHERE booking_id = p_booking_id AND employee_id = v_caller_id
  ) INTO v_is_assigned;

  -- ABAC Checks
  IF v_caller_role = 'CUSTOMER' THEN
    IF p_new_status = 'COMPLETED' AND v_booking.booking_status = 'DELIVERED' AND v_booking.customer_id = v_caller_id THEN
      NULL; -- Allowed customer delivery acknowledgment
    ELSE
      RAISE EXCEPTION 'Access Denied: Customers cannot directly mutate operational booking status.' USING ERRCODE = '42501';
    END IF;

  ELSIF v_caller_role = 'STAFF' THEN
    IF p_new_status IN ('DEPOSIT_PAID', 'PENDING_PAYMENT', 'CANCELLED', 'CONFIRMED', 'CONSULTATION_REQUESTED', 'CONSULTING') THEN
      RAISE EXCEPTION 'Access Denied: Staff cannot mutate payment, consultation or confirmation state.' USING ERRCODE = '42501';
    END IF;

    IF v_caller_staff_role = 'RECEPTIONIST' THEN
      IF v_booking.booking_status = 'CONFIRMED' AND p_new_status = 'CHECKED_IN' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Receptionist can only transition CONFIRMED -> CHECKED_IN.' USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'PHOTOGRAPHER' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Photographer is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
      IF v_booking.booking_status = 'CHECKED_IN' AND p_new_status = 'SHOOTING' THEN
        NULL;
      ELSIF v_booking.booking_status = 'SHOOTING' AND p_new_status = 'SHOOT_COMPLETED' THEN
        NULL;
      ELSE
        RAISE EXCEPTION 'Access Denied: Invalid photographer transition.' USING ERRCODE = '42501';
      END IF;

    ELSIF v_caller_staff_role = 'EDITOR' THEN
      IF NOT v_is_assigned THEN
        RAISE EXCEPTION 'Access Denied: Editor is not assigned to this booking.' USING ERRCODE = '42501';
      END IF;
      IF v_booking.booking_status IN ('SHOOT_COMPLETED', 'AWAITING_SELECTION') AND p_new_status = 'EDITING' THEN
        NULL;
      ELSIF v_booking.booking_status = 'EDITING' AND p_new_status = 'READY_FOR_REVIEW' THEN
        -- Verify final assets exist before ready for review
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
    -- Transition to CONFIRMED must happen through confirm_booking_deposit RPC
    IF p_new_status = 'CONFIRMED' AND v_booking.booking_status IN ('CONSULTATION_REQUESTED', 'CONSULTING') THEN
      RAISE EXCEPTION 'Xác nhận đơn đặt lịch từ trạng thái tư vấn phải thông qua quy trình xác nhận nhận cọc (confirm_booking_deposit).' USING ERRCODE = '42501';
    END IF;

    -- Revision path: READY_FOR_REVIEW -> EDITING requires note
    IF v_booking.booking_status = 'READY_FOR_REVIEW' AND p_new_status = 'EDITING' THEN
      IF p_staff_note IS NULL OR trim(p_staff_note) = '' THEN
        RAISE EXCEPTION 'Yêu cầu chỉnh sửa cần có ghi chú chi tiết.' USING ERRCODE = 'P0003';
      END IF;
    END IF;

    -- Skip customer selection: SHOOT_COMPLETED -> EDITING requires note
    IF v_booking.booking_status = 'SHOOT_COMPLETED' AND p_new_status = 'EDITING' THEN
      IF p_staff_note IS NULL OR trim(p_staff_note) = '' THEN
        RAISE EXCEPTION 'Bỏ qua bước chọn ảnh cần có lý do trong ghi chú nhân viên.' USING ERRCODE = 'P0003';
      END IF;
    END IF;

    -- Check final files before READY_FOR_REVIEW
    IF p_new_status = 'READY_FOR_REVIEW' THEN
      SELECT * INTO v_delivery FROM public.booking_deliveries WHERE booking_id = p_booking_id;
      IF v_delivery IS NULL OR COALESCE(v_delivery.final_file_count, 0) <= 0 THEN
        RAISE EXCEPTION 'Chưa có ảnh hoàn thiện trong thư mục 03_FINAL.' USING ERRCODE = 'P0005';
      END IF;
    END IF;

    IF v_booking.booking_status = 'COMPLETED' AND p_new_status IN ('DRAFT', 'PENDING_PAYMENT', 'CONSULTATION_REQUESTED', 'CONSULTING') THEN
      RAISE EXCEPTION 'Illegal state transition from COMPLETED to %', p_new_status USING ERRCODE = '22023';
    END IF;

  ELSE
    RAISE EXCEPTION 'Access Denied: Unrecognized role.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET booking_status = p_new_status,
      staff_note = COALESCE(p_staff_note, staff_note),
      revision_notes = CASE WHEN v_booking.booking_status = 'READY_FOR_REVIEW' AND p_new_status = 'EDITING' THEN p_staff_note ELSE revision_notes END,
      updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

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
      WHEN v_booking.booking_status = 'SHOOT_COMPLETED' AND p_new_status = 'EDITING' THEN 'SELECTION_SKIPPED'
      WHEN p_new_status = 'READY_FOR_REVIEW' THEN 'EDITING_READY_FOR_REVIEW'
      WHEN p_new_status = 'COMPLETED' THEN 'BOOKING_COMPLETED'
      ELSE 'BOOKING_STATUS_UPDATED'
    END,
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', p_new_status, 'staff_note', p_staff_note),
    timezone('utc'::text, now())
  );

  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'booking_status', b.booking_status,
    'staff_note', b.staff_note,
    'updated_at', b.updated_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 15. Grants
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_proof_images TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_photo_selections TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.check_in_booking(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_booking_shoot(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_shoot(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_photo_selection(UUID, UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_photo_selection(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_booking_revision(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking_editing(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_booking(UUID) TO authenticated, service_role;
