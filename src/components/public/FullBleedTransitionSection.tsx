// ==============================================================================
// Maison MIPA Memories — Signature Moment #5: Film Gate & Moving Matte Transition
// Art Direction: Analog film gate / moving archival matte sweep unveiling a physical print.
// As user scrolls, a darkroom matte sweeps across (translateX: 0 -> 100%) with a subtle
// warm exposure shimmer (<90ms), revealing the underlying full-bleed photograph as it
// settles from scale 1.06 to 1.0.
// ==============================================================================
import React, { useRef } from 'react';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

export const FullBleedTransitionSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const matteRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  // Signature Moment #5: Film Gate Sweep & Matte Unveiling
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || !matteRef.current || !imageRef.current) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop) {
      // Mobile: clean scale settle without heavy sweep
      gsap.fromTo(
        imageRef.current,
        { scale: 1.05 },
        {
          scale: 1.0,
          ease: 'none',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 85%',
            end: 'bottom 20%',
            scrub: true,
          },
        }
      );
      if (matteRef.current) gsap.set(matteRef.current, { display: 'none' });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 75%',
        end: 'center 35%',
        scrub: 1.0,
      },
    });

    // 1. Moving Matte Sweeps Across (translateX: 0 -> 100%)
    tl.fromTo(
      matteRef.current,
      { xPercent: 0 },
      {
        xPercent: 102,
        ease: 'power2.inOut',
      },
      0
    );

    // 2. Micro Exposure Shimmer (Warm light flash: 0 -> 0.12 -> 0)
    if (flashRef.current) {
      tl.fromTo(
        flashRef.current,
        { opacity: 0 },
        { opacity: 0.12, duration: 0.15, ease: 'power1.in' },
        0.2
      );
      tl.to(
        flashRef.current,
        { opacity: 0, duration: 0.2, ease: 'power1.out' },
        0.35
      );
    }

    // 3. Revealed Photograph Settles from Scale 1.06 to 1.0
    tl.fromTo(
      imageRef.current,
      { scale: 1.06 },
      {
        scale: 1.0,
        ease: 'power2.out',
      },
      0.15
    );

    // 4. Caption reveals smoothly
    if (captionRef.current) {
      tl.fromTo(
        captionRef.current,
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
        height: 'clamp(460px, 70vh, 780px)',
        margin: 'clamp(3rem, 6vw, 6rem) 0',
        backgroundColor: '#171310',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Underlying Full-Bleed Photograph */}
        <img
          ref={imageRef}
          src="/studio.png"
          alt="Không gian ánh sáng tự nhiên tại Maison MIPA Studio"
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            willChange: 'transform',
          }}
        />

        {/* Subtle Warm Contrast Tint */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(23, 19, 16, 0.7) 0%, rgba(23, 19, 16, 0.15) 50%, rgba(23, 19, 16, 0.4) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Shutter Exposure Flash Overlay */}
        <div
          ref={flashRef}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#FFFDF6',
            opacity: 0,
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />

        {/* Moving Darkroom Film Gate / Editorial Matte */}
        <div
          ref={matteRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#201A16',
            zIndex: 4,
            pointerEvents: 'none',
            borderRight: '2px solid rgba(198, 164, 95, 0.3)',
            display: prefersReduced ? 'none' : 'block',
            willChange: 'transform',
          }}
        />

        {/* Minimal Editorial Caption (Visual Rhythm only — no button/card) */}
        <div
          ref={captionRef}
          style={{
            position: 'absolute',
            bottom: 'clamp(2rem, 5vw, 3.5rem)',
            left: 'clamp(1.5rem, 5vw, 4rem)',
            zIndex: 5,
            color: '#FFFDF9',
            maxWidth: '520px',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            opacity: prefersReduced ? 1 : 0,
          }}
        >
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.4rem',
              color: '#EFE6C9',
              fontWeight: 500,
            }}
          >
            02 / LE TEMPS SUSPENDU — SAIGON ATELIER
          </span>
          <p
            style={{
              fontFamily: 'var(--editorial-font-heading)',
              fontSize: 'clamp(1.25rem, 2.5vw, 1.85rem)',
              margin: 0,
              fontWeight: 400,
              lineHeight: 1.3,
            }}
          >
            Nơi ánh sáng tự nhiên định hình từng khuôn hình nguyên bản.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FullBleedTransitionSection;
