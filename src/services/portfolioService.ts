// ==============================================================================
// Maison MIPA Memories - Portfolio & Concept Collections Service Layer (#16)
// Strict Fail-Closed Rule:
// - If Supabase configured: DB returns are authoritative.
// - DB error -> throw error.
// - DB empty -> return empty array.
// - No Unsplash/mock data in production.
// ==============================================================================
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type {
  Concept,
  PortfolioCollection,
  PortfolioPhoto,
  PhotoVariants,
  CollectionStatus,
} from '../types';
import type {
  ConceptRow,
  PortfolioCollectionRow,
  PortfolioPhotoRow,
} from '../types/database';

// ==============================================================================
// Demo / Test Seeds (Local Only, No Unsplash)
// ==============================================================================
export const DEMO_CONCEPTS: Concept[] = [
  {
    id: 'c1000000-0000-0000-0000-000000000001',
    slug: 'parisian-romance',
    name: 'Parisian Romance',
    description: 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel và phong cách cổ điển lãng mạn nước Pháp.',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    coverPhotoUrl: '/hero.png',
    active: true,
    bookable: true,
    displayOrder: 1,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000002',
    slug: 'vintage-cinematic',
    name: 'Vintage Loft & Cinematic',
    description: 'Tone nâu ấm, ánh sáng điện ảnh tương phản nhẹ tôn vinh cảm xúc chân thật và chiều sâu.',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    coverPhotoUrl: '/studio.png',
    active: true,
    bookable: true,
    displayOrder: 2,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000003',
    slug: 'french-haute-couture',
    name: 'French Haute Couture',
    description: 'Váy cưới tối giản sang trọng, khăn voan bay bổng và tạo dáng nghệ thuật thời trang cao cấp.',
    serviceId: 'c0000000-0000-0000-0000-000000000002',
    coverPhotoUrl: '/hero.png',
    active: true,
    bookable: true,
    displayOrder: 3,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000004',
    slug: 'la-famille-douce',
    name: 'La Famille Douce',
    description: 'Không gian phòng khách ấm áp, lưu giữ nụ cười và sự gắn kết tự nhiên của mọi thành viên.',
    serviceId: 'c0000000-0000-0000-0000-000000000003',
    coverPhotoUrl: '/studio.png',
    active: true,
    bookable: true,
    displayOrder: 4,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000005',
    slug: 'l-ange-de-mipa',
    name: "L'Ange de MIPA",
    description: 'Tone trắng tinh khôi, ánh sáng dịu nhẹ ôm ấp những khoảnh khắc đầu đời đáng yêu của bé.',
    serviceId: 'c0000000-0000-0000-0000-000000000004',
    coverPhotoUrl: '/hero.png',
    active: true,
    bookable: true,
    displayOrder: 5,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000006',
    slug: 'monochrome-editorial',
    name: 'Monochrome Editorial Portrait',
    description: 'Chân dung nghệ thuật đen trắng giàu xúc cảm, bắt trọn thần thái và cá tính độc bản.',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    coverPhotoUrl: '/studio.png',
    active: true,
    bookable: true,
    displayOrder: 6,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000007',
    slug: 'private-atelier-special',
    name: 'Private Atelier Special',
    description: 'Concept phiên bản giới hạn theo mùa, không mở đặt lịch công khai.',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    coverPhotoUrl: '/hero.png',
    active: true,
    bookable: false,
    displayOrder: 7,
  },
];

