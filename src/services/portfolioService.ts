// ==============================================================================
// Maison MIPA Memories - Portfolio & Concept Collections Service Layer (#16)
// Strict Fail-Closed Rule:
// - If Supabase configured: DB returns are authoritative.
// - DB error -> throw error.
// - DB empty -> return empty array.
// - No Unsplash/mock data in production.
// ==============================================================================
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import { normalizeError } from '../utils/AppError';
import type {
  Concept,
  PortfolioCollection,
  PortfolioPhoto,
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
    coverPhotoUrl: '/hero-couple.jpg',
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
    coverPhotoUrl: '/hero-bride.jpg',
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
    coverPhotoUrl: '/hero.webp',
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
    coverPhotoUrl: '/hero-baby.jpg',
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
    coverPhotoUrl: '/hero-camera.jpg',
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
    coverPhotoUrl: '/studio.png',
    active: true,
    bookable: false,
    displayOrder: 7,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000008',
    slug: 'chup-chan-dung-nghe-thuat',
    name: 'Chụp Chân Dung Nghệ Thuật',
    description: 'Tôn vinh nét đẹp, thần thái độc bản của riêng bạn với ánh sáng tự nhiên tinh tế và phong cách xử lý màu nhẹ nhàng.',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    coverPhotoUrl: '/hero-camera.jpg',
    active: true,
    bookable: true,
    displayOrder: 8,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000009',
    slug: 'chup-ky-yeu-tot-nghiep',
    name: 'Chụp Kỷ Yếu & Tốt Nghiệp Thanh Xuân',
    description: 'Lưu giữ mốc son rực rỡ của thời sinh viên, lễ phục cử nhân trang trọng kết hợp cùng nụ cười thanh xuân rạng rỡ.',
    serviceId: 'c0000000-0000-0000-0000-000000000007',
    coverPhotoUrl: '/concept-graduation.webp',
    active: true,
    bookable: true,
    displayOrder: 9,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000010',
    slug: 'chup-ao-dai-duyen-dang',
    name: 'Chụp Áo Dài Duyên Dáng',
    description: 'Tôn vinh vẻ đẹp truyền thống và nét thanh lịch Việt Nam với tà áo dài thướt tha trong không gian ấm áp tại tiệm ảnh.',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    coverPhotoUrl: '/concept-aodai.webp',
    active: true,
    bookable: true,
    displayOrder: 10,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000011',
    slug: 'chup-do-an-sang-tao',
    name: 'Chụp Đồ Án & Tác Phẩm Sáng Tạo',
    description: 'Không gian ánh sáng chuẩn mực hỗ trợ sinh viên kiến trúc, thời trang, mỹ thuật ghi lại trọn vẹn chi tiết đồ án tâm huyết.',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    coverPhotoUrl: '/studio.png',
    active: true,
    bookable: true,
    displayOrder: 11,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000012',
    slug: 'chup-le-tet-sum-vay',
    name: 'Chụp Lễ Tết Sum Vầy & Du Xuân',
    description: 'Sắc xuân rạng ngời, câu đối đỏ và ấm trà đầu năm ghi lại niềm vui sum họp đong đầy yêu thương cho gia đình và bạn bè.',
    serviceId: 'c0000000-0000-0000-0000-000000000003',
    coverPhotoUrl: '/concept-tet.webp',
    active: true,
    bookable: true,
    displayOrder: 12,
  },
  {
    id: 'c1000000-0000-0000-0000-000000000013',
    slug: 'chup-giang-sinh-noel-cozy',
    name: 'Chụp Giáng Sinh Lung Linh (Noel Cozy)',
    description: 'Ánh đèn vàng ấm cúng, cây thông Noel và những hộp quà xinh xắn mang đến bộ ảnh mùa đông ngọt ngào, ấm áp.',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    coverPhotoUrl: '/concept-noel.webp',
    active: true,
    bookable: true,
    displayOrder: 13,
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
    coverPhotoUrl: '/hero-couple.jpg',
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
    coverPhotoUrl: '/hero-bride.jpg',
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
    coverPhotoUrl: '/hero.webp',
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
    coverPhotoUrl: '/hero-baby.jpg',
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
    coverPhotoUrl: '/hero-camera.jpg',
    displayOrder: 6,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000007',
    slug: 'thanh-xuan-tot-nghiep-2026',
    title: 'Kỷ Yếu Thanh Xuân — Rạng Rỡ Tuổi Trẻ',
    description: 'Bộ ảnh kỷ yếu cử nhân trang trọng, ghi dấu khoảnh khắc tốt nghiệp đáng nhớ cùng bạn bè.',
    conceptId: 'c1000000-0000-0000-0000-000000000009',
    conceptName: 'Chụp Kỷ Yếu & Tốt Nghiệp Thanh Xuân',
    conceptSlug: 'chup-ky-yeu-tot-nghiep',
    serviceId: 'c0000000-0000-0000-0000-000000000007',
    status: 'PUBLISHED',
    featured: true,
    coverPhotoUrl: '/concept-graduation.webp',
    displayOrder: 7,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000008',
    slug: 'ao-dai-viet-nam-thanh-lich',
    title: 'Dáng Ngọc Áo Dài — Nét Đẹp Truyền Thống',
    description: 'Tà áo dài lụa thướt tha tôn vinh nét đẹp dịu dàng, trang nhã của người con gái Việt.',
    conceptId: 'c1000000-0000-0000-0000-000000000010',
    conceptName: 'Chụp Áo Dài Duyên Dáng',
    conceptSlug: 'chup-ao-dai-duyen-dang',
    serviceId: 'c0000000-0000-0000-0000-000000000005',
    status: 'PUBLISHED',
    featured: true,
    coverPhotoUrl: '/concept-aodai.webp',
    displayOrder: 8,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000009',
    slug: 'tet-sum-vay-doan-vien',
    title: 'Tết Đoàn Viên — Sắc Xuân Ấm Áp',
    description: 'Bộ ảnh sum vầy đầu xuân tràn ngập tiếng cười và lời chúc may mắn cho cả gia đình.',
    conceptId: 'c1000000-0000-0000-0000-000000000012',
    conceptName: 'Chụp Lễ Tết Sum Vầy & Du Xuân',
    conceptSlug: 'chup-le-tet-sum-vay',
    serviceId: 'c0000000-0000-0000-0000-000000000003',
    status: 'PUBLISHED',
    featured: false,
    coverPhotoUrl: '/concept-tet.webp',
    displayOrder: 9,
    photosCount: 1,
  },
  {
    id: 'c2000000-0000-0000-0000-000000000010',
    slug: 'giang-sinh-cozy-noel',
    title: 'Noel Ấm Áp — Đêm Đông Lung Linh',
    description: 'Khung cảnh Giáng Sinh ấm cúng cùng ánh đèn lung linh và cây thông trang hoàng tinh tế.',
    conceptId: 'c1000000-0000-0000-0000-000000000013',
    conceptName: 'Chụp Giáng Sinh Lung Linh (Noel Cozy)',
    conceptSlug: 'chup-giang-sinh-noel-cozy',
    serviceId: 'c0000000-0000-0000-0000-000000000001',
    status: 'PUBLISHED',
    featured: false,
    coverPhotoUrl: '/concept-noel.webp',
    displayOrder: 10,
    photosCount: 1,
  },
];

