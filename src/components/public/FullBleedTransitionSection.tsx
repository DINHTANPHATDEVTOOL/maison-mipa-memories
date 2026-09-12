import React, { useRef } from 'react';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';

/**
 * Section 05 — Full-Bleed Cinematic Visual Rhythm Transition
 * Placed between Selected Works and Services.
 * Full-viewport photographic moment that unmasks and settles on scroll.
 * Uses pure Vanilla CSS for layout integrity.
 */
export const FullBleedTransitionSection: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || !containerRef.current || !imageRef.current) return;

    // Expand clip-path as user scrolls into the section
    gsap.fromTo(
      containerRef.current,
      {
        clipPath: 'inset(6% 5% 6% 5%)',
      },
      {
        clipPath: 'inset(0% 0% 0% 0%)',
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 80%',
          end: 'center 45%',
          scrub: 0.8,
        },
      }
    );

    // Subtle scale settle from 1.08 down to 1.0
    gsap.fromTo(
      imageRef.current,
      {
        scale: 1.08,
      },
      {
        scale: 1.0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 85%',
          end: 'bottom 20%',
          scrub: 0.8,
        },
      }
    );

    // Subtle caption entrance
    if (captionRef.current) {
      gsap.fromTo(
        captionRef.current,
        {
          opacity: 0,
          y: 16,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 60%',
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
        height: 'clamp(420px, 65vh, 720px)',
        margin: 'clamp(2.5rem, 5vw, 5rem) 0',
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          clipPath: prefersReduced ? 'inset(0% 0% 0% 0%)' : undefined,
        }}
      >
        <img
          ref={imageRef}
          src="/studio.png"
          alt="Không gian ánh sáng tự nhiên tại Maison MIPA Studio"
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'block',
            transformOrigin: 'center center',
            filter: 'brightness(0.92) contrast(1.02)',
          }}
        />

        {/* Restrained visual tint */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            background: 'linear-gradient(to top, rgba(31, 26, 23, 0.45) 0%, transparent 45%)',
          }}
        />

        {/* Minimal editorial caption */}
        <div
          ref={captionRef}
          style={{
            position: 'absolute',
            bottom: 'clamp(1.5rem, 4vw, 2.5rem)',
            left: 'clamp(1.5rem, 5vw, 3.5rem)',
            zIndex: 10,
            color: '#F8F3EB',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              fontSize: '11px',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              fontWeight: 500,
              display: 'block',
              opacity: 0.75,
            }}
          >
            Maison MIPA / Atelier & Studio
          </span>
          <p
            style={{
              fontFamily: 'var(--editorial-font-heading)',
              fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)',
              fontStyle: 'italic',
              fontWeight: 300,
              marginTop: '0.35rem',
              color: 'rgba(248, 243, 235, 0.9)',
            }}
          >
            Nơi ánh sáng tự nhiên định hình từng khuôn hình.
          </p>
        </div>
      </div>
    </section>
  );
};

export default FullBleedTransitionSection;
