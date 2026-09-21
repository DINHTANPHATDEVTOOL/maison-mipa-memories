import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { convertToWebpBlob } from './siteAssetService';

/**
 * Extracts storage path from public avatar URL in portfolio-public bucket
 */
export function extractStoragePathFromAvatarUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/portfolio-public\/(avatars\/[^?#]+)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }
  return null;
}

/**
 * Uploads user avatar to Supabase Storage portfolio-public bucket under avatars/{userId}
 * Automatically optimizes to WebP 512x512 and deletes previous avatar if on cloud storage.
 */
export async function uploadUserAvatar(
  file: File,
  userId: string,
  oldAvatarUrl?: string
): Promise<{ url: string; storagePath: string }> {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
  }

  const MAX_SIZE = 8 * 1024 * 1024; // 8MB
  if (file.size > MAX_SIZE) {
    throw new Error('Kích thước ảnh đại diện vượt quá 8MB.');
  }

  // Convert to WebP square 512x512 with 90% quality
  const webpBlob = await convertToWebpBlob(file, 512, 0.9);
  const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.webp`;
  const storagePath = `avatars/${cleanUserId}/${filename}`;

  if (isSupabaseConfigured()) {
    // Clean up old avatar from storage bucket if present
    if (oldAvatarUrl) {
      const oldStoragePath = extractStoragePathFromAvatarUrl(oldAvatarUrl);
      if (oldStoragePath) {
        await supabase.storage.from('portfolio-public').remove([oldStoragePath]).catch(() => {});
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('portfolio-public')
      .upload(storagePath, webpBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      throw new Error(`Không thể tải ảnh đại diện lên: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('portfolio-public')
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : '';
    return { url: publicUrl, storagePath };
  }

  // Offline or demo fallback: create data URL
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(webpBlob);
  });

  return { url: dataUrl, storagePath };
}

/**
 * Removes avatar file from Supabase Storage portfolio-public bucket
 */
export async function removeUserAvatarFile(avatarUrl?: string): Promise<void> {
  if (!isSupabaseConfigured() || !avatarUrl) return;
  const storagePath = extractStoragePathFromAvatarUrl(avatarUrl);
  if (storagePath) {
    await supabase.storage.from('portfolio-public').remove([storagePath]).catch(() => {});
  }
}
