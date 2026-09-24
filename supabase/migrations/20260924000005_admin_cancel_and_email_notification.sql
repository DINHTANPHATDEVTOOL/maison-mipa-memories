-- ==============================================================================
-- Migration: 20260924000005_admin_cancel_and_email_notification.sql
-- Description:
-- 1. Adds cancel_booking_by_manager RPC: Allows MANAGER and ADMIN to cancel any
--    booking with mandatory reason, updates status to CANCELLED, and enqueues
--    rich cancellation email to customer into notification_outbox.
-- 2. Hardens request_booking_cancel RPC to enqueue customer ack email
--    (customer_cancel_request_ack) in addition to studio notification.
-- 3. Adds approve_booking_reschedule RPC to accept customer reschedule request,
--    update booking start_at/slot, and enqueue booking_rescheduled email.
-- ==============================================================================

-- 1. Manager/Admin Authoritative Cancellation RPC
CREATE OR REPLACE FUNCTION public.cancel_booking_by_manager(
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
  v_service_name TEXT;
  v_package_name TEXT;
  v_studio_name TEXT;
  v_payload JSONB;
  v_result JSONB;
  v_trimmed_reason TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Your account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Quyền hủy đơn chỉ dành cho Quản Lý hoặc Quản Trị Viên.' USING ERRCODE = '42501';
  END IF;

  v_trimmed_reason := trim(COALESCE(p_reason, ''));
  IF v_trimmed_reason = '' THEN
    RAISE EXCEPTION 'Lý do hủy lịch không được để trống.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_status = 'CANCELLED' THEN
    SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
    RETURN v_result;
  END IF;

  -- Update booking status to CANCELLED and record reason
  UPDATE public.bookings
  SET
    booking_status = 'CANCELLED',
    cancel_requested_at = COALESCE(cancel_requested_at, timezone('utc'::text, now())),
    cancel_requested_reason = v_trimmed_reason,
    staff_note = CASE
      WHEN staff_note IS NULL OR trim(staff_note) = '' THEN '[HỦY BỞI QUẢN LÝ/ADMIN]: ' || v_trimmed_reason
      ELSE staff_note || E'\n[HỦY BỞI QUẢN LÝ/ADMIN]: ' || v_trimmed_reason
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  -- Fetch metadata for rich email payload
  SELECT name INTO v_service_name FROM public.services WHERE id = v_booking.service_id;
  SELECT name INTO v_package_name FROM public.packages WHERE id = v_booking.package_id;
  SELECT name INTO v_studio_name FROM public.studio_rooms WHERE id = v_booking.studio_room_id;

  v_payload := jsonb_build_object(
    'bookingId', v_booking.id,
    'bookingCode', v_booking.booking_code,
    'customerName', COALESCE(v_booking.customer_name, 'Quý khách'),
    'customerPhone', COALESCE(v_booking.customer_phone, ''),
    'customerEmail', COALESCE(v_booking.customer_email, ''),
    'serviceName', COALESCE(v_service_name, 'Dịch Vụ Tiệm Ảnh'),
    'packageName', COALESCE(v_package_name, 'Gói Chụp Tiệm Ảnh'),
    'studioName', COALESCE(v_studio_name, 'Phòng Studio MIPA'),
    'startAt', v_booking.start_at,
    'totalAmount', COALESCE(v_booking.total_amount, 0),
    'depositAmount', COALESCE(v_booking.deposit_amount, 0),
    'cancelReason', v_trimmed_reason,
    'directLink', 'https://maisonmipa.io.vn/account?tab=bookings&bookingCode=' || v_booking.booking_code
  );

  -- Enqueue email to customer in notification_outbox
  IF v_booking.customer_email IS NOT NULL AND trim(v_booking.customer_email) != '' THEN
    INSERT INTO public.notification_outbox (
      event_type,
      recipient_user_id,
      recipient_email,
      entity_type,
      entity_id,
      template_key,
      payload,
      idempotency_key,
      status
    ) VALUES (
      'BOOKING_CANCELLED',
      v_booking.customer_id,
      v_booking.customer_email,
      'BOOKING',
      v_booking.id,
      'booking_cancelled',
      v_payload,
      'cancel-admin-cust:' || v_booking.id::text || ':' || extract(epoch from now())::bigint::text,
      'PENDING'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  -- Insert Audit Log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', v_booking.id, 'BOOKING_CANCELLED_BY_ADMIN',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('booking_status', 'CANCELLED', 'cancel_reason', v_trimmed_reason),
    timezone('utc'::text, now())
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- 2. Hardened request_booking_cancel with Customer Ack Email
CREATE OR REPLACE FUNCTION public.request_booking_cancel(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
  v_studio_email TEXT := 'maisonmipamemories@gmail.com';
  v_service_name TEXT;
  v_package_name TEXT;
  v_studio_name TEXT;
  v_direct_link TEXT;
  v_payload JSONB;
BEGIN
  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Account not active or email not verified.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.customer_id != auth.uid() AND public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.bookings
  SET
    cancel_requested_at = timezone('utc'::text, now()),
    cancel_requested_reason = p_reason,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  SELECT name INTO v_service_name FROM public.services WHERE id = v_booking.service_id;
  SELECT name INTO v_package_name FROM public.packages WHERE id = v_booking.package_id;
  SELECT name INTO v_studio_name FROM public.studio_rooms WHERE id = v_booking.studio_room_id;

  v_direct_link := 'https://maisonmipa.io.vn/management?tab=dashboard&bookingCode=' || v_booking.booking_code || '&bookingId=' || v_booking.id::text;

  v_payload := jsonb_build_object(
    'bookingId', v_booking.id,
    'bookingCode', v_booking.booking_code,
    'customerName', COALESCE(v_booking.customer_name, 'Quý khách'),
    'customerPhone', COALESCE(v_booking.customer_phone, 'Chưa cung cấp'),
    'customerEmail', COALESCE(v_booking.customer_email, 'Chưa cung cấp'),
    'serviceName', COALESCE(v_service_name, 'Dịch Vụ Tiệm Ảnh'),
    'packageName', COALESCE(v_package_name, 'Gói Chụp Tiệm Ảnh'),
    'studioName', COALESCE(v_studio_name, 'Phòng Studio MIPA'),
    'startAt', v_booking.start_at,
    'bookingDate', v_booking.start_at::date,
    'totalAmount', COALESCE(v_booking.total_amount, 0),
    'depositAmount', COALESCE(v_booking.deposit_amount, 0),
    'cancelReason', COALESCE(p_reason, 'Khách hàng không ghi rõ lý do'),
    'directLink', v_direct_link
  );

  -- 1. Studio alert notification
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_outbox') THEN
    INSERT INTO public.notification_outbox (
      event_type,
      recipient_email,
      entity_type,
      entity_id,
      template_key,
      payload,
      idempotency_key,
      status
    ) VALUES (
      'BOOKING_CANCEL_REQUESTED',
      v_studio_email,
      'BOOKING',
      v_booking.id,
      'studio_cancel_request_notification',
      v_payload,
      'cancel-request-studio:' || v_booking.id::text || ':' || extract(epoch from now())::bigint::text,
      'PENDING'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    -- 2. Customer Ack confirmation email
    IF v_booking.customer_email IS NOT NULL AND trim(v_booking.customer_email) != '' THEN
      INSERT INTO public.notification_outbox (
        event_type,
        recipient_user_id,
        recipient_email,
        entity_type,
        entity_id,
        template_key,
        payload,
        idempotency_key,
        status
      ) VALUES (
        'CUSTOMER_CANCEL_REQUEST_ACK',
        v_booking.customer_id,
        v_booking.customer_email,
        'BOOKING',
        v_booking.id,
        'customer_cancel_request_ack',
        v_payload,
        'cancel-ack-customer:' || v_booking.id::text || ':' || extract(epoch from now())::bigint::text,
        'PENDING'
      )
      ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
  END IF;

  -- 3. Audit log
  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    auth.uid(), public.get_auth_role(), auth.uid(), 'BOOKING', v_booking.id, 'BOOKING_CANCEL_REQUESTED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('cancel_requested_reason', p_reason),
    timezone('utc'::text, now())
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- 3. Approve Booking Reschedule RPC
CREATE OR REPLACE FUNCTION public.approve_booking_reschedule(
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
  v_caller_status TEXT;
  v_booking RECORD;
  v_service_name TEXT;
  v_package_name TEXT;
  v_studio_name TEXT;
  v_new_start_at TIMESTAMPTZ;
  v_payload JSONB;
  v_result JSONB;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  SELECT role, status INTO v_caller_role, v_caller_status
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_status != 'ACTIVE' THEN
    RAISE EXCEPTION 'Access Denied: Your account is %.', v_caller_status USING ERRCODE = '42501';
  END IF;

  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Quyền duyệt đổi lịch chỉ dành cho Quản Lý hoặc Quản Trị Viên.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  -- Parse requested date into start_at if available
  IF v_booking.reschedule_requested_date IS NOT NULL THEN
    BEGIN
      -- Handle format YYYY-MM-DD and time slot if possible
      v_new_start_at := (v_booking.reschedule_requested_date || ' ' || COALESCE(split_part(v_booking.reschedule_requested_slot, ' - ', 1), '09:00') || ':00+07')::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_new_start_at := v_booking.start_at;
    END;
  ELSE
    v_new_start_at := v_booking.start_at;
  END IF;

  UPDATE public.bookings
  SET
    start_at = COALESCE(v_new_start_at, start_at),
    reschedule_requested_at = NULL,
    reschedule_requested_date = NULL,
    reschedule_requested_slot = NULL,
    reschedule_requested_reason = NULL,
    staff_note = CASE
      WHEN p_staff_note IS NOT NULL AND trim(p_staff_note) != '' THEN
        CASE WHEN staff_note IS NULL THEN p_staff_note ELSE staff_note || E'\n' || p_staff_note END
      ELSE staff_note
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  SELECT name INTO v_service_name FROM public.services WHERE id = v_booking.service_id;
  SELECT name INTO v_package_name FROM public.packages WHERE id = v_booking.package_id;
  SELECT name INTO v_studio_name FROM public.studio_rooms WHERE id = v_booking.studio_room_id;

  v_payload := jsonb_build_object(
    'bookingId', v_booking.id,
    'bookingCode', v_booking.booking_code,
    'customerName', COALESCE(v_booking.customer_name, 'Quý khách'),
    'customerPhone', COALESCE(v_booking.customer_phone, ''),
    'customerEmail', COALESCE(v_booking.customer_email, ''),
    'serviceName', COALESCE(v_service_name, 'Dịch Vụ Tiệm Ảnh'),
    'packageName', COALESCE(v_package_name, 'Gói Chụp Tiệm Ảnh'),
    'studioName', COALESCE(v_studio_name, 'Phòng Studio MIPA'),
    'startAt', COALESCE(v_new_start_at, v_booking.start_at),
    'bookingDate', COALESCE(v_booking.reschedule_requested_date, (v_new_start_at::date)::text),
    'newDate', COALESCE(v_booking.reschedule_requested_date, (v_new_start_at::date)::text),
    'newSlot', COALESCE(v_booking.reschedule_requested_slot, 'Theo thỏa thuận'),
    'directLink', 'https://maisonmipa.io.vn/account?tab=bookings&bookingCode=' || v_booking.booking_code
  );

  -- Enqueue booking_rescheduled email to customer
  IF v_booking.customer_email IS NOT NULL AND trim(v_booking.customer_email) != '' THEN
    INSERT INTO public.notification_outbox (
      event_type,
      recipient_user_id,
      recipient_email,
      entity_type,
      entity_id,
      template_key,
      payload,
      idempotency_key,
      status
    ) VALUES (
      'BOOKING_RESCHEDULED',
      v_booking.customer_id,
      v_booking.customer_email,
      'BOOKING',
      v_booking.id,
      'booking_rescheduled',
      v_payload,
      'reschedule-approved:' || v_booking.id::text || ':' || extract(epoch from now())::bigint::text,
      'PENDING'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', v_booking.id, 'BOOKING_RESCHEDULE_APPROVED',
    jsonb_build_object('old_start_at', v_booking.start_at),
    jsonb_build_object('new_start_at', v_new_start_at, 'staff_note', p_staff_note),
    timezone('utc'::text, now())
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cancel_booking_by_manager(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_booking_cancel(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_booking_reschedule(UUID, TEXT) TO authenticated, service_role;