export const DEMO_PHOTOS: PortfolioPhoto[] = [
  {
    id: 'c3000000-0000-0000-0000-000000000001',
    collectionId: 'c2000000-0000-0000-0000-000000000001',
    url: '/hero-couple.jpg',
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
    url: '/hero.webp',
    filename: 'parisian-romance-2.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Góc hoa tươi và tách trà chiều Parisian',
    caption: 'Chi tiết trang trí tinh tế tại Tiệm ảnh',
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
    url: '/hero-couple.jpg',
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
    url: '/hero-bride.jpg',
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
    url: '/hero.webp',
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
    url: '/hero-baby.jpg',
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
  {
    id: 'c3000000-0000-0000-0000-000000000008',
    collectionId: 'c2000000-0000-0000-0000-000000000007',
    url: '/concept-graduation.webp',
    filename: 'graduation-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Sinh viên tốt nghiệp rạng rỡ trong áo cử nhân',
    caption: 'Mốc son tốt nghiệp thanh xuân',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000009',
    collectionId: 'c2000000-0000-0000-0000-000000000008',
    url: '/concept-aodai.webp',
    filename: 'aodai-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Tà áo dài truyền thống thanh lịch',
    caption: 'Dáng ngọc áo dài Việt Nam',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000010',
    collectionId: 'c2000000-0000-0000-0000-000000000009',
    url: '/concept-tet.webp',
    filename: 'tet-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Tết sum vầy ấm cúng bên gia đình',
    caption: 'Sắc xuân đoàn viên',
    sortOrder: 1,
    featured: true,
  },
  {
    id: 'c3000000-0000-0000-0000-000000000011',
    collectionId: 'c2000000-0000-0000-0000-000000000010',
    url: '/concept-noel.webp',
    filename: 'noel-1.webp',
    width: 1920,
    height: 1080,
    focalX: 50.0,
    focalY: 50.0,
    altText: 'Giáng sinh lung linh ấm áp',
    caption: 'Mùa đông ấm áp Maison MIPA',
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
function mapConceptRow(row: ConceptRow, coverPhotoUrl?: string): Concept {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description || '',
    coverPhotoId: row.cover_photo_id || undefined,
    coverPhotoUrl: coverPhotoUrl || row.cover_photo_url || undefined,
    serviceId: row.service_id || undefined,
    active: row.active,
    bookable: row.bookable,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to resolve collection cover photo priority:
// 1. directCoverUrl (if custom set or stored in collection row)
// 2. cover_photo_id referenced photo
// 3. explicitly featured photo
// 4. first collection photo
// 5. demo fallback URL / concept-specific distinctive photo (DEF-006)
function resolveCollectionCoverUrl(
  coverPhotoId?: string,
  photos?: PortfolioPhoto[],
  demoFallbackUrl?: string,
  slugHint?: string,
  directCoverUrl?: string
): string | undefined {
  if (directCoverUrl && directCoverUrl !== '/hero.png' && directCoverUrl !== '/studio.png') {
    return directCoverUrl;
  }
  if (photos && photos.length > 0) {
    if (coverPhotoId) {
      const match = photos.find((p) => p.id === coverPhotoId);
      if (match?.url && match.url !== '/hero.png' && match.url !== '/studio.png') return match.url;
    }
    const featured = photos.find((p) => p.featured);
    if (featured?.url && featured.url !== '/hero.png' && featured.url !== '/studio.png') return featured.url;
    if (photos[0]?.url && photos[0].url !== '/hero.png' && photos[0].url !== '/studio.png') return photos[0].url;
  }
  if (directCoverUrl) return directCoverUrl;
  if (demoFallbackUrl && demoFallbackUrl !== '/hero.png' && demoFallbackUrl !== '/studio.png') {
    return demoFallbackUrl;
  }
  // Curated distinctive mapping to eliminate duplicate hero.png/studio.png (DEF-006)
  const hint = (slugHint || '').toLowerCase();
  if (hint.includes('ky-yeu') || hint.includes('tot-nghiep') || hint.includes('graduation')) return '/concept-graduation.webp';
  if (hint.includes('ao-dai')) return '/concept-aodai.webp';
  if (hint.includes('tet') || hint.includes('xuan')) return '/concept-tet.webp';
  if (hint.includes('noel') || hint.includes('giang-sinh')) return '/concept-noel.webp';
  if (hint.includes('ange') || hint.includes('baby')) return '/hero-baby.jpg';
  if (hint.includes('famille') || hint.includes('family')) return '/hero.webp';
  if (hint.includes('couture') || hint.includes('veil') || hint.includes('wedding')) return '/hero-bride.jpg';
  if (hint.includes('parisian') || hint.includes('couple')) return '/hero-couple.jpg';
  if (hint.includes('portrait') || hint.includes('chan-dung') || hint.includes('monochrome') || hint.includes('do-an')) return '/hero-camera.jpg';
  if (demoFallbackUrl) return demoFallbackUrl;
  return photos && photos[0]?.url ? photos[0].url : undefined;
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
    coverPhotoUrl: row.cover_photo_url || undefined,
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
// In-Memory Caching & Public API Methods (Performance & Deduplication)
// ==============================================================================
const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const conceptsCache = new Map<string, { data: Concept[]; timestamp: number }>();
const conceptsPromises = new Map<string, Promise<Concept[]>>();

const collectionsCache = new Map<string, { data: PortfolioCollection[]; timestamp: number }>();
const collectionsPromises = new Map<string, Promise<PortfolioCollection[]>>();
const singleCollectionCache = new Map<string, { data: PortfolioCollection; timestamp: number }>();

const LOCAL_STORAGE_CONCEPTS_KEY = 'maison_mipa_custom_concepts';
const LOCAL_STORAGE_COLLECTIONS_KEY = 'maison_mipa_custom_collections_cache';
const LOCAL_STORAGE_CONCEPT_GALLERY_KEY = 'maison_mipa_concept_gallery_photos';
const LOCAL_STORAGE_COLLECTIONS_OVERRIDES_KEY = 'maison_mipa_portfolio_collections_overrides';
const LOCAL_STORAGE_DELETED_COLLECTIONS_KEY = 'maison_mipa_deleted_collections';

let localCustomConcepts: Concept[] = [];
let localCustomCollections: PortfolioCollection[] = [];

export function getStoredCustomCollections(): PortfolioCollection[] {
  if (typeof window === 'undefined') return localCustomCollections;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_COLLECTIONS_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return localCustomCollections;
}

export function persistStoredCustomCollections(cols: PortfolioCollection[]): void {
  localCustomCollections = cols;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_OVERRIDES_KEY, JSON.stringify(cols));
  } catch {}
}

export function getStoredDeletedCollectionIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_DELETED_COLLECTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function persistDeletedCollectionId(id: string): void {
  const list = getStoredDeletedCollectionIds();
  if (!list.includes(id)) {
    list.push(id);
    try {
      localStorage.setItem(LOCAL_STORAGE_DELETED_COLLECTIONS_KEY, JSON.stringify(list));
    } catch {}
  }
}

export interface ConceptGalleryPhotoItem {
  id?: string;
  url: string;
  altText?: string;
}

export function getStoredConceptGalleryPhotos(conceptSlugOrId: string): ConceptGalleryPhotoItem[] | null {
  if (typeof window === 'undefined' || !conceptSlugOrId) return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONCEPT_GALLERY_KEY);
    if (!raw) return null;
    const mapping = JSON.parse(raw);
    if (mapping && Array.isArray(mapping[conceptSlugOrId])) {
      return mapping[conceptSlugOrId];
    }
  } catch {
    // Ignore JSON error
  }
  return null;
}

export function persistStoredConceptGalleryPhotos(
  conceptSlugOrId: string,
  photos: ConceptGalleryPhotoItem[]
): void {
  if (typeof window === 'undefined' || !conceptSlugOrId) return;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONCEPT_GALLERY_KEY);
    const mapping = raw ? JSON.parse(raw) : {};
    mapping[conceptSlugOrId] = photos;
    localStorage.setItem(LOCAL_STORAGE_CONCEPT_GALLERY_KEY, JSON.stringify(mapping));
  } catch {
    // Ignore storage error
  }
}

