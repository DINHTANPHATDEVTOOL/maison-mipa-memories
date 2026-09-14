-- ==============================================================================
-- Maison MIPA Memories - Database Migration #13
-- File: 20260911000007_rich_email_payload_and_realtime_publication.sql
--
-- Features:
-- 1. Ensure supabase_realtime publication includes public.bookings and public.booking_assignments.
-- 2. Update trg_enqueue_booking_events to write both snake_case and camelCase keys
--    including package price, subtotal, addon_total, discount_total, total_amount, deposit_amount.
-- ==============================================================================

-- 1. Realtime Publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_assignments;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END;
$$;

-- 2. Trigger Enqueue Function with complete payload
CREATE OR REPLACE FUNCTION public.trg_enqueue_booking_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idempotency_key TEXT;
  v_pkg RECORD;
  v_service RECORD;
  v_studio RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_idempotency_key := 'booking_created_' || NEW.id::text;

    -- Query package, service, and studio room details
    SELECT * INTO v_pkg FROM public.packages WHERE id = NEW.package_id;
    SELECT * INTO v_service FROM public.services WHERE id = NEW.service_id;
    SELECT * INTO v_studio FROM public.studio_rooms WHERE id = NEW.studio_room_id;

    INSERT INTO public.notification_outbox (
      event_type,
      recipient_user_id,
      recipient_email,
      entity_type,
      entity_id,
      template_key,
      payload,
      status,
      idempotency_key
    )
    VALUES (
      'BOOKING_CREATED',
      NEW.customer_id,
      NEW.customer_email,
      'BOOKING',
      NEW.id::text,
      'booking_created',
      jsonb_build_object(
        'booking_code', NEW.booking_code,
        'bookingCode', NEW.booking_code,
        'customer_name', NEW.customer_name,
        'customerName', NEW.customer_name,
        'customer_email', NEW.customer_email,
        'customerEmail', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'customerPhone', NEW.customer_phone,
        'service_id', NEW.service_id,
        'service_name', COALESCE(v_service.name, 'Dịch Vụ Studio'),
        'serviceName', COALESCE(v_service.name, 'Dịch Vụ Studio'),
        'package_id', NEW.package_id,
        'package_name', COALESCE(v_pkg.name, 'Gói Chụp Maison MIPA'),
        'packageName', COALESCE(v_pkg.name, 'Gói Chụp Maison MIPA'),
        'package_price', COALESCE(v_pkg.price, NEW.total_amount),
        'packagePrice', COALESCE(v_pkg.price, NEW.total_amount),
        'duration_minutes', COALESCE(v_pkg.duration_minutes, 60),
        'durationMinutes', COALESCE(v_pkg.duration_minutes, 60),
        'concepts_count', COALESCE(v_pkg.concepts_count, 1),
        'conceptsCount', COALESCE(v_pkg.concepts_count, 1),
        'edited_photos_count', COALESCE(v_pkg.edited_photos_count, 10),
        'editedPhotosCount', COALESCE(v_pkg.edited_photos_count, 10),
        'features', COALESCE(v_pkg.features, '[]'::jsonb),
        'studio_name', COALESCE(v_studio.name, 'Maison Studio Room'),
        'studioName', COALESCE(v_studio.name, 'Maison Studio Room'),
        'subtotal', NEW.subtotal,
        'addon_total', NEW.addon_total,
        'addonTotal', NEW.addon_total,
        'discount_total', NEW.discount_total,
        'discountTotal', NEW.discount_total,
        'total_amount', NEW.total_amount,
        'totalAmount', NEW.total_amount,
        'deposit_amount', NEW.deposit_amount,
        'depositAmount', NEW.deposit_amount,
        'start_at', to_char(NEW.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI Ngày DD/MM/YYYY'),
        'startAt', to_char(NEW.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI Ngày DD/MM/YYYY'),
        'occasion', NEW.occasion,
        'customer_note', NEW.customer_note,
        'customerNote', NEW.customer_note
      ),
      'PENDING',
      v_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;
