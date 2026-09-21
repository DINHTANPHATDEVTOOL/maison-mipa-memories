-- ==============================================================================
-- Maison MIPA Memories - Migration #31: Allow All Authenticated Users to Upload Avatars
-- Adds RLS policies so any logged-in user (including CUSTOMER / custom_mer role)
-- can upload, update, and delete their own avatar files under the avatars/ prefix
-- in the portfolio-public storage bucket.
-- ==============================================================================

-- Drop any conflicting avatar-specific policies that may already exist
DROP POLICY IF EXISTS "Any authenticated user can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Any authenticated user can update their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Any authenticated user can delete their avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can manage their own avatar" ON storage.objects;

-- INSERT: any authenticated user can upload files to the avatars/ folder
CREATE POLICY "Any authenticated user can upload avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'portfolio-public'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- UPDATE: any authenticated user can overwrite (upsert) files in the avatars/ folder
CREATE POLICY "Any authenticated user can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'portfolio-public'
  AND (storage.foldername(name))[1] = 'avatars'
)
WITH CHECK (
  bucket_id = 'portfolio-public'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- DELETE: any authenticated user can remove files from the avatars/ folder
CREATE POLICY "Any authenticated user can delete their avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'portfolio-public'
  AND (storage.foldername(name))[1] = 'avatars'
);
