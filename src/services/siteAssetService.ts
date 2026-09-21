// ==============================================================================
// Maison MIPA Memories - Site Media & Asset Management Service
// Full-site dynamic image management for Root Owner & Studio Managers
// Direct file upload to Supabase Storage with WebP compression & metadata stripping
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { SiteAssetRow } from '../types/database';

export interface SiteAsset {
  id: string;
  page: 'HOME' | 'SERVICES' | 'CONCEPTS' | 'PORTFOLIO' | 'ATELIER' | 'GLOBAL' | 'CUSTOM';
  label: string;
  description?: string;
  imageUrl: string;
  storagePath?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export const DEFAULT_SITE_ASSETS: Record<string, SiteAsset> = {
  site_logo: {
    id: 'site_logo',
    page: 'GLOBAL',
    label: 'Logo Thương Hiệu (Navbar & Header)',
    description: 'Logo chính thức của Tiệm ảnh Maison MIPA Memories',
    imageUrl: '/logo.png',
  },
  site_logo_transparent: {
    id: 'site_logo_transparent',
    page: 'GLOBAL',
    label: 'Logo Trong Suốt (Footer & Dark Mode)',
    description: 'Logo phiên bản nền trong suốt tinh tế',
    imageUrl: '/logo-transparent.png',
  },
  site_favicon: {
    id: 'site_favicon',
    page: 'GLOBAL',
    label: 'Biểu Tượng Favicon Trình Duyệt',
    description: 'Biểu tượng nhỏ hiển thị trên tab trình duyệt',
    imageUrl: '/favicon.png',
  },
  home_hero_banner: {
    id: 'home_hero_banner',
    page: 'HOME',
    label: 'Ảnh Banner Chính (Hero Section)',
    description: 'Khung hình chính đầu trang chủ (Tỷ lệ 16:9 hoặc 3:2, khuyến nghị >= 1920x1080px)',
    imageUrl: '/hero.png',
  },
  home_curatorial_banner: {
    id: 'home_curatorial_banner',
    page: 'HOME',
    label: 'Ảnh Giới Thiệu Nghệ Thuật (Curatorial Split)',
    description: 'Khung hình phân tách giữa trang tôn vinh phong cách atelier Pháp',
    imageUrl: '/studio.png',
  },
  home_atelier_showcase: {
    id: 'home_atelier_showcase',
    page: 'HOME',
    label: 'Ảnh Không Gian Studio (Atelier Darkroom)',
    description: 'Góc phòng studio nghệ thuật, ánh sáng tự nhiên',
    imageUrl: '/studio.png',
  },
  home_cta_banner: {
    id: 'home_cta_banner',
    page: 'HOME',
    label: 'Ảnh Lời Kết & Đặt Lịch (Final CTA)',
    description: 'Khung hình nền ấm áp cuối trang trước form gửi yêu cầu tư vấn',
    imageUrl: '/hero.png',
  },
  service_couple: {
    id: 'service_couple',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Couple & Kỷ Niệm',
    description: 'Ảnh đại diện gói chụp đôi lãng mạn',
    imageUrl: '/hero-couple.jpg',
  },
  service_wedding: {
    id: 'service_wedding',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Cưới & Pre-Wedding',
    description: 'Ảnh đại diện gói chụp ảnh cưới studio phong cách Pháp',
    imageUrl: '/hero-bride.jpg',
  },
  service_portrait: {
    id: 'service_portrait',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Chân Dung Nghệ Thuật',
    description: 'Ảnh đại diện gói chụp chân dung cá nhân thần thái',
    imageUrl: '/hero-camera.jpg',
  },
  service_family: {
    id: 'service_family',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Gia Đình',
    description: 'Ảnh đại diện gói chụp gia đình đa thế hệ',
    imageUrl: '/hero-baby.jpg',
  },
  service_baby: {
    id: 'service_baby',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Em Bé & Baby',
    description: 'Ảnh đại diện gói chụp em bé sơ sinh & thôi nôi',
    imageUrl: '/hero-baby.jpg',
  },
  service_graduation: {
    id: 'service_graduation',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Kỷ Yếu & Tốt Nghiệp',
    description: 'Ảnh đại diện gói chụp kỷ niệm thanh xuân',
    imageUrl: '/concept-graduation.webp',
  },
  service_birthday: {
    id: 'service_birthday',
    page: 'SERVICES',
    label: 'Ảnh Dịch Vụ: Sinh Nhật & Tiệc',
    description: 'Ảnh đại diện gói chụp sinh nhật, sự kiện nhỏ',
    imageUrl: '/concept-tet.webp',
  },
  atelier_room_1: {
    id: 'atelier_room_1',
    page: 'ATELIER',
    label: 'Không Gian: Parisian Salon (Phòng 1)',
    description: 'Phòng concept cổ điển Pháp phong cách Paris',
    imageUrl: '/studio.png',
  },
  atelier_room_2: {
    id: 'atelier_room_2',
    page: 'ATELIER',
    label: 'Không Gian: Vintage Loft (Phòng 2)',
    description: 'Phòng ánh sáng tự nhiên tone ấm vintage',
    imageUrl: '/hero-camera.jpg',
  },
  atelier_room_3: {
    id: 'atelier_room_3',
    page: 'ATELIER',
    label: 'Không Gian: Garden Atelier (Phòng 3)',
    description: 'Khu vực bối cảnh vườn & ánh sáng hoa tươi',
    imageUrl: '/hero-bride.jpg',
  },
  brand_story_1: {
    id: 'brand_story_1',
    page: 'HOME',
    label: 'Ảnh Câu Chuyện Thương Hiệu (Khung 1)',
    description: 'Khung ảnh giới thiệu phong cách tiệm ảnh Maison MIPA',
    imageUrl: '/hero-couple.jpg',
  },
  brand_story_2: {
    id: 'brand_story_2',
    page: 'HOME',
    label: 'Ảnh Câu Chuyện Thương Hiệu (Khung 2)',
    description: 'Khung ảnh góc studio và ánh sáng tự nhiên',
    imageUrl: '/studio.png',
  },
  concept_aodai: {
    id: 'concept_aodai',
    page: 'CONCEPTS',
    label: 'Ảnh Concept: Nàng Thơ Áo Dài',
    description: 'Ảnh đại diện concept Áo dài truyền thống & cách tân',
    imageUrl: '/concept-aodai.webp',
  },
  concept_graduation: {
    id: 'concept_graduation',
    page: 'CONCEPTS',
    label: 'Ảnh Concept: Kỷ Yếu & Tốt Nghiệp',
    description: 'Ảnh đại diện concept Kỷ yếu thanh xuân',
    imageUrl: '/concept-graduation.webp',
  },
  concept_tet: {
    id: 'concept_tet',
    page: 'CONCEPTS',
    label: 'Ảnh Concept: Tết Sum Vầy & Du Xuân',
    description: 'Ảnh đại diện concept Tết ấm áp',
    imageUrl: '/concept-tet.webp',
  },
  concept_noel: {
    id: 'concept_noel',
    page: 'CONCEPTS',
    label: 'Ảnh Concept: Giáng Sinh Lung Linh (Noel Cozy)',
    description: 'Ảnh đại diện concept Giáng sinh ấm áp',
    imageUrl: '/concept-noel.webp',
  },
  editorial_guide_banner: {
    id: 'editorial_guide_banner',
    page: 'GLOBAL',
    label: 'Ảnh Banner Cẩm Nang Chuẩn Bị (/cam-nang)',
    description: 'Ảnh trang cẩm nang chụp ảnh',
    imageUrl: '/hero-camera.jpg',
  },
};

const LOCAL_STORAGE_KEY = 'maison_mipa_site_assets_cache';
let cachedAssets: Record<string, SiteAsset> | null = null;
type AssetListener = (assets: Record<string, SiteAsset>) => void;
const listeners = new Set<AssetListener>();

function notifyListeners(assets: Record<string, SiteAsset>) {
  listeners.forEach(fn => {
    try {
      fn(assets);
    } catch (e) {
      console.error('Error notifying site assets listener:', e);
    }
  });
}

/** Clears the in-memory module-level cache so the next getSiteAssets() call re-fetches from Supabase */
export function bustSiteAssetsCache(): void {
  cachedAssets = null;
}

/**
 * Synchronously retrieves initial site assets from localStorage cache or defaults.
 * Guarantees zero-latency initialization to prevent flashing default assets on page reload.
 */
export function getInitialSiteAssets(): Record<string, SiteAsset> {
  let localCache: Record<string, SiteAsset> = { ...DEFAULT_SITE_ASSETS };
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          localCache = { ...DEFAULT_SITE_ASSETS, ...parsed };
        }
      }
    } catch {
      // Ignore JSON error
    }
  }
  return localCache;
}


