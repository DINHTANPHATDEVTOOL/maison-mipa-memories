// ==============================================================================
// Maison MIPA Memories — Visual Commerce Redesigned Homepage
// Photography First • Concept Discovery • Service Discovery • Stories • Clear Pricing • Easy Booking
// Zero 3D / WebGL dependencies in critical initial bundle (demoted to /atelier).
// ==============================================================================
import React from 'react';
import { SeoHead, generateStudioLocalBusinessSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG } from '../config/site';

// 8–10 Meaningful Visual Commerce Sections
import { VisualCommerceHero } from '../components/public/VisualCommerceHero';
import { HomeConceptsSection } from '../components/public/HomeConceptsSection';
import { HomeServicesSection } from '../components/public/HomeServicesSection';
import { HomeStoriesSection } from '../components/public/HomeStoriesSection';
import { HomeConceptCatalogPreview } from '../components/public/HomeConceptCatalogPreview';
import { HomeBrandStorySection } from '../components/public/HomeBrandStorySection';
import { HomePricingPreview } from '../components/public/HomePricingPreview';
import { HomeConsultationCtaSection } from '../components/public/HomeConsultationCtaSection';

interface HomePageProps {
  onOpenBooking: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenBooking }) => {
  return (
    <>
      <SeoHead
        title={`${SITE_CONFIG.siteName} | Studio Chụp Ảnh Phong Cách Pháp & Đặt Lịch Online`}
        description="Maison MIPA Memories – studio chụp ảnh phong cách Pháp ấm áp & tinh tế tại Sài Gòn. Khám phá concept chụp ảnh, bảng giá trọn gói minh bạch và đặt lịch trực tuyến."
        canonicalPath="/"
        jsonLd={generateStudioLocalBusinessSchema()}
      />

      {/* 01. Full-bleed Visual Hero (Photography-First) */}
      <VisualCommerceHero onOpenBooking={onOpenBooking} />

      {/* 02. Concept mới / Concept nổi bật */}
      <HomeConceptsSection />

      {/* 03. Dịch vụ nổi bật */}
      <HomeServicesSection />

      {/* 04. Selected Stories / Bộ ảnh */}
      <HomeStoriesSection />

      {/* 05. Concept catalog preview */}
      <HomeConceptCatalogPreview />

      {/* 06. Maison MIPA experience / brand story */}
      <HomeBrandStorySection />

      {/* 07. Pricing preview */}
      <HomePricingPreview />

      {/* 08. Reviews omitted (no real authoritative reviews in DB) */}
      {/* 09. Cẩm nang preview omitted from homepage (no real blog posts in DB) */}

      {/* 10. Consultation CTA / Booking CTA */}
      <HomeConsultationCtaSection onOpenBooking={onOpenBooking} />
    </>
  );
};

export default HomePage;