/**
 * Synchronously retrieves a collection by slug from in-memory cache, localStorage, or demo fallback.
 * Allows instant 0ms page rendering on /portfolio/:slug without waiting for network.
 */
export function getCollectionBySlugSync(slug: string): PortfolioCollection | null {
  if (!slug) return null;

  const deletedIds = getStoredDeletedCollectionIds();
  if (deletedIds.includes(slug)) return null;

  // Check stored custom / modified collections first for instant persistence
  const customCols = getStoredCustomCollections();
  const customMatch = customCols.find((c) => (c.slug === slug || c.id === slug) && !deletedIds.includes(c.id));
  if (customMatch) {
    singleCollectionCache.set(slug, { data: customMatch, timestamp: Date.now() });
    return customMatch;
  }

  // 1. In-memory singleCollectionCache
  const single = singleCollectionCache.get(slug);
  if (single && (Date.now() - single.timestamp < CACHE_TTL_MS || isTestEnv)) {
    if (deletedIds.includes(single.data.id)) return null;
    return single.data;
  }

  // 2. Scan in-memory collectionsCache
  for (const entry of collectionsCache.values()) {
    const found = entry.data.find((c) => c.slug === slug);
    if (found && !deletedIds.includes(found.id)) {
      singleCollectionCache.set(slug, { data: found, timestamp: Date.now() });
      return found;
    }
  }

  // 3. Scan localStorage cache
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_COLLECTIONS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const matched = parsed.find((c: any) => c.slug === slug);
          if (matched && !deletedIds.includes(matched.id)) {
            singleCollectionCache.set(slug, { data: matched, timestamp: Date.now() });
            return matched;
          }
        }
      }
    } catch {
      // Ignore JSON error
    }
  }

  // 4. Scan DEMO_COLLECTIONS fallback
  const demo = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED' && !deletedIds.includes(c.id));
  if (demo) {
    const photos = DEMO_PHOTOS.filter((p) => p.collectionId === demo.id);
    const resolvedCol: PortfolioCollection = {
      ...demo,
      photos,
      photosCount: photos.length,
      coverPhotoUrl: resolveCollectionCoverUrl(
        demo.coverPhotoId,
        photos,
        demo.coverPhotoUrl,
        demo.slug + ' ' + (demo.conceptSlug || '')
      ),
    };
    singleCollectionCache.set(slug, { data: resolvedCol, timestamp: Date.now() });
    return resolvedCol;
  }

  return null;
}

export function getStoredCustomConcepts(): Concept[] {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_CONCEPTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignore JSON error
    }
  }
  return localCustomConcepts;
}

export function persistStoredCustomConcepts(concepts: Concept[]): void {
  localCustomConcepts = concepts;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_CONCEPTS_KEY, JSON.stringify(concepts));
    } catch {
      // Ignore storage error
    }
  }
}

export function clearPortfolioCache(): void {
  conceptsCache.clear();
  conceptsPromises.clear();
  collectionsCache.clear();
  collectionsPromises.clear();
  singleCollectionCache.clear();
}

/**
 * Gets active public concepts for guest/customer browsing and booking
 */
export async function getPublicConcepts(serviceId?: string): Promise<Concept[]> {
  const cacheKey = serviceId || '__ALL__';

  if (!isTestEnv) {
    const cached = conceptsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
    const inFlight = conceptsPromises.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const fetchPromise = (async () => {
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

      // Hydrate coverPhotoUrl without N+1 query
      const coverPhotoIds = data
        .map((c) => c.cover_photo_id)
        .filter((id): id is string => Boolean(id));

      const coverPhotoMap = new Map<string, string>();
      if (coverPhotoIds.length > 0) {
        const { data: photosData, error: photosError } = await supabase
          .from('portfolio_photos')
          .select('id, url')
          .in('id', coverPhotoIds);

        if (!photosError && photosData) {
          photosData.forEach((p) => {
            if (p.id && p.url) coverPhotoMap.set(p.id, p.url);
          });
        }
      }

      const mapped = data.map((row) => {
        let coverUrl = row.cover_photo_id ? coverPhotoMap.get(row.cover_photo_id) : undefined;
        if (!coverUrl && row.cover_photo_url) {
          coverUrl = row.cover_photo_url;
        }
        // DEF-005: Fallback to curated concept image if DB row lacks cover photo
        if (!coverUrl) {
          const demoMatch = DEMO_CONCEPTS.find(
            (d) => d.id === row.id || d.slug === row.slug
          );
          if (demoMatch?.coverPhotoUrl) {
            coverUrl = demoMatch.coverPhotoUrl;
          } else {
            coverUrl = resolveCollectionCoverUrl(undefined, undefined, undefined, row.slug);
          }
        }
        return mapConceptRow(row, coverUrl);
      });

      // Guarantee brand concepts from DEMO_CONCEPTS are merged ONLY in demo mode
      if (isDemoModeEnabled()) {
        for (const dCnc of DEMO_CONCEPTS) {
          if (dCnc.active && !mapped.some((c) => c.slug === dCnc.slug || c.id === dCnc.id)) {
            if (!serviceId || dCnc.serviceId === serviceId) {
              mapped.push(dCnc);
            }
          }
        }
      }

      if (!isTestEnv) {
        conceptsCache.set(cacheKey, { data: mapped, timestamp: Date.now() });
      }
      return mapped;
    }

    if (isDemoModeEnabled()) {
      const storedCustom = getStoredCustomConcepts();
      const allMerged = [...storedCustom, ...DEMO_CONCEPTS];
      let items = allMerged.filter((c) => c.active);
      if (serviceId) {
        items = items.filter((c) => c.serviceId === serviceId);
      }
      return items;
    }

    return [];
  })();

  if (!isTestEnv) {
    conceptsPromises.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      conceptsPromises.delete(cacheKey);
    });
  }

  return fetchPromise;
}

/**
 * Gets a concept by its unique slug
 */
