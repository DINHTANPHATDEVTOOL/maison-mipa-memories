-- ==============================================================================
-- Maison MIPA Memories - Migration: Enrich Booking Email Alert & Direct Link
-- 1. Automatically extracts conceptNames and addonNames when customer books
-- 2. Embeds direct management portal link (https://maisonmipa.io.vn/management?tab=dashboard&bookingCode=...&bookingId=...)
-- 3. Ensures both customer confirmation and studio admin alert carry full booking info
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
  p_customer_note TEXT DEFAULT NULL,
  p_concept_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_pkg RECORD;
  v_service RECORD;
  v_studio RECORD;
  v_concept_record RECORD;
  v_concept_id UUID;
  v_primary_concept_id UUID := NULL;
  v_promo RECORD;
  v_addon_total NUMERIC(12, 2) := 0;
  v_subtotal NUMERIC(12, 2) := 0;
  v_discount_total NUMERIC(12, 2) := 0;
  v_total_amount NUMERIC(12, 2) := 0;
  v_deposit_amount NUMERIC(12, 2) := 0;
  v_total_duration INTEGER := 0;
  v_end_at TIMESTAMPTZ;
  v_booking_code TEXT;
  v_new_booking_id UUID;
  v_result JSONB;
  v_idx INTEGER := 0;
  v_studio_email TEXT := 'maisonmipamemories@gmail.com';
  v_customer_record RECORD;
  v_concept_names_str TEXT := NULL;
  v_addon_names_str TEXT := NULL;
BEGIN
  -- 1. Auth & Status Validation
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User must be authenticated to create a booking.' USING ERRCODE = '42501';
  END IF;

  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Tài khoản chưa được xác thực email hoặc không hoạt động. Vui lòng kiểm tra hộp thư và xác thực tài khoản trước khi đặt lịch.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_customer_record FROM public.profiles WHERE id = v_customer_id;

  -- 2. Validate Service
  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND active = true;

  -- 3. Validate Package & Service association
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND (service_id = p_service_id OR service_id IS NULL) AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package specified for the selected service.' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Validate Concepts & Enforce Package concepts_count Limit
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    IF array_length(p_concept_ids, 1) > v_pkg.concepts_count THEN
      RAISE EXCEPTION 'Package concept limit exceeded. Selected: %, Allowed: %',
        array_length(p_concept_ids, 1), v_pkg.concepts_count USING ERRCODE = 'P0003';
    END IF;

    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      SELECT * INTO v_concept_record FROM public.concepts WHERE id = v_concept_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Concept % not found.', v_concept_id USING ERRCODE = 'P0002';
      END IF;

      IF NOT v_concept_record.active OR NOT v_concept_record.bookable THEN
        RAISE EXCEPTION 'Concept "%" is currently inactive or non-bookable.', v_concept_record.name USING ERRCODE = 'P0003';
      END IF;

      IF v_primary_concept_id IS NULL THEN
        v_primary_concept_id := v_concept_id;
      END IF;
    END LOOP;
  END IF;

  -- 5. Validate Studio Room with resilient self-healing fallback
  IF p_studio_room_id IS NOT NULL THEN
    SELECT * INTO v_studio FROM public.studio_rooms WHERE id = p_studio_room_id AND active = true;
  END IF;

  IF v_studio.id IS NULL THEN
    SELECT * INTO v_studio FROM public.studio_rooms WHERE active = true ORDER BY code ASC LIMIT 1;
  END IF;

  IF v_studio.id IS NULL THEN
    INSERT INTO public.studio_rooms (id, slug, code, name, description, image, capacity, active)
    VALUES ('f0000000-0000-0000-0000-000000000001', 'room_01', 'ROOM_01', 'Tiệm Ảnh Maison MIPA — Room 01 (Atelier)', 'Không gian tiệm ảnh ấm áp, ánh sáng tự nhiên tinh tế phong cách Pháp.', '/studio.png', 6, true)
    ON CONFLICT (id) DO UPDATE SET active = true
    RETURNING * INTO v_studio;
  END IF;

  -- 6. Calculate Duration & End Time (Package + Valid Addons)
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_total_duration + v_addon_total::INTEGER;
    v_addon_total := 0;
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- 7. Calculate Server-Authoritative Estimated Pricing & Validate Promotion Voucher
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;

  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) != '' THEN
    SELECT * INTO v_promo FROM public.promotions
    WHERE code = UPPER(trim(p_voucher_code)) AND active = true
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Promotion voucher code "%" is invalid or inactive.', p_voucher_code USING ERRCODE = 'P0004';
    END IF;

    IF v_promo.start_at IS NOT NULL AND now() < v_promo.start_at THEN
      RAISE EXCEPTION 'Promotion voucher code has not started yet.' USING ERRCODE = 'P0004';
    END IF;
    IF v_promo.end_at IS NOT NULL AND now() > v_promo.end_at THEN
      RAISE EXCEPTION 'Promotion voucher code has expired.' USING ERRCODE = 'P0004';
    END IF;
    IF v_promo.usage_limit IS NOT NULL AND COALESCE(v_promo.usage_count, 0) >= v_promo.usage_limit THEN
      RAISE EXCEPTION 'Promotion voucher usage limit has been reached.' USING ERRCODE = 'P0004';
    END IF;
    IF v_subtotal < v_promo.min_order THEN
      RAISE EXCEPTION 'Subtotal does not meet minimum order requirement of % for voucher.', v_promo.min_order USING ERRCODE = 'P0004';
    END IF;
    IF v_promo.applicable_service_id IS NOT NULL AND v_promo.applicable_service_id != p_service_id THEN
      RAISE EXCEPTION 'Promotion voucher is not applicable to the selected service.' USING ERRCODE = 'P0004';
    END IF;

    IF v_promo.discount_percent > 0 THEN
      v_discount_total := ROUND(v_subtotal * (v_promo.discount_percent / 100.0));
    ELSIF v_promo.discount_amount > 0 THEN
      v_discount_total := v_promo.discount_amount;
    END IF;

    IF v_promo.max_discount IS NOT NULL AND v_promo.max_discount > 0 THEN
      v_discount_total := LEAST(v_discount_total, v_promo.max_discount);
    END IF;

    v_discount_total := LEAST(v_subtotal, GREATEST(0, v_discount_total));

    UPDATE public.promotions
    SET usage_count = COALESCE(usage_count, 0) + 1, updated_at = timezone('utc'::text, now())
    WHERE id = v_promo.id;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := ROUND(v_total_amount * 0.30); -- Estimated 30% deposit reference

  -- 8. Generate Booking Code
  v_booking_code := 'MIPA-' || to_char(timezone('Asia/Ho_Chi_Minh', now()), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 4));

  -- 9. Insert Booking Record
  INSERT INTO public.bookings (
    booking_code,
    customer_id,
    service_id,
    package_id,
    concept_id,
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
    voucher_code,
    customer_name,
    customer_phone,
    customer_email,
    occasion,
    customer_note,
    created_at,
    updated_at
  )
  VALUES (
    v_booking_code,
    v_customer_id,
    p_service_id,
    p_package_id,
    v_primary_concept_id,
    v_studio.id,
    p_start_at,
    v_end_at,
    'CONSULTATION_REQUESTED',
    'UNPAID',
    v_subtotal,
    v_addon_total,
    v_discount_total,
    v_total_amount,
    v_deposit_amount,
    p_voucher_code,
    COALESCE(p_customer_name, v_customer_record.full_name, 'Quý khách'),
    p_customer_phone,
    COALESCE(p_customer_email, v_customer_record.email),
    p_occasion,
    p_customer_note,
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
  )
  RETURNING id INTO v_new_booking_id;

  -- 10. Insert Booking Addons
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    INSERT INTO public.booking_addons (booking_id, addon_id, quantity, unit_price, line_total)
    SELECT v_new_booking_id, a.id, 1, a.price, a.price
    FROM public.addons a
    WHERE a.id = ANY(p_addon_ids) AND a.active = true;
  END IF;

  -- 11. Insert Booking Concepts
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_idx := v_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order, display_order)
      VALUES (v_new_booking_id, v_concept_id, v_idx, v_idx);
    END LOOP;
  END IF;

  -- 12. Audit Log Entry
  INSERT INTO public.audit_logs (
    actor_id,
    actor_role,
    action,
    entity_type,
    entity_id,
    new_data
  )
  VALUES (
    v_customer_id,
    'CUSTOMER',
    'BOOKING_CONSULTATION_REQUESTED',
    'BOOKING',
    v_new_booking_id::text,
    jsonb_build_object(
      'booking_code', v_booking_code,
      'service_id', p_service_id,
      'package_id', p_package_id,
      'studio_room_id', v_studio.id,
      'start_at', p_start_at,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'booking_status', 'CONSULTATION_REQUESTED'
    )
  );

  -- 13. Collect concept names and addon names for rich notifications
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    SELECT string_agg(name, ', ') INTO v_concept_names_str
    FROM public.concepts
    WHERE id = ANY(p_concept_ids);
  END IF;

  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT string_agg(name, ', ') INTO v_addon_names_str
    FROM public.addons
    WHERE id = ANY(p_addon_ids);
  END IF;

  -- 14. Enqueue Customer Confirmation Email
  IF COALESCE(p_customer_email, v_customer_record.email) IS NOT NULL THEN
    INSERT INTO public.notification_outbox (
      event_type,
      recipient_user_id,
      recipient_email,
      entity_type,
      entity_id,
      template_key,
      payload,
      idempotency_key,
      status,
      created_at
    )
    VALUES (
      'BOOKING_CONSULTATION_REQUESTED',
      v_customer_id,
      COALESCE(p_customer_email, v_customer_record.email),
      'BOOKING',
      v_new_booking_id::text,
      'booking_consultation_requested',
      jsonb_build_object(
        'bookingId', v_new_booking_id::text,
        'bookingCode', v_booking_code,
        'customerName', COALESCE(p_customer_name, v_customer_record.full_name, 'Quý khách'),
        'customerPhone', p_customer_phone,
        'customerEmail', COALESCE(p_customer_email, v_customer_record.email),
        'serviceName', COALESCE(v_service.name, 'Dịch Vụ Tiệm Ảnh'),
        'packageName', v_pkg.name,
        'studioName', v_studio.name,
        'conceptNames', COALESCE(v_concept_names_str, 'Theo tư vấn studio'),
        'addonNames', COALESCE(v_addon_names_str, 'Không có'),
        'startAt', to_char(timezone('Asia/Ho_Chi_Minh', p_start_at), 'DD/MM/YYYY lúc HH24:MI'),
        'totalAmount', v_total_amount,
        'depositAmount', v_deposit_amount,
        'customerNote', p_customer_note
      ),
      'booking-consultation-customer:' || v_new_booking_id::text,
      'PENDING',
      timezone('utc'::text, now())
    ) ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  -- 15. Enqueue Studio Admin Alert Email (Gửi về mail tiệm MIPA để nhân viên liên hệ ngay, tránh miss khách)
  INSERT INTO public.notification_outbox (
    event_type,
    recipient_user_id,
    recipient_email,
    entity_type,
    entity_id,
    template_key,
    payload,
    idempotency_key,
    status,
    created_at
  )
  VALUES (
    'ADMIN_NEW_BOOKING_ALERT',
    NULL,
    v_studio_email,
    'BOOKING',
    v_new_booking_id::text,
    'admin_new_booking_alert',
    jsonb_build_object(
      'bookingId', v_new_booking_id::text,
      'bookingCode', v_booking_code,
      'customerName', COALESCE(p_customer_name, v_customer_record.full_name, 'Quý khách'),
      'customerPhone', p_customer_phone,
      'customerEmail', COALESCE(p_customer_email, v_customer_record.email),
      'serviceName', COALESCE(v_service.name, 'Dịch Vụ Tiệm Ảnh'),
      'packageName', v_pkg.name,
      'studioName', v_studio.name,
      'conceptNames', COALESCE(v_concept_names_str, 'Theo tư vấn studio'),
      'addonNames', COALESCE(v_addon_names_str, 'Không có'),
      'startAt', to_char(timezone('Asia/Ho_Chi_Minh', p_start_at), 'DD/MM/YYYY lúc HH24:MI'),
      'totalAmount', v_total_amount,
      'depositAmount', v_deposit_amount,
      'customerNote', p_customer_note,
      'directLink', 'https://maisonmipa.io.vn/management?tab=dashboard&bookingCode=' || v_booking_code || '&bookingId=' || v_new_booking_id::text
    ),
    'booking-admin-alert:' || v_new_booking_id::text,
    'PENDING',
    timezone('utc'::text, now())
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  -- 16. Return Authoritative Domain Representation
  SELECT to_jsonb(b.*) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.create_booking(
  UUID, UUID, UUID, TIMESTAMPTZ, UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[]
) TO authenticated;
