-- ==============================================================================
-- Maison MIPA Memories - Migration #28: Dynamic Portfolio Asset Management & Storage
-- Enables fully dynamic admin upload and persistent asset storage in Supabase Storage
-- ==============================================================================

-- 1. Extend portfolio_photos with storage metadata columns
ALTER TABLE public.portfolio_photos
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'portfolio-public',
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT DEFAULT 'image/webp',
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id);

-- 2. Ensure storage bucket for portfolio-public exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'portfolio-public',
  'portfolio-public',
  true,
  15728640, -- 15MB max
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies for portfolio-public
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public read portfolio assets'
  ) THEN
    CREATE POLICY "Public read portfolio assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'portfolio-public');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authorized staff upload portfolio assets'
  ) THEN
    CREATE POLICY "Authorized staff upload portfolio assets"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'portfolio-public'
      AND public.get_auth_role() IN ('MANAGER', 'ADMIN', 'STAFF')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Managers update portfolio assets'
  ) THEN
    CREATE POLICY "Managers update portfolio assets"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'portfolio-public'
      AND public.get_auth_role() IN ('MANAGER', 'ADMIN')
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Managers delete portfolio assets'
  ) THEN
    CREATE POLICY "Managers delete portfolio assets"
    ON storage.objects FOR DELETE TO authenticated
    USING (
      bucket_id = 'portfolio-public'
      AND public.get_auth_role() IN ('MANAGER', 'ADMIN')
    );
  END IF;
END $$;

-- 4. Index for sorting
CREATE INDEX IF NOT EXISTS idx_portfolio_photos_order ON public.portfolio_photos(collection_id, sort_order ASC);