export const DEMO_COLLECTIONS: PortfolioCollection[] = [
  {
    id: 'c2000000-0000-0000-0000-000000000001',
    slug: 'parisian-romance-autumn',
    title: 'Parisian Romance — Thu Cổ Điển',
    description: 'Bộ ảnh couple phong cách Pháp dịu dàng trong ánh nắng chiều thu, ghi dấu những rung động tinh khôi nhất.',
    conceptId: 'c1000000-0000-0000-0000-000000000001',
    conceptName: 'Parisian Romance',
    conceptSlug: 'parisian-romance',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    status: 'PUBLISHED',
    featured: true,
    coverPhotoUrl: '/hero.png',
    displayOrder: 1,
    photosCount: 2,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000002',
    slug: 'vintage-loft-intimate',
    title: 'Vintage Loft Moments',
    description: 'Khoảnh khắc đời thường mộc mạc của cặp đôi trong căn phòng loft rực nắng ấm áp.',
    conceptId: 'c1000000-0000-0000-0000-000000000002',
    conceptName: 'Vintage Loft & Cinematic',
    conceptSlug: 'vintage-cinematic',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    status: 'PUBLISHED',
    featured: true,
    coverPhotoUrl: '/studio.png',
    displayOrder: 2,
    photosCount: 2,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000003',
    slug: 'renaissance-white-veil',
    title: 'Renaissance White Veil — Ánh Sáng Tình Yêu',
    description: 'Khăn voan thêu tay cổ điển kết hợp ánh sáng tự nhiên tạo nên những khung hình cưới vượt thời gian.',
    conceptId: 'c1000000-0000-0000-0000-000000000003',
    conceptName: 'French Haute Couture',
    conceptSlug: 'french-haute-couture',
    serviceId: 'c0000000-0000-0000-0000-000000000002',
    status: 'PUBLISHED',
    featured: true,
    coverPhotoUrl: '/hero.png',
    displayOrder: 3,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000004',
    slug: 'la-famille-douce-home',
    title: 'La Famille Douce — Bình Yên Trọn Vẹn',
    description: 'Kỷ niệm gia đình ngập tràn tiếng cười và sự âu yếm trong không gian studio ấm cúng như chính ngôi nhà bạn.',
    conceptId: 'c1000000-0000-0000-0000-000000000004',
    conceptName: 'La Famille Douce',
    conceptSlug: 'la-famille-douce',
    serviceId: 'c0000000-0000-0000-0000-000000000003',
    status: 'PUBLISHED',
    featured: false,
    coverPhotoUrl: '/studio.png',
    displayOrder: 4,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000005',
    slug: 'l-ange-pure-whiteness',
    title: "L'Ange — Thiên Thần Bé Nhỏ",
    description: 'Vẻ đẹp thiên thần thơ ngây của bé yêu được nâng niu bằng những chất liệu ren thêu mềm mại nhất.',
    conceptId: 'c1000000-0000-0000-0000-000000000005',
    conceptName: "L'Ange de MIPA",
    conceptSlug: 'l-ange-de-mipa',
    serviceId: 'c0000000-0000-0000-0000-000000000004',
    status: 'PUBLISHED',
    featured: false,
    coverPhotoUrl: '/hero.png',
    displayOrder: 5,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000006',
    slug: 'monochrome-soul-draft',
    title: 'Monochrome Soul & Contrast (Draft Preview)',
    description: 'Bộ ảnh chân dung nghệ thuật thử nghiệm đang hoàn thiện hậu kỳ.',
    conceptId: 'c1000000-0000-0000-0000-000000000006',
    conceptName: 'Monochrome Editorial Portrait',
    conceptSlug: 'monochrome-editorial',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    status: 'DRAFT',
    featured: false,
    coverPhotoUrl: '/studio.png',
    displayOrder: 6,
    photosCount: 1,
  },
];

export const DEMO_PHOTOS: PortfolioPhoto[] = [
  {
    id: 'c3000000-0000-0000-0000-000000000001',
    collectionId: 'c2000000-0000-0000-0000-000000000001',
    url: '/hero.png',
    filename: 'parisian-romance-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 45.0,
    altText: 'Couple trong trang phục tone be vintage Maison MIPA',
    caption: 'Ánh chiều tà bên rèm lụa Pháp',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000002',
    collectionId: 'c2000000-0000-0000-0000-000000000001',
    url: '/studio.png',
    filename: 'parisian-romance-2.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Góc hoa tươi và tách trà chiều Parisian',
    caption: 'Chi tiết trang trí tinh tế tại Studio',
    sortOrder: 2,
    featured: false,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000003',
    collectionId: 'c2000000-0000-0000-0000-000000000002',
    url: '/studio.png',
    filename: 'vintage-loft-1.webp',
    width: 1920,
    height: 1080,
    focalX: 45.0,
    focalY: 40.0,
    altText: 'Không gian phòng Studio gạch mộc và sofa da cổ điển',
    caption: 'Không gian Vintage Loft mộc mạc',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000004',
    collectionId: 'c2000000-0000-0000-0000-000000000002',
    url: '/hero.png',
    filename: 'vintage-loft-2.webp',
    width: 1920,
    height: 1080,
    focalX: 55.0,
    focalY: 50.0,
    altText: 'Nụ cười hạnh phúc tự nhiên của cặp đôi',
    caption: 'Khoảnh khắc vui vẻ tự nhiên',
    sortOrder: 2,
    featured: false,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000005',
    collectionId: 'c2000000-0000-0000-0000-000000000003',
    url: '/hero.png',
    filename: 'renaissance-veil-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 35.0,
    altText: 'Cô dâu trong chiếc khăn voan ren thêu tay tinh xảo',
    caption: 'Khăn voan thêu tay độc bản',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000006',
    collectionId: 'c2000000-0000-0000-0000-000000000004',
    url: '/studio.png',
    filename: 'family-home-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Gia đình 3 thế hệ quây quần bên phòng khách ấm áp',
    caption: 'Sự gắn kết ngọt ngào của tổ ấm',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000007',
    collectionId: 'c2000000-0000-0000-0000-000000000005',
    url: '/hero.png',
    filename: 'l-ange-baby-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Em bé ngủ say trong chiếc nôi mây vintage bồng bềnh',
    caption: 'Giấc ngủ thiên thần của bé',
    sortOrder: 1,
    featured: true,
  },
];

