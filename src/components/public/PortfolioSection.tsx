// ==============================================================================
// Maison MIPA Memories - Public Portfolio Section
// Editorial Photography Gallery connected to real portfolioService data.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicCollections, getPublicConcepts } from '../../services/portfolioService';
import { getFocalPointStyle } from '../../utils/imageOptimizer';
import type { PortfolioCollection, Concept } from '../../types';
import { ArrowRight } from 'lucide-react';

interface PortfolioSectionProps {
  onOpenBooking?: (conceptSlug?: string) => void;
  featuredOnly?: boolean;
  hideHeader?: boolean;
}

export const PortfolioSection: React.FC<PortfolioSectionProps> = ({
  onOpenBooking: _onOpenBooking,
  featuredOnly = false,
  hideHeader = false,
}) => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<PortfolioCollection[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [selectedConceptSlug, setSelectedConceptSlug] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadPortfolioData() {
      setIsLoading(true);
      try {
        const [concs, cols] = await Promise.all([
          getPublicConcepts(),
          getPublicCollections(undefined, featuredOnly),
        ]);
        if (mounted) {
          setConcepts(concs);
          setCollections(cols);
        }
      } catch (e) {
        console.error('Lỗi tải portfolio:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadPortfolioData();
    return () => { mounted = false; };
  }, [featuredOnly]);

  const filteredCollections = selectedConceptSlug === 'ALL'
    ? collections
    : collections.filter((c) => c.conceptSlug === selectedConceptSlug || c.conceptId === selectedConceptSlug);

  return (
    <section id="portfolio" className="editorial-section" style={{ padding: '2.5rem 0', maxWidth: '1240px', margin: '0 auto' }}>
      <div>
        {/* Section Header */}
        {!hideHeader && (
          <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
            <span className="editorial-overline">GALERIE DE MAISON MIPA</span>
            <h2 className="editorial-h2" style={{ marginBottom: '1rem' }}>
              Bộ sưu tập hình ảnh
            </h2>
            <p className="editorial-copy" style={{ margin: '0 auto' }}>
              Mỗi khung hình là một khoảnh khắc được lưu giữ tự nhiên từ ánh sáng, góc máy đến cảm xúc chân thật nhất.
            </p>
          </div>
        )}

        {/* Concept Filter */}
        {!featuredOnly && concepts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setSelectedConceptSlug('ALL')}
              style={{
                border: 'none',
                borderBottom: selectedConceptSlug === 'ALL' ? '2px solid var(--editorial-brown)' : '2px solid transparent',
                background: 'transparent',
                color: selectedConceptSlug === 'ALL' ? 'var(--editorial-brown)' : 'var(--editorial-text-secondary)',
                padding: '0.4rem 0.8rem',
                fontSize: '0.9rem',
                fontWeight: selectedConceptSlug === 'ALL' ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Tất cả
            </button>
            {concepts.map((concept) => (
              <button
                key={concept.id}
                type="button"
                onClick={() => setSelectedConceptSlug(concept.slug)}
                style={{
                  border: 'none',
                  borderBottom: selectedConceptSlug === concept.slug ? '2px solid var(--editorial-brown)' : '2px solid transparent',
                  background: 'transparent',
                  color: selectedConceptSlug === concept.slug ? 'var(--editorial-brown)' : 'var(--editorial-text-secondary)',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.9rem',
                  fontWeight: selectedConceptSlug === concept.slug ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {concept.name}
              </button>
            ))}
          </div>
        )}

        {/* Collections Gallery Grid */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--editorial-brown-accent)' }}>
            <p style={{ fontSize: '0.95rem' }}>Đang chuẩn bị bộ sưu tập...</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--editorial-text-secondary)' }}>
            Chưa có bộ sưu tập nào thuộc concept này.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '2.5rem',
            }}
          >
            {filteredCollections.map((col) => {
              const coverPhoto = col.photos && col.photos.length > 0 ? col.photos[0] : null;
              const focalX = coverPhoto?.focalX || 50;
              const focalY = coverPhoto?.focalY || 50;

              return (
                <div
                  key={col.id}
                  data-cursor="XEM"
                  onClick={() => navigate(`/portfolio/${col.slug}`)}
                  role="button"
                  tabIndex={0}
                  className="group"
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/portfolio/${col.slug}`); }}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'transparent',
                  }}
                >
                  <div style={{
                    position: 'relative',
                    height: '280px',
                    overflow: 'hidden',
                    backgroundColor: '#241D1A',
                    borderRadius: '4px',
                  }}>
                    <img
                      src={col.coverPhotoUrl || coverPhoto?.url || '/hero.png'}
                      alt={col.title}
                      loading="lazy"
                      className="transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        objectFit: 'cover',
                        ...getFocalPointStyle(focalX, focalY),
                      }}
                    />

                    {/* Concept overline */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(36, 29, 26, 0.85)',
                          color: '#FFFDF9',
                          fontSize: '0.7rem',
                          fontWeight: 500,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '2px',
                        }}
                      >
                        {col.conceptName || 'Concept'}
                      </span>
                    </div>

                    {/* Photo count indicator */}
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(36, 29, 26, 0.75)',
                          color: '#FFFDF9',
                          fontSize: '0.72rem',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '2px',
                        }}
                      >
                        {col.photosCount || col.photos?.length || 1} ảnh
                      </span>
                    </div>
                  </div>

                  <div style={{ paddingTop: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <h3 style={{
                      fontFamily: 'var(--editorial-font-heading)',
                      fontSize: '1.45rem',
                      color: 'var(--editorial-brown)',
                      fontWeight: 600,
                      margin: 0,
                    }}>
                      {col.title}
                    </h3>
                    <p style={{ color: 'var(--editorial-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                      {col.description}
                    </p>

                    <div style={{
                      marginTop: '0.5rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      color: 'var(--editorial-brown)',
                      fontSize: '0.88rem',
                      fontWeight: 500,
                    }}>
                      Xem bộ ảnh <ArrowRight size={14} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default PortfolioSection;
