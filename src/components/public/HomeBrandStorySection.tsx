// ==============================================================================
// Maison MIPA Memories — Brand Story & Atelier Space Section
// Authentic studio craft, human tone, discreet link to /atelier.
// Observational brand copy without unsupported historical or unverified claims.
// ==============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

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
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
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
              Những bức ảnh giàu cảm xúc thường bắt nguồn từ những khoảnh khắc đời thường giản dị. Tại Maison MIPA, chúng tôi nâng niu ánh sáng tự nhiên qua từng khung cửa sổ, những cử chỉ thân mật và nụ cười không gượng gạo.
            </p>
            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.7,
                color: '#604634',
                margin: '0 0 2rem 0',
                fontWeight: 300,
              }}
            >
              Mỗi concept và góc ảnh đều hướng tới sự lắng đọng, tạo cảm giác nhẹ nhàng để từng khoảnh khắc được lưu giữ một cách trọn vẹn và tự nhiên nhất.
            </p>

            {/* Subtle Invitation to 3D Atelier */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '4px',
                backgroundColor: '#FFFDF9',
                border: '1px solid rgba(140, 110, 83, 0.25)',
              }}
            >
              <Compass size={18} color="#8C6E53" />
              <div style={{ fontSize: '0.88rem', color: '#29231F' }}>
                Khám phá không gian trải nghiệm trực tuyến:{' '}
                <Link
                  to="/atelier"
                  style={{
                    color: '#8C6E53',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  3D Atelier Maison →
                </Link>
              </div>
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