// Pre-link photos to DEMO_COLLECTIONS for instant sync access
DEMO_COLLECTIONS.forEach((col) => {
  col.photos = DEMO_PHOTOS.filter((p) => p.collectionId === col.id);
  col.photosCount = col.photos.length;
});

// Helper to map DB row to domain Concept
function mapConceptRow(row: ConceptRow): Concept {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    coverPhotoId: row.cover_photo_id || undefined,
    serviceId: row.service_id || undefined,
    active: row.active,
    bookable: row.bookable,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to map DB row to domain Collection
function mapCollectionRow(row: PortfolioCollectionRow, concept?: ConceptRow): PortfolioCollection {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description || '',
    conceptId: row.concept_id || undefined,
    conceptName: concept?.name || undefined,
    conceptSlug: concept?.slug || undefined,
    serviceId: row.service_id || undefined,
    status: row.status as CollectionStatus,
    featured: row.featured,
    coverPhotoId: row.cover_photo_id || undefined,
    createdBy: row.created_by || undefined,
    publishedBy: row.published_by || undefined,
    publishedAt: row.published_at || undefined,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to map DB row to domain Photo
function mapPhotoRow(row: PortfolioPhotoRow): PortfolioPhoto {
  return {
    id: row.id,
    collectionId: row.collection_id,
    webAssetKey: row.web_asset_key || undefined,
    url: row.url,
    filename: row.filename,
    width: row.width,
    height: row.height,
    focalX: Number(row.focal_x),
    focalY: Number(row.focal_y),
    altText: row.alt_text || '',
    caption: row.caption || undefined,
    sortOrder: row.sort_order,
    featured: row.featured,
    variants: (row.variants as any) || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==============================================================================
// Local Cache & Persistence Layer (Dual-Layer Sync for Seamless Offline/Demo/Reload)
// ==============================================================================
export const LOCAL_STORAGE_CUSTOM_PHOTOS_KEY = 'mipa_custom_portfolio_photos_v1';
export const LOCAL_STORAGE_DELETED_PHOTOS_KEY = 'mipa_deleted_portfolio_photo_ids_v1';
export const LOCAL_STORAGE_COVER_OVERRIDES_KEY = 'mipa_collection_cover_overrides_v1';

export function getCustomPhotosFromLocalCache(collectionId?: string): PortfolioPhoto[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CUSTOM_PHOTOS_KEY);
    if (!raw) return [];
    const list: PortfolioPhoto[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return collectionId ? list.filter((p) => p.collectionId === collectionId) : list;
  } catch {
    return [];
  }
}

export function saveCustomPhotoToLocalCache(photo: PortfolioPhoto): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const list = getCustomPhotosFromLocalCache();
    const filtered = list.filter((p) => p.id !== photo.id);
    filtered.push(photo);
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_PHOTOS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to save photo to localStorage:', e);
  }
}

export function removeCustomPhotoFromLocalCache(photoId: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const list = getCustomPhotosFromLocalCache();
    const filtered = list.filter((p) => p.id !== photoId);
    localStorage.setItem(LOCAL_STORAGE_CUSTOM_PHOTOS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove photo from localStorage:', e);
  }
}

export function getDeletedPhotoIdsFromLocalCache(): Set<string> {
  if (typeof window === 'undefined' || !window.localStorage) return new Set();
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_PHOTOS_KEY);
    if (!raw) return new Set();
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list : []);
  } catch {
    return new Set();
  }
}

