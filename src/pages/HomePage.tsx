// ==============================================================================
// Maison MIPA Memories - Editorial Homepage (#6 & #16)
// Flow:
// 1. Cinematic Hero
// 2. Maison MIPA story
// 3. Featured Concepts
// 4. Services
// 5. Maison Experience
// 6. Packages
// 7. Quy trình 4 bước
// 8. Testimonials (authentic client reflection)
// 9. FAQ
// 10. Emotional final CTA
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '../components/public/HeroSection';
import { MaisonStorySection } from '../components/public/MaisonStorySection';
import { FeaturedConceptsSection } from '../components/public/FeaturedConceptsSection';
import { ServicesSection } from '../components/public/ServicesSection';
import { MaisonExperienceSection } from '../components/public/MaisonExperienceSection';
import { PackagesSection } from '../components/public/PackagesSection';
import { ProcessSection } from '../components/public/ProcessSection';
import { TestimonialsSection } from '../components/public/TestimonialsSection';
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

      {/* 1. Cinematic Hero */}
      <HeroSection onOpenBooking={onOpenBooking} />

      {/* 2. Maison MIPA Story */}
      <MaisonStorySection />

      {/* 3. Featured Concepts */}
      <FeaturedConceptsSection onOpenBooking={handleOpenBookingWithConcept} />

      {/* 4. Services */}
      <ServicesSection
        onSelectService={(serviceId) => {
          const matchedSlug = serviceId.replace('srv_', '');
          navigate(`/dich-vu/${matchedSlug}`);
        }}
      />

      {/* 5. Maison Experience */}
      <MaisonExperienceSection />

      {/* 6. Packages */}
      <PackagesSection onOpenBooking={onOpenBooking} />

      {/* 7. Quy trình 4 bước */}
      <ProcessSection />

      {/* 8. Testimonials (Genuine Editorial Reflection) */}
      <TestimonialsSection />

      {/* 9. FAQ & Policies */}
      <FaqSection />

      {/* 10. Emotional Final CTA */}
      <FinalCtaSection onOpenBooking={onOpenBooking} />
    </>
  );
};

export default HomePage;
