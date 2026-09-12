// ==============================================================================
// Maison MIPA Memories — French Editorial Photography Hero Section
// Art Direction: Photography-first, contemporary magazine layout, warm Saigon studio.
// Zero Sparkles, zero pill badges, zero floating cards, zero heavy shadows.
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface HeroSectionProps {
  onOpenBooking: () => void;
  onExplorePackages?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();

  return (
    <section className="editorial-section" style={{ paddingTop: '3.5rem', paddingBottom: '4.5rem' }}>
      <div className="editorial-container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.35fr',
            gap: 'clamp(2.5rem, 5vw, 5rem)',
            alignItems: 'center',
          }}
          className="editorial-hero-grid"
        >
          {/* Left: Compact Editorial Text Block */}
          <div style={{ maxWidth: '540px' }}>
            <span className="editorial-overline">MAISON MIPA / SAIGON</span>

            <h1 className="editorial-h1" style={{ marginBottom: '1.5rem' }}>
              Một nơi để những khoảnh khắc được lưu lại thật tự nhiên.
            </h1>

            <p className="editorial-lead" style={{ marginBottom: '2.5rem' }}>
              Không gian ánh sáng dịu nhẹ, tone màu ấm và những buổi chụp thư thái. Chúng tôi ghi lại cảm xúc và vẻ đẹp chân thật của bạn.
            </p>

            {/* Restrained CTAs */}
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={onOpenBooking}
                className="public-btn-primary"
                style={{ padding: '0.9rem 2.2rem', fontSize: '1rem' }}
              >
                Đặt lịch chụp
              </button>

              <button
                onClick={() => navigate('/portfolio')}
                className="public-btn-secondary"
                style={{ padding: '0.9rem 2rem', fontSize: '1rem' }}
              >
                Xem portfolio
              </button>
            </div>
          </div>

          {/* Right: Very Large Editorial Photograph (No 28px corners, no heavy shadow, no floating badge) */}
          <div className="editorial-hero-media">
            <div
              className="editorial-image-frame"
              style={{
                borderRadius: '4px',
                border: '1px solid rgba(96, 70, 52, 0.14)',
                boxShadow: 'none',
                maxHeight: '620px',
                overflow: 'hidden',
              }}
            >
              <img
                src="/hero.png"
                alt="Maison MIPA Memories — Không gian studio và buổi chụp tự nhiên"
                fetchPriority="high"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '620px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .editorial-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
          .editorial-hero-media {
            order: 2;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
