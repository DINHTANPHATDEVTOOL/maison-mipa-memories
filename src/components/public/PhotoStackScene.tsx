// ==============================================================================
// Maison MIPA Memories — Signature Moment #3: Physical Photo Stack Separation
// Art Direction: Physical archival photographic prints spread across an atelier table.
// Starts stacked with subtle tactile rotations (-3°, 2°, -1°, 3°), then on scroll
// smoothly separates across the stage into distinct quadrants.
// ==============================================================================
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

interface StackPrint {
  id: string;
  title: string;
  annotation: string;
  imageUrl: string;
  slug: string;
}

const STACK_PRINTS: StackPrint[] = [
  {
    id: 'p1',
    title: 'Parisian Romance — Moment I',
    annotation: '01 / Épreuve d’artiste — North Light',
    imageUrl: '/hero.png',
    slug: 'parisian-romance',
  },
  {
    id: 'p2',
    title: 'Vintage Loft & Warmth',
    annotation: '02 / Atelier Saigon — Oak Tone',
    imageUrl: '/studio.png',
    slug: 'vintage-cinematic',
  },
  {
    id: 'p3',
    title: 'French Haute Couture',
    annotation: '03 / Tirage argentique — Studio B',
    imageUrl: '/hero.png',
    slug: 'french-haute-couture',
  },
  {
    id: 'p4',
    title: 'Daylight Monologue',
    annotation: '04 / Épreuve d’artiste — Archive 2026',
    imageUrl: '/studio.png',
    slug: 'parisian-romance',
  },
];

export const PhotoStackScene: React.FC = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const prefersReduced = useReducedMotion();

  // Signature Moment #3: Physical Stack Separation on Scroll
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || !stageRef.current) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop) {
      // Mobile: flat natural layout
      cardsRef.current.forEach((card) => {
        if (card) gsap.set(card, { x: 0, y: 0, rotation: 0, opacity: 1 });
      });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 75%',
        end: 'bottom 40%',
        scrub: 1.2,
      },
    });

    // Initial Stack Configuration (Organic stacked prints)
    const initialRotations = MOTION_CONFIG.stackAngles;
    const initialOffsets = [
      { x: -15, y: -10 },
      { x: 12, y: -6 },
      { x: -8, y: 12 },
      { x: 6, y: 4 },
    ];

    // Target Separated Coordinates (Spread across the table)
    const targets = [
      { x: -260, y: -130, rot: -1.2 }, // Top-Left
      { x: 260, y: -130, rot: 1.5 },   // Top-Right
      { x: -260, y: 140, rot: -0.8 },  // Bottom-Left
      { x: 260, y: 140, rot: 1.0 },   // Bottom-Right
    ];

    cardsRef.current.forEach((card, idx) => {
      if (!card) return;
      const initOffset = initialOffsets[idx] || { x: 0, y: 0 };
      const target = targets[idx];

      tl.fromTo(
        card,
        {
          x: initOffset.x,
          y: initOffset.y,
          rotation: initialRotations[idx] || 0,
          opacity: 0.9,
        },
        {
          x: target.x,
          y: target.y,
          rotation: target.rot,
          opacity: 1,
          ease: 'power2.out',
        },
        0
      );
    });
  }, sectionRef, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="editorial-section cinematic-scene"
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--editorial-paper)',
        paddingTop: 'clamp(4rem, 7vw, 6rem)',
        paddingBottom: 'clamp(5rem, 8vw, 7rem)',
        borderTop: '1px solid var(--editorial-divider-subtle)',
        borderBottom: '1px solid var(--editorial-divider-subtle)',
      }}
    >
      <div className="editorial-container">
        {/* Section Header */}
        <div style={{ maxWidth: '640px', marginBottom: '3.5rem' }}>
          <span className="editorial-overline">BẢN IN THỦ CÔNG & ATELIER PRINTS</span>
          <h2 className="editorial-h2" style={{ marginBottom: '1rem' }}>
            Những bản in trải rộng trên bàn làm việc
          </h2>
          <p className="editorial-copy">
            Mỗi khung hình được in thử nghiệm trên chất liệu giấy mỹ thuật mộc để kiểm tra sắc độ ánh sáng tự nhiên và độ chuyển màu trước khi hoàn thiện.
          </p>
        </div>

        {/* Physical Photo Stack Stage */}
        <div
          ref={stageRef}
          className="editorial-stack-stage"
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '620px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {STACK_PRINTS.map((print, idx) => (
            <div
              key={print.id}
              ref={(el) => {
                if (el) cardsRef.current[idx] = el;
              }}
              data-cursor="XEM"
              onClick={() => navigate(`/portfolio/${print.slug}`)}
              className="editorial-print-card group"
              style={{
                position: 'absolute',
                width: 'clamp(260px, 28vw, 360px)',
                backgroundColor: '#FFFFFF',
                padding: '10px 10px 24px 10px',
                borderRadius: '2px',
                boxShadow: '0 8px 24px rgba(33, 26, 21, 0.07)',
                border: '1px solid rgba(96, 70, 52, 0.12)',
                cursor: 'pointer',
                zIndex: idx + 1,
                transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                willChange: 'transform',
              }}
            >
              {/* Photo Area */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '240px',
                  overflow: 'hidden',
                  backgroundColor: '#241D1A',
                }}
              >
                <img
                  src={print.imageUrl}
                  alt={print.title}
                  loading="lazy"
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>

              {/* Physical Print Annotation Footer */}
              <div style={{ marginTop: '12px', padding: '0 4px' }}>
                <div
                  style={{
                    fontFamily: 'var(--editorial-font-heading)',
                    fontSize: '1.05rem',
                    color: 'var(--editorial-brown)',
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}
                >
                  {print.title}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--editorial-text-secondary)',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                  }}
                >
                  {print.annotation}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .editorial-stack-stage {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)) !important;
            gap: 2rem !important;
            min-height: auto !important;
          }
          .editorial-print-card {
            position: relative !important;
            width: 100% !important;
            transform: none !important;
          }
        }
      `}</style>
    </section>
  );
};

export default PhotoStackScene;