/**
 * Strips EXIF/GPS and compresses image to clean WebP blob
 */
export async function convertToWebpBlob(file: File | Blob, maxWidth = 2048, quality = 0.88): Promise<Blob> {
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    (typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST)))
  ) {
    return file instanceof Blob ? file : new Blob([file], { type: 'image/webp' });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const naturalWidth = img.naturalWidth || img.width || 1200;
      const naturalHeight = img.naturalHeight || img.height || 800;

      let targetWidth = naturalWidth;
      let targetHeight = naturalHeight;

      if (naturalWidth > maxWidth || naturalHeight > maxWidth) {
        if (naturalWidth > naturalHeight) {
          targetWidth = maxWidth;
          targetHeight = Math.round((naturalHeight * maxWidth) / naturalWidth);
        } else {
          targetHeight = maxWidth;
          targetWidth = Math.round((naturalWidth * maxWidth) / naturalHeight);
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(file instanceof Blob ? file : new Blob([file], { type: 'image/webp' }));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file instanceof Blob ? file : new Blob([file], { type: 'image/webp' }));
          }
        },
        'image/webp',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file hình ảnh đã chọn.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Generic direct upload helper: compresses image to WebP and uploads to Supabase Storage
 */
export async function uploadDirectAssetFile(
  file: File,
  folder = 'site-assets',
  prefix = 'asset'
): Promise<{ url: string; storagePath: string; fileSizeBytes: number }> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Định dạng file không được hỗ trợ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
  }

  const webpBlob = await convertToWebpBlob(file, 2048, 0.88);
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const filename = `${cleanPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.webp`;
  const storagePath = `${folder}/${filename}`;

  if (isSupabaseConfigured()) {
    const { error: uploadError } = await supabase.storage
      .from('portfolio-public')
      .upload(storagePath, webpBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw new Error(`Lỗi tải ảnh lên đám mây: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('portfolio-public')
      .getPublicUrl(storagePath);

    // Append cache-busting timestamp so CDN and browser do not serve a stale version
    const publicUrl = urlData?.publicUrl
      ? `${urlData.publicUrl}?t=${Date.now()}`
      : '';

    return {
      url: publicUrl,
      storagePath,
      fileSizeBytes: webpBlob.size,
    };
  }

  // Offline / Demo fallback: Create object URL
  const localUrl = URL.createObjectURL(webpBlob);
  return {
    url: localUrl,
    storagePath,
    fileSizeBytes: webpBlob.size,
  };
}

/**
 * Fetches all site assets, merging Supabase records with default site assets
 */
export async function getSiteAssets(): Promise<Record<string, SiteAsset>> {
  if (cachedAssets) {
    return cachedAssets;
  }

  // Hydrate from localStorage first if available
  const localCache = getInitialSiteAssets();

  if (!isSupabaseConfigured()) {
    cachedAssets = localCache;
    return cachedAssets;
  }

  try {
    const { data, error } = await supabase
      .from('site_assets')
      .select('*');

    if (error) {
      console.warn('Could not load site_assets from Supabase, using defaults:', error.message);
      cachedAssets = localCache;
      return cachedAssets;
    }

    const merged: Record<string, SiteAsset> = { ...DEFAULT_SITE_ASSETS };

    if (Array.isArray(data)) {
      data.forEach((row: SiteAssetRow) => {
        merged[row.id] = {
          id: row.id,
          page: (row.page as any) || 'GLOBAL',
          label: row.label || row.id,
          description: row.description || undefined,
          imageUrl: row.image_url,
          storagePath: row.storage_path || undefined,
          updatedBy: row.updated_by || undefined,
          updatedAt: row.updated_at,
        };
      });
    }

    cachedAssets = merged;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore storage error
      }
    }

    return merged;
  } catch (err) {
    console.warn('Network error reading site_assets:', err);
    cachedAssets = localCache;
    return cachedAssets;
  }
}

/**
 * Updates a site asset image directly via file upload
 */
export async function updateSiteAssetImage(
  assetId: string,
  file: File,
  userId?: string
): Promise<SiteAsset> {
  const currentAssets = await getSiteAssets();
  const existing = currentAssets[assetId] || DEFAULT_SITE_ASSETS[assetId] || {
    id: assetId,
    page: 'GLOBAL',
    label: assetId,
    imageUrl: '/hero.png',
  };

  const oldStoragePath = existing.storagePath;

  const uploadResult = await uploadDirectAssetFile(file, 'site-assets', assetId);

  // Physically delete the previous custom image file from Supabase Storage so it is not retained
  if (oldStoragePath && oldStoragePath !== uploadResult.storagePath && isSupabaseConfigured()) {
    try {
      const { error: removeError } = await supabase.storage
        .from('portfolio-public')
        .remove([oldStoragePath]);
      if (removeError) {
        console.warn('Could not remove previous asset file from storage:', removeError.message);
      }
    } catch (err) {
      console.warn('Error deleting old asset file from storage:', err);
    }
  }

  const updatedAsset: SiteAsset = {
    ...existing,
    imageUrl: uploadResult.url,
    storagePath: uploadResult.storagePath,
    updatedBy: userId,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const isValidUuid =
      typeof userId === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    const { error: dbError } = await supabase
      .from('site_assets')
      .upsert({
        id: updatedAsset.id,
        page: updatedAsset.page,
        label: updatedAsset.label,
        description: updatedAsset.description || null,
        image_url: updatedAsset.imageUrl,
        storage_path: updatedAsset.storagePath || null,
        updated_by: isValidUuid ? userId : null,
        updated_at: updatedAsset.updatedAt,
      });

    if (dbError) {
      console.error('Error saving site_asset to database:', dbError);
      throw new Error(`Không thể lưu thay đổi vào cơ sở dữ liệu: ${dbError.message}`);
    }
  }

  // Update in-memory & localStorage
  const nextAssets = { ...currentAssets, [assetId]: updatedAsset };
  cachedAssets = nextAssets;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextAssets));
    } catch {
      // Ignore
    }
  }

  notifyListeners(nextAssets);
  return updatedAsset;
}

/**
 * Resets a site asset back to the initial brand default, deleting the uploaded file from cloud storage
 */
export async function resetSiteAssetToDefault(assetId: string): Promise<SiteAsset> {
  const defaultAsset = DEFAULT_SITE_ASSETS[assetId];
  if (!defaultAsset) {
    throw new Error('Không tìm thấy cấu hình mặc định cho ảnh này.');
  }

  const currentAssets = await getSiteAssets();
  const existing = currentAssets[assetId];

  if (isSupabaseConfigured()) {
    // 1. Physically delete uploaded file from Supabase Storage bucket
    if (existing?.storagePath) {
      try {
        const { error: removeError } = await supabase.storage
          .from('portfolio-public')
          .remove([existing.storagePath]);
        if (removeError) {
          console.warn('Failed to delete asset file from storage bucket:', removeError.message);
        }
      } catch (err) {
        console.warn('Error deleting asset from storage during reset:', err);
      }
    }

    // 2. Clear image_url back to default and clear storage_path in DB
    const { error } = await supabase
      .from('site_assets')
      .update({
        image_url: defaultAsset.imageUrl,
        storage_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId);

    if (error) {
      console.warn('Failed to reset site_asset in database:', error.message);
    }
  }

  const nextAssets = { ...currentAssets, [assetId]: defaultAsset };
  cachedAssets = nextAssets;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextAssets));
    } catch {
      // Ignore
    }
  }

  notifyListeners(nextAssets);
  return defaultAsset;
}

/** Explicit alias for deleting an uploaded custom image and reverting to the brand default */
export const deleteSiteAssetImage = resetSiteAssetToDefault;

/**
 * Updates a site asset directly with an external or local URL
 */
export async function updateSiteAssetWithUrl(
  assetId: string,
  imageUrl: string,
  userId?: string
): Promise<SiteAsset> {
  const currentAssets = await getSiteAssets();
  const existing = currentAssets[assetId] || DEFAULT_SITE_ASSETS[assetId] || {
    id: assetId,
    page: 'GLOBAL',
    label: assetId,
    imageUrl: '/hero.png',
  };

  const updatedAsset: SiteAsset = {
    ...existing,
    imageUrl: imageUrl.trim(),
    updatedBy: userId,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const isValidUuid =
        typeof userId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      await supabase.from('site_assets').upsert({
        id: updatedAsset.id,
        page: updatedAsset.page,
        label: updatedAsset.label,
        description: updatedAsset.description || null,
        image_url: updatedAsset.imageUrl,
        storage_path: updatedAsset.storagePath || null,
        updated_by: isValidUuid ? userId : null,
        updated_at: updatedAsset.updatedAt,
      });
    } catch (err: any) {
      console.warn('Supabase updateSiteAssetWithUrl warning:', err?.message);
    }
  }

  const nextAssets = { ...currentAssets, [assetId]: updatedAsset };
  cachedAssets = nextAssets;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextAssets));
    } catch {
      // Ignore
    }
  }

  notifyListeners(nextAssets);
  return updatedAsset;
}

/**
 * Creates a brand new custom site asset slot
 */
export async function createCustomSiteAsset(
  params: {
    id: string;
    page?: 'HOME' | 'SERVICES' | 'CONCEPTS' | 'PORTFOLIO' | 'ATELIER' | 'GLOBAL' | 'CUSTOM';
    label: string;
    imageUrl: string;
    description?: string;
  },
  userId?: string
): Promise<SiteAsset> {
  const assetId = params.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const newAsset: SiteAsset = {
    id: assetId,
    page: params.page || 'CUSTOM',
    label: params.label.trim(),
    description: params.description?.trim(),
    imageUrl: params.imageUrl.trim() || '/hero.png',
    updatedBy: userId,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const isValidUuid =
        typeof userId === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

      await supabase.from('site_assets').upsert({
        id: newAsset.id,
        page: newAsset.page,
        label: newAsset.label,
        description: newAsset.description || null,
        image_url: newAsset.imageUrl,
        storage_path: null,
        updated_by: isValidUuid ? userId : null,
        updated_at: newAsset.updatedAt,
      });
    } catch (err: any) {
      console.warn('Supabase createCustomSiteAsset warning:', err?.message);
    }
  }

  const currentAssets = await getSiteAssets();
  const nextAssets = { ...currentAssets, [assetId]: newAsset };
  cachedAssets = nextAssets;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextAssets));
    } catch {
      // Ignore
    }
  }

  notifyListeners(nextAssets);
  return newAsset;
}

/**
 * Deletes a custom site asset slot
 */
export async function deleteCustomSiteAsset(assetId: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      await supabase.from('site_assets').delete().eq('id', assetId);
    } catch (err: any) {
      console.warn('Supabase deleteCustomSiteAsset warning:', err?.message);
    }
  }

  const currentAssets = await getSiteAssets();
  const nextAssets = { ...currentAssets };
  delete nextAssets[assetId];
  cachedAssets = nextAssets;

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextAssets));
    } catch {
      // Ignore
    }
  }

  notifyListeners(nextAssets);
  return true;
}

/**
 * Subscribe to site asset changes for reactive UI updates
 */
export function subscribeSiteAssets(listener: AssetListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