export async function getConceptBySlug(rawSlug: string): Promise<Concept | null> {
  if (!rawSlug) return null;
  const decoded = decodeURIComponent(rawSlug).trim();
  const normalized = decoded.toLowerCase().replace(/\s+/g, '-');

  if (isSupabaseConfigured()) {
    let data: any = null;
    const res1 = await supabase
      .from('concepts')
      .select('*')
      .eq('slug', decoded)
      .eq('active', true)
      .maybeSingle();

    if (res1.data) {
      data = res1.data;
    } else if (decoded !== normalized) {
      const res2 = await supabase
        .from('concepts')
        .select('*')
        .eq('slug', normalized)
        .eq('active', true)
        .maybeSingle();
      if (res2.data) {
        data = res2.data;
      }
    }

    if (!data) {
      const custom = getStoredCustomConcepts();
      const customFound = custom.find((c) => c.slug === decoded || c.slug === normalized || c.id === decoded);
      if (customFound && customFound.active) return customFound;

      const brandConcept = DEMO_CONCEPTS.find(
        (c) =>
          (c.slug === decoded ||
            c.slug === normalized ||
            c.slug.replace(/-/g, ' ') === decoded.toLowerCase() ||
            c.id === decoded) &&
          c.active
      );
      if (brandConcept) return brandConcept;
      return null;
    }

    let coverPhotoUrl: string | undefined = data.cover_photo_url || undefined;
    if (!coverPhotoUrl && data.cover_photo_id) {
      const { data: photoData } = await supabase
        .from('portfolio_photos')
        .select('url')
        .eq('id', data.cover_photo_id)
        .single();
      if (photoData?.url) {
        coverPhotoUrl = photoData.url;
      }
    }

    // Fallback to curated thumbnail if DB row lacks cover photo
    if (!coverPhotoUrl) {
      const demoMatch = DEMO_CONCEPTS.find((d) => d.slug === normalized || d.slug === decoded || d.id === data.id);
      if (demoMatch?.coverPhotoUrl) {
        coverPhotoUrl = demoMatch.coverPhotoUrl;
      } else {
        coverPhotoUrl = resolveCollectionCoverUrl(undefined, undefined, undefined, normalized);
      }
    }

    return mapConceptRow(data, coverPhotoUrl);
  }

  const custom = getStoredCustomConcepts();
  const customFound = custom.find((c) => c.slug === decoded || c.slug === normalized || c.id === decoded);
  if (customFound && customFound.active) return customFound;

  return (
    DEMO_CONCEPTS.find(
      (c) =>
        (c.slug === decoded ||
          c.slug === normalized ||
          c.slug.replace(/-/g, ' ') === decoded.toLowerCase() ||
          c.id === decoded) &&
        c.active
    ) || null
  );
}

/**
 * Helper to layer persistent locally modified / created collections and filter deleted ones
 */
function applyCollectionOverrides(
  baseCollections: PortfolioCollection[],
  conceptId?: string,
  featuredOnly?: boolean
): PortfolioCollection[] {
  const deletedIds = getStoredDeletedCollectionIds();
  let list = baseCollections.filter(c => !deletedIds.includes(c.id) && !deletedIds.includes(c.slug));

  const customCols = getStoredCustomCollections();
  for (const custom of customCols) {
    if (deletedIds.includes(custom.id) || deletedIds.includes(custom.slug)) continue;
    const idx = list.findIndex(c => c.id === custom.id || c.slug === custom.slug);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...custom };
    } else if (custom.status === 'PUBLISHED') {
      if (!conceptId || custom.conceptId === conceptId) {
        if (!featuredOnly || custom.featured) {
          list.unshift(custom);
        }
      }
    }
  }
  return list;
}

/**
 * Gets published portfolio collections for public gallery
 */
export async function getPublicCollections(
  conceptId?: string,
  featuredOnly?: boolean
): Promise<PortfolioCollection[]> {
  const cacheKey = `${conceptId || '__ALL__'}_${featuredOnly ? '1' : '0'}`;

  if (!isTestEnv) {
    const cached = collectionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return applyCollectionOverrides(cached.data, conceptId, featuredOnly);
    }
    const inFlight = collectionsPromises.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }
  }

  const fetchPromise = (async () => {
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
        console.warn('Query collections from Supabase warned, falling back to local:', error.message);
        return applyCollectionOverrides(DEMO_COLLECTIONS.filter(c => c.status === 'PUBLISHED'), conceptId, featuredOnly);
      }

      if (!data || data.length === 0) {
        return applyCollectionOverrides([], conceptId, featuredOnly);
      }

      const mappedCollections: PortfolioCollection[] = data.map((item: any) => {
        const col = mapCollectionRow(item, item.concepts);
        const photos: PortfolioPhoto[] = Array.isArray(item.portfolio_photos)
          ? item.portfolio_photos.map((p: any) => {
              const rowPhoto = mapPhotoRow(p);
              // DEF-006: If photo url in DB is generic /hero.png or /studio.png, resolve to distinctive photo
              if (rowPhoto.url === '/hero.png' || rowPhoto.url === '/studio.png') {
                const hint = col.slug + ' ' + (col.conceptSlug || '');
                const resolved = resolveCollectionCoverUrl(undefined, undefined, undefined, hint);
                if (resolved) rowPhoto.url = resolved;
              }
              return rowPhoto;
            })
          : [];
        photos.sort((a, b) => a.sortOrder - b.sortOrder);
        col.photos = photos;
        col.photosCount = photos.length;
        col.coverPhotoUrl = resolveCollectionCoverUrl(
          col.coverPhotoId,
          photos,
          undefined,
          col.slug + ' ' + (col.conceptSlug || ''),
          col.coverPhotoUrl
        );
        return col;
      });

      // Merge brand collections from DEMO_COLLECTIONS ONLY in demo mode
      if (isDemoModeEnabled()) {
        for (const dCol of DEMO_COLLECTIONS) {
          if (dCol.status === 'PUBLISHED' && !mappedCollections.some((c) => c.slug === dCol.slug || c.id === dCol.id)) {
            if ((!conceptId || dCol.conceptId === conceptId) && (!featuredOnly || dCol.featured)) {
              mappedCollections.push(dCol);
            }
          }
        }
      }

      const finalCols = applyCollectionOverrides(mappedCollections, conceptId, featuredOnly);

      if (!isTestEnv) {
        collectionsCache.set(cacheKey, { data: finalCols, timestamp: Date.now() });
        // Populate single collection cache for instant /portfolio/:slug access
        finalCols.forEach((c) => {
          if (c.slug) singleCollectionCache.set(c.slug, { data: c, timestamp: Date.now() });
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(finalCols.slice(0, 30)));
          } catch {
            // Ignore quota
          }
        }
      }
      return finalCols;
    }

    if (isDemoModeEnabled()) {
      let items = DEMO_COLLECTIONS.filter((c) => c.status === 'PUBLISHED');
      if (conceptId) {
        items = items.filter((c) => c.conceptId === conceptId);
      }
      if (featuredOnly) {
        items = items.filter((c) => c.featured);
      }
      const mappedDemo = items.map((c) => {
        const photos = DEMO_PHOTOS.filter((p) => p.collectionId === c.id);
        return {
          ...c,
          photos,
          photosCount: photos.length,
          coverPhotoUrl: resolveCollectionCoverUrl(
            c.coverPhotoId,
            photos,
            c.coverPhotoUrl,
            c.slug + ' ' + (c.conceptSlug || '')
          ),
        };
      });

      const finalCols = applyCollectionOverrides(mappedDemo, conceptId, featuredOnly);

      if (!isTestEnv) {
        collectionsCache.set(cacheKey, { data: finalCols, timestamp: Date.now() });
        finalCols.forEach((c) => {
          if (c.slug) singleCollectionCache.set(c.slug, { data: c, timestamp: Date.now() });
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(LOCAL_STORAGE_COLLECTIONS_KEY, JSON.stringify(finalCols.slice(0, 30)));
          } catch {
            // Ignore quota
          }
        }
      }

      return finalCols;
    }

    return applyCollectionOverrides([], conceptId, featuredOnly);
  })();

  if (!isTestEnv) {
    collectionsPromises.set(cacheKey, fetchPromise);
    fetchPromise.finally(() => {
      collectionsPromises.delete(cacheKey);
    });
  }

  return fetchPromise;
}

/**
 * Gets a single published collection with all photos by its slug.
 * Prioritizes instantaneous in-memory and local cache lookup.
 */
