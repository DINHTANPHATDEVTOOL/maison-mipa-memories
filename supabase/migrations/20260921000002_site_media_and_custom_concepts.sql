-- ==============================================================================
-- Maison MIPA Memories - Migration #29: Site Media CMS & Direct Asset Upload
-- Enables Root Owner & Managers to upload & customize all site images directly
-- ==============================================================================

-- 1. Create site_assets table for dynamic full-site image management
CREATE TABLE IF NOT EXISTS public.site_assets (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  storage_path TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Enable RLS
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies: Public read, Root Owner / Manager / Admin update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_assets' AND schemaname = 'public' AND policyname = 'Public can read site assets'
  ) THEN
    CREATE POLICY "Public can read site assets"
    ON public.site_assets FOR SELECT
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'site_assets' AND schemaname = 'public' AND policyname = 'Managers and Root Owner can manage site assets'
  ) THEN
    CREATE POLICY "Managers and Root Owner can manage site assets"
    ON public.site_assets FOR ALL TO authenticated
    USING (
      public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
      public.is_root_owner(auth.uid())
    )
    WITH CHECK (
      public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
      public.is_root_owner(auth.uid())
    );
  END IF;
END $$;

-- 4. Initial Seed for standard site asset slots
INSERT INTO public.site_assets (id, page, label, description, image_url)
VALUES
  ('home_hero_banner', 'HOME', 'Ảnh Banner Chính (Hero Section)', 'Khung hình chính đầu trang chủ (Tỷ lệ 16:9 hoặc 3:2, khuyến nghị >= 1920x1080px)', '/hero.png'),
  ('home_curatorial_banner', 'HOME', 'Ảnh Giới Thiệu Nghệ Thuật (Curatorial Split)', 'Khung hình phân tách giữa trang tôn vinh phong cách atelier Pháp', '/studio.png'),
  ('home_atelier_showcase', 'HOME', 'Ảnh Không Gian Studio (Atelier Darkroom)', 'Góc phòng studio nghệ thuật, ánh sáng tự nhiên', '/studio.png'),
  ('home_cta_banner', 'HOME', 'Ảnh Lời Kết & Đặt Lịch (Final CTA)', 'Khung hình nền ấm áp cuối trang trước form gửi yêu cầu tư vấn', '/hero.png'),
  ('service_couple', 'SERVICES', 'Ảnh Dịch Vụ: Couple & Kỷ Niệm', 'Ảnh đại diện gói chụp đôi lãng mạn', '/hero-couple.jpg'),
  ('service_portrait', 'SERVICES', 'Ảnh Dịch Vụ: Chân Dung Nghệ Thuật', 'Ảnh đại diện gói chụp chân dung cá nhân thần thái', '/hero-camera.jpg'),
  ('service_family', 'SERVICES', 'Ảnh Dịch Vụ: Gia Đình & Em Bé', 'Ảnh đại diện gói chụp gia đình & baby', '/hero-baby.jpg'),
  ('service_graduation', 'SERVICES', 'Ảnh Dịch Vụ: Kỷ Yếu & Tốt Nghiệp', 'Ảnh đại diện gói chụp kỷ niệm thanh xuân', '/concept-graduation.webp'),
  ('service_birthday', 'SERVICES', 'Ảnh Dịch Vụ: Sinh Nhật & Tiệc', 'Ảnh đại diện gói chụp sinh nhật, sự kiện nhỏ', '/concept-tet.webp'),
  ('atelier_room_1', 'ATELIER', 'Không Gian Studio: Parisian Salon (Phòng 1)', 'Phòng concept cổ điển Pháp phong cách Paris', '/studio.png'),
  ('atelier_room_2', 'ATELIER', 'Không Gian Studio: Vintage Loft (Phòng 2)', 'Phòng ánh sáng tự nhiên tone ấm vintage', '/hero-camera.jpg'),
  ('atelier_room_3', 'ATELIER', 'Không Gian Studio: Garden Atelier (Phòng 3)', 'Khu vực bối cảnh vườn & ánh sáng hoa tươi', '/hero-bride.jpg')
ON CONFLICT (id) DO NOTHING;

-- 5. Add direct cover_photo_url column to concepts and portfolio_collections for direct asset uploads
ALTER TABLE public.concepts ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;
ALTER TABLE public.portfolio_collections ADD COLUMN IF NOT EXISTS cover_photo_url TEXT;

