-- ==============================================================================
-- Migration: 20260924000006_prevent_duplicate_booking_emails.sql
-- Goal: Prevent duplicate emails completely across the entire system.
-- Root causes fixed:
-- 1. DROP legacy trigger on_booking_created_notification on public.bookings
--    (which created a duplicate 'booking_created' outbox entry alongside create_booking's 'booking_consultation_requested').
-- 2. Enforce deterministic, timestamp-free idempotency_keys across all RPCs
--    (so ON CONFLICT (idempotency_key) DO NOTHING strictly prevents duplicate enqueuing).
-- 3. Cleanup existing duplicate pending outbox entries.
-- ==============================================================================

-- 1. Drop the duplicate trigger on public.bookings
DROP TRIGGER IF EXISTS on_booking_created_notification ON public.bookings;

-- 2. Cleanup any duplicate pending emails currently queued in notification_outbox
UPDATE public.notification_outbox
SET status = 'CANCELLED', last_error = 'Deduplicated: superseded by primary email record'
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY entity_id, recipient_email, event_type
      ORDER BY created_at ASC
    ) as rnum
    FROM public.notification_outbox
    WHERE status = 'PENDING'
  ) sub WHERE sub.rnum > 1
);

-- 3. Update cancel_booking_by_manager with deterministic idempotency_key
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
  v_booking RECORD;
  v_caller_role TEXT;
  v_caller_id UUID;
  v_trimmed_reason TEXT;
  v_service_name TEXT;
  v_package_name TEXT;
  v_studio_name TEXT;
  v_payload JSONB;
  v_result JSONB;
  v_idempotency_key TEXT;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := public.get_auth_role();

  IF v_caller_role NOT IN ('ADMIN', 'ROOT_OWNER', 'MANAGER') THEN
    RAISE EXCEPTION 'Chỉ Quản lý hoặc Quản trị viên mới có quyền hủy đơn đặt lịch này.';
  END IF;

  v_trimmed_reason := trim(COALESCE(p_reason, ''));
  IF length(v_trimmed_reason) < 3 THEN
    RAISE EXCEPTION 'Vui lòng cung cấp lý do hủy lịch rõ ràng (tối thiểu 3 ký tự) để gửi thông báo chu đáo cho khách hàng.';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn đặt lịch với ID: %', p_booking_id;
  END IF;

  IF v_booking.booking_status = 'CANCELLED' THEN
    SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
    RETURN v_result;
  END IF;

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

  -- Deterministic key: strictly one cancellation email per booking
  v_idempotency_key := 'cancel-admin-cust:' || v_booking.id::text;

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
      v_idempotency_key,
      'PENDING'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

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

-- 4. Update request_booking_cancellation with deterministic idempotency_key
CREATE OR REPLACE FUNCTION public.request_booking_cancellation(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_caller_id UUID;
  v_caller_role TEXT;
  v_is_customer_owner BOOLEAN;
  v_service_name TEXT;
  v_package_name TEXT;
  v_studio_name TEXT;
  v_studio_email TEXT := 'maisonmipamemories@gmail.com';
  v_payload JSONB;
  v_result JSONB;
  v_direct_link TEXT;
BEGIN
  v_caller_id := auth.uid();
  v_caller_role := public.get_auth_role();

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy đơn đặt lịch với ID: %', p_booking_id;
  END IF;

  v_is_customer_owner := (v_caller_id IS NOT NULL AND v_booking.customer_id = v_caller_id);
  IF NOT v_is_customer_owner AND v_caller_role NOT IN ('ADMIN', 'ROOT_OWNER', 'MANAGER', 'STAFF') THEN
    RAISE EXCEPTION 'Bạn không có quyền gửi yêu cầu hủy cho đơn đặt lịch này.';
  END IF;

  IF v_booking.booking_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Đơn đặt lịch này đã ở trạng thái ĐÃ HỦY.';
  END IF;

  IF v_booking.booking_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Không thể yêu cầu hủy đơn chụp đã hoàn thành.';
  END IF;

  UPDATE public.bookings
  SET
    cancel_requested_at = timezone('utc'::text, now()),
    cancel_requested_reason = COALESCE(p_reason, 'Khách hàng yêu cầu hủy lịch'),
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
    'customerPhone', COALESCE(v_booking.customer_phone, ''),
    'customerEmail', COALESCE(v_booking.customer_email, ''),
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

  -- 1. Studio alert notification (strictly 1 entry)
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
    'cancel-request-studio:' || v_booking.id::text,
    'PENDING'
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- 2. Customer Ack confirmation email (strictly 1 entry)
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
      'cancel-request-customer:' || v_booking.id::text,
      'PENDING'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    v_caller_id, v_caller_role, v_caller_id, 'BOOKING', v_booking.id, 'BOOKING_CANCEL_REQUESTED',
    jsonb_build_object('booking_status', v_booking.booking_status),
    jsonb_build_object('cancel_requested_reason', p_reason),
    timezone('utc'::text, now())
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;
