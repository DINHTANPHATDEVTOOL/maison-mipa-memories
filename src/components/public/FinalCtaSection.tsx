// ==============================================================================
// Maison MIPA Memories — Cinematic Closing CTA
// Art Direction: Full-bleed real photograph backdrop, subtle darkroom tint,
// scale settle on scroll, light text fade up, pure Vanilla CSS.
// ==============================================================================
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

interface FinalCtaSectionProps {
  onOpenBooking: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current) return;

    // Image scale settles on scroll
    if (imageRef.current) {
      gsap.fromTo(
        imageRef.current,
        { scale: 1.06 },
        {
          scale: 1.0,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top bottom',
            end: 'bottom bottom',
            scrub: true,
          },
        }
      );
    }

    // Text content fades upward
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: MOTION_CONFIG.duration.slow,
          ease: MOTION_CONFIG.ease.cinematic,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 75%',
            once: true,
          },
        }
      );
    }
  }, sectionRef, [prefersReduced]);

  return (
    <section
      ref={sectionRef}
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        textAlign: 'center',
        paddingTop: 'clamp(5rem, 10vw, 8rem)',
        paddingBottom: 'clamp(5rem, 10vw, 8rem)',
        backgroundColor: '#1F1A17',
      }}
    >
      {/* Full-width Real Studio Photograph */}
      <img
        ref={imageRef}
        src="/hero.png"
        alt="Maison MIPA không gian studio"
        loading="lazy"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.35) contrast(1.05)',
          userSelect: 'none',
          pointerEvents: 'none',
          willChange: 'transform',
          display: 'block',
        }}
      />

      {/* Subtle Darkroom Atmosphere Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          backgroundColor: 'rgba(31, 26, 23, 0.45)',
        }}
      />

      {/* Editorial Content */}
      <div
        ref={contentRef}
        className="editorial-container-narrow"
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '680px',
          color: '#F8F3EB',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        <span
          className="editorial-overline"
          style={{
            color: '#B89B62',
            display: 'block',
            marginBottom: '1rem',
          }}
        >
          MAISON MIPA
        </span>

        <h2
          style={{
            fontFamily: 'var(--editorial-font-heading)',
            fontSize: 'clamp(2rem, 5vw, 3.4rem)',
            fontWeight: 300,
            letterSpacing: '-0.02em',
            color: '#F8F3EB',
            marginBottom: '1.5rem',
            lineHeight: 1.15,
          }}
        >
          Hẹn một buổi chụp cùng Maison MIPA.
        </h2>

        <p
          style={{
            fontSize: 'clamp(0.95rem, 1.3vw, 1.1rem)',
            color: 'rgba(248, 243, 235, 0.8)',
            fontWeight: 300,
            lineHeight: 1.7,
            maxWidth: '560px',
            margin: '0 auto 2.5rem',
          }}
        >
          Chọn dịch vụ, khung giờ và concept phù hợp với bạn. Chúng tôi sẵn sàng đồng hành cùng những khoảnh khắc đáng nhớ.
        </p>

        <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenBooking}
            className="public-btn-primary"
            style={{
              padding: '0.9rem 2.2rem',
              fontSize: '1rem',
              backgroundColor: '#F8F3EB',
              color: '#1F1A17',
              border: 'none',
            }}
          >
            Đặt lịch chụp
          </button>

          <button
            onClick={() => navigate('/portfolio')}
            className="public-btn-secondary"
            style={{
              padding: '0.9rem 2rem',
              fontSize: '1rem',
              borderColor: 'rgba(248, 243, 235, 0.4)',
              color: '#F8F3EB',
            }}
          >
            Xem portfolio
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
