-- ==============================================================================
-- Migration: 20260924000004_cancellation_request_alert_and_admin_workflow.sql
-- Description:
-- 1. Hardens request_booking_cancel RPC to enqueue studio alert emails to
--    maisonmipamemories@gmail.com with customer cancel reason and direct link.
-- 2. Adds reject_booking_cancel RPC for managers/admins to clear cancel requests.
-- 3. Emits audit logs for cancel requests and rejections.
-- ==============================================================================

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

  -- Fetch metadata for rich email notification
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

  -- 1. Insert into email_outbox
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'email_outbox') THEN
    INSERT INTO public.email_outbox (
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
  END IF;

  -- 2. Insert into notification_outbox if exists
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

-- ------------------------------------------------------------------------------
-- RPC: reject_booking_cancel (Manager/Admin rejects or clears cancellation request)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_booking_cancel(
  p_booking_id UUID,
  p_staff_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_result JSONB;
BEGIN
  IF public.get_auth_role() NOT IN ('MANAGER', 'ADMIN') AND NOT public.is_root_owner() THEN
    RAISE EXCEPTION 'Access Denied: Only Manager or Admin can resolve cancellation requests.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.bookings
  SET
    cancel_requested_at = NULL,
    cancel_requested_reason = NULL,
    staff_note = CASE 
      WHEN p_staff_note IS NOT NULL AND trim(p_staff_note) != '' 
      THEN COALESCE(staff_note || E'\n', '') || '[Bác bỏ yêu cầu hủy] ' || trim(p_staff_note)
      ELSE staff_note
    END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_booking_id;

  INSERT INTO public.audit_logs (
    actor_id, actor_role, actor_user_id, entity_type, entity_id, action,
    old_data, new_data, created_at
  ) VALUES (
    auth.uid(), public.get_auth_role(), auth.uid(), 'BOOKING', v_booking.id, 'BOOKING_CANCEL_REQUEST_REJECTED',
    jsonb_build_object('cancel_requested_at', v_booking.cancel_requested_at, 'cancel_requested_reason', v_booking.cancel_requested_reason),
    jsonb_build_object('staff_note', p_staff_note),
    timezone('utc'::text, now())
  );

  SELECT to_jsonb(b.*) INTO v_result FROM public.bookings b WHERE b.id = p_booking_id;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_booking_cancel(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_booking_cancel(UUID, TEXT) TO authenticated, service_role;