export async function getCollectionBySlug(slug: string): Promise<PortfolioCollection | null> {
  const deletedIds = getStoredDeletedCollectionIds();
  if (deletedIds.includes(slug)) return null;

  // Check stored custom / modified collections first for instant persistence
  const customCols = getStoredCustomCollections();
  const customMatch = customCols.find((c) => (c.slug === slug || c.id === slug) && !deletedIds.includes(c.id));
  if (customMatch && customMatch.photos && customMatch.photos.length > 0) {
    singleCollectionCache.set(slug, { data: customMatch, timestamp: Date.now() });
    return customMatch;
  }

  // 1. Instant cache lookup
  const cached = getCollectionBySlugSync(slug);
  if (cached && cached.photos && cached.photos.length > 0) {
    if (customMatch) {
      const merged = { ...cached, ...customMatch };
      return merged;
    }
    return cached;
  }

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('portfolio_collections')
      .select('*, concepts(*), portfolio_photos(*)')
      .eq('slug', slug)
      .eq('status', 'PUBLISHED')
      .single();

    if (error) {
      if (customMatch) return customMatch;
      if (error.code === 'PGRST116') {
        const demoMatch = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED' && !deletedIds.includes(c.id));
        return demoMatch || cached || null;
      }
      console.warn(`Could not load collection ${slug} from DB, checking local:`, error.message);
      if (customMatch) return customMatch;
      const demoMatch = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED' && !deletedIds.includes(c.id));
      return demoMatch || cached || null;
    }

    if (!data) {
      if (customMatch) return customMatch;
      const demoMatch = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED' && !deletedIds.includes(c.id));
      return demoMatch || cached || null;
    }

    if (deletedIds.includes(data.id)) return null;

    const col = mapCollectionRow(data as any, (data as any).concepts);
    const photos: PortfolioPhoto[] = Array.isArray((data as any).portfolio_photos)
      ? (data as any).portfolio_photos.map((p: any) => {
          const rowPhoto = mapPhotoRow(p);
          if (rowPhoto.url === '/hero.png' || rowPhoto.url === '/studio.png') {
            const hint = col.slug + ' ' + (col.conceptSlug || '');
            const resolved = resolveCollectionCoverUrl(undefined, undefined, undefined, hint);
            if (resolved) rowPhoto.url = resolved;
          }
          return rowPhoto;
        })
      : [];
    photos.sort((a, b) => a.sortOrder - b.sortOrder);
    col.photos = photos;
    col.photosCount = photos.length;
    col.coverPhotoUrl = resolveCollectionCoverUrl(
      col.coverPhotoId,
      photos,
      undefined,
      col.slug + ' ' + (col.conceptSlug || ''),
      col.coverPhotoUrl
    );

    const mergedCol = customMatch ? { ...col, ...customMatch } : col;

    singleCollectionCache.set(slug, { data: mergedCol, timestamp: Date.now() });
    return mergedCol;
  }

  if (customMatch) return customMatch;

  if (isDemoModeEnabled()) {
    const col = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED' && !deletedIds.includes(c.id));
    if (!col) return cached || null;
    const photos = DEMO_PHOTOS.filter((p) => p.collectionId === col.id);
    const resCol = {
      ...col,
      photos,
      photosCount: photos.length,
      coverPhotoUrl: resolveCollectionCoverUrl(
        col.coverPhotoId,
        photos,
        col.coverPhotoUrl,
        col.slug + ' ' + (col.conceptSlug || '')
      ),
    };
    singleCollectionCache.set(slug, { data: resCol, timestamp: Date.now() });
    return resCol;
  }

  return cached || null;
}

// ==============================================================================
// Manager & Admin Operations (CMS)
// ==============================================================================

// In-memory collections & concepts store for fallback / instant UI responsiveness

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

    if (!data || data.length === 0) return [...localCustomConcepts];

    const coverPhotoIds = data
      .map((c) => c.cover_photo_id)
      .filter((id): id is string => Boolean(id));

    const coverPhotoMap = new Map<string, string>();
    if (coverPhotoIds.length > 0) {
      const { data: photosData, error: photosError } = await supabase
        .from('portfolio_photos')
        .select('id, url')
        .in('id', coverPhotoIds);

      if (!photosError && photosData) {
        photosData.forEach((p) => {
          if (p.id && p.url) coverPhotoMap.set(p.id, p.url);
        });
      }
    }

    const mapped = data.map((row) =>
      mapConceptRow(row, row.cover_photo_id ? coverPhotoMap.get(row.cover_photo_id) : undefined)
    );
    return [...localCustomConcepts, ...mapped];
  }

  if (isDemoModeEnabled()) {
    return [...localCustomConcepts, ...DEMO_CONCEPTS];
  }

  return [...localCustomConcepts];
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

    const mapped = (data || []).map((item: any) => {
      const col = mapCollectionRow(item, item.concepts);
      const photos: PortfolioPhoto[] = Array.isArray(item.portfolio_photos)
        ? item.portfolio_photos.map(mapPhotoRow)
        : [];
      photos.sort((a, b) => a.sortOrder - b.sortOrder);
      col.photos = photos;
      col.photosCount = photos.length;
      col.coverPhotoUrl = resolveCollectionCoverUrl(col.coverPhotoId, photos, undefined, undefined, col.coverPhotoUrl);
      return col;
    });

    let filteredCustom = [...localCustomCollections];
    if (statusFilter && statusFilter !== 'ALL') {
      filteredCustom = filteredCustom.filter(c => c.status === statusFilter);
    }
    return [...filteredCustom, ...mapped];
  }

  if (isDemoModeEnabled()) {
    let items = DEMO_COLLECTIONS;
    if (statusFilter && statusFilter !== 'ALL') {
      items = items.filter((c) => c.status === statusFilter);
    }
    const mapped = items.map((c) => ({
      ...c,
      photos: DEMO_PHOTOS.filter((p) => p.collectionId === c.id),
      photosCount: DEMO_PHOTOS.filter((p) => p.collectionId === c.id).length,
    }));
    let filteredCustom = [...localCustomCollections];
    if (statusFilter && statusFilter !== 'ALL') {
      filteredCustom = filteredCustom.filter(c => c.status === statusFilter);
    }
    return [...filteredCustom, ...mapped];
  }

  return [...localCustomCollections];
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

    return { success: true, photoId };
  }

  if (isDemoModeEnabled()) {
    const photo = DEMO_PHOTOS.find((p) => p.id === photoId);
    if (photo) {
      photo.focalX = focalX;
      photo.focalY = focalY;
    }
    return { success: true, photoId };
  }

  throw new Error('Supabase not configured and demo mode disabled.');
}

/**
 * Creates a new concept
 * Fail-closed in production: mutates DB and invalidates cache.
 */
export async function createConcept(input: {
  name: string;
  slug?: string;
  description?: string;
  serviceId?: string;
  coverPhotoUrl?: string;
  active?: boolean;
  bookable?: boolean;
  displayOrder?: number;
}): Promise<Concept> {
  const slug = input.slug || input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `concept-${Date.now()}`;
  const newConcept: Concept = {
    id,
    name: input.name,
    slug,
    description: input.description || '',
    serviceId: input.serviceId || 'c0000000-0000-0000-0000-000000000001',
    coverPhotoUrl: input.coverPhotoUrl || '',
    active: input.active ?? true,
    bookable: input.bookable ?? true,
    displayOrder: input.displayOrder ?? 99,
  };

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.from('concepts').insert({
      name: input.name,
      slug,
      description: input.description || null,
      service_id: input.serviceId || null,
      cover_photo_url: input.coverPhotoUrl || null,
      active: input.active ?? true,
      bookable: input.bookable ?? true,
      display_order: input.displayOrder ?? 99,
    }).select().single();

    if (error) {
      throw normalizeError(error, 'createConcept');
    }
    clearPortfolioCache();
    return mapConceptRow(data, input.coverPhotoUrl);
  }

  const custom = getStoredCustomConcepts();
  persistStoredCustomConcepts([newConcept, ...custom]);
  clearPortfolioCache();
  return newConcept;
}

