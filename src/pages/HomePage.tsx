// ==============================================================================
// Maison MIPA Memories - Editorial Homepage (Flagship Living French Atelier)
// Restrained, Calm & Curated 10-Section Flow (Blocker 15):
// 1. Living Atelier Hero (Flagship Entrance)
// 2. Selected Works
// 3. Photo Stack Scene
// 4. Services
// 5. Full Bleed Film Transition
// 6. Maison Story
// 7. Darkroom Portfolio Moment
// 8. Packages
// 9. FAQ
// 10. Final CTA
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hero3DExhibitionSection } from '../components/public/Hero3DExhibitionSection';
import { FeaturedConceptsSection } from '../components/public/FeaturedConceptsSection';
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
import { getPublicConcepts } from '../services/portfolioService';
import { adaptConceptToAtelierArtwork } from '../components/public/atelier/atelierConfig';
import type { AtelierArtwork } from '../components/public/atelier/atelierTypes';

interface HomePageProps {
  onOpenBooking: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [atelierArtworks, setAtelierArtworks] = useState<AtelierArtwork[] | undefined>(undefined);

  // Blocker 11: load real public concepts for the atelier diorama
  useEffect(() => {
    let mounted = true;
    getPublicConcepts()
      .then((concepts) => {
        if (!mounted || !concepts || concepts.length === 0) return;
        const adapted = concepts.slice(0, 3).map((c, i) => adaptConceptToAtelierArtwork(c, i));
        setAtelierArtworks(adapted);
      })
      .catch(() => {
        // graceful fallback to default config artworks
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        description="Maison MIPA Memories – studio chụp ảnh phong cách Pháp ấm áp & tinh tế tại Sài Gòn. Đặt lịch chụp Couple, Wedding, Portrait, Family trực tuyến với file ảnh gốc chất lượng cao."
        canonicalPath="/"
        jsonLd={generateStudioLocalBusinessSchema()}
      />

      {/* 01. Living Atelier Hero (Flagship Entrance) */}
      <Hero3DExhibitionSection
        onOpenBooking={handleOpenBookingWithConcept}
        artworks={atelierArtworks}
      />

      {/* 02. Selected Works Entrance */}
      <FeaturedConceptsSection onOpenBooking={handleOpenBookingWithConcept} />

      {/* 03. Physical Photo Stack Separation Scene */}
      <PhotoStackScene />

      {/* 04. Services Editorial Rows */}
      <ServicesSection
        onSelectService={(serviceId, slug) => {
          const matchedSlug = slug || serviceId.replace('srv_', '');
          navigate(`/dich-vu/${matchedSlug}`);
        }}
      />

      {/* 05. Film Gate & Moving Matte Transition */}
      <FullBleedTransitionSection />

      {/* 06. Maison Story & 4-Step Timeline */}
      <MaisonStorySection />

      {/* 07. Darkroom Exhibition Moment */}
      <DarkroomExhibitionSection />

      {/* 08. Packages Pricing Menu */}
      <PackagesSection onOpenBooking={onOpenBooking} />

      {/* 09. Frequently Asked Questions */}
      <FaqSection />

      {/* 10. Cinematic Final Image CTA */}
      <FinalCtaSection onOpenBooking={onOpenBooking} />
    </>
  );
};

export default HomePage;
