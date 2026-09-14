// ==============================================================================
// Maison MIPA Memories — Visual Commerce Hero (Photography-First)
// Art Direction: Restrained, luxury editorial photography occupying 75–85% visual field.
// Zero WebGL / 3D dependencies; pure high-fidelity photography, subtle typography reveal.
// ==============================================================================
import React, { useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { ArrowRight, Calendar } from 'lucide-react';
import { gsap } from 'gsap';

// Authoritative static brand hero asset approved for Maison MIPA.
// Used exclusively as the official default hero photography; never substituted with random concepts.
export const BRAND_HERO_ASSET = '/hero.png';

interface VisualCommerceHeroProps {
  onOpenBooking: () => void;
  heroImageUrl?: string;
  conceptSlug?: string;
}

export const VisualCommerceHero: React.FC<VisualCommerceHeroProps> = ({
  onOpenBooking,
  heroImageUrl = BRAND_HERO_ASSET,
  conceptSlug,
}) => {
  const navigate = useNavigate();
  const prefersReduced = useReducedMotion();

  const heroRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const leadRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Subtle restrained entrance: image scale 1.03 -> 1.0, text reveal
  useEffect(() => {
    if (prefersReduced || !heroRef.current) return;

    const ctx = gsap.context(() => {
      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { scale: 1.03, opacity: 0.92 },
          { scale: 1.0, opacity: 1, duration: 1.6, ease: 'power2.out' }
        );
      }

      const elements = [
        eyebrowRef.current,
        titleRef.current,
        leadRef.current,
        actionsRef.current,
      ].filter(Boolean);

      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.12,
            ease: 'power3.out',
            delay: 0.2,
          }
        );
      }
    }, heroRef);

    return () => ctx.revert();
  }, [prefersReduced]);

  const handleBooking = () => {
    if (conceptSlug) {
      navigate(`/booking?concept=${conceptSlug}`);
    } else {
      onOpenBooking();
    }
  };

  return (
    <section
      ref={heroRef}
      aria-label="Maison MIPA Memories — Trang chủ"
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'clamp(540px, 90vh, 95vh)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        overflow: 'hidden',
        backgroundColor: '#1E1916',
      }}
      className="mipa-visual-commerce-hero"
    >
      {/* Background Full-bleed Photograph */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          overflow: 'hidden',
        }}
      >
        <img
          ref={imageRef}
          src={heroImageUrl}
          alt="Maison MIPA Memories — Nhiếp ảnh nghệ thuật phong cách Pháp"
          fetchPriority="high"
          decoding="async"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 40%',
            display: 'block',
            transformOrigin: 'center center',
          }}
        />

        {/* Cinematic Dual Gradient Mask for High Text Legibility & Warm Paper Feel */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(to top, rgba(26, 20, 17, 0.88) 0%, rgba(26, 20, 17, 0.45) 45%, rgba(26, 20, 17, 0.15) 100%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 30% 80%, rgba(26, 20, 17, 0.6) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Restrained Typographic Content Container */}
      <div
        ref={contentRef}
        className="mipa-container"
        style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1350px',
          margin: '0 auto',
          padding: 'clamp(2.5rem, 6vw, 5rem) 1.5rem',
          width: '100%',
        }}
      >
        <div style={{ maxWidth: '680px' }}>
          {/* Headline with Brand Eyebrow */}
          <h1
            ref={titleRef}
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: 'clamp(2.35rem, 5.5vw, 4.25rem)',
              lineHeight: 1.1,
              fontWeight: 500,
              color: '#FFFDF9',
              margin: '0 0 1.25rem 0',
              letterSpacing: '-0.01em',
              textWrap: 'balance',
            }}
          >
            <span
              ref={eyebrowRef}
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: '#D4AF37',
                fontWeight: 600,
                marginBottom: '0.85rem',
                fontFamily: 'var(--editorial-font-body, "Be Vietnam Pro", sans-serif)',
              }}
            >
              MAISON MIPA MEMORIES
            </span>
            Những câu chuyện được giữ lại bằng ánh sáng.
          </h1>

          {/* Supporting Line */}
          <p
            ref={leadRef}
            style={{
              fontFamily: 'var(--editorial-font-body, "Be Vietnam Pro", sans-serif)',
              fontSize: 'clamp(0.95rem, 1.8vw, 1.15rem)',
              lineHeight: 1.6,
              color: 'rgba(255, 253, 249, 0.82)',
              margin: '0 0 2rem 0',
              maxWidth: '560px',
              fontWeight: 300,
            }}
          >
            Studio nhiếp ảnh phong cách Pháp ấm áp và tinh tế tại Sài Gòn. Lưu giữ trọn vẹn cảm xúc chân thật qua từng khung hình.
          </p>

          {/* Two Clear CTAs */}
          <div
            ref={actionsRef}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/concept"
              className="public-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.85rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textDecoration: 'none',
                backgroundColor: '#FAF8F3',
                color: '#29231F',
                borderRadius: '4px',
                border: '1px solid #FAF8F3',
                transition: 'all 0.25s ease',
              }}
            >
              Khám phá concept <ArrowRight size={15} />
            </Link>

            <button
              onClick={handleBooking}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.85rem 1.85rem',
                fontSize: '0.92rem',
                fontWeight: 500,
                letterSpacing: '0.04em',
                backgroundColor: 'rgba(255, 253, 249, 0.12)',
                color: '#FFFDF9',
                border: '1px solid rgba(255, 253, 249, 0.35)',
                borderRadius: '4px',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.25s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 253, 249, 0.22)';
                e.currentTarget.style.borderColor = '#FFFDF9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 253, 249, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(255, 253, 249, 0.35)';
              }}
            >
              <Calendar size={15} /> Đặt lịch chụp
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VisualCommerceHero;
