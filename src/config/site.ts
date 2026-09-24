import { INITIAL_PACKAGES } from '../mockData';

const packagePrices = INITIAL_PACKAGES.map((p) => p.price);
const minPrice = packagePrices.length > 0 ? Math.min(...packagePrices) : 1290000;
const maxPrice = packagePrices.length > 0 ? Math.max(...packagePrices) : 3990000;

export const SITE_CONFIG = {
  siteName: 'Maison MIPA Memories',
  legalName: 'Tiệm Ảnh Maison MIPA Memories',
  tagline: 'Nhà là nơi lưu giữ ký ức',
  slogan: 'Maison MIPA Memories — Nhà là nơi lưu giữ ký ức',
  brandStoryShort: 'Trong tiếng Pháp, Maison là Ngôi Nhà. Tiệm ảnh Maison MIPA Memories tin rằng mỗi bức ảnh là một mảnh ghép của tổ ấm — nơi tình yêu, nụ cười và những rung cảm chân thật nhất được trân trọng và lưu giữ vẹn nguyên cùng năm tháng.',
  domain: 'https://maisonmipa.io.vn',
  canonicalBase: 'https://maisonmipa.io.vn',
  
  // Contact info (consistent across UI, noscript, footer, and schema)
  contact: {
    hotline: '0966 616 546',
    phoneE164: '+84966616546',
    email: 'maisonmipamemories@gmail.com',
    address: {
      streetAddress: '88 Phan Sào Nam, Phường 11',
      district: 'Quận Tân Bình',
      addressLocality: 'TP. Hồ Chí Minh',
      addressRegion: 'Hồ Chí Minh',
      postalCode: '700000',
      addressCountry: 'VN',
      formatted: '88 Phan Sào Nam, Phường 11, Quận Tân Bình, TP. Hồ Chí Minh',
      short: '88 Phan Sào Nam, Quận Tân Bình, TP. Hồ Chí Minh',
    },
    openingHours: {
      schemaOpens: '08:00',
      schemaCloses: '21:00',
      weekday: '08:30 — 19:00',
      weekend: '08:00 — 20:30',
      daysOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    },
  },

  // Social & Web profiles
  social: {
    facebook: 'https://web.facebook.com/share/1Dja1oVznW/?mibextid=wwXIfr&_rdc=1&_rdr',
    tiktok: 'https://www.tiktok.com/@maison_mipa?_r=1&_t=ZS-99pWbFD4WAO',
    instagram: 'https://instagram.com/maisonmipa',
    zalo: 'https://zalo.me/0966616546',
  },

  // Media & Branding assets
  assets: {
    defaultOgImage: 'https://maisonmipa.io.vn/hero.png',
    logo: 'https://maisonmipa.io.vn/favicon.svg',
  },

  // Pricing Source of Truth (dynamically derived from catalog packages)
  pricing: {
    minPrice,
    maxPrice,
    currency: 'VND',
    priceRangeSchema: `${minPrice}VND - ${maxPrice}VND`,
    formattedMin: `Chỉ từ ${minPrice.toLocaleString('vi-VN')} VNĐ`,
    formattedMax: `${maxPrice.toLocaleString('vi-VN')} VNĐ`,
    formattedRange: `Chỉ từ ${minPrice.toLocaleString('vi-VN')} VNĐ — ${maxPrice.toLocaleString('vi-VN')} VNĐ`,
  },

  // Supported Service Slugs with metadata (5 core photo boutique services)
  services: [
    {
      slug: 'portrait',
      name: 'Chụp ảnh chân dung cá nhân',
      shortTitle: 'Chân dung cá nhân',
      h1: 'Chụp Ảnh Chân Dung Nghệ Thuật — Maison MIPA',
      description: 'Chân dung nghệ thuật cá nhân, tôn vinh nét đẹp & thần thái độc bản của riêng bạn trong không gian ấm áp tại tiệm ảnh.',
      keywords: 'chụp ảnh chân dung cá nhân, chân dung nghệ thuật, tiệm ảnh sài gòn, tiệm ảnh tân bình',
      image: '/hero-camera.jpg',
    },
    {
      slug: 'couple',
      name: 'Ảnh couple',
      shortTitle: 'Couple Photography',
      h1: 'Chụp Ảnh Couple & Kỷ Niệm Tình Yêu — Maison MIPA',
      description: 'Lưu giữ khoảnh khắc ngọt ngào, ấm áp & tự nhiên của hai bạn trong không gian thơ mộng phong cách Pháp tại tiệm ảnh Maison MIPA Memories.',
      keywords: 'chụp ảnh couple, chụp ảnh đôi, chụp ảnh kỷ niệm tình yêu sài gòn, tiệm ảnh couple',
      image: '/hero-couple.jpg',
    },
    {
      slug: 'graduation',
      name: 'Tốt nghiệp',
      shortTitle: 'Kỷ yếu & Tốt nghiệp',
      h1: 'Chụp Ảnh Kỷ Yếu & Tốt Nghiệp Thanh Xuân — Maison MIPA',
      description: 'Bộ ảnh kỷ yếu tốt nghiệp thanh xuân với phong cách hiện đại, trẻ trung, lưu giữ dấu ấn rực rỡ của tuổi trẻ.',
      keywords: 'chụp ảnh kỷ yếu, chụp ảnh tốt nghiệp, concept cử nhân thanh xuân, kỷ yếu cử nhân',
      image: '/concept-graduation.webp',
    },
    {
      slug: 'birthday',
      name: 'Sinh nhật',
      shortTitle: 'Chụp ảnh sinh nhật',
      h1: 'Chụp Ảnh Sinh Nhật & Tuổi Mới Rạng Rỡ — Maison MIPA',
      description: 'Khung hình sinh nhật lung linh với hoa tươi, bóng bay, bánh kem và không gian trang trí ấm cúng tại tiệm ảnh.',
      keywords: 'chụp ảnh sinh nhật, tiệc sinh nhật tuổi mới, chụp ảnh kỷ niệm sinh nhật, tiệm ảnh sinh nhật',
      image: '/concept-noel.webp',
    },
    {
      slug: 'family',
      name: 'Gia đình',
      shortTitle: 'Gia đình sum vầy',
      h1: 'Chụp Ảnh Gia Đình Sum Vầy & Ấm Áp — Maison MIPA',
      description: 'Kỷ niệm gia đình ấm áp, lưu giữ nụ cười và sự gắn kết qua từng thế hệ trong không gian tiệm ảnh riêng tư, thoải mái.',
      keywords: 'chụp ảnh gia đình, chụp ảnh tổ ấm, chụp ảnh kỷ niệm gia đình, tiệm ảnh gia đình ấm cúng',
      image: '/hero.png',
    },
  ],
} as const;

export type ServiceSlug = (typeof SITE_CONFIG.services)[number]['slug'];

/**
 * Returns canonical URL for a given pathname, ensuring consistent trailing-slash policy.
 * Only '/' has a trailing slash; all other paths have no trailing slash.
 */
export function getCanonicalUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath === '/' || cleanPath === '') {
    return `${SITE_CONFIG.domain}/`;
  }
  return `${SITE_CONFIG.domain}${cleanPath.replace(/\/+$/, '')}`;
}