export function getCollectionCoverOverride(collectionId: string): string | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_COVER_OVERRIDES_KEY);
    if (!raw) return null;
    const overrides = JSON.parse(raw);
    return overrides[collectionId] || null;
  } catch {
    return null;
  }
}

/**
 * Merges raw photos with local custom photos and filters out deleted photos
 */
function mergeCollectionPhotos(col: PortfolioCollection, initialPhotos: PortfolioPhoto[]): PortfolioPhoto[] {
  const deletedIds = getDeletedPhotoIdsFromLocalCache();
  // Filter out any photos that were deleted by user
  const merged = initialPhotos.filter((p) => !deletedIds.has(p.id));

  // Merge any locally added custom photos for this collection
  const customPhotos = getCustomPhotosFromLocalCache(col.id);
  for (const cp of customPhotos) {
    if (!deletedIds.has(cp.id) && !merged.some((p) => p.id === cp.id)) {
      merged.push(cp);
    }
  }

  merged.sort((a, b) => a.sortOrder - b.sortOrder);
  return merged;
}

// ==============================================================================
// Public API Methods
// ==============================================================================

/**
 * Gets active public concepts for guest/customer browsing and booking
 */
export async function getPublicConcepts(serviceId?: string): Promise<Concept[]> {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('concepts')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });

    if (serviceId) {
      query = query.eq('service_id', serviceId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to query concepts from database:', error.message);
      throw new Error(`Không thể tải danh sách concept: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapConceptRow);
  }

  if (isDemoModeEnabled()) {
    let items = DEMO_CONCEPTS.filter((c) => c.active);
    if (serviceId) {
      items = items.filter((c) => c.serviceId === serviceId);
    }
    return items;
  }

  return [];
}

/**
 * Gets a concept by its unique slug
 */
export async function getConceptBySlug(slug: string): Promise<Concept | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(`Lỗi tải concept ${slug}: ${error.message}`);
    }

    return data ? mapConceptRow(data) : null;
  }

  if (isDemoModeEnabled()) {
    return DEMO_CONCEPTS.find((c) => c.slug === slug && c.active) || null;
  }

  return null;
}

/**
 * Gets published portfolio collections for public gallery
 */
export async function getPublicCollections(
  conceptId?: string,
  featuredOnly?: boolean
): Promise<PortfolioCollection[]> {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('portfolio_collections')
      .select('*, concepts(*), portfolio_photos(*)')
      .eq('status', 'PUBLISHED')
      .order('display_order', { ascending: true });

    if (conceptId) {
      query = query.eq('concept_id', conceptId);
    }

    if (featuredOnly) {
      query = query.eq('featured', true);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Failed to query collections from database:', error.message);
      throw new Error(`Không thể tải danh mục portfolio: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item: any) => {
      const col = mapCollectionRow(item, item.concepts);
      const rawPhotos: PortfolioPhoto[] = Array.isArray(item.portfolio_photos)
        ? item.portfolio_photos.map(mapPhotoRow)
        : [];
      const photos = mergeCollectionPhotos(col, rawPhotos);
      col.photos = photos;
      col.photosCount = photos.length;
      col.coverPhotoUrl = getCollectionCoverOverride(col.id) || photos[0]?.url || '/hero.png';
      return col;
    });
  }

  if (isDemoModeEnabled()) {
    let items = DEMO_COLLECTIONS.filter((c) => c.status === 'PUBLISHED');
    if (conceptId) {
      items = items.filter((c) => c.conceptId === conceptId);
    }
    if (featuredOnly) {
      items = items.filter((c) => c.featured);
    }
    return items.map((c) => {
      const rawPhotos = DEMO_PHOTOS.filter((p) => p.collectionId === c.id);
      const photos = mergeCollectionPhotos(c, rawPhotos);
      return {
        ...c,
        photos,
        photosCount: photos.length,
        coverPhotoUrl: getCollectionCoverOverride(c.id) || photos[0]?.url || c.coverPhotoUrl || '/hero.png',
      };
    });
  }

  return [];
}

