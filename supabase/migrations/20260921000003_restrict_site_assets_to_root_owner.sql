-- ==============================================================================
-- Maison MIPA Memories - Migration #30: Site Asset & Storage Management Hardening
-- Ensures ADMIN, MANAGER and Root Owner can manage site_assets and upload to portfolio-public
-- ==============================================================================

-- Drop any conflicting restrictive policies on site_assets
DROP POLICY IF EXISTS "Only Root Owner can manage site assets" ON public.site_assets;
DROP POLICY IF EXISTS "Managers and Root Owner can manage site assets" ON public.site_assets;

-- Create comprehensive write policy for Managers, Admins, and Root Owner
CREATE POLICY "Managers, Admins, and Root Owner can manage site assets"
ON public.site_assets FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
  public.is_root_owner(auth.uid())
)
WITH CHECK (
  public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
  public.is_root_owner(auth.uid())
);

-- Storage bucket permissions: Allow Managers, Admins, and Root Owner to upload to portfolio-public
DROP POLICY IF EXISTS "Only Root Owner can upload to portfolio-public" ON storage.objects;
DROP POLICY IF EXISTS "Managers and Root Owner can upload to portfolio-public" ON storage.objects;

CREATE POLICY "Managers, Admins, and Root Owner can upload to portfolio-public"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-public'
  AND (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner(auth.uid())
  )
);

DROP POLICY IF EXISTS "Only Root Owner can update portfolio-public" ON storage.objects;
DROP POLICY IF EXISTS "Managers and Root Owner can update portfolio-public" ON storage.objects;

CREATE POLICY "Managers, Admins, and Root Owner can update portfolio-public"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'portfolio-public'
  AND (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner(auth.uid())
  )
);

DROP POLICY IF EXISTS "Only Root Owner can delete from portfolio-public" ON storage.objects;
DROP POLICY IF EXISTS "Managers and Root Owner can delete from portfolio-public" ON storage.objects;

CREATE POLICY "Managers, Admins, and Root Owner can delete from portfolio-public"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'portfolio-public'
  AND (
    public.get_auth_role() IN ('MANAGER', 'ADMIN') OR
    public.is_root_owner(auth.uid())
  )
);