/**
 * Updates an existing concept
 * Fail-closed in production: throws if DB fails, never mutates DEMO_CONCEPTS in production.
 */
export async function updateConcept(id: string, updates: Partial<Concept>): Promise<Concept> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.serviceId !== undefined) dbUpdates.service_id = updates.serviceId;
    if (updates.coverPhotoUrl !== undefined) dbUpdates.cover_photo_url = updates.coverPhotoUrl;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    if (updates.bookable !== undefined) dbUpdates.bookable = updates.bookable;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

    const { data, error } = await supabase.from('concepts').update(dbUpdates).eq('id', id).select().single();
    if (error) {
      throw normalizeError(error, 'updateConcept');
    }
    clearPortfolioCache();
    return mapConceptRow(data, updates.coverPhotoUrl);
  }

  const custom = getStoredCustomConcepts();
  const customIdx = custom.findIndex((c) => c.id === id);
  if (customIdx !== -1) {
    custom[customIdx] = { ...custom[customIdx], ...updates };
    persistStoredCustomConcepts(custom);
    clearPortfolioCache();
    return custom[customIdx];
  }

  const demo = DEMO_CONCEPTS.find((c) => c.id === id);
  if (demo) {
    Object.assign(demo, updates);
    clearPortfolioCache();
    return demo;
  }
  return { id, ...updates } as Concept;
}

/**
 * Deletes a concept by ID
 * Fail-closed in production: throws if DB fails, never mutates DEMO_CONCEPTS in production.
 */
export async function deleteConcept(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { error } = await supabase.from('concepts').delete().eq('id', id);
    if (error) {
      throw normalizeError(error, 'deleteConcept');
    }
    clearPortfolioCache();
    return true;
  }

  const custom = getStoredCustomConcepts();
  persistStoredCustomConcepts(custom.filter((c) => c.id !== id));
  const demoIdx = DEMO_CONCEPTS.findIndex((c) => c.id === id);
  if (demoIdx !== -1) {
    DEMO_CONCEPTS.splice(demoIdx, 1);
  }
  clearPortfolioCache();
  return true;
}

/**
 * Creates a new portfolio collection
 * Synchronizes with Supabase DB and local persistent storage.
 */
export async function createCollection(input: {
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  conceptId?: string;
  coverPhotoUrl?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  featured?: boolean;
}): Promise<PortfolioCollection> {
  const slug = input.slug || input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `col-${Date.now()}`;
  let newCol: PortfolioCollection = {
    id,
    slug,
    title: input.title,
    description: input.description || '',
    category: input.category || 'PORTRAIT',
    conceptId: input.conceptId,
    status: input.status || 'DRAFT',
    featured: input.featured ?? false,
    coverPhotoUrl: input.coverPhotoUrl || '',
    photos: [],
    photosCount: 0,
    createdAt: new Date().toISOString(),
    displayOrder: 1,
  };

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { data, error } = await supabase.from('portfolio_collections').insert({
        title: input.title,
        slug,
        description: input.description || null,
        concept_id: input.conceptId || null,
        status: input.status || 'DRAFT',
        featured: input.featured ?? false,
        display_order: 1,
        cover_photo_id: null,
        cover_photo_url: input.coverPhotoUrl || null,
      }).select('*, concepts(*), portfolio_photos(*)').single();

      if (!error && data) {
        newCol = mapCollectionRow(data, data.concepts || undefined);
      } else if (error) {
        console.warn('Supabase createCollection insert notice, saving locally:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase createCollection exception, saving locally:', err?.message);
    }
  }

  const stored = getStoredCustomCollections();
  const nextStored = [newCol, ...stored.filter(c => c.id !== newCol.id && c.slug !== newCol.slug)];
  persistStoredCustomCollections(nextStored);
  localCustomCollections = nextStored;

  clearPortfolioCache();
  return newCol;
}

/**
 * Updates a portfolio collection
 * Synchronizes with Supabase DB and local persistent storage.
 */
export async function updateCollection(id: string, updates: Partial<PortfolioCollection>): Promise<PortfolioCollection> {
  let updatedCol: PortfolioCollection | null = null;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.slug !== undefined) dbUpdates.slug = updates.slug;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.conceptId !== undefined) dbUpdates.concept_id = updates.conceptId;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.featured !== undefined) dbUpdates.featured = updates.featured;
      if (updates.coverPhotoId !== undefined) dbUpdates.cover_photo_id = updates.coverPhotoId;
      if (updates.coverPhotoUrl !== undefined) dbUpdates.cover_photo_url = updates.coverPhotoUrl;

      const { data, error } = await supabase
        .from('portfolio_collections')
        .update(dbUpdates)
        .eq('id', id)
        .select('*, concepts(*), portfolio_photos(*)').single();

      if (!error && data) {
        updatedCol = mapCollectionRow(data, data.concepts || undefined);
      } else if (error) {
        console.warn('Supabase updateCollection warning, falling back to local persistent store:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase updateCollection error, falling back to local persistent store:', err?.message);
    }
  }

  // Update in stored custom collections
  const stored = getStoredCustomCollections();
  const existingStoredIdx = stored.findIndex(c => c.id === id || c.slug === updates.slug);
  if (existingStoredIdx !== -1) {
    stored[existingStoredIdx] = { ...stored[existingStoredIdx], ...updates, ...(updatedCol || {}) };
    updatedCol = stored[existingStoredIdx];
  } else {
    // Find in demo collections or synthesize
    const demo = DEMO_COLLECTIONS.find(c => c.id === id);
    const base = demo ? { ...demo } : ({ id, slug: id, title: id, status: 'PUBLISHED', photos: [] } as any);
    const merged = { ...base, ...updates, ...(updatedCol || {}) };
    stored.unshift(merged);
    updatedCol = merged;
  }
  persistStoredCustomCollections(stored);

  // Update demo collections in memory if matched
  const demoIdx = DEMO_COLLECTIONS.findIndex(c => c.id === id);
  if (demoIdx !== -1) {
    Object.assign(DEMO_COLLECTIONS[demoIdx], updates, updatedCol || {});
  }

  clearPortfolioCache();
  return updatedCol || ({ id, ...updates } as PortfolioCollection);
}

/**
 * Deletes a portfolio collection by ID
 * Synchronizes with Supabase DB and local persistent storage.
 */
export async function deleteCollection(id: string): Promise<boolean> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    try {
      const { error } = await supabase.from('portfolio_collections').delete().eq('id', id);
      if (error) {
        console.warn('Supabase deleteCollection notice, applying locally:', error.message);
      }
    } catch (err: any) {
      console.warn('Supabase deleteCollection exception, applying locally:', err?.message);
    }
  }

  // Record deleted ID in persistent deleted list
  persistDeletedCollectionId(id);

  // Remove from stored custom collections
  const stored = getStoredCustomCollections();
  persistStoredCustomCollections(stored.filter(c => c.id !== id));

  // Remove from in-memory collections
  localCustomCollections = localCustomCollections.filter(c => c.id !== id);
  const demoIdx = DEMO_COLLECTIONS.findIndex(c => c.id === id);
  if (demoIdx !== -1) {
    DEMO_COLLECTIONS.splice(demoIdx, 1);
  }

  clearPortfolioCache();
  return true;
}

