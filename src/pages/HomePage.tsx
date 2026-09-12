// ==============================================================================
// Maison MIPA Memories - Editorial Homepage (Cinematic Art Experience Phase 2)
// Rhythm:
// 1. Hero cinematic arrival
// 2. Selected works 3D reveal
// 3. Full-bleed image transition
// 4. Services editorial rows
// 5. Maison story & timeline
// 6. Darkroom exhibition gallery moment
// 7. Pricing
// 8. FAQ
// 9. Cinematic final image CTA
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '../components/public/HeroSection';
import { FeaturedConceptsSection } from '../components/public/FeaturedConceptsSection';
import { PhotoStackScene } from '../components/public/PhotoStackScene';
import { FullBleedTransitionSection } from '../components/public/FullBleedTransitionSection';
import { ServicesSection } from '../components/public/ServicesSection';
import { MaisonStorySection } from '../components/public/MaisonStorySection';
import { DarkroomExhibitionSection } from '../components/public/DarkroomExhibitionSection';
import { PackagesSection } from '../components/public/PackagesSection';
import { FaqSection } from '../components/public/FaqSection';
import { FinalCtaSection } from '../components/public/FinalCtaSection';
import { SeoHead, generateStudioLocalBusinessSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG } from '../config/site';

interface HomePageProps {
  onOpenBooking: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();

  const handleOpenBookingWithConcept = (conceptSlug?: string) => {
    if (conceptSlug) {
      navigate(`/booking?concept=${conceptSlug}`);
    } else {
      onOpenBooking();
    }
  };

  return (
    <>
      <SeoHead
        title={`${SITE_CONFIG.siteName} | Studio Chụp Ảnh Phong Cách Pháp & Đặt Lịch Online`}
        description="Maison MIPA Memories – studio chụp ảnh phong cách Pháp ấm áp & tinh tế tại Sài Gòn. Đặt lịch chụp Couple, Wedding, Portrait, Family trực tuyến với 100% file ảnh gốc chất lượng cao."
        canonicalPath="/"
        jsonLd={generateStudioLocalBusinessSchema()}
      />

      {/* 01. Hero Cinematic Arrival & Transformation */}
      <HeroSection onOpenBooking={onOpenBooking} />

      {/* 02. Selected Works 3D Perspective Entrance */}
      <FeaturedConceptsSection onOpenBooking={handleOpenBookingWithConcept} />

      {/* 03. Physical Photo Stack Separation Scene */}
      <PhotoStackScene />

      {/* 04. Film Gate & Moving Matte Transition */}
      <FullBleedTransitionSection />

      {/* 04. Services Editorial Rows */}
      <ServicesSection
        onSelectService={(serviceId, slug) => {
          const matchedSlug = slug || serviceId.replace('srv_', '');
          navigate(`/dich-vu/${matchedSlug}`);
        }}
      />

      {/* 05. Maison Story & 4-Step Timeline */}
      <MaisonStorySection />

      {/* 06. Darkroom Exhibition Moment */}
      <DarkroomExhibitionSection />

      {/* 07. Pricing Menu */}
      <PackagesSection onOpenBooking={onOpenBooking} />

      {/* 08. Frequently Asked Questions */}
      <FaqSection />

      {/* 09. Cinematic Final Image CTA */}
      <FinalCtaSection onOpenBooking={onOpenBooking} />
    </>
  );
};

export default HomePage;
