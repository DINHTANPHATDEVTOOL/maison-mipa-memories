// ==============================================================================
// Maison MIPA Memories — Signature Moment #6: Darkroom Chapter with Depth of Field
// Art Direction: Immersive warm near-black (#171310) gallery room.
// Depth of Field: Background giant phrase moves slow, floating centerpiece photo moves
// faster, stationary minimal caption sits foreground. Followed by curated exhibition frames.
// ==============================================================================
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
  const bgTypographyRef = useRef<HTMLDivElement>(null);
  const floatingPhotoRef = useRef<HTMLDivElement>(null);
  const stationaryCaptionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Signature Moment #6: Depth-of-field Parallax & Darkroom Transition
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop) return;

    // 1. Smooth Background Transition to warm near-black (#171310)
    gsap.fromTo(
      sectionRef.current,
      { backgroundColor: '#231D19' },
      {
        backgroundColor: '#171310',
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          end: 'top 30%',
          scrub: 1,
        },
      }
    );

    // 2. Depth of Field Parallax
    // Layer A (Background text): moves slow (yPercent: -16)
    if (bgTypographyRef.current) {
      gsap.fromTo(
        bgTypographyRef.current,
        { yPercent: 12 },
        {
          yPercent: -16,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.2,
          },
        }
      );
    }

    // Layer B (Floating photo): moves faster (yPercent: -8 to 15)
    if (floatingPhotoRef.current) {
      gsap.fromTo(
        floatingPhotoRef.current,
        { yPercent: -10, scale: 0.98 },
        {
          yPercent: 14,
          scale: 1.01,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 0.8,
          },
        }
      );
    }

    // 3. Lower Exhibition Gallery Horizontal Translation
    if (trackRef.current) {
      gsap.fromTo(
        trackRef.current,
        { x: '0%' },
        {
          x: '-20%',
          ease: 'none',
          scrollTrigger: {
            trigger: trackRef.current,
            start: 'top 85%',
            end: 'bottom 20%',
            scrub: 1,
          },
        }
      );
    }
  }, sectionRef, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="editorial-section cinematic-scene"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        padding: 'clamp(5rem, 9vw, 8rem) 0',
        backgroundColor: '#171310',
        color: '#F8F3EB',
        transition: 'background-color 0.5s ease',
      }}
    >
      <div className="editorial-container" style={{ marginBottom: '2.5rem' }}>
        <div style={{ maxWidth: '640px' }}>
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontWeight: 500,
              display: 'block',
              color: '#B89B62',
              marginBottom: '0.75rem',
            }}
          >
            KHÔNG GIAN TRIỂN LÃM / DARKROOM
          </span>
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading)',
              fontSize: 'clamp(2.2rem, 4.5vw, 3.4rem)',
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

      {/* Signature Moment #6: Floating Centerpiece Stage with Depth-of-Field */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 'clamp(360px, 55vh, 520px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          margin: '2.5rem 0 4rem',
        }}
      >
        {/* Layer 1: Background Giant Ghost Typography (moves slower) */}
        <div
          ref={bgTypographyRef}
          aria-hidden="true"
          style={{
            position: 'absolute',
            whiteSpace: 'nowrap',
            fontSize: 'clamp(4.5rem, 13vw, 11rem)',
            fontFamily: 'var(--editorial-font-heading)',
            color: 'rgba(248, 243, 235, 0.035)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 1,
            willChange: 'transform',
          }}
        >
          KHOẢNH KHẮC NGUYÊN BẢN
        </div>

        {/* Layer 2: Floating Centerpiece Photo Plane (moves faster) */}
        <div
          ref={floatingPhotoRef}
          data-cursor="XEM"
          onClick={() => navigate('/portfolio/parisian-romance')}
          className="group"
          style={{
            position: 'relative',
            zIndex: 2,
            width: 'clamp(300px, 52vw, 700px)',
            height: 'clamp(320px, 50vh, 460px)',
            borderRadius: '3px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.55)',
            cursor: 'pointer',
            willChange: 'transform',
          }}
        >
          <img
            src="/hero.png"
            alt="Maison MIPA Không gian phòng tối triển lãm"
            loading="lazy"
            className="transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>

        {/* Layer 3: Foreground Stationary Caption */}
        <div
          ref={stationaryCaptionRef}
          style={{
            position: 'absolute',
            bottom: '1.5rem',
            right: 'clamp(1.5rem, 8vw, 6rem)',
            zIndex: 3,
            textAlign: 'right',
            color: '#EFE6C9',
            fontSize: '0.72rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}
        >
          <div>03 / ATELIER NOIR</div>
          <div style={{ color: 'rgba(248, 243, 235, 0.5)', fontSize: '0.65rem', marginTop: '3px' }}>
            ARCHIVE 2026 — SAIGON
          </div>
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
              onClick={() => navigate(`/portfolio/${frame.collectionSlug}`)}
              className="group"
              style={{
                flex: '0 0 clamp(280px, 35vw, 440px)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  height: 'clamp(320px, 45vh, 480px)',
                  overflow: 'hidden',
                  borderRadius: '2px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backgroundColor: '#171310',
                }}
              >
                <img
                  src={frame.imageUrl}
                  alt={frame.title}
                  loading="lazy"
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    filter: 'contrast(1.03)',
                  }}
                />
              </div>

              <div style={{ marginTop: '1.2rem' }}>
                <span
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.15em',
                    color: '#8C6E53',
                    textTransform: 'uppercase',
                    display: 'block',
                    marginBottom: '0.35rem',
                  }}
                >
                  {frame.dimension}
                </span>
                <h3
                  style={{
                    fontFamily: 'var(--editorial-font-heading)',
                    fontSize: '1.35rem',
                    color: '#F8F3EB',
                    margin: 0,
                    fontWeight: 500,
                  }}
                >
                  {frame.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.85rem',
                    color: 'rgba(248, 243, 235, 0.65)',
                    marginTop: '0.4rem',
                    lineHeight: 1.5,
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
