import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';

interface ExhibitionFrame {
  id: string;
  title: string;
  subtitle: string;
  dimension: string;
  imageUrl: string;
  collectionSlug: string;
}

const EXHIBITION_FRAMES: ExhibitionFrame[] = [
  {
    id: 'f1',
    title: 'Parisian Romance — Moment II',
    subtitle: 'Ánh sáng cửa sổ hướng Bắc, chất liệu lụa mộc & hoa khô',
    dimension: 'Saigon Studio / Atelier 01',
    imageUrl: '/hero.png',
    collectionSlug: 'parisian-romance',
  },
  {
    id: 'f2',
    title: 'Vintage Loft & Stillness',
    subtitle: 'Sắc nâu sồi tự nhiên, không gian yên tĩnh và chiều sâu ánh sáng',
    dimension: 'Natural Daylight / Studio B',
    imageUrl: '/studio.png',
    collectionSlug: 'vintage-cinematic',
  },
  {
    id: 'f3',
    title: 'French Haute Couture — Monologue',
    subtitle: 'Nét tối giản đương đại, đường nét mềm mại và tinh tế',
    dimension: 'Black & Ochre Archive / 2026',
    imageUrl: '/hero.png',
    collectionSlug: 'french-haute-couture',
  },
];

export const DarkroomExhibitionSection: React.FC = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGsapContext(() => {
    // Only animate horizontal translation on desktop if reduced motion is disabled
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (prefersReduced || !isDesktop || !sectionRef.current || !trackRef.current) return;

    gsap.fromTo(
      trackRef.current,
      {
        x: '0%',
      },
      {
        x: '-22%',
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 75%',
          end: 'bottom 25%',
          scrub: 1,
        },
      }
    );
  }, sectionRef, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        padding: 'clamp(4rem, 8vw, 7rem) 0',
        backgroundColor: 'var(--editorial-darkroom-bg, #1F1A17)',
        color: 'var(--editorial-darkroom-text, #F8F3EB)',
      }}
    >
      <div className="editorial-container" style={{ marginBottom: '3rem' }}>
        <div style={{ maxWidth: '640px' }}>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontWeight: 500,
              display: 'block',
              color: '#8C6E53',
              marginBottom: '0.75rem',
            }}
          >
            KHÔNG GIAN TRIỂN LÃM / DARKROOM
          </span>
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading)',
              fontSize: 'clamp(2rem, 4vw, 3.2rem)',
              fontWeight: 300,
              letterSpacing: '-0.02em',
              color: '#F8F3EB',
              marginBottom: '1rem',
              lineHeight: 1.15,
            }}
          >
            Tĩnh lặng trong từng khuôn hình
          </h2>
          <p
            style={{
              fontSize: 'clamp(0.9rem, 1.2vw, 1.05rem)',
              color: 'rgba(248, 243, 235, 0.7)',
              fontWeight: 300,
              lineHeight: 1.7,
              maxWidth: '560px',
            }}
          >
            Tách biệt khỏi nhịp sống bên ngoài, phòng tối và triển lãm là nơi những câu chuyện chân thật được soi rọi dưới góc nhìn nghệ thuật nhiếp ảnh.
          </p>
        </div>
      </div>

      {/* Exhibition Carousel / Gallery Track */}
      <div style={{ width: '100%', overflow: 'hidden', padding: '0 clamp(1.5rem, 5vw, 3rem)' }}>
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: 'clamp(1.5rem, 3vw, 3rem)',
            flexWrap: 'nowrap',
            paddingBottom: '1.5rem',
            willChange: 'transform',
          }}
        >
          {EXHIBITION_FRAMES.map((frame) => (
            <div
              key={frame.id}
              data-cursor="XEM"
              onClick={() => navigate(`/portfolio`)}
              className="editorial-darkroom-item"
              style={{
                flexShrink: 0,
                cursor: 'pointer',
                width: 'clamp(280px, 38vw, 480px)',
              }}
            >
              {/* Photo Frame */}
              <div
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: '3px',
                  border: '1px solid rgba(248, 243, 235, 0.15)',
                  backgroundColor: '#171311',
                  height: 'clamp(360px, 50vh, 520px)',
                }}
              >
                <img
                  src={frame.imageUrl}
                  alt={frame.title}
                  loading="lazy"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.95) contrast(1.02)',
                    display: 'block',
                    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.03)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                />
              </div>

              {/* Editorial Frame Details */}
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading)',
                      fontSize: 'clamp(1.1rem, 1.6vw, 1.35rem)',
                      fontWeight: 400,
                      color: '#F8F3EB',
                      letterSpacing: '0.02em',
                      margin: 0,
                    }}
                  >
                    {frame.title}
                  </h3>
                  <span
                    style={{
                      fontSize: '10px',
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color: 'rgba(248, 243, 235, 0.4)',
                      flexShrink: 0,
                    }}
                  >
                    {frame.dimension}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'rgba(248, 243, 235, 0.6)',
                    fontWeight: 300,
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {frame.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DarkroomExhibitionSection;
