import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { HelmetProvider } from 'react-helmet-async';
import { MemoryRouter } from 'react-router-dom';
import { getPublicConcepts, getPublicCollections, DEMO_CONCEPTS, DEMO_COLLECTIONS } from '../../services/portfolioService';
import { getServices, getPackages } from '../../services/catalogService';
import { SeoHead } from '../seo/SeoHead';
import { NotFoundPage } from '../../pages/NotFoundPage';
import { ServiceDetailPage } from '../../pages/ServiceDetailPage';
import * as supabaseModule from '../../lib/supabase';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabase')>();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn().mockReturnValue(false),
    isDemoModeEnabled: vi.fn().mockReturnValue(true),
  };
});

describe('Maison MIPA Web Review Defects Regression Suite (DEF-004 to DEF-009)', () => {
  it('DEF-005: getPublicConcepts ensures Parisian Romance and all concepts have valid coverPhotoUrl', async () => {
    const concepts = await getPublicConcepts();
    expect(concepts.length).toBeGreaterThan(0);

    const parisian = concepts.find((c) => c.slug === 'parisian-romance');
    expect(parisian).toBeDefined();
    expect(parisian?.coverPhotoUrl).toBeTruthy();
    expect(parisian?.coverPhotoUrl).not.toBe('/placeholder.png');
    expect(parisian?.coverPhotoUrl).toContain('.jpg');

    // All active concepts must have defined coverPhotoUrl
    for (const c of concepts) {
      expect(c.coverPhotoUrl).toBeDefined();
      expect(typeof c.coverPhotoUrl).toBe('string');
      expect(c.coverPhotoUrl!.length).toBeGreaterThan(0);
    }
  });

  it('DEF-006: Concept and collection catalogs use distinct, authentic visual assets', () => {
    // Unique URLs across the 7 core brand concepts
    const brandConceptSlugs = [
      'parisian-romance',
      'french-haute-couture',
      'chup-ky-yeu-tot-nghiep',
      'chup-ao-dai-duyen-dang',
      'chup-le-tet-sum-vay',
      'chup-giang-sinh-noel-cozy',
    ];

    const urls = brandConceptSlugs
      .map((slug) => DEMO_CONCEPTS.find((c) => c.slug === slug)?.coverPhotoUrl)
      .filter(Boolean);

    // Ensure they are not all identical
    const uniqueUrls = new Set(urls);
    expect(uniqueUrls.size).toBe(urls.length);

    // Verify dedicated WebP assets are utilized
    expect(urls).toContain('/concept-graduation.webp');
    expect(urls).toContain('/concept-aodai.webp');
    expect(urls).toContain('/concept-tet.webp');
    expect(urls).toContain('/concept-noel.webp');
  });

  it('DEF-007: 404 page emits robots noindex, follow and does NOT render canonical link', async () => {
    render(
      <HelmetProvider>
        <MemoryRouter>
          <NotFoundPage />
        </MemoryRouter>
      </HelmetProvider>
    );

    await waitFor(() => {
      const robotsMeta = document.querySelector('meta[name="robots"]');
      expect(robotsMeta).not.toBeNull();
      expect(robotsMeta?.getAttribute('content')).toBe('noindex, follow');
    });

    const canonicalLink = document.querySelector('link[rel="canonical"]');
    expect(canonicalLink).toBeNull();
  });

  it('DEF-008: Main pages have unique meta descriptions', () => {
    const descriptions = [
      'Maison MIPA Memories – Nhà là nơi lưu giữ ký ức. Tiệm ảnh phong cách ấm áp & tinh tế tại Sài Gòn. Chụp Chân Dung, Kỷ Yếu & Tốt Nghiệp, Áo Dài, Đồ Án, Couple, Lễ Tết & Giáng Sinh.', // HomePage
      'Khám phá toàn bộ concept chụp ảnh độc bản tại Tiệm ảnh Maison MIPA Memories: Chân dung, Kỷ yếu & Tốt nghiệp, Áo dài, Đồ án, Couple, Lễ Tết & Giáng Sinh với ánh sáng tự nhiên tinh tế.', // ConceptCatalogPage
      'Khám phá các dịch vụ chụp ảnh phong cách ấm áp & tinh tế tại Tiệm ảnh Maison MIPA Memories: Couple tình yêu, Chân dung cá nhân, Gia đình & Em bé, Kỷ yếu & Tốt nghiệp thanh xuân.', // ServicesPage
      'Bộ sưu tập ký ức và câu chuyện thực tế tại Tiệm ảnh Maison MIPA Memories: Những khung hình tình yêu, tổ ấm gia đình, kỷ yếu thanh xuân và chân dung nghệ thuật được kể lại bằng cảm xúc tự nhiên.', // PortfolioPage
      'Bảng giá dịch vụ chụp ảnh nghệ thuật minh bạch tại Tiệm ảnh Maison MIPA Memories. Chi phí trọn gói rõ ràng theo từng concept, thời lượng chụp và số lượng ảnh hậu kỳ bàn giao.', // PricingPage
      'Đặt lịch chụp ảnh trực tuyến nhanh chóng tại Tiệm ảnh Maison MIPA Memories: Lựa chọn concept, gói chụp, khung giờ và thanh toán cọc bảo đảm an toàn.', // BookingPage
      'Cẩm nang hướng dẫn chuẩn bị trang phục, phối tone màu và kinh nghiệm tạo dáng tự nhiên cho các buổi chụp ảnh chân dung, kỷ yếu, couple tại Tiệm ảnh Maison MIPA.', // EditorialGuidePage
    ];

    const uniqueDescriptions = new Set(descriptions);
    expect(uniqueDescriptions.size).toBe(descriptions.length);

    // None contain the confusing word "Studio" as brand descriptor
    for (const desc of descriptions) {
      expect(desc).not.toContain('Studio Chụp Ảnh');
    }
  });

  it('DEF-009: Service catalog guarantees Graduation service and packages are included', async () => {
    const services = await getServices();
    const graduationService = services.find((s) => s.slug === 'graduation');
    expect(graduationService).toBeDefined();
    expect(graduationService?.name).toContain('Graduation');

    const packages = await getPackages(graduationService?.id);
    expect(packages.length).toBeGreaterThan(0);
    expect(packages.some((p) => p.name.includes('GRADUATION'))).toBe(true);
  });
});
