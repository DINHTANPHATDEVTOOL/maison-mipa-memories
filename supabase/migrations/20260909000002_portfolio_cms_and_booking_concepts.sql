-- ==============================================================================
-- Maison MIPA Memories - Migration #5: Portfolio CMS, Concept Collections &
-- Authoritative Booking Concept Validation (#16 & #6)
-- ==============================================================================

-- 1. Concepts Table
CREATE TABLE IF NOT EXISTS public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_photo_id UUID,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  bookable BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Portfolio Collections Table
CREATE TABLE IF NOT EXISTS public.portfolio_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  featured BOOLEAN NOT NULL DEFAULT false,
  cover_photo_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Portfolio Photos Table
CREATE TABLE IF NOT EXISTS public.portfolio_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.portfolio_collections(id) ON DELETE CASCADE,
  web_asset_key TEXT,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 1200,
  height INTEGER NOT NULL DEFAULT 800,
  focal_x NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (focal_x >= 0 AND focal_x <= 100),
  focal_y NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (focal_y >= 0 AND focal_y <= 100),
  alt_text TEXT NOT NULL DEFAULT '',
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  variants JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Extend Bookings Table with concept relation
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS concept_id UUID REFERENCES public.concepts(id) ON DELETE SET NULL;

-- 5. Booking Concepts Join Table (for packages supporting multiple concepts)
CREATE TABLE IF NOT EXISTS public.booking_concepts (
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  concept_id UUID NOT NULL REFERENCES public.concepts(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (booking_id, concept_id)
);

-- Indexes for high-traffic queries
CREATE INDEX IF NOT EXISTS idx_concepts_slug ON public.concepts(slug);
CREATE INDEX IF NOT EXISTS idx_concepts_service ON public.concepts(service_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_collections_slug ON public.portfolio_collections(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_collections_concept ON public.portfolio_collections(concept_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_collections_status ON public.portfolio_collections(status);
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_collection ON public.portfolio_photos(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bookings_concept ON public.bookings(concept_id);

-- ==============================================================================
-- Row-Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_concepts ENABLE ROW LEVEL SECURITY;

-- Concepts RLS
DROP POLICY IF EXISTS "Public can view active concepts" ON public.concepts;
CREATE POLICY "Public can view active concepts"
  ON public.concepts FOR SELECT
  USING (active = true OR public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'));

DROP POLICY IF EXISTS "Managers and Admins can manage concepts" ON public.concepts;
CREATE POLICY "Managers and Admins can manage concepts"
  ON public.concepts FOR ALL
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Portfolio Collections RLS
DROP POLICY IF EXISTS "Public can view published collections" ON public.portfolio_collections;
CREATE POLICY "Public can view published collections"
  ON public.portfolio_collections FOR SELECT
  USING (
    status = 'PUBLISHED' OR
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
  );

DROP POLICY IF EXISTS "Staff can insert draft collections" ON public.portfolio_collections;
CREATE POLICY "Staff can insert draft collections"
  ON public.portfolio_collections FOR INSERT
  WITH CHECK (
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN') AND
    (public.get_auth_role() IN ('MANAGER', 'ADMIN') OR status = 'DRAFT')
  );

DROP POLICY IF EXISTS "Managers and Admins can mutate collections" ON public.portfolio_collections;
CREATE POLICY "Managers and Admins can mutate collections"
  ON public.portfolio_collections FOR UPDATE
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

DROP POLICY IF EXISTS "Managers and Admins can delete collections" ON public.portfolio_collections;
CREATE POLICY "Managers and Admins can delete collections"
  ON public.portfolio_collections FOR DELETE
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Portfolio Photos RLS
DROP POLICY IF EXISTS "Public can view photos of published collections" ON public.portfolio_photos;
CREATE POLICY "Public can view photos of published collections"
  ON public.portfolio_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_collections pc
      WHERE pc.id = collection_id AND pc.status = 'PUBLISHED'
    ) OR
    public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
  );

DROP POLICY IF EXISTS "Staff, Managers and Admins can insert photos" ON public.portfolio_photos;
CREATE POLICY "Staff, Managers and Admins can insert photos"
  ON public.portfolio_photos FOR INSERT
  WITH CHECK (public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN'));

DROP POLICY IF EXISTS "Managers and Admins can update photos" ON public.portfolio_photos;
CREATE POLICY "Managers and Admins can update photos"
  ON public.portfolio_photos FOR UPDATE
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'))
  WITH CHECK (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

DROP POLICY IF EXISTS "Managers and Admins can delete photos" ON public.portfolio_photos;
CREATE POLICY "Managers and Admins can delete photos"
  ON public.portfolio_photos FOR DELETE
  USING (public.get_auth_role() IN ('MANAGER', 'ADMIN'));

-- Booking Concepts RLS
DROP POLICY IF EXISTS "Customers and Staff can view booking concepts" ON public.booking_concepts;
CREATE POLICY "Customers and Staff can view booking concepts"
  ON public.booking_concepts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND (
        b.customer_id = auth.uid() OR
        public.get_auth_role() IN ('STAFF', 'MANAGER', 'ADMIN')
      )
    )
  );

-- ==============================================================================
-- Authoritative RPC: publish_portfolio_collection
-- Only Manager or Admin can publish/unpublish collections.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.publish_portfolio_collection(
  p_collection_id UUID,
  p_publish BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_target_status TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Login required.' USING ERRCODE = '42501';
  END IF;

  v_caller_role := public.get_auth_role();
  IF v_caller_role NOT IN ('MANAGER', 'ADMIN') THEN
    RAISE EXCEPTION 'Permission denied: Only Manager or Admin can publish portfolio collections. Staff/Photographers are not authorized.' USING ERRCODE = '42501';
  END IF;

  v_target_status := CASE WHEN p_publish THEN 'PUBLISHED' ELSE 'DRAFT' END;

  UPDATE public.portfolio_collections
  SET
    status = v_target_status,
    published_by = CASE WHEN p_publish THEN v_caller_id ELSE NULL END,
    published_at = CASE WHEN p_publish THEN timezone('utc'::text, now()) ELSE NULL END,
    updated_at = timezone('utc'::text, now())
  WHERE id = p_collection_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portfolio collection % not found.', p_collection_id USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'collection_id', p_collection_id,
    'status', v_target_status,
    'updated_at', timezone('utc'::text, now())
  );
END;
$$;

-- ==============================================================================
-- Authoritative RPC: create_booking with Concept Validation & Limit Enforcement
-- ==============================================================================
-- Drop the legacy 11-argument signature from migration #2 so there is no signature conflict or parameter default collision
DROP FUNCTION IF EXISTS public.create_booking(
  UUID, UUID, UUID, TIMESTAMPTZ,
  UUID[], TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

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

  v_customer_id := v_caller_id;
  v_caller_role := public.get_auth_role();

  -- 1. Validate Service
  SELECT * INTO v_service FROM public.services WHERE id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or inactive service specified.' USING ERRCODE = 'P0002';
  END IF;

  -- 2. Validate Package & Service association
  SELECT * INTO v_pkg FROM public.packages
  WHERE id = p_package_id AND service_id = p_service_id AND active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid package specified for the selected service.' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Validate Concepts & Enforce Package concepts_count Limit
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    -- Limit Check
    IF array_length(p_concept_ids, 1) > v_pkg.concepts_count THEN
      RAISE EXCEPTION 'Package concept limit exceeded. Selected: %, Allowed: %',
        array_length(p_concept_ids, 1), v_pkg.concepts_count USING ERRCODE = 'P0003';
    END IF;

    -- Validate each concept
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
    v_addon_total := 0; -- reset for price calculation
  END IF;

  v_end_at := p_start_at + (v_total_duration * INTERVAL '1 minute');

  -- 6. Calculate Server-Authoritative Pricing (Single Source of Truth)
  IF p_addon_ids IS NOT NULL AND array_length(p_addon_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(price), 0) INTO v_addon_total
    FROM public.addons
    WHERE id = ANY(p_addon_ids) AND active = true;
  END IF;

  v_subtotal := v_pkg.price + v_addon_total;

  -- Validate Voucher if provided
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

        -- Update usage count
        UPDATE public.promotions SET usage_count = usage_count + 1 WHERE id = v_promo.id;
      END IF;
    END IF;
  END IF;

  v_total_amount := GREATEST(0, v_subtotal - v_discount_total);
  v_deposit_amount := COALESCE(v_pkg.deposit_amount, ROUND(v_total_amount * 0.3));

  -- 7. Customer details resolution
  SELECT full_name, phone, email INTO v_cust_name, v_cust_phone, v_cust_email
  FROM public.profiles WHERE id = v_customer_id;

  v_cust_name := COALESCE(p_customer_name, v_cust_name, 'Khách Hàng MIPA');
  v_cust_phone := COALESCE(p_customer_phone, v_cust_phone, '');
  v_cust_email := COALESCE(p_customer_email, v_cust_email, '');

  -- 8. Generate Booking Code
  v_booking_code := 'MIPA-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 4));

  -- 9. Insert Booking record
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
    customer_note
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
    p_customer_note
  )
  RETURNING id INTO v_new_booking_id;

  -- 10. Insert Booking Addons
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

  -- 11. Insert Booking Concepts
  IF p_concept_ids IS NOT NULL AND array_length(p_concept_ids, 1) > 0 THEN
    FOREACH v_concept_id IN ARRAY p_concept_ids LOOP
      v_concept_idx := v_concept_idx + 1;
      INSERT INTO public.booking_concepts (booking_id, concept_id, sort_order)
      VALUES (v_new_booking_id, v_concept_id, v_concept_idx);
    END LOOP;
  END IF;

  -- 12. Create initial Audit Log
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
      'total_amount', v_total_amount,
      'deposit_amount', v_deposit_amount,
      'concept_id', v_primary_concept_id,
      'concept_ids', p_concept_ids,
      'start_at', p_start_at,
      'end_at', v_end_at
    )
  );

  -- 13. Return Created Booking Details
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
    'created_at', b.created_at
  ) INTO v_result
  FROM public.bookings b
  WHERE b.id = v_new_booking_id;

  RETURN v_result;
END;
$$;


-- ==============================================================================
-- Seeds: Authentic Concepts, Collections and Photos
-- ==============================================================================
INSERT INTO public.concepts (id, slug, name, description, service_id, active, bookable, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'parisian-romance', 'Parisian Romance', 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel và phong cách cổ điển lãng mạn nước Pháp.', 'c0000000-0000-0000-0000-000000000001', true, true, 1),
  ('c1000000-0000-0000-0000-000000000002', 'vintage-cinematic', 'Vintage Loft & Cinematic', 'Tone nâu ấm, ánh sáng điện ảnh tương phản nhẹ tôn vinh cảm xúc chân thật và chiều sâu.', 'c0000000-0000-0000-0000-000000000001', true, true, 2),
  ('c1000000-0000-0000-0000-000000000003', 'french-haute-couture', 'French Haute Couture', 'Váy cưới tối giản sang trọng, khăn voan bay bổng và tạo dáng nghệ thuật thời trang cao cấp.', 'c0000000-0000-0000-0000-000000000002', true, true, 3),
  ('c1000000-0000-0000-0000-000000000004', 'la-famille-douce', 'La Famille Douce', 'Không gian phòng khách ấm áp, lưu giữ nụ cười và sự gắn kết tự nhiên của mọi thành viên gia đình.', 'c0000000-0000-0000-0000-000000000003', true, true, 4),
  ('c1000000-0000-0000-0000-000000000005', 'l-ange-de-mipa', 'L''Ange de MIPA', 'Tone trắng tinh khôi, ánh sáng dịu nhẹ ôm ấp những khoảnh khắc đầu đời đáng yêu của bé.', 'c0000000-0000-0000-0000-000000000004', true, true, 5),
  ('c1000000-0000-0000-0000-000000000006', 'monochrome-editorial', 'Monochrome Editorial Portrait', 'Chân dung nghệ thuật đen trắng giàu xúc cảm, bắt trọn thần thái và cá tính độc bản.', 'c0000000-0000-0000-0000-000000000005', true, true, 6),
  ('c1000000-0000-0000-0000-000000000007', 'private-atelier-special', 'Private Atelier Special', 'Concept phiên bản giới hạn theo mùa, chỉ mở theo sự kiện studio.', 'c0000000-0000-0000-0000-000000000005', true, false, 7)
ON CONFLICT (id) DO NOTHING;

-- Seed Collections
INSERT INTO public.portfolio_collections (id, slug, title, description, concept_id, service_id, status, featured, display_order, published_at)
VALUES
  (
    'c2000000-0000-0000-0000-000000000001',
    'parisian-romance-autumn',
    'Parisian Romance — Thu Cổ Điển',
    'Bộ ảnh couple phong cách Pháp dịu dàng trong ánh nắng chiều thu, ghi dấu những rung động tinh khôi nhất.',
    'c1000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'PUBLISHED',
    true,
    1,
    timezone('utc'::text, now())
  ),
  (
    'c2000000-0000-0000-0000-000000000002',
    'vintage-loft-intimate',
    'Vintage Loft Moments',
    'Khoảnh khắc đời thường mộc mạc của cặp đôi trong căn phòng loft rực nắng ấm áp.',
    'c1000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'PUBLISHED',
    true,
    2,
    timezone('utc'::text, now())
  ),
  (
    'c2000000-0000-0000-0000-000000000003',
    'renaissance-white-veil',
    'Renaissance White Veil — Ánh Sáng Tình Yêu',
    'Khăn voan thêu tay cổ điển kết hợp ánh sáng tự nhiên tạo nên những khung hình cưới vượt thời gian.',
    'c1000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000002',
    'PUBLISHED',
    true,
    3,
    timezone('utc'::text, now())
  ),
  (
    'c2000000-0000-0000-0000-000000000004',
    'la-famille-douce-home',
    'La Famille Douce — Bình Yên Trọn Vẹn',
    'Kỷ niệm gia đình ngập tràn tiếng cười và sự âu yếm trong không gian studio ấm cúng như chính ngôi nhà bạn.',
    'c1000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000003',
    'PUBLISHED',
    false,
    4,
    timezone('utc'::text, now())
  ),
  (
    'c2000000-0000-0000-0000-000000000005',
    'l-ange-pure-whiteness',
    'L''Ange — Thiên Thần Bé Nhỏ',
    'Vẻ đẹp thiên thần thơ ngây của bé yêu được nâng niu bằng những chất liệu ren thêu mềm mại nhất.',
    'c1000000-0000-0000-0000-000000000005',
    'c0000000-0000-0000-0000-000000000004',
    'PUBLISHED',
    false,
    5,
    timezone('utc'::text, now())
  ),
  (
    'c2000000-0000-0000-0000-000000000006',
    'monochrome-soul-draft',
    'Monochrome Soul & Contrast (Draft Preview)',
    'Bộ ảnh chân dung nghệ thuật thử nghiệm đang hoàn thiện hậu kỳ.',
    'c1000000-0000-0000-0000-000000000006',
    'c0000000-0000-0000-0000-000000000005',
    'DRAFT',
    false,
    6,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- Seed Photos for Collections
INSERT INTO public.portfolio_photos (id, collection_id, url, filename, width, height, focal_x, focal_y, alt_text, caption, sort_order, featured)
VALUES
  ('c3000000-0000-0000-0000-000000000001', 'c2000000-0000-0000-0000-000000000001', '/hero.png', 'parisian-romance-1.webp', 1920, 1080, 50.0, 45.0, 'Couple trong trang phục tone be vintage Maison MIPA', 'Ánh chiều tà bên rèm lụa Pháp', 1, true),
  ('c3000000-0000-0000-0000-000000000002', 'c2000000-0000-0000-0000-000000000001', '/studio.png', 'parisian-romance-2.webp', 1920, 1080, 50.0, 50.0, 'Góc hoa tươi và tách trà chiều Parisian', 'Chi tiết trang trí tinh tế tại Studio', 2, false),
  ('c3000000-0000-0000-0000-000000000003', 'c2000000-0000-0000-0000-000000000002', '/studio.png', 'vintage-loft-1.webp', 1920, 1080, 45.0, 40.0, 'Không gian phòng Studio gạch mộc và sofa da cổ điển', 'Không gian Vintage Loft mộc mạc', 1, true),
  ('c3000000-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000002', '/hero.png', 'vintage-loft-2.webp', 1920, 1080, 55.0, 50.0, 'Nụ cười hạnh phúc tự nhiên của cặp đôi', 'Khoảnh khắc vui vẻ tự nhiên', 2, false),
  ('c3000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000003', '/hero.png', 'renaissance-veil-1.webp', 1920, 1080, 50.0, 35.0, 'Cô dâu trong chiếc khăn voan ren thêu tay tinh xảo', 'Khăn voan thêu tay độc bản', 1, true),
  ('c3000000-0000-0000-0000-000000000006', 'c2000000-0000-0000-0000-000000000004', '/studio.png', 'family-home-1.webp', 1920, 1080, 50.0, 50.0, 'Gia đình 3 thế hệ quây quần bên phòng khách ấm áp', 'Sự gắn kết ngọt ngào của tổ ấm', 1, true),
  ('c3000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000005', '/hero.png', 'l-ange-baby-1.webp', 1920, 1080, 50.0, 50.0, 'Em bé ngủ say trong chiếc nôi mây vintage bồng bềnh', 'Giấc ngủ thiên thần của bé', 1, true)
ON CONFLICT (id) DO NOTHING;
