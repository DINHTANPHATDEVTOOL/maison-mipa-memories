import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Hero3DExhibitionSection } from '../components/public/Hero3DExhibitionSection';
import { SeoHead } from '../components/seo/SeoHead';
import { getPublicConcepts } from '../services/portfolioService';
import { adaptConceptToAtelierArtwork } from '../components/public/atelier/atelierConfig';
import type { AtelierArtwork } from '../components/public/atelier/atelierTypes';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';

interface AtelierPageProps {
  onOpenBooking: () => void;
}

export const AtelierPage: React.FC<AtelierPageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [atelierArtworks, setAtelierArtworks] = useState<AtelierArtwork[] | undefined>(undefined);
  const [isProductionEmpty, setIsProductionEmpty] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const isDemo = typeof window !== 'undefined' && localStorage.getItem('mipa_demo_mode') === 'true';

    getPublicConcepts()
      .then((concepts) => {
        if (!mounted) return;
        if (!concepts || concepts.length === 0) {
          if (isDemo) {
            setAtelierArtworks(undefined);
          } else {
            setAtelierArtworks([]);
            setIsProductionEmpty(true);
          }
          return;
        }
        const adapted = concepts.slice(0, 3).map((c, i) => adaptConceptToAtelierArtwork(c, i));
        setAtelierArtworks(adapted);
      })
      .catch(() => {
        if (!mounted) return;
        if (isDemo) {
          setAtelierArtworks(undefined);
        } else {
          setAtelierArtworks([]);
          setIsProductionEmpty(true);
        }
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
    <div style={{ backgroundColor: '#1A1412', minHeight: '100vh', color: '#FAF8F3', position: 'relative' }}>
      <SeoHead
        title="Không Gian Nghệ Thuật 3D Atelier | Maison MIPA Memories"
        description="Khám phá không gian thực tế ảo 3D Atelier của Maison MIPA Memories. Trải nghiệm ánh sáng tự nhiên và chiêm ngưỡng các tác phẩm nhiếp ảnh trong phòng tranh nghệ thuật."
        canonicalPath="/atelier"
      />

      {/* Breadcrumbs & Navigation Bar */}
      <nav
        aria-label="Breadcrumb"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '1.2rem 1.5rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: 'rgba(245, 230, 200, 0.7)',
          }}
        >
          <li>
            <Link
              to="/"
              style={{
                color: 'rgba(245, 230, 200, 0.7)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li>
            <ChevronRight size={13} color="#C6A45F" />
          </li>
          <li style={{ fontWeight: 500, color: '#F5E6C8' }} aria-current="page">
            3D Atelier
          </li>
        </ol>

        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: '#F5E6C8',
            fontSize: '0.85rem',
            textDecoration: 'none',
            borderBottom: '1px solid rgba(198, 164, 95, 0.4)',
            paddingBottom: '2px',
          }}
        >
          <ArrowLeft size={14} /> Trở về trang chủ
        </Link>
      </nav>

      {isProductionEmpty && (
        <div
          style={{
            maxWidth: '1350px',
            margin: '0.5rem auto 1rem',
            padding: '0.85rem 1.5rem',
            backgroundColor: 'rgba(140, 110, 83, 0.25)',
            border: '1px solid rgba(198, 164, 95, 0.4)',
            borderRadius: '4px',
            textAlign: 'center',
            color: '#F5E6C8',
            fontSize: '0.9rem',
          }}
        >
          Nội dung triển lãm đang được cập nhật.
        </div>
      )}

      {/* Atelier 3D Experience */}
      <Hero3DExhibitionSection
        onOpenBooking={handleOpenBookingWithConcept}
        artworks={atelierArtworks}
      />

      {/* Bottom Booking Invitation */}
      <section
        style={{
          padding: '4rem 1.5rem',
          textAlign: 'center',
          backgroundColor: '#15100E',
          borderTop: '1px solid rgba(198, 164, 95, 0.2)',
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <span
            style={{
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#C6A45F',
              display: 'block',
              marginBottom: '0.75rem',
            }}
          >
            TRẢI NGHIỆM TRỰC TIẾP TẠI STUDIO
          </span>
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, serif)',
              fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)',
              fontWeight: 500,
              color: '#FAF8F3',
              marginBottom: '1rem',
            }}
          >
            Hiện thực hóa bộ ảnh của riêng bạn
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: 'rgba(250, 248, 243, 0.75)',
              marginBottom: '2rem',
            }}
          >
            Maison MIPA chào đón bạn đến trải nghiệm không gian ánh sáng tự nhiên và dịch vụ chụp ảnh trọn gói tại Sài Gòn.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => handleOpenBookingWithConcept()}
              className="public-btn-primary"
              style={{ padding: '0.85rem 2.25rem', fontSize: '0.95rem' }}
            >
              Đặt lịch chụp ngay
            </button>
            <Link
              to="/concept"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.85rem 2rem',
                fontSize: '0.95rem',
                color: '#FAF8F3',
                backgroundColor: 'transparent',
                border: '1px solid rgba(250, 248, 243, 0.3)',
                borderRadius: '4px',
                textDecoration: 'none',
                transition: 'border-color 0.2s ease',
              }}
            >
              Khám phá danh mục concept
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AtelierPage;
