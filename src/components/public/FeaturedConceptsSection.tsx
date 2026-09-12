// ==============================================================================
// Maison MIPA Memories — Featured Work & Concepts (Tactile 3D Photo Composition)
// Art Direction: Asymmetrical photography composition, subtle spatial depth,
// restrained photo stack settling, no generic cards.
// ==============================================================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPublicConcepts } from '../../services/portfolioService';
import type { Concept } from '../../types';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

interface FeaturedConceptsSectionProps {
  onOpenBooking?: (conceptSlug?: string) => void;
}

export const FeaturedConceptsSection: React.FC<FeaturedConceptsSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const prefersReduced = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const primaryFrameRef = useRef<HTMLDivElement>(null);
  const secondaryFramesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadConcepts() {
      try {
        const data = await getPublicConcepts();
        if (mounted) {
          setConcepts(data.filter((c) => c.bookable).slice(0, 3));
        }
      } catch (err) {
        console.error('Lỗi tải concepts:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadConcepts();
    return () => {
      mounted = false;
    };
  }, []);

  // 3D Photo Composition Entry Choreography
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || concepts.length === 0) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 78%',
        once: true,
      },
    });

    // Primary image rises from slight Z-depth
    if (primaryFrameRef.current) {
      tl.fromTo(
        primaryFrameRef.current,
        {
          y: 50,
          rotationY: -2,
          scale: 0.97,
          opacity: 0.85,
        },
        {
          y: 0,
          rotationY: 0,
          scale: 1,
          opacity: 1,
          duration: MOTION_CONFIG.duration.slow,
          ease: MOTION_CONFIG.ease.cinematic,
        },
        0
      );
    }

    // Secondary stacked photos enter with staggered offsets and subtle rotation then flatten
    if (secondaryFramesRef.current.length > 0) {
      tl.fromTo(
        secondaryFramesRef.current,
        {
          y: (i) => (i === 0 ? 70 : 90),
          rotation: (i) => (i === 0 ? 1.2 : -1.2),
          opacity: 0.85,
        },
        {
          y: 0,
          rotation: 0,
          opacity: 1,
          duration: MOTION_CONFIG.duration.slow,
          stagger: 0.15,
          ease: MOTION_CONFIG.ease.cinematic,
        },
        0.15
      );
    }
  }, sectionRef, [prefersReduced, concepts]);

  if (isLoading || concepts.length === 0) return null;

  const handleConceptClick = (conceptSlug: string) => {
    if (onOpenBooking) {
      onOpenBooking(conceptSlug);
    } else {
      navigate(`/booking?concept=${conceptSlug}`);
    }
  };

  const primaryConcept = concepts[0];
  const secondaryConcepts = concepts.slice(1, 3);

  return (
    <section
      ref={sectionRef}
      className="editorial-section cinematic-scene"
      style={{
        backgroundColor: 'var(--editorial-bg)',
        perspective: '1200px',
      }}
    >
      <div className="editorial-container">
        {/* Editorial Section Header */}
        <div style={{ marginBottom: '3.5rem', maxWidth: '640px' }}>
          <span className="editorial-overline">BỘ SƯU TẬP & BỐI CẢNH</span>
          <h2 className="editorial-h2">Bộ sưu tập concept chọn lọc</h2>
          <p className="editorial-copy">
            Mỗi concept được kiến tạo riêng biệt với bảng màu, ánh sáng và góc chụp mang đậm tinh thần tự nhiên.
          </p>
        </div>

        {/* Asymmetrical Editorial Grid */}
        <div className="editorial-concept-grid">
          {/* Large Hero Concept (Left) */}
          {primaryConcept && (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                ref={primaryFrameRef}
                className="editorial-image-frame group cinematic-depth-image"
                data-cursor="XEM"
                style={{
                  height: '480px',
                  cursor: 'pointer',
                  border: '1px solid rgba(96, 70, 52, 0.12)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  transformStyle: 'preserve-3d',
                }}
                onClick={() => handleConceptClick(primaryConcept.slug)}
              >
                <img
                  src={primaryConcept.coverPhotoUrl || '/hero.png'}
                  alt={primaryConcept.name}
                  loading="lazy"
                  className="transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div
                style={{
                  marginTop: '1.25rem',
                  transition: 'transform 0.3s ease',
                }}
                className="group-hover:-translate-y-0.5"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <h3 className="editorial-h3" style={{ margin: 0 }}>
                    {primaryConcept.name}
                  </h3>
                  <button
                    onClick={() => handleConceptClick(primaryConcept.slug)}
                    className="public-btn-link"
                  >
                    Đặt concept này →
                  </button>
                </div>
                <p className="editorial-copy" style={{ marginTop: '0.5rem', maxWidth: '520px' }}>
                  {primaryConcept.description}
                </p>
              </div>
            </div>
          )}

          {/* Secondary Stacked Concepts (Right) */}
          <div className="editorial-concept-subgrid">
            {secondaryConcepts.map((concept, idx) => (
              <div key={concept.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  ref={(el) => {
                    if (el) secondaryFramesRef.current[idx] = el;
                  }}
                  className="editorial-image-frame group cinematic-depth-image"
                  data-cursor="XEM"
                  style={{
                    height: '215px',
                    cursor: 'pointer',
                    border: '1px solid rgba(96, 70, 52, 0.12)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    transformStyle: 'preserve-3d',
                  }}
                  onClick={() => handleConceptClick(concept.slug)}
                >
                  <img
                    src={concept.coverPhotoUrl || '/studio.png'}
                    alt={concept.name}
                    loading="lazy"
                    className="transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ marginTop: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <h4
                      style={{
                        fontFamily: 'var(--editorial-font-heading)',
                        fontSize: '1.35rem',
                        color: 'var(--editorial-brown)',
                        margin: 0,
                        fontWeight: 600,
                      }}
                    >
                      {concept.name}
                    </h4>
                    <button
                      onClick={() => handleConceptClick(concept.slug)}
                      className="public-btn-link"
                      style={{ fontSize: '0.85rem' }}
                    >
                      Xem concept →
                    </button>
                  </div>
                  <p className="editorial-caption" style={{ marginTop: '0.35rem' }}>
                    {concept.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet link to full portfolio */}
        <div style={{ marginTop: '3.5rem', textAlign: 'left', borderTop: '1px solid var(--editorial-divider-subtle)', paddingTop: '1.5rem' }}>
          <Link to="/portfolio" className="public-btn-link" style={{ fontSize: '1rem' }}>
            Xem toàn bộ bộ sưu tập ảnh Maison MIPA →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedConceptsSection;
