-- ==============================================================================
-- Maison MIPA Memories - Database Migration #10
-- File: 20260911000004_booking_package_service_harmony_and_rich_email.sql
--
-- Features:
-- 1. Support both service-scoped and universal studio packages (service_id nullable).
-- 2. Harden create_booking RPC to seamlessly accept packages matching service or universal packages.
-- 3. Enhance trg_enqueue_booking_events trigger function to capture complete photoshoot package
--    specifications (name, duration, concept count, photo count, features, studio room) in
--    notification_outbox for rich transactional confirmation emails.
-- 4. Seed Graduation service & packages if not yet present.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Schema Harmony: Make packages.service_id Nullable for Universal Packages
-- ------------------------------------------------------------------------------
ALTER TABLE public.packages ALTER COLUMN service_id DROP NOT NULL;

-- ------------------------------------------------------------------------------
-- 2. Seed Graduation Service & Packages (if missing)
-- ------------------------------------------------------------------------------
INSERT INTO public.services (id, slug, name, description, icon, image, badge, display_order)
VALUES (
  'c0000000-0000-0000-0000-000000000007',
  'graduation',
  'Graduation & Concept',
  'Bộ ảnh kỷ yếu tốt nghiệp thanh xuân với phong cách hiện đại, trẻ trung, lưu giữ dấu ấn rực rỡ của tuổi trẻ.',
  'Sparkles',
  '/hero.png',
  'Trending',
  7
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge;

INSERT INTO public.packages (id, service_id, slug, name, description, price, deposit_amount, duration_minutes, concepts_count, edited_photos_count, features, recommended, popular_tag, display_order)
VALUES
  ('d0000000-0000-0000-0000-000000000061', 'c0000000-0000-0000-0000-000000000007', 'pkg_basic', 'GRADUATION YOUTH', 'Gói kỷ yếu cá nhân thanh xuân', 890000, 267000, 45, 1, 8, '["45 phút chụp kỷ yếu tốt nghiệp thanh xuân", "1 Concept lễ tốt nghiệp (áo cử nhân, bằng tốt nghiệp)", "8 Ảnh chỉnh sửa sắc nét tone màu tươi sáng", "Tặng toàn bộ file ảnh gốc"]'::jsonb, false, NULL, 1),
  ('d0000000-0000-0000-0000-000000000062', 'c0000000-0000-0000-0000-000000000007', 'pkg_signature', 'GRADUATION MEMORIES', 'Gói kỷ yếu phong cách thanh xuân tự do', 1690000, 507000, 90, 2, 16, '["90 phút chụp với 2 phong cách: Cử nhân & Thanh xuân tự do", "Trang điểm làm tóc nhẹ nhàng tự nhiên", "Hỗ trợ hoa hướng dương, gấu bông tốt nghiệp & phụ kiện", "16 Ảnh chỉnh sửa màu kỷ niệm tươi sáng", "Tặng 01 Khung ảnh tốt nghiệp để bàn", "Tặng toàn bộ file ảnh gốc Full HD"]'::jsonb, true, 'Kỷ Yếu Xu Hướng', 2),
  ('d0000000-0000-0000-0000-000000000063', 'c0000000-0000-0000-0000-000000000007', 'pkg_premium', 'GRADUATION BRILLIANCE', 'Gói kỷ yếu mở rộng cùng bạn bè & gia đình', 2690000, 807000, 150, 3, 25, '["150 phút chụp kỷ yếu cá nhân & cùng gia đình/bạn thân", "3 Concept: Lễ đường tốt nghiệp, Thư viện & Ngoại cảnh vườn", "Trang điểm làm tóc chuẩn chỉnh từng chi tiết", "25 Ảnh chỉnh sửa phong cách tạp chí thanh xuân", "01 Album Photobook kỷ yếu mở phẳng cao cấp", "Tặng video kỷ niệm tốt nghiệp ngắn 4K"]'::jsonb, false, 'VIP Experience', 3)
ON CONFLICT (service_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  deposit_amount = EXCLUDED.deposit_amount,
  duration_minutes = EXCLUDED.duration_minutes,
  features = EXCLUDED.features;

-- ------------------------------------------------------------------------------
-- 3. Update create_booking RPC (Hardened Package Association)
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
  v_addon_id UUID;
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
    RAISE EXCEPTION 'Invalid studio room specified.' USING ERRCODE = 'P0002';
  END IF;

  -- 5. Calculate Total Duration & End Time
  v_total_duration := v_pkg.duration_minutes;
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(duration_minutes), 0), COALESCE(SUM(price), 0)
    INTO v_total_duration, v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;

    v_total_duration := v_pkg.duration_minutes + v_total_duration;
  END IF;

  v_end_at := p_start_at + (v_total_duration || ' minutes')::interval;

  -- 6. Lock Studio Room and Detect Overlapping Confirmed/Active Bookings
  PERFORM id FROM public.studio_rooms WHERE id = p_studio_room_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE studio_room_id = p_studio_room_id
      AND status NOT IN ('CANCELLED')
      AND tstzrange(start_at, end_at, '[)') && tstzrange(p_start_at, v_end_at, '[)')
  ) THEN
    RAISE EXCEPTION 'Studio room is already booked for the selected time slot.' USING ERRCODE = '23P01';
  END IF;

  -- 7. Calculate Pricing Authoritatively
  v_subtotal := v_pkg.price + v_addon_total;

  IF p_voucher_code IS NOT NULL AND trim(p_voucher_code) != '' THEN
    SELECT * INTO v_promo FROM public.promotions
    WHERE code = upper(trim(p_voucher_code))
      AND active = true
      AND (valid_until IS NULL OR valid_until > timezone('utc'::text, now()))
      AND (usage_limit IS NULL OR times_used < usage_limit);

    IF FOUND THEN
      IF v_subtotal >= v_promo.min_order THEN
        v_discount_total := round(v_subtotal * (v_promo.discount_percent / 100.0));
      END IF;
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := round(v_total_amount * 0.30);

  -- 8. Customer Profile Resolution
  SELECT
    COALESCE(p_customer_name, full_name, 'Khách Hàng MIPA'),
    COALESCE(p_customer_phone, phone, ''),
    COALESCE(p_customer_email, email, '')
  INTO v_cust_name, v_cust_phone, v_cust_email
  FROM public.profiles
  WHERE id = v_customer_id;

  -- 9. Generate Sequential Booking Code
  v_booking_code := 'MIPA-' || to_char(timezone('Asia/Ho_Chi_Minh'::text, now()), 'YYYYMMDD') || '-' || LPAD(nextval('public.booking_code_seq')::text, 4, '0');

  -- 10. Insert Booking Record
  INSERT INTO public.bookings (
    booking_code,
    customer_id,
    service_id,
    package_id,
    studio_room_id,
    primary_concept_id,
    start_at,
    end_at,
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
    status
  )
  VALUES (
    v_booking_code,
    v_customer_id,
    p_service_id,
    p_package_id,
    p_studio_room_id,
    v_primary_concept_id,
    p_start_at,
    v_end_at,
    v_subtotal,
    v_addon_total,
    v_discount_total,
    v_total_amount,
    v_deposit_amount,
    p_voucher_code,
    v_cust_name,
    v_cust_phone,
    v_cust_email,
    p_occasion,
    p_customer_note,
    'PENDING_PAYMENT'
  )
  RETURNING id INTO v_new_booking_id;

  -- 11. Insert Selected Addons
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    FOREACH v_addon_id IN ARRAY p_addon_ids LOOP
      INSERT INTO public.booking_addons (booking_id, addon_id, price_at_booking)
      SELECT v_new_booking_id, id, price
      FROM public.addons
      WHERE id = v_addon_id AND active = true;
    END LOOP;
  END IF;

  -- 12. Insert Selected Booking Concepts
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    v_concept_idx := 0;
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_concept_idx := v_concept_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, display_order)
      VALUES (v_new_booking_id, v_concept_id, v_concept_idx)
      ON CONFLICT (booking_id, concept_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 13. Audit Logging
  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, details)
  VALUES (
    v_caller_id,
    'CREATE_BOOKING',
    'BOOKING',
    v_new_booking_id,
    jsonb_build_object(
      'booking_code', v_booking_code,
      'service_id', p_service_id,
      'package_id', p_package_id,
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'concept_ids', p_concept_ids,
      'primary_concept_id', v_primary_concept_id
    )
  );

  -- 14. Return Created Booking Details
  SELECT jsonb_build_object(
    'id', b.id,
    'booking_code', b.booking_code,
    'customer_id', b.customer_id,
    'service_id', b.service_id,
    'package_id', b.package_id,
    'studio_room_id', b.studio_room_id,
    'primary_concept_id', b.primary_concept_id,
    'start_at', b.start_at,
    'end_at', b.end_at,
    'status', b.status,
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
    'created_at', b.created_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. Enhance trg_enqueue_booking_events for Rich Notification Outbox Payload
-- ------------------------------------------------------------------------------
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
        'customer_name', NEW.customer_name,
        'customer_email', NEW.customer_email,
        'customer_phone', NEW.customer_phone,
        'service_id', NEW.service_id,
        'service_name', COALESCE(v_service.name, 'Dịch Vụ Studio'),
        'package_id', NEW.package_id,
        'package_name', COALESCE(v_pkg.name, 'Gói Chụp Maison MIPA'),
        'duration_minutes', COALESCE(v_pkg.duration_minutes, 60),
        'concepts_count', COALESCE(v_pkg.concepts_count, 1),
        'edited_photos_count', COALESCE(v_pkg.edited_photos_count, 10),
        'features', COALESCE(v_pkg.features, '[]'::jsonb),
        'studio_name', COALESCE(v_studio.name, 'Maison Studio Room'),
        'total_amount', NEW.total_amount,
        'deposit_amount', NEW.deposit_amount,
        'start_at', to_char(NEW.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI Ngày DD/MM/YYYY'),
        'customer_note', NEW.customer_note
      ),
      'PENDING',
      v_idempotency_key
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_booking_created_notification ON public.bookings;
CREATE TRIGGER on_booking_created_notification
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_enqueue_booking_events();

-- ------------------------------------------------------------------------------
-- 5. RLS Policies: Ensure Users Can Access Their Own Notification Outbox Entries
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users read own notifications" ON public.notification_outbox;
CREATE POLICY "Users read own notifications" ON public.notification_outbox
  FOR SELECT TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR recipient_email = auth.jwt() ->> 'email'
    OR public.get_auth_role() IN ('MANAGER', 'ADMIN')
  );

DROP POLICY IF EXISTS "Users update own notifications" ON public.notification_outbox;
CREATE POLICY "Users update own notifications" ON public.notification_outbox
  FOR UPDATE TO authenticated
  USING (
    recipient_user_id = auth.uid()
    OR recipient_email = auth.jwt() ->> 'email'
    OR public.get_auth_role() IN ('MANAGER', 'ADMIN')
  )
  WITH CHECK (
    recipient_user_id = auth.uid()
    OR recipient_email = auth.jwt() ->> 'email'
    OR public.get_auth_role() IN ('MANAGER', 'ADMIN')
  );
