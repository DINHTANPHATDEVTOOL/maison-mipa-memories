// ==============================================================================
// Maison MIPA Memories — Brand Story & Atelier Space Section
// Authentic studio craft, human tone, discreet link to /atelier.
// Observational brand copy without unsupported historical or unverified claims.
// ==============================================================================
import React from 'react';
import { Link } from 'react-router-dom';

const BRAND_STUDIO_STORY_ASSET = '/hero.png';

export const HomeBrandStorySection: React.FC = () => {
  return (
    <section
      aria-label="Câu Chuyện Maison MIPA"
      style={{
        padding: 'clamp(4rem, 8vw, 7.5rem) 1.5rem',
        backgroundColor: '#FAF8F3',
        borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2.5rem, 5vw, 5rem)',
            alignItems: 'center',
          }}
        >
          {/* Content Left */}
          <div style={{ maxWidth: '580px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.76rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              VỀ MAISON MIPA
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 1.25rem 0',
              }}
            >
              Ánh sáng tự nhiên và sự chân thật trong từng khung hình
            </h2>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.7,
                color: '#604634',
                margin: '0 0 1rem 0',
                fontWeight: 300,
              }}
            >
              Ánh sáng tự nhiên qua từng khung cửa sổ, những cử chỉ thân mật và nụ cười không gượng gạo là những gì chúng tôi trân trọng nhất.
            </p>
            <p
              style={{
                fontSize: '0.96rem',
                lineHeight: 1.7,
                color: '#604634',
                margin: '0 0 1.5rem 0',
                fontWeight: 300,
              }}
            >
              Không gian studio được thiết kế mộc mạc và tĩnh lặng, giúp bạn cảm thấy thư thái như đang ở trong chính căn phòng của mình.
            </p>

            {/* Subtle Invitation to 3D Atelier */}
            <div style={{ marginTop: '1.25rem' }}>
              <Link
                to="/atelier"
                className="vc-text-link"
                style={{ fontSize: '0.92rem' }}
              >
                Khám phá Atelier 3D →
              </Link>
            </div>
          </div>

          {/* Visual Right */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4/5',
              borderRadius: '2px',
              overflow: 'hidden',
              backgroundColor: '#EDE7DC',
            }}
          >
            <img
              src={BRAND_STUDIO_STORY_ASSET}
              alt="Không gian ánh sáng tại Maison MIPA"
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeBrandStorySection;