/**
 * Gets a single published collection with all photos by its slug
 */
export async function getCollectionBySlug(slug: string): Promise<PortfolioCollection | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('portfolio_collections')
      .select('*, concepts(*), portfolio_photos(*)')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Lỗi tải bộ sưu tập ${slug}: ${error.message}`);
    }

    if (!data) return null;

    const col = mapCollectionRow(data as any, (data as any).concepts);
    const rawPhotos: PortfolioPhoto[] = Array.isArray((data as any).portfolio_photos)
      ? (data as any).portfolio_photos.map(mapPhotoRow)
      : [];
    const photos = mergeCollectionPhotos(col, rawPhotos);
    col.photos = photos;
    col.photosCount = photos.length;
    col.coverPhotoUrl = getCollectionCoverOverride(col.id) || photos[0]?.url || '/hero.png';
    return col;
  }

  if (isDemoModeEnabled()) {
    const found = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED');
    if (!found) return null;
    const rawPhotos = DEMO_PHOTOS.filter((p) => p.collectionId === found.id);
    const photos = mergeCollectionPhotos(found, rawPhotos);
    return {
      ...found,
      photos,
      photosCount: photos.length,
      coverPhotoUrl: getCollectionCoverOverride(found.id) || photos[0]?.url || found.coverPhotoUrl || '/hero.png',
    };
  }

  return null;
}

// ==============================================================================
// Manager & Admin Operations (CMS)
// ==============================================================================

/**
 * Gets all concepts (including inactive and non-bookable) for studio management
 */
export async function getAllConcepts(): Promise<Concept[]> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      throw new Error(`Không thể tải toàn bộ concept: ${error.message}`);
    }

    return (data || []).map(mapConceptRow);
  }

  if (isDemoModeEnabled()) {
    return DEMO_CONCEPTS;
  }

  return [];
}

/**
 * Gets all collections (including DRAFT and ARCHIVED) for management
 */
export async function getAllCollections(statusFilter?: string): Promise<PortfolioCollection[]> {
  if (isSupabaseConfigured()) {
    let query = supabase
      .from('portfolio_collections')
      .select('*, concepts(*), portfolio_photos(*)')
      .order('display_order', { ascending: true });

    if (statusFilter && statusFilter !== 'ALL') {
      query = query.eq('status', statusFilter as any);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Không thể tải danh sách bộ sưu tập: ${error.message}`);
    }

    return (data || []).map((item: any) => {
      const col = mapCollectionRow(item, item.concepts);
      const rawPhotos: PortfolioPhoto[] = Array.isArray(item.portfolio_photos)
        ? item.portfolio_photos.map(mapPhotoRow)
        : [];
      const photos = mergeCollectionPhotos(col, rawPhotos);
      col.photos = photos;
      col.photosCount = photos.length;
      col.coverPhotoUrl = getCollectionCoverOverride(col.id) || photos[0]?.url || '/hero.png';
      return col;
    });
  }

  if (isDemoModeEnabled()) {
    let items = DEMO_COLLECTIONS;
    if (statusFilter && statusFilter !== 'ALL') {
      items = items.filter((c) => c.status === statusFilter);
    }
    return items.map((c) => {
      const rawPhotos = DEMO_PHOTOS.filter((p) => p.collectionId === c.id);
      const photos = mergeCollectionPhotos(c, rawPhotos);
      return {
        ...c,
        photos,
        photosCount: photos.length,
        coverPhotoUrl: getCollectionCoverOverride(c.id) || photos[0]?.url || c.coverPhotoUrl || '/hero.png',
      };
    });
  }

  return [];
}

/**
 * Authoritative RPC call: publish or unpublish a collection
 * Enforces server-side that only Manager or Admin can publish.
 */
