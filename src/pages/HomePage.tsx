import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HeroSection } from '../components/public/HeroSection';
import { ServicesSection } from '../components/public/ServicesSection';
import { PackagesSection } from '../components/public/PackagesSection';
import { PortfolioSection } from '../components/public/PortfolioSection';
import { SeoHead, generateStudioLocalBusinessSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG } from '../config/site';

interface HomePageProps {
  onOpenBooking: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();

  return (
    <>
      <SeoHead
        title={`${SITE_CONFIG.siteName} | Studio Chụp Ảnh & Đặt Lịch Online`}
        description="Maison MIPA Memories – studio chụp ảnh phong cách Pháp ấm áp & tinh tế. Đặt lịch chụp Couple, Portrait, Family, Graduation và các gói Signature trực tuyến."
        canonicalPath="/"
        jsonLd={generateStudioLocalBusinessSchema()}
      />
      <HeroSection
        onOpenBooking={onOpenBooking}
        onExplorePackages={() => navigate('/bang-gia')}
      />
      <ServicesSection
        onSelectService={(serviceId) => {
          // If a service is selected from homepage, navigate to booking or detail
          const matchedSlug = serviceId.replace('srv_', '');
          navigate(`/dich-vu/${matchedSlug}`);
        }}
      />
      <PackagesSection
        onOpenBooking={onOpenBooking}
      />
      <PortfolioSection />
    </>
  );
};

export default HomePage;