/**
 * Creates and persists a portfolio photo in Supabase Storage and database
 */
export async function createPortfolioPhoto(input: {
  collectionId: string;
  file?: File | Blob;
  url?: string;
  filename: string;
  width?: number;
  height?: number;
  focalX?: number;
  focalY?: number;
  altText?: string;
  caption?: string;
  sortOrder?: number;
  featured?: boolean;
  variants?: Record<string, any>;
}): Promise<PortfolioPhoto> {
  const photoId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pho_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let finalUrl = input.url || '';
    let storagePath: string | null = null;

    if (input.file) {
      const sanitizedName = (input.filename || 'photo.webp').replace(/[^a-zA-Z0-9.-]/g, '_');
      storagePath = `portfolio/${input.collectionId}/${photoId}/${Date.now()}_${sanitizedName}`;

      const { error: uploadError } = await supabase.storage
        .from('portfolio-public')
        .upload(storagePath, input.file, {
          contentType: input.file.type || 'image/webp',
          upsert: true,
        });

      if (uploadError) {
        throw normalizeError(uploadError, 'createPortfolioPhoto');
      }

      const { data: urlData } = supabase.storage
        .from('portfolio-public')
        .getPublicUrl(storagePath);

      finalUrl = urlData?.publicUrl || '';
    }

    if (!finalUrl) {
      throw new Error('URL ảnh hoặc file tải lên không hợp lệ.');
    }

    const { data: inserted, error: dbError } = await supabase
      .from('portfolio_photos')
      .insert({
        id: photoId,
        collection_id: input.collectionId,
        url: finalUrl,
        filename: input.filename || 'photo.webp',
        width: input.width || 1200,
        height: input.height || 800,
        focal_x: input.focalX ?? 50,
        focal_y: input.focalY ?? 50,
        alt_text: input.altText || '',
        caption: input.caption || null,
        sort_order: input.sortOrder ?? 0,
        featured: input.featured ?? false,
        variants: (input.variants || {}) as any,
        storage_bucket: 'portfolio-public',
        storage_path: storagePath,
        mime_type: input.file?.type || 'image/webp',
        file_size_bytes: input.file?.size || 0,
      })
      .select()
      .single();

    if (dbError) {
      if (storagePath) {
        await supabase.storage.from('portfolio-public').remove([storagePath]).catch(() => {});
      }
      throw normalizeError(dbError, 'createPortfolioPhoto');
    }

    const mapped = mapPhotoRow(inserted);

    // Update stored custom collections
    const stored = getStoredCustomCollections();
    const targetCol = stored.find(c => c.id === input.collectionId);
    if (targetCol) {
      if (!targetCol.photos) targetCol.photos = [];
      targetCol.photos.push(mapped);
      targetCol.photosCount = targetCol.photos.length;
      persistStoredCustomCollections(stored);
    }
    const demoCol = DEMO_COLLECTIONS.find(c => c.id === input.collectionId);
    if (demoCol) {
      if (!demoCol.photos) demoCol.photos = [];
      demoCol.photos.push(mapped);
      demoCol.photosCount = demoCol.photos.length;
    }

    clearPortfolioCache();
    return mapped;
  }

  // Demo / test mode fallback
  const demoPhoto: PortfolioPhoto = {
    id: photoId,
    collectionId: input.collectionId,
    url: input.url || (input.file ? URL.createObjectURL(input.file) : '/hero-couple.jpg'),
    filename: input.filename,
    width: input.width || 1200,
    height: input.height || 800,
    focalX: input.focalX ?? 50,
    focalY: input.focalY ?? 50,
    altText: input.altText || '',
    caption: input.caption,
    sortOrder: input.sortOrder ?? 0,
    featured: input.featured ?? false,
    variants: input.variants || {},
  };

  const stored = getStoredCustomCollections();
  const targetCol = stored.find(c => c.id === input.collectionId);
  if (targetCol) {
    if (!targetCol.photos) targetCol.photos = [];
    targetCol.photos.push(demoPhoto);
    targetCol.photosCount = targetCol.photos.length;
    if (!targetCol.coverPhotoUrl) {
      targetCol.coverPhotoUrl = demoPhoto.url;
    }
    persistStoredCustomCollections(stored);
  }

  const col = localCustomCollections.find(c => c.id === input.collectionId) ||
    DEMO_COLLECTIONS.find(c => c.id === input.collectionId);
  if (col) {
    if (!col.photos) col.photos = [];
    col.photos.push(demoPhoto);
    col.photosCount = col.photos.length;
    if (!col.coverPhotoUrl) {
      col.coverPhotoUrl = demoPhoto.url;
    }
  }

  clearPortfolioCache();
  return demoPhoto;
}

/**
 * Replaces an existing portfolio photo with a new optimized image asset
 */
export async function replacePortfolioPhoto(
  photoId: string,
  file: File | Blob,
  metadata?: { width?: number; height?: number; filename?: string }
): Promise<PortfolioPhoto> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data: existing, error: fetchErr } = await supabase
      .from('portfolio_photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (fetchErr || !existing) {
      throw normalizeError(fetchErr || new Error('Photo not found'), 'replacePortfolioPhoto');
    }

    const filename = metadata?.filename || existing.filename || 'photo.webp';
    const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const newStoragePath = `portfolio/${existing.collection_id}/${photoId}/${Date.now()}_${sanitizedName}`;

    const { error: uploadError } = await supabase.storage
      .from('portfolio-public')
      .upload(newStoragePath, file, {
        contentType: file.type || 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      throw normalizeError(uploadError, 'replacePortfolioPhoto');
    }

    const { data: urlData } = supabase.storage
      .from('portfolio-public')
      .getPublicUrl(newStoragePath);

    const newUrl = urlData?.publicUrl || '';

    const { data: updated, error: updateErr } = await supabase
      .from('portfolio_photos')
      .update({
        url: newUrl,
        filename,
        width: metadata?.width || existing.width,
        height: metadata?.height || existing.height,
        storage_path: newStoragePath,
        file_size_bytes: file.size,
        mime_type: file.type || 'image/webp',
        updated_at: new Date().toISOString(),
      })
      .eq('id', photoId)
      .select()
      .single();

    if (updateErr) {
      await supabase.storage.from('portfolio-public').remove([newStoragePath]).catch(() => {});
      throw normalizeError(updateErr, 'replacePortfolioPhoto');
    }

    // Clean up old storage file safely
    const oldPath = (existing as any).storage_path;
    if (oldPath && oldPath !== newStoragePath) {
      await supabase.storage.from('portfolio-public').remove([oldPath]).catch(() => {});
    }

    clearPortfolioCache();
    return mapPhotoRow(updated);
  }

  // Demo / test mode fallback
  for (const col of [...localCustomCollections, ...DEMO_COLLECTIONS]) {
    if (col.photos) {
      const p = col.photos.find(item => item.id === photoId);
      if (p) {
        p.url = URL.createObjectURL(file);
        if (metadata?.width) p.width = metadata.width;
        if (metadata?.height) p.height = metadata.height;
        if (metadata?.filename) p.filename = metadata.filename;
        clearPortfolioCache();
        return p;
      }
    }
  }

  throw new Error('Photo not found');
}

/**
 * Deletes a portfolio photo and cleans up storage and cover references
 */