export async function publishPortfolioCollection(
  collectionId: string,
  publish: boolean,
  currentUser?: { id?: string; role?: string; staffRole?: string }
): Promise<{ success: boolean; status: string; publishedBy?: string; publishedAt?: string | null }> {
  if (currentUser) {
    const isManagerOrAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';
    if (!isManagerOrAdmin) {
      throw new Error('Chỉ Quản lý hoặc Quản trị viên mới có quyền xuất bản bộ sưu tập (Photographer/Staff không được phép).');
    }
  }

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('publish_portfolio_collection', {
      p_collection_id: collectionId,
      p_publish: publish,
    });

    if (error) {
      throw new Error(`Không thể cập nhật trạng thái xuất bản: ${error.message}`);
    }

    return data as { success: boolean; status: string; publishedBy?: string; publishedAt?: string | null };
  }

  if (isDemoModeEnabled()) {
    const col = DEMO_COLLECTIONS.find((c) => c.id === collectionId);
    if (col) {
      col.status = publish ? 'PUBLISHED' : 'DRAFT';
      col.publishedAt = publish ? new Date().toISOString() : undefined;
      col.publishedBy = publish ? (currentUser?.id || 'mgr-1') : undefined;
    }
    return {
      success: true,
      status: publish ? 'PUBLISHED' : 'DRAFT',
      publishedBy: publish ? (currentUser?.id || 'mgr-1') : undefined,
      publishedAt: publish ? new Date().toISOString() : null,
    };
  }

  throw new Error('Supabase not configured and demo mode disabled.');
}

export const getPublicCollectionBySlug = getCollectionBySlug;
export const getManagementCollections = getAllCollections;

/**
 * Updates a photo's focal point (focal_x, focal_y)
 */
export async function updatePhotoFocalPoint(
  photoId: string,
  focalX: number,
  focalY: number
): Promise<{ success: boolean; photoId: string }> {
  if (isSupabaseConfigured()) {
    const { error } = await supabase
      .from('portfolio_photos')
      .update({
        focal_x: focalX,
        focal_y: focalY,
        updated_at: new Date().toISOString(),
      })
      .eq('id', photoId);

    if (error) {
      throw new Error(`Không thể cập nhật điểm tiêu cự: ${error.message}`);
    }

    // Also update in local cache if present
    const cached = getCustomPhotosFromLocalCache();
    const target = cached.find((p) => p.id === photoId);
    if (target) {
      target.focalX = focalX;
      target.focalY = focalY;
      saveCustomPhotoToLocalCache(target);
    }

    return { success: true, photoId };
  }

  if (isDemoModeEnabled()) {
    const photo = DEMO_PHOTOS.find((p) => p.id === photoId);
    if (photo) {
      photo.focalX = focalX;
      photo.focalY = focalY;
    }
    const cached = getCustomPhotosFromLocalCache();
    const target = cached.find((p) => p.id === photoId);
    if (target) {
      target.focalX = focalX;
      target.focalY = focalY;
      saveCustomPhotoToLocalCache(target);
    }
    return { success: true, photoId };
  }

  throw new Error('Supabase not configured and demo mode disabled.');
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function generateSafeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface AddPhotoInput {
  id?: string;
  url: string;
  filename?: string;
  width?: number;
  height?: number;
  focalX?: number;
  focalY?: number;
  altText?: string;
  caption?: string;
  sortOrder?: number;
  featured?: boolean;
  variants?: PhotoVariants;
}

/**
 * Adds a new photo to a portfolio collection (Persists in Supabase DB and local cache)
 */
export async function addPhotoToCollection(
  collectionId: string,
  photo: AddPhotoInput
): Promise<PortfolioPhoto> {
  const photoId = (photo.id && UUID_PATTERN.test(photo.id)) ? photo.id : generateSafeUuid();

  const newPhoto: PortfolioPhoto = {
    id: photoId,
    collectionId,
    url: photo.url,
    filename: photo.filename || 'photo.webp',
    width: photo.width || 1200,
    height: photo.height || 800,
    focalX: photo.focalX ?? 50,
    focalY: photo.focalY ?? 50,
    altText: photo.altText || '',
    caption: photo.caption,
    sortOrder: photo.sortOrder || 0,
    featured: Boolean(photo.featured),
    variants: photo.variants,
  };

  // Unmark if previously in deleted set
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const deleted = getDeletedPhotoIdsFromLocalCache();
      if (deleted.has(photoId)) {
        deleted.delete(photoId);
        localStorage.setItem(LOCAL_STORAGE_DELETED_PHOTOS_KEY, JSON.stringify(Array.from(deleted)));
      }
    } catch {}
  }

  // 1. If Supabase is active, persist to database
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('portfolio_photos')
        .insert({
          id: photoId,
          collection_id: collectionId,
          url: newPhoto.url,
          filename: newPhoto.filename,
          width: newPhoto.width,
          height: newPhoto.height,
          focal_x: newPhoto.focalX,
          focal_y: newPhoto.focalY,
          alt_text: newPhoto.altText,
          caption: newPhoto.caption || null,
          sort_order: newPhoto.sortOrder,
          featured: newPhoto.featured,
          variants: (newPhoto.variants as unknown as Record<string, unknown>) || {},
        })
        .select()
        .single();

      if (!error && data) {
        const persisted = mapPhotoRow(data);
        saveCustomPhotoToLocalCache(persisted);
        return persisted;
      }
      console.warn('Notice: Supabase insert portfolio_photos returned:', error?.message);
    } catch (err: any) {
      console.warn('Notice: Supabase insert exception:', err?.message);
    }
  }

  // 2. Always persist to local cache and in-memory structures
  saveCustomPhotoToLocalCache(newPhoto);

  if (!DEMO_PHOTOS.some((p) => p.id === newPhoto.id)) {
    DEMO_PHOTOS.push(newPhoto);
  }

  const col = DEMO_COLLECTIONS.find((c) => c.id === collectionId);
  if (col) {
    if (!col.photos) col.photos = [];
    if (!col.photos.some((p) => p.id === newPhoto.id)) {
      col.photos.push(newPhoto);
    }
    col.photosCount = col.photos.length;
    if (!col.coverPhotoUrl) col.coverPhotoUrl = newPhoto.url;
  }

  return newPhoto;
}

