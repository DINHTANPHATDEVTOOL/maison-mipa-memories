-- ==============================================================================
-- Maison MIPA Memories - Database Migration #11
-- File: 20260911000005_fix_booking_concepts_display_order_and_columns.sql
--
-- Features:
-- 1. Add display_order column to booking_concepts table for full column compatibility.
-- 2. Add concept_id and voucher_code columns to bookings table if missing.
-- 3. Replace create_booking RPC with production-hardened column mapping matching
--    the active production schema (sort_order, concept_id, booking_status, payment_status,
--    unit_price, actor_user_id).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Add display_order to booking_concepts for dual compatibility
-- ------------------------------------------------------------------------------
ALTER TABLE public.booking_concepts
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS voucher_code TEXT;

-- ------------------------------------------------------------------------------
-- 2. Hardened create_booking RPC
-- ------------------------------------------------------------------------------
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
  v_caller_id UUID;
  v_customer_id UUID;
  v_caller_role TEXT;
  v_pkg RECORD;
  v_studio RECORD;
  v_service RECORD;
  v_total_duration INTEGER;
  v_end_at TIMESTAMPTZ;
  v_addon_total BIGINT := 0;
  v_subtotal BIGINT := 0;
  v_discount_total BIGINT := 0;
  v_total_amount BIGINT := 0;
  v_deposit_amount BIGINT := 0;
  v_promo RECORD;
  v_booking_code TEXT;
  v_new_booking_id UUID;
  v_cust_name TEXT;
  v_cust_phone TEXT;
  v_cust_email TEXT;
  v_result JSONB;
  v_concept_record RECORD;
  v_concept_id UUID;
  v_primary_concept_id UUID := NULL;
  v_concept_idx INTEGER := 0;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required to create booking.' USING ERRCODE = '42501';
  END IF;

  -- Security Gate: Require verified ACTIVE account
  IF public.get_auth_user_status() != 'ACTIVE' THEN
    RAISE EXCEPTION 'Tài khoản chưa được xác thực email hoặc không hoạt động. Vui lòng xác thực tài khoản trước khi đặt lịch.' USING ERRCODE = '42501';
  END IF;

  v_customer_id := v_caller_id;
  v_caller_role := public.get_auth_role();

  -- 1. Validate Service
  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive service specified.' USING ERRCODE = 'P0002';
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

      IF v_concept_record.service_id IS NOT NULL AND v_concept_record.service_id != p_service_id THEN
        RAISE EXCEPTION 'Concept "%" does not belong to the selected service.', v_concept_record.name USING ERRCODE = 'P0003';
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
      IF (v_promo.start_at IS NULL OR v_promo.start_at <= now()) AND
         (v_promo.end_at IS NULL OR v_promo.end_at >= now()) AND
         (v_promo.usage_limit > v_promo.usage_count) AND
         (v_subtotal >= v_promo.min_order) THEN

        IF v_promo.discount_percent > 0 THEN
          v_discount_total := ROUND(v_subtotal * (v_promo.discount_percent / 100.0));
        ELSIF v_promo.discount_amount > 0 THEN
          v_discount_total := v_promo.discount_amount;
        END IF;

        IF v_promo.max_discount IS NOT NULL AND v_discount_total > v_promo.max_discount THEN
          v_discount_total := v_promo.max_discount;
        END IF;

        UPDATE public.promotions SET usage_count = usage_count + 1 WHERE id = v_promo.id;
      END IF;
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := COALESCE(v_pkg.deposit_amount, ROUND(v_total_amount * 0.3));

  -- 8. Customer Details Resolution
  SELECT full_name, phone, email INTO v_cust_name, v_cust_phone, v_cust_email
  FROM public.profiles WHERE id = v_customer_id;

  v_cust_name := COALESCE(p_customer_name, v_cust_name, 'Khách Hàng MIPA');
  v_cust_phone := COALESCE(p_customer_phone, v_cust_phone, '');
  v_cust_email := COALESCE(p_customer_email, v_cust_email, '');

  -- 9. Generate Booking Code
  v_booking_code := 'MIPA-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));

  -- 10. Insert Booking Record
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
    customer_name,
    customer_phone,
    customer_email,
    occasion,
    customer_note,
    voucher_code
  ) VALUES (
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
    v_cust_name,
    v_cust_phone,
    v_cust_email,
    p_occasion,
    p_customer_note,
    p_voucher_code
  )
  RETURNING id INTO v_new_booking_id;

  -- 11. Insert Booking Addons
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    INSERT INTO public.booking_addons (
      booking_id,
      addon_id,
      quantity,
      unit_price,
      line_total
    )
    SELECT
      v_new_booking_id,
      id,
      1,
      price,
      price
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  -- 12. Insert Booking Concepts (both sort_order & display_order populated)
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_concept_idx := v_concept_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order, display_order)
      VALUES (v_new_booking_id, v_concept_id, v_concept_idx, v_concept_idx)
      ON CONFLICT (booking_id, concept_id) DO UPDATE
      SET sort_order = EXCLUDED.sort_order, display_order = EXCLUDED.display_order;
    END LOOP;
  END IF;

  -- 13. Audit Log
  INSERT INTO public.audit_logs (
    actor_user_id,
    entity_type,
    entity_id,
    action,
    old_data,
    new_data
  ) VALUES (
    v_caller_id,
    'BOOKING',
    v_new_booking_id::text,
    'CREATE_BOOKING',
    NULL,
    jsonb_build_object(
      'booking_code', v_booking_code,
      'service_id', p_service_id,
      'package_id', p_package_id,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'concept_id', v_primary_concept_id,
      'concept_ids', p_concept_ids,
      'start_at', p_start_at,
      'end_at', v_end_at
    )
  );

  -- 14. Return Created Booking Details
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
    'customer_name', b.customer_name,
    'customer_phone', b.customer_phone,
    'customer_email', b.customer_email,
    'occasion', b.occasion,
    'customer_note', b.customer_note,
    'voucher_code', b.voucher_code,
    'created_at', b.created_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;
