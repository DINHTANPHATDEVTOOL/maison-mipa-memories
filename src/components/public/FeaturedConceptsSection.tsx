// ==============================================================================
// Maison MIPA Memories — Signature Moment #2: Selected Works 3D Perspective Entrance
// Art Direction: Genuine perspective scene (perspective: 1400px).
// Photos enter from "behind" the page (Z-depth -280px / -160px / -80px) and settle
// flat into the refined editorial composition as the user scrolls.
// ==============================================================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getConcepts } from '../../services/catalogService';
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
  const secondaryFramesRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let mounted = true;
    async function loadConceptsData() {
      try {
        const data = await getConcepts();
        if (mounted) {
          setConcepts(data.slice(0, 3));
          setIsLoading(false);
        }
      } catch (err) {
        console.warn('Concepts load error:', err);
        if (mounted) setIsLoading(false);
      }
    }
    loadConceptsData();
    return () => {
      mounted = false;
    };
  }, []);

  // Signature Moment #2: 3D Photo Perspective Entrance from Behind the Page
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || concepts.length === 0) return;

    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (!isDesktop) {
      if (primaryFrameRef.current) gsap.set(primaryFrameRef.current, { opacity: 1, y: 0, z: 0, rotationY: 0 });
      secondaryFramesRef.current.forEach((el) => {
        if (el) gsap.set(el, { opacity: 1, y: 0, z: 0, rotationY: 0, x: 0 });
      });
      return;
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top 85%',
        end: 'top 22%',
        scrub: 1.2,
      },
    });

    // Photo A (Primary): Enters from deep Z-depth (-280px) and slight rotationY (-5deg)
    if (primaryFrameRef.current) {
      tl.fromTo(
        primaryFrameRef.current,
        {
          z: -280,
          rotationY: -5,
          y: 60,
          scale: 0.94,
          opacity: 0.7,
        },
        {
          z: 0,
          rotationY: 0,
          y: 0,
          scale: 1,
          opacity: 1,
          ease: 'power2.out',
        },
        0
      );
    }

    // Photo B (Secondary Top): Enters from Z-depth (-160px), offset X (80px), rotationY (3deg)
    if (secondaryFramesRef.current[0]) {
      tl.fromTo(
        secondaryFramesRef.current[0],
        {
          z: -160,
          x: 80,
          rotationY: 3,
          y: 40,
          opacity: 0.75,
        },
        {
          z: 0,
          x: 0,
          rotationY: 0,
          y: 0,
          opacity: 1,
          ease: 'power2.out',
        },
        0.1
      );
    }

    // Photo C (Secondary Bottom): Enters from Z-depth (-80px), offset X (-40px), rotationY (-3deg)
    if (secondaryFramesRef.current[1]) {
      tl.fromTo(
        secondaryFramesRef.current[1],
        {
          z: -80,
          x: -40,
          rotationY: -3,
          y: 50,
          opacity: 0.8,
        },
        {
          z: 0,
          x: 0,
          rotationY: 0,
          y: 0,
          opacity: 1,
          ease: 'power2.out',
        },
        0.2
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
      id="concepts"
      className="editorial-section cinematic-scene"
      style={{
        backgroundColor: 'var(--editorial-bg)',
        perspective: MOTION_CONFIG.perspective.deep,
        transformStyle: 'preserve-3d',
      }}
    >
      <div className="editorial-container">
        {/* Section Header */}
        <div style={{ marginBottom: '3.5rem', maxWidth: '640px' }}>
          <span className="editorial-overline">BỘ SƯU TẬP & BỐI CẢNH</span>
          <h2 className="editorial-h2" style={{ marginBottom: '1rem' }}>
            Bộ sưu tập concept chọn lọc
          </h2>
          <p className="editorial-copy">
            Mỗi concept được kiến tạo riêng biệt với bảng màu, ánh sáng và góc chụp mang đậm tinh thần tự nhiên.
          </p>
        </div>

        {/* Asymmetrical 3D Photo Composition */}
        <div
          className="editorial-concept-composition"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Primary Dominant Concept (Left) */}
          {primaryConcept && (
            <div style={{ display: 'flex', flexDirection: 'column', transformStyle: 'preserve-3d' }}>
              <div
                ref={primaryFrameRef}
                className="editorial-image-frame group cinematic-depth-image"
                data-cursor="XEM"
                style={{
                  height: '460px',
                  cursor: 'pointer',
                  border: '1px solid rgba(96, 70, 52, 0.12)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform, opacity',
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
          <div className="editorial-concept-subgrid" style={{ transformStyle: 'preserve-3d' }}>
            {secondaryConcepts.map((concept, idx) => (
              <div key={concept.id} style={{ display: 'flex', flexDirection: 'column', transformStyle: 'preserve-3d' }}>
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
                    willChange: 'transform, opacity',
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