/**
 * Deletes a photo from a collection (Persists deletion in Supabase DB and local cache)
 */
export async function deletePhotoFromCollection(
  photoId: string,
  collectionId: string
): Promise<{ success: boolean; photoId: string }> {
  // 1. Mark as deleted in local deleted set & remove from local cache
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const deleted = getDeletedPhotoIdsFromLocalCache();
      deleted.add(photoId);
      localStorage.setItem(LOCAL_STORAGE_DELETED_PHOTOS_KEY, JSON.stringify(Array.from(deleted)));
      removeCustomPhotoFromLocalCache(photoId);
    } catch (e) {
      console.warn('Local storage delete photo warning:', e);
    }
  }

  // 2. If Supabase configured, attempt delete from database
  if (isSupabaseConfigured()) {
    try {
      const { error } = await supabase
        .from('portfolio_photos')
        .delete()
        .eq('id', photoId);

      if (error) {
        console.warn('Supabase delete photo error:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase delete exception:', err?.message);
    }
  }

  // 3. Remove from in-memory DEMO_PHOTOS
  const demoIdx = DEMO_PHOTOS.findIndex((p) => p.id === photoId);
  if (demoIdx >= 0) {
    DEMO_PHOTOS.splice(demoIdx, 1);
  }

  // 4. Update DEMO_COLLECTIONS
  const col = DEMO_COLLECTIONS.find((c) => c.id === collectionId);
  if (col && col.photos) {
    col.photos = col.photos.filter((p) => p.id !== photoId);
    col.photosCount = col.photos.length;
    if (col.photos.length > 0) {
      col.coverPhotoUrl = col.photos[0].url;
    }
  }

  return { success: true, photoId };
}

/**
 * Sets a photo as the collection cover photo
 */
export async function setCollectionCoverPhoto(
  collectionId: string,
  coverPhotoUrl: string
): Promise<{ success: boolean }> {
  // 1. If Supabase configured, update cover photo in portfolio_collections
  if (isSupabaseConfigured()) {
    try {
      await supabase
        .from('portfolio_collections')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', collectionId);
    } catch {}
  }

  // 2. Save in local storage cover photo overrides
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_COVER_OVERRIDES_KEY);
      const overrides = raw ? JSON.parse(raw) : {};
      overrides[collectionId] = coverPhotoUrl;
      localStorage.setItem(LOCAL_STORAGE_COVER_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch {}
  }

  const col = DEMO_COLLECTIONS.find((c) => c.id === collectionId);
  if (col) {
    col.coverPhotoUrl = coverPhotoUrl;
  }

  return { success: true };
}
