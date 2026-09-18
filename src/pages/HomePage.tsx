// ==============================================================================
// Maison MIPA Memories — Visual Commerce Redesigned Homepage
// Photography First • Concept Discovery • Service Discovery • Stories • Clear Pricing • Easy Booking
// Zero 3D / WebGL dependencies in critical initial bundle (demoted to /atelier).
// ==============================================================================
import React from 'react';
import { SeoHead, generateStudioLocalBusinessSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG } from '../config/site';

// 7 Curated Visual Commerce Sections
import { VisualCommerceHero } from '../components/public/VisualCommerceHero';
import { HomeConceptsSection } from '../components/public/HomeConceptsSection';
import { HomeServicesSection } from '../components/public/HomeServicesSection';
import { HomeStoriesSection } from '../components/public/HomeStoriesSection';
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
        title="Tiệm Ảnh Maison MIPA Memories — Nhà Là Nơi Lưu Giữ Ký Ức"
        description="Maison MIPA Memories – Nhà là nơi lưu giữ ký ức. Tiệm ảnh phong cách ấm áp & tinh tế tại Sài Gòn. Chụp Chân Dung, Kỷ Yếu & Tốt Nghiệp, Áo Dài, Đồ Án, Couple, Lễ Tết & Giáng Sinh."
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

      {/* 05. Maison MIPA experience / brand story */}
      <HomeBrandStorySection />

      {/* 06. Pricing preview */}
      <HomePricingPreview />

      {/* 07. Consultation CTA / Booking CTA */}
      <HomeConsultationCtaSection onOpenBooking={onOpenBooking} />
    </>
  );
};

export default HomePage;
