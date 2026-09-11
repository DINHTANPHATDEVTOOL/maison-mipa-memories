-- ==============================================================================
-- Maison MIPA Memories - Database Migration #14
-- File: 20260911000008_flexible_concepts_and_availability_grant.sql
--
-- Features:
-- 1. Grant EXECUTE privileges on get_studio_booked_slots to anon, authenticated, and service_role.
-- 2. Update create_booking RPC to allow flexible concept selection across services
--    (enforces concept existence, active status, bookable status, and package limit,
--    while removing the restrictive service_id mismatch exception so booking creation succeeds).
-- ==============================================================================

-- 1. Grant explicit EXECUTE permissions on get_studio_booked_slots
GRANT EXECUTE ON FUNCTION public.get_studio_booked_slots(UUID, DATE) TO anon, authenticated, service_role;

-- 2. Update create_booking RPC
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
BEGIN
  -- 1. Auth & Status Validation
  v_customer_id := auth.uid();
  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User must be authenticated to create a booking.' USING ERRCODE = '42501';
  END IF;

  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Tài khoản chưa được xác thực email hoặc không hoạt động. Vui lòng kiểm tra hộp thư và xác thực tài khoản trước khi đặt lịch.' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate Package & Service association (Accepts service-specific OR universal packages)
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND (service_id = p_service_id OR service_id IS NULL) AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package specified for the selected service.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validate Concepts & Enforce Package concepts_count Limit
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

  -- 4. Validate Studio Room
  SELECT * INTO v_studio FROM public.studio_rooms WHERE id = p_studio_room_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Studio room not found or currently inactive.' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Calculate Duration & End Time
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
    v_total_duration := v_total_duration + v_addon_total::INTEGER;
    v_addon_total := 0;
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- 6. Lock Studio Room & Detect Overlaps
  PERFORM id FROM public.studio_rooms WHERE id = p_studio_room_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE studio_room_id = p_studio_room_id
      AND booking_status NOT IN ('CANCELLED')
      AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, v_end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Studio room is already booked for the selected time slot.' USING ERRCODE = '23P01';
  END IF;

  -- 7. Calculate Server-Authoritative Pricing
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;

  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) != '' THEN
    SELECT * INTO v_promo FROM public.promotions
    WHERE code = UPPER(trim(p_voucher_code)) AND active = true;

    IF FOUND THEN
      IF v_promo.starts_at IS NOT NULL AND now() < v_promo.starts_at THEN
        RAISE EXCEPTION 'Promotion voucher code has not started yet.' USING ERRCODE = 'P0004';
      END IF;
      IF v_promo.expires_at IS NOT NULL AND now() > v_promo.expires_at THEN
        RAISE EXCEPTION 'Promotion voucher code has expired.' USING ERRCODE = 'P0004';
      END IF;
      IF v_promo.usage_limit IS NOT NULL AND v_promo.times_used >= v_promo.usage_limit THEN
        RAISE EXCEPTION 'Promotion voucher usage limit has been reached.' USING ERRCODE = 'P0004';
      END IF;
      IF v_subtotal < v_promo.min_order_amount THEN
        RAISE EXCEPTION 'Subtotal does not meet minimum order requirement of % for voucher.', v_promo.min_order_amount USING ERRCODE = 'P0004';
      END IF;

      IF v_promo.discount_type = 'PERCENTAGE' THEN
        v_discount_total := ROUND(v_subtotal * (v_promo.discount_value / 100.0));
        IF v_promo.max_discount_amount IS NOT NULL AND v_discount_total > v_promo.max_discount_amount THEN
          v_discount_total := v_promo.max_discount_amount;
        END IF;
      ELSIF v_promo.discount_type = 'FIXED_AMOUNT' THEN
        v_discount_total := v_promo.discount_value;
      END IF;

      UPDATE public.promotions
      SET times_used = times_used + 1, updated_at = timezone('utc'::text, now())
      WHERE id = v_promo.id;
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := ROUND(v_total_amount * 0.30); -- Authoritative 30% deposit rule

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
    p_studio_room_id,
    p_start_at,
    v_end_at,
    'PENDING_PAYMENT',
    'UNPAID',
    v_subtotal,
    v_addon_total,
    v_discount_total,
    v_total_amount,
    v_deposit_amount,
    p_voucher_code,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
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

  -- 12. Audit Trail
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    new_data
  )
  VALUES (
    v_customer_id,
    'BOOKING',
    v_new_booking_id::text,
    'CREATE_BOOKING',
    jsonb_build_object(
      'booking_code', v_booking_code,
      'service_id', p_service_id,
      'package_id', p_package_id,
      'concept_ids', p_concept_ids,
      'studio_room_id', p_studio_room_id,
      'start_at', p_start_at,
      'end_at', v_end_at,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount
    )
  );

  -- 13. Return JSON Representation
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'package_id', b.package_id,
    'concept_id', b.concept_id,
    'studio_room_id', b.studio_room_id,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'booking_status', b.booking_status,
    'payment_status', b.payment_status,
    'subtotal', b.subtotal,
    'addon_total', b.addon_total,
    'discount_total', b.discount_total,
    'total_amount', b.total_amount,
    'deposit_amount', b.deposit_amount,
    'voucher_code', b.voucher_code,
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'customer_email', b.customer_email,
    'occasion', b.occasion,
    'customer_note', b.customer_note,
    'created_at', b.created_at,
    'updated_at', b.updated_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;
