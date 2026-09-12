// ==============================================================================
// Maison MIPA Memories - Editorial Homepage (Flagship 3D Exhibition & Luxury Atelier)
// Rhythm:
// 1. Hero 3D Spatial Virtual Exhibition Gallery (Flagship Entrance)
// 2. Editorial Marquee Gold Running Ribbon
// 3. Seasonal Privilege Campaign Banner (Mùa Kỷ Niệm & Cưới 2026)
// 4. Selected Works 3D Perspective Entrance
// 5. Curatorial Split Magazine Banner (Vogue / Elle French Spread)
// 6. Services Editorial Rows
// 7. Physical Photo Stack Separation Scene
// 8. Film Gate & Moving Matte Transition
// 9. Maison Story & 4-Step Timeline
// 10. Darkroom Exhibition Moment
// 11. Packages Pricing Menu
// 12. FAQ Section
// 13. Cinematic Final Image CTA
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero3DExhibitionSection } from '../components/public/Hero3DExhibitionSection';
import { EditorialMarqueeBanner } from '../components/public/EditorialMarqueeBanner';
import { SeasonalCampaignBanner } from '../components/public/SeasonalCampaignBanner';
import { FeaturedConceptsSection } from '../components/public/FeaturedConceptsSection';
import { CuratorialSplitBanner } from '../components/public/CuratorialSplitBanner';
import { ServicesSection } from '../components/public/ServicesSection';
import { PhotoStackScene } from '../components/public/PhotoStackScene';
import { FullBleedTransitionSection } from '../components/public/FullBleedTransitionSection';
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

      {/* 01. Flagship 3D Spatial Virtual Exhibition Gallery Hero */}
      <Hero3DExhibitionSection onOpenBooking={handleOpenBookingWithConcept} />

      {/* 02. Editorial Marquee Gold Running Ribbon */}
      <EditorialMarqueeBanner />

      {/* 03. Seasonal Privilege Campaign Banner (Mùa Kỷ Niệm & Cưới Paris 2026) */}
      <SeasonalCampaignBanner onOpenBooking={onOpenBooking} />

      {/* 04. Selected Works 3D Perspective Entrance */}
      <FeaturedConceptsSection onOpenBooking={handleOpenBookingWithConcept} />

      {/* 05. Curatorial Split Magazine Banner */}
      <CuratorialSplitBanner />

      {/* 06. Services Editorial Rows */}
      <ServicesSection
        onSelectService={(serviceId, slug) => {
          const matchedSlug = slug || serviceId.replace('srv_', '');
          navigate(`/dich-vu/${matchedSlug}`);
        }}
      />

      {/* 07. Physical Photo Stack Separation Scene */}
      <PhotoStackScene />

      {/* 08. Film Gate & Moving Matte Transition */}
      <FullBleedTransitionSection />

      {/* 09. Maison Story & 4-Step Timeline */}
      <MaisonStorySection />

      {/* 10. Darkroom Exhibition Moment */}
      <DarkroomExhibitionSection />

      {/* 11. Pricing Menu */}
      <PackagesSection onOpenBooking={onOpenBooking} />

      {/* 12. Frequently Asked Questions */}
      <FaqSection />

      {/* 13. Cinematic Final Image CTA */}
      <FinalCtaSection onOpenBooking={onOpenBooking} />
    </>
  );
};

export default HomePage;
