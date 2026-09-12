// ==============================================================================
// Maison MIPA Memories — French Editorial Photography Hero Section
// Art Direction: Photography-first, cinematic arrival, restrained pointer depth,
// line-by-line typographic reveal, subtle scroll exit.
// ==============================================================================
import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

interface HeroSectionProps {
  onOpenBooking: () => void;
  onExplorePackages?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const textColRef = useRef<HTMLDivElement>(null);
  const imageFrameRef = useRef<HTMLDivElement>(null);
  const heroImageRef = useRef<HTMLImageElement>(null);

  const overlineRef = useRef<HTMLSpanElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const ctaGroupRef = useRef<HTMLDivElement>(null);

  // Cinematic Arrival & Scroll Exit Orchestration
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current) return;

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if (isMobile) {
      if (heroImageRef.current) gsap.to(heroImageRef.current, { scale: 1, opacity: 1, duration: 0.25 });
      if (overlineRef.current) gsap.to(overlineRef.current, { opacity: 1, y: 0, duration: 0.25 });
      const headingLines = [line1Ref.current, line2Ref.current].filter(Boolean);
      if (headingLines.length > 0) gsap.to(headingLines, { yPercent: 0, opacity: 1, duration: 0.25 });
      if (leadRef.current) gsap.to(leadRef.current, { opacity: 1, y: 0, duration: 0.25 });
      if (ctaGroupRef.current) gsap.to(ctaGroupRef.current, { opacity: 1, y: 0, duration: 0.25 });
      return;
    }

    const tl = gsap.timeline({ defaults: { ease: MOTION_CONFIG.ease.cinematic } });

    // 1. Hero image starts slightly enlarged (scale 1.06) and settles smoothly to 1.0
    if (heroImageRef.current) {
      tl.fromTo(
        heroImageRef.current,
        { scale: 1.06, opacity: 0.88 },
        { scale: 1.0, opacity: 1, duration: MOTION_CONFIG.duration.heroSettle, ease: 'power2.out' },
        0
      );
    }

    // 2. Overline fades in
    if (overlineRef.current) {
      tl.fromTo(
        overlineRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.5 },
        0.15
      );
    }

    // 3. H1 reveals line-by-line from overflow:hidden wrappers
    const headingLines = [line1Ref.current, line2Ref.current].filter(Boolean);
    if (headingLines.length > 0) {
      tl.fromTo(
        headingLines,
        { yPercent: 105, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.75, stagger: 0.1 },
        0.25
      );
    }

    // 4. Supporting text follows
    if (leadRef.current) {
      tl.fromTo(
        leadRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.6 },
        0.55
      );
    }

    // 5. CTAs appear last
    if (ctaGroupRef.current) {
      tl.fromTo(
        ctaGroupRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.5 },
        0.75
      );
    }

    // 6. Subtle Scroll Exit Parallax
    if (imageFrameRef.current && textColRef.current) {
      gsap.to(imageFrameRef.current, {
        yPercent: -5,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });

      gsap.to(textColRef.current, {
        yPercent: -10,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }, sectionRef, [prefersReduced]);

  // Subtle pointer depth (Desktop only, fine pointer, non-reduced motion)
  useEffect(() => {
    const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (prefersReduced || !isFinePointer || !sectionRef.current || !imageFrameRef.current) return;

    const frame = imageFrameRef.current;
    const textCol = textColRef.current;

    // Create fast GSAP quickTo setters for 60fps micro-depth
    const xImg = gsap.quickTo(frame, 'x', { duration: 0.5, ease: 'power2.out' });
    const yImg = gsap.quickTo(frame, 'y', { duration: 0.5, ease: 'power2.out' });
    const rotYImg = gsap.quickTo(frame, 'rotationY', { duration: 0.5, ease: 'power2.out' });
    const rotXImg = gsap.quickTo(frame, 'rotationX', { duration: 0.5, ease: 'power2.out' });

    const xTxt = textCol ? gsap.quickTo(textCol, 'x', { duration: 0.6, ease: 'power2.out' }) : null;
    const yTxt = textCol ? gsap.quickTo(textCol, 'y', { duration: 0.6, ease: 'power2.out' }) : null;

    const handlePointerMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth) * 2 - 1; // -1 to +1
      const normY = (e.clientY / innerHeight) * 2 - 1; // -1 to +1

      // Image: ±8px translate, ±1.5deg rotateY, ±1.0deg rotateX
      xImg(normX * MOTION_CONFIG.depth.subtleX);
      yImg(normY * MOTION_CONFIG.depth.subtleY);
      rotYImg(normX * MOTION_CONFIG.depth.tiltRotateY);
      rotXImg(-normY * MOTION_CONFIG.depth.tiltRotateX);

      // Text: ±3px translate
      if (xTxt && yTxt) {
        xTxt(normX * 3);
        yTxt(normY * 2);
      }
    };

    const handlePointerLeave = () => {
      xImg(0);
      yImg(0);
      rotYImg(0);
      rotXImg(0);
      if (xTxt && yTxt) {
        xTxt(0);
        yTxt(0);
      }
    };

    const sec = sectionRef.current;
    sec.addEventListener('mousemove', handlePointerMove, { passive: true });
    sec.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      sec.removeEventListener('mousemove', handlePointerMove);
      sec.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      className="editorial-section cinematic-scene"
      style={{
        paddingTop: 'clamp(2.5rem, 5vw, 4rem)',
        paddingBottom: 'clamp(3rem, 6vw, 5rem)',
        perspective: '1200px',
      }}
    >
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
          {/* Left: Editorial Text Block */}
          <div ref={textColRef} style={{ maxWidth: '540px', willChange: 'transform' }}>
            <span
              ref={overlineRef}
              className="editorial-overline block"
              style={{ opacity: prefersReduced ? 1 : 0 }}
            >
              MAISON MIPA / SAIGON
            </span>

            <h1
              className="editorial-h1"
              style={{ marginBottom: '1.5rem' }}
            >
              <span className="block overflow-hidden">
                <span
                  ref={line1Ref}
                  className="inline-block"
                  style={{ transform: prefersReduced ? 'none' : undefined }}
                >
                  Một nơi để những khoảnh khắc
                </span>
              </span>{' '}
              <span className="block overflow-hidden">
                <span
                  ref={line2Ref}
                  className="inline-block"
                  style={{ transform: prefersReduced ? 'none' : undefined }}
                >
                  được lưu lại thật tự nhiên.
                </span>
              </span>
            </h1>

            <p
              ref={leadRef}
              className="editorial-lead"
              style={{ marginBottom: '2.5rem', opacity: prefersReduced ? 1 : 0 }}
            >
              Không gian ánh sáng dịu nhẹ, tone màu ấm và những buổi chụp thư thái. Chúng tôi ghi lại cảm xúc và vẻ đẹp chân thật của bạn.
            </p>

            {/* Restrained CTAs */}
            <div
              ref={ctaGroupRef}
              style={{
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'center',
                flexWrap: 'wrap',
                opacity: prefersReduced ? 1 : 0,
              }}
            >
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

          {/* Right: Large Editorial Photograph with Subtle 3D Spatial Frame */}
          <div className="editorial-hero-media" style={{ perspective: '1000px' }}>
            <div
              ref={imageFrameRef}
              className="editorial-image-frame cinematic-depth-image"
              data-cursor="XEM"
              onClick={() => navigate('/portfolio')}
              style={{
                borderRadius: '4px',
                border: '1px solid rgba(96, 70, 52, 0.14)',
                boxShadow: 'none',
                maxHeight: '620px',
                overflow: 'hidden',
                transformStyle: 'preserve-3d',
                cursor: 'pointer',
              }}
            >
              <img
                ref={heroImageRef}
                src="/hero.png"
                alt="Maison MIPA Memories — Không gian studio và buổi chụp tự nhiên"
                fetchPriority="high"
                style={{
                  width: '100%',
                  height: '100%',
                  maxHeight: '620px',
                  objectFit: 'cover',
                  display: 'block',
                  willChange: 'transform',
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