export async function deletePortfolioPhoto(photoId: string): Promise<boolean> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data: photoData, error: fetchErr } = await supabase
      .from('portfolio_photos')
      .select('*')
      .eq('id', photoId)
      .single();

    if (fetchErr || !photoData) {
      throw normalizeError(fetchErr || new Error('Photo not found'), 'deletePortfolioPhoto');
    }

    const { error: delErr } = await supabase
      .from('portfolio_photos')
      .delete()
      .eq('id', photoId);

    if (delErr) {
      throw normalizeError(delErr, 'deletePortfolioPhoto');
    }

    // If collection had this photo as cover, choose next available photo or null
    const { data: colData } = await supabase
      .from('portfolio_collections')
      .select('cover_photo_id')
      .eq('id', photoData.collection_id)
      .single();

    if (colData && colData.cover_photo_id === photoId) {
      const { data: remaining } = await supabase
        .from('portfolio_photos')
        .select('id')
        .eq('collection_id', photoData.collection_id)
        .order('sort_order', { ascending: true })
        .limit(1);

      const nextCoverId = remaining && remaining.length > 0 ? remaining[0].id : null;
      await supabase
        .from('portfolio_collections')
        .update({ cover_photo_id: nextCoverId })
        .eq('id', photoData.collection_id);
    }

    // Clean up storage file
    const stPath = (photoData as any).storage_path;
    if (stPath) {
      await supabase.storage.from('portfolio-public').remove([stPath]).catch(() => {});
    }

    const stored = getStoredCustomCollections();
    let storedChanged = false;
    for (const c of stored) {
      if (c.photos && c.photos.some(p => p.id === photoId)) {
        c.photos = c.photos.filter(p => p.id !== photoId);
        c.photosCount = c.photos.length;
        if (c.coverPhotoId === photoId) {
          c.coverPhotoId = c.photos[0]?.id;
          c.coverPhotoUrl = c.photos[0]?.url || '';
        }
        storedChanged = true;
      }
    }
    if (storedChanged) persistStoredCustomCollections(stored);

    for (const c of DEMO_COLLECTIONS) {
      if (c.photos && c.photos.some(p => p.id === photoId)) {
        c.photos = c.photos.filter(p => p.id !== photoId);
        c.photosCount = c.photos.length;
        if (c.coverPhotoId === photoId) {
          c.coverPhotoId = c.photos[0]?.id;
          c.coverPhotoUrl = c.photos[0]?.url || '';
        }
      }
    }

    clearPortfolioCache();
    return true;
  }

  // Demo / test mode fallback
  const stored = getStoredCustomCollections();
  let storedChanged = false;
  for (const c of stored) {
    if (c.photos && c.photos.some(p => p.id === photoId)) {
      c.photos = c.photos.filter(p => p.id !== photoId);
      c.photosCount = c.photos.length;
      if (c.coverPhotoId === photoId) {
        c.coverPhotoId = c.photos[0]?.id;
        c.coverPhotoUrl = c.photos[0]?.url || '';
      }
      storedChanged = true;
    }
  }
  if (storedChanged) persistStoredCustomCollections(stored);

  for (const col of [...localCustomCollections, ...DEMO_COLLECTIONS]) {
    if (col.photos) {
      const idx = col.photos.findIndex(p => p.id === photoId);
      if (idx !== -1) {
        col.photos.splice(idx, 1);
        col.photosCount = col.photos.length;
        if (col.coverPhotoId === photoId) {
          col.coverPhotoId = col.photos[0]?.id;
          col.coverPhotoUrl = col.photos[0]?.url || '';
        }
        break;
      }
    }
  }

  clearPortfolioCache();
  return true;
}

/**
 * Reorders photos in a collection and persists sort_order to database
 */
export async function reorderPortfolioPhotos(
  collectionId: string,
  orderedPhotoIds: string[]
): Promise<boolean> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    for (let i = 0; i < orderedPhotoIds.length; i++) {
      const { error } = await supabase
        .from('portfolio_photos')
        .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
        .eq('id', orderedPhotoIds[i]);
      if (error) {
        throw normalizeError(error, 'reorderPortfolioPhotos');
      }
    }
    clearPortfolioCache();
    return true;
  }

  // Demo / test mode fallback
  for (const col of [...localCustomCollections, ...DEMO_COLLECTIONS]) {
    if (col.id === collectionId && col.photos) {
      const photoMap = new Map(col.photos.map(p => [p.id, p]));
      col.photos = orderedPhotoIds
        .map((id, idx) => {
          const p = photoMap.get(id);
          if (p) p.sortOrder = idx + 1;
          return p;
        })
        .filter((p): p is PortfolioPhoto => Boolean(p));
      break;
    }
  }

  clearPortfolioCache();
  return true;
}

/**
 * Sets a photo as the authoritative cover for a portfolio collection
 */
export async function setCollectionCoverPhoto(
  collectionId: string,
  photoId: string
): Promise<boolean> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { error } = await supabase
      .from('portfolio_collections')
      .update({
        cover_photo_id: photoId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', collectionId);

    if (error) {
      throw normalizeError(error, 'setCollectionCoverPhoto');
    }

    clearPortfolioCache();
    return true;
  }

  // Demo / test mode fallback
  for (const col of [...localCustomCollections, ...DEMO_COLLECTIONS]) {
    if (col.id === collectionId) {
      col.coverPhotoId = photoId;
      const p = col.photos?.find(x => x.id === photoId);
      if (p) col.coverPhotoUrl = p.url;
      break;
    }
  }

  clearPortfolioCache();
  return true;
}

/**
 * Sets a photo as the cover for a concept
 */
export async function setConceptCoverPhoto(
  conceptId: string,
  photoId: string
): Promise<boolean> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { error } = await supabase
      .from('concepts')
      .update({
        cover_photo_id: photoId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conceptId);

    if (error) {
      throw normalizeError(error, 'setConceptCoverPhoto');
    }

    clearPortfolioCache();
    return true;
  }

  // Demo / test mode fallback
  for (const c of [...localCustomConcepts, ...DEMO_CONCEPTS]) {
    if (c.id === conceptId) {
      c.coverPhotoId = photoId;
      break;
    }
  }

  clearPortfolioCache();
  return true;
}

/**
 * Updates metadata for a portfolio photo (alt text, caption, featured, focal point)
 */
export async function updatePortfolioPhotoMetadata(
  photoId: string,
  updates: {
    altText?: string;
    caption?: string;
    focalX?: number;
    focalY?: number;
    featured?: boolean;
  }
): Promise<PortfolioPhoto> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.altText !== undefined) dbUpdates.alt_text = updates.altText;
    if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
    if (updates.focalX !== undefined) dbUpdates.focal_x = updates.focalX;
    if (updates.focalY !== undefined) dbUpdates.focal_y = updates.focalY;
    if (updates.featured !== undefined) dbUpdates.featured = updates.featured;

    const { data, error } = await supabase
      .from('portfolio_photos')
      .update(dbUpdates)
      .eq('id', photoId)
      .select()
      .single();

    if (error) {
      throw normalizeError(error, 'updatePortfolioPhotoMetadata');
    }

    clearPortfolioCache();
    return mapPhotoRow(data);
  }

  // Demo / test mode fallback
  for (const col of [...localCustomCollections, ...DEMO_COLLECTIONS]) {
    if (col.photos) {
      const p = col.photos.find(item => item.id === photoId);
      if (p) {
        if (updates.altText !== undefined) p.altText = updates.altText;
        if (updates.caption !== undefined) p.caption = updates.caption;
        if (updates.focalX !== undefined) p.focalX = updates.focalX;
        if (updates.focalY !== undefined) p.focalY = updates.focalY;
        if (updates.featured !== undefined) p.featured = updates.featured;
        clearPortfolioCache();
        return p;
      }
    }
  }

  throw new Error('Photo not found');
}

