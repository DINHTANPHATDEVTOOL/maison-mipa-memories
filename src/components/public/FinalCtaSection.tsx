// ==============================================================================
// Maison MIPA Memories — Signature Moment #7: Final CTA "Enter the Frame"
// Art Direction: Narrative symmetry with Hero. Starts as a framed photograph surrounded
// by quiet darkroom space, then on scroll expands to fullscreen (100vw x 100vh) as the
// centered invitation copy and booking button reveal themselves.
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
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const ctaBtnRef = useRef<HTMLDivElement>(null);

  // Signature Moment #7: Enter the Frame Photographic Expansion
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || !frameRef.current) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop) {
      if (imageRef.current) gsap.set(imageRef.current, { scale: 1 });
      if (contentRef.current) gsap.set(contentRef.current, { opacity: 1, y: 0 });
      if (ctaBtnRef.current) gsap.set(ctaBtnRef.current, { opacity: 1, y: 0 });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 85%',
        end: 'bottom bottom',
        scrub: 0.8,
      },
    });

    // 1. Photo frame expands from inset (~72vw x ~65vh) to full bleed (100vw x 100vh)
    tl.fromTo(
      frameRef.current,
      {
        scale: 0.82,
        borderRadius: '8px',
      },
      {
        scale: 1.0,
        borderRadius: '0px',
        ease: 'power2.out',
      },
      0
    );

    // Inner image micro scale settle: 1.06 -> 1.0
    if (imageRef.current) {
      tl.fromTo(
        imageRef.current,
        { scale: 1.06 },
        { scale: 1.0, ease: 'none' },
        0
      );
    }

    // 2. Centered Invitation Copy Fades In
    if (contentRef.current) {
      tl.fromTo(
        contentRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, ease: 'power2.out' },
        0.2
      );
    }

    // 3. CTA Buttons Appear when expansion reaches full
    if (ctaBtnRef.current) {
      tl.fromTo(
        ctaBtnRef.current,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, ease: 'power2.out' },
        0.5
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
        overflow: 'hidden',
        backgroundColor: '#171310',
        padding: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          minHeight: 'clamp(520px, 85vh, 850px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Expanding Photographic Frame */}
        <div
          ref={frameRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            willChange: 'transform, border-radius',
          }}
        >
          <img
            ref={imageRef}
            src="/hero.png"
            alt="Maison MIPA không gian studio"
            loading="lazy"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              filter: 'brightness(0.55)',
              willChange: 'transform',
            }}
          />

          {/* Deep Darkroom Vignette */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(ellipse at center, rgba(23, 19, 16, 0.4) 0%, rgba(23, 19, 16, 0.88) 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* Centered Editorial Content */}
        <div
          ref={contentRef}
          className="editorial-container"
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            maxWidth: '680px',
            color: '#FFFDF9',
            padding: ' clamp(3rem, 6vw, 5rem) 1.5rem',
            willChange: 'transform, opacity',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '1rem',
              color: '#EFE6C9',
              fontWeight: 500,
            }}
          >
            MAISON MIPA / SÀI GÒN
          </span>

          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading)',
              fontSize: 'clamp(2.4rem, 5.5vw, 4rem)',
              color: '#FFFDF9',
              lineHeight: 1.15,
              fontWeight: 300,
              marginBottom: '1.25rem',
            }}
          >
            Hẹn một buổi chụp cùng Maison MIPA.
          </h2>

          <p
            style={{
              color: 'rgba(255, 253, 249, 0.85)',
              fontSize: 'clamp(1rem, 1.3vw, 1.15rem)',
              lineHeight: 1.7,
              marginBottom: '2.5rem',
              fontWeight: 300,
            }}
          >
            Chọn dịch vụ, khung giờ và concept phù hợp với bạn. Chúng tôi sẵn sàng đồng hành cùng những khoảnh khắc đáng nhớ.
          </p>

          <div
            ref={ctaBtnRef}
            style={{
              display: 'flex',
              gap: '1.25rem',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap',
              willChange: 'transform, opacity',
            }}
          >
            <button
              onClick={onOpenBooking}
              className="public-btn-primary"
              style={{
                padding: '0.95rem 2.5rem',
                fontSize: '1.05rem',
                backgroundColor: '#B89B62',
                color: '#171310',
                border: 'none',
                fontWeight: 600,
              }}
            >
              Đặt lịch chụp
            </button>

            <button
              onClick={() => navigate('/portfolio')}
              className="public-btn-secondary"
              style={{
                padding: '0.95rem 2.2rem',
                fontSize: '1.05rem',
                borderColor: 'rgba(255, 253, 249, 0.4)',
                color: '#FFFDF9',
                backgroundColor: 'transparent',
              }}
            >
              Xem portfolio
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
