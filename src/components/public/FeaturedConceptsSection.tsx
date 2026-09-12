// ==============================================================================
// Maison MIPA Memories — Featured Work & Concepts (French Editorial Magazine Grid)
// Art Direction: Asymmetrical photography grid, no cards, no pill badges, no giant buttons.
// Real dynamic concepts data from portfolioService.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getPublicConcepts } from '../../services/portfolioService';
import type { Concept } from '../../types';

interface FeaturedConceptsSectionProps {
  onOpenBooking?: (conceptSlug?: string) => void;
}

export const FeaturedConceptsSection: React.FC<FeaturedConceptsSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadConcepts() {
      try {
        const data = await getPublicConcepts();
        if (mounted) {
          // Take top 3 bookable concepts for the asymmetrical grid
          setConcepts(data.filter((c) => c.bookable).slice(0, 3));
        }
      } catch (err) {
        console.error('Lỗi tải concepts:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadConcepts();
    return () => { mounted = false; };
  }, []);

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
    <section className="editorial-section" style={{ backgroundColor: 'var(--editorial-bg)' }}>
      <div className="editorial-container">
        {/* Editorial Section Header */}
        <div style={{ marginBottom: '3.5rem', maxWidth: '640px' }}>
          <span className="editorial-overline">BỘ SƯU TẬP & BỐI CẢNH</span>
          <h2 className="editorial-h2">Những concept được chọn nhiều</h2>
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
                className="editorial-image-frame"
                style={{
                  height: '480px',
                  cursor: 'pointer',
                  border: '1px solid rgba(96, 70, 52, 0.12)',
                }}
                onClick={() => handleConceptClick(primaryConcept.slug)}
              >
                <img
                  src={primaryConcept.coverPhotoUrl || '/hero.png'}
                  alt={primaryConcept.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ marginTop: '1.25rem' }}>
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
            {secondaryConcepts.map((concept) => (
              <div key={concept.id} style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  className="editorial-image-frame"
                  style={{
                    height: '215px',
                    cursor: 'pointer',
                    border: '1px solid rgba(96, 70, 52, 0.12)',
                  }}
                  onClick={() => handleConceptClick(concept.slug)}
                >
                  <img
                    src={concept.coverPhotoUrl || '/studio.png'}
                    alt={concept.name}
                    loading="lazy"
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
