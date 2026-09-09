import { INITIAL_PACKAGES } from '../mockData';

const packagePrices = INITIAL_PACKAGES.map((p) => p.price);
const minPrice = packagePrices.length > 0 ? Math.min(...packagePrices) : 1290000;
const maxPrice = packagePrices.length > 0 ? Math.max(...packagePrices) : 3990000;

export const SITE_CONFIG = {
  siteName: 'Maison MIPA Memories',
  legalName: 'Maison MIPA Memories Studio',
  tagline: 'Capture the moment. Keep the memory.',
  domain: 'https://maisonmipa.io.vn',
  canonicalBase: 'https://maisonmipa.io.vn',
  
  // Contact info (consistent across UI, noscript, footer, and schema)
  contact: {
    hotline: '0966 616 546',
    phoneE164: '+84966616546',
    email: 'contact@maisonmipa.vn',
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
    facebook: 'https://facebook.com/maisonmipa',
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
    formattedMin: `${minPrice.toLocaleString('vi-VN')}đ`,
    formattedMax: `${maxPrice.toLocaleString('vi-VN')}đ`,
    formattedRange: `${minPrice.toLocaleString('vi-VN')}đ — ${maxPrice.toLocaleString('vi-VN')}đ`,
  },

  // Supported Service Slugs with metadata
  services: [
    {
      slug: 'couple',
      name: 'Couple & Anniversary',
      shortTitle: 'Couple Photography',
      h1: 'Chụp Ảnh Couple & Kỷ Niệm Tình Yêu — Maison MIPA',
      description: 'Lưu giữ khoảnh khắc ngọt ngào, ấm áp & tự nhiên của hai bạn trong không gian studio thơ mộng phong cách Pháp tại Maison MIPA Memories.',
      keywords: 'chụp ảnh couple, chụp ảnh đôi studio, chụp ảnh kỷ niệm tình yêu sài gòn, studio tân bình',
      image: '/hero.png',
    },
    {
      slug: 'portrait',
      name: 'Personal Portrait & Concept',
      shortTitle: 'Personal Portrait',
      h1: 'Chụp Ảnh Chân Dung Nghệ Thuật & Concept Cá Nhân — Maison MIPA',
      description: 'Chân dung nghệ thuật cá nhân, tôn vinh nét đẹp & thần thái độc bản của riêng bạn với ánh sáng chuẩn studio điện ảnh.',
      keywords: 'chụp ảnh chân dung, personal portrait studio, chụp ảnh concept cá nhân, studio sài gòn',
      image: '/studio.png',
    },
    {
      slug: 'family',
      name: 'Family & Generational',
      shortTitle: 'Family & Baby',
      h1: 'Chụp Ảnh Gia Đình & Em Bé Ấm Áp — Maison MIPA',
      description: 'Kỷ niệm gia đình ấm áp, lưu giữ nụ cười và sự gắn kết qua từng thế hệ trong không gian studio riêng tư, thoải mái.',
      keywords: 'chụp ảnh gia đình, chụp ảnh em bé, chụp ảnh thôi nôi gia đình studio, chụp ảnh kỷ niệm gia đình',
      image: '/hero.png',
    },
    {
      slug: 'graduation',
      name: 'Graduation & Concept',
      shortTitle: 'Graduation Concept',
      h1: 'Chụp Ảnh Kỷ Yếu & Tốt Nghiệp Thanh Xuân — Maison MIPA',
      description: 'Bộ ảnh kỷ yếu tốt nghiệp thanh xuân với phong cách hiện đại, trẻ trung, lưu giữ dấu ấn rực rỡ của tuổi trẻ.',
      keywords: 'chụp ảnh kỷ yếu, chụp ảnh tốt nghiệp studio, concept cử nhân thanh xuân, studio chụp ảnh tốt nghiệp',
      image: '/studio.png',
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
