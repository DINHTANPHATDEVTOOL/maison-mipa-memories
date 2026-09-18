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
    coverPhotoUrl: coverPhotoUrl || undefined,
    serviceId: row.service_id || undefined,
    active: row.active,
    bookable: row.bookable,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper to resolve collection cover photo priority:
// 1. cover_photo_id referenced photo
// 2. explicitly featured photo
// 3. first collection photo
// 4. demo fallback URL / concept-specific distinctive photo (DEF-006)
function resolveCollectionCoverUrl(
  coverPhotoId?: string,
  photos?: PortfolioPhoto[],
  demoFallbackUrl?: string,
  slugHint?: string
): string | undefined {
  if (photos && photos.length > 0) {
    if (coverPhotoId) {
      const match = photos.find((p) => p.id === coverPhotoId);
      if (match?.url && match.url !== '/hero.png' && match.url !== '/studio.png') return match.url;
    }
    const featured = photos.find((p) => p.featured);
    if (featured?.url && featured.url !== '/hero.png' && featured.url !== '/studio.png') return featured.url;
    if (photos[0]?.url && photos[0].url !== '/hero.png' && photos[0].url !== '/studio.png') return photos[0].url;
  }
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

export function clearPortfolioCache(): void {
  conceptsCache.clear();
  conceptsPromises.clear();
  collectionsCache.clear();
  collectionsPromises.clear();
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
        // DEF-005: Fallback to curated concept image if DB row lacks cover photo
        if (!coverUrl) {
          const demoMatch = DEMO_CONCEPTS.find(
            (d) => d.id === row.id || d.slug === row.slug
          );
          if (demoMatch?.coverPhotoUrl) {
            coverUrl = demoMatch.coverPhotoUrl;
          }
        }
        return mapConceptRow(row, coverUrl);
      });

      // Guarantee the 7 core brand concepts from DEMO_CONCEPTS are merged if missing from DB
      for (const dCnc of DEMO_CONCEPTS) {
        if (dCnc.active && !mapped.some((c) => c.slug === dCnc.slug || c.id === dCnc.id)) {
          if (!serviceId || dCnc.serviceId === serviceId) {
            mapped.push(dCnc);
          }
        }
      }

      if (!isTestEnv) {
        conceptsCache.set(cacheKey, { data: mapped, timestamp: Date.now() });
      }
      return mapped;
    }

    if (isDemoModeEnabled()) {
      let items = DEMO_CONCEPTS.filter((c) => c.active);
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
export async function getConceptBySlug(slug: string): Promise<Concept | null> {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('concepts')
      .select('*')
      .eq('slug', slug)
      .eq('active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Fallback to local brand concept if not in remote DB
        const brandConcept = DEMO_CONCEPTS.find((c) => c.slug === slug && c.active);
        return brandConcept || null;
      }
      throw new Error(`Lỗi tải concept ${slug}: ${error.message}`);
    }

    if (!data) {
      const brandConcept = DEMO_CONCEPTS.find((c) => c.slug === slug && c.active);
      return brandConcept || null;
    }

    let coverPhotoUrl: string | undefined = undefined;
    if (data.cover_photo_id) {
      const { data: photoData } = await supabase
        .from('portfolio_photos')
        .select('url')
        .eq('id', data.cover_photo_id)
        .single();
      if (photoData?.url) {
        coverPhotoUrl = photoData.url;
      }
    }

    // DEF-005: Fallback to curated thumbnail if DB row lacks cover_photo_id
    if (!coverPhotoUrl) {
      const demoMatch = DEMO_CONCEPTS.find((d) => d.slug === slug || d.id === data.id);
      if (demoMatch?.coverPhotoUrl) {
        coverPhotoUrl = demoMatch.coverPhotoUrl;
      }
    }

    return mapConceptRow(data, coverPhotoUrl);
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
  const cacheKey = `${conceptId || '__ALL__'}_${featuredOnly ? '1' : '0'}`;

  if (!isTestEnv) {
    const cached = collectionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
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
        console.error('Failed to query collections from database:', error.message);
        throw new Error(`Không thể tải danh mục portfolio: ${error.message}`);
      }

      if (!data || data.length === 0) {
        return [];
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
          col.slug + ' ' + (col.conceptSlug || '')
        );
        return col;
      });

      // Merge brand collections from DEMO_COLLECTIONS if not in remote DB
      for (const dCol of DEMO_COLLECTIONS) {
        if (dCol.status === 'PUBLISHED' && !mappedCollections.some((c) => c.slug === dCol.slug || c.id === dCol.id)) {
          if ((!conceptId || dCol.conceptId === conceptId) && (!featuredOnly || dCol.featured)) {
            mappedCollections.push(dCol);
          }
        }
      }

      if (!isTestEnv) {
        collectionsCache.set(cacheKey, { data: mappedCollections, timestamp: Date.now() });
      }
      return mappedCollections;
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
    }

    return [];
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
      if (error.code === 'PGRST116') {
        const demoMatch = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED');
        return demoMatch || null;
      }
      throw new Error(`Lỗi tải bộ sưu tập ${slug}: ${error.message}`);
    }

    if (!data) {
      const demoMatch = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED');
      return demoMatch || null;
    }

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
      col.slug + ' ' + (col.conceptSlug || '')
    );
    return col;
  }

  if (isDemoModeEnabled()) {
    const col = DEMO_COLLECTIONS.find((c) => c.slug === slug && c.status === 'PUBLISHED');
    if (!col) return null;
    const photos = DEMO_PHOTOS.filter((p) => p.collectionId === col.id);
    return {
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

    if (!data || data.length === 0) return [];

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

    return data.map((row) =>
      mapConceptRow(row, row.cover_photo_id ? coverPhotoMap.get(row.cover_photo_id) : undefined)
    );
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
      const photos: PortfolioPhoto[] = Array.isArray(item.portfolio_photos)
        ? item.portfolio_photos.map(mapPhotoRow)
        : [];
      photos.sort((a, b) => a.sortOrder - b.sortOrder);
      col.photos = photos;
      col.photosCount = photos.length;
      col.coverPhotoUrl = resolveCollectionCoverUrl(col.coverPhotoId, photos);
      return col;
    });
  }

  if (isDemoModeEnabled()) {
    let items = DEMO_COLLECTIONS;
    if (statusFilter && statusFilter !== 'ALL') {
      items = items.filter((c) => c.status === statusFilter);
    }
    return items.map((c) => ({
      ...c,
      photos: DEMO_PHOTOS.filter((p) => p.collectionId === c.id),
      photosCount: DEMO_PHOTOS.filter((p) => p.collectionId === c.id).length,
    }));
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
