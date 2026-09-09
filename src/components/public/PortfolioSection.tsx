// ==============================================================================
// Maison MIPA Memories - Public Portfolio Section (#16 & #6)
// Connected to real portfolioService data. No Unsplash or fake demo collections.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getPublicCollections, getPublicConcepts } from '../../services/portfolioService';
import { getFocalPointStyle } from '../../utils/imageOptimizer';
import type { PortfolioCollection, Concept } from '../../types';
import { Sparkles, ArrowRight, Camera } from 'lucide-react';

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
    <section id="portfolio" className="mipa-container" style={{ padding: '3.5rem 1rem', backgroundColor: '#FAF8F5', maxWidth: '1350px', margin: '0 auto' }}>
      <div>
        {/* Section Header */}
        {!hideHeader && (
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2.5rem' }}>
            <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
              GALERIE DE MAISON MIPA
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
              Bộ Sưu Tập Kỷ Niệm Thơ Mộng
            </h2>
            <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
              Mỗi khung hình là một câu chuyện tình yêu, gia đình hay thanh xuân được chăm chút tỉ mỉ từ ánh sáng tự nhiên đến cảm xúc chân thật nhất.
            </p>
          </div>
        )}

        {/* Concept Filter Pills */}
        {!featuredOnly && concepts.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedConceptSlug('ALL')}
              style={{
                border: '1px solid var(--mipa-beige)',
                background: selectedConceptSlug === 'ALL' ? '#604634' : '#FFFDF6',
                color: selectedConceptSlug === 'ALL' ? '#FFFDF6' : '#604634',
                padding: '0.45rem 1.1rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Tất Cả
            </button>
            {concepts.map((concept) => (
              <button
                key={concept.id}
                onClick={() => setSelectedConceptSlug(concept.slug)}
                style={{
                  border: '1px solid var(--mipa-beige)',
                  background: selectedConceptSlug === concept.slug ? '#604634' : '#FFFDF6',
                  color: selectedConceptSlug === concept.slug ? '#FFFDF6' : '#604634',
                  padding: '0.45rem 1.1rem',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
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
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#8C6E53' }}>
            <Sparkles size={24} color="#C6A45F" className="animate-spin" />
            <p style={{ marginTop: '0.8rem', fontSize: '0.95rem' }}>Đang tải bộ sưu tập nghệ thuật...</p>
          </div>
        ) : filteredCollections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6E5F55' }}>
            Chưa có bộ sưu tập nào thuộc concept này.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '2rem',
            }}
          >
            {filteredCollections.map((col) => {
              const coverPhoto = col.photos && col.photos.length > 0 ? col.photos[0] : null;
              const focalX = coverPhoto?.focalX || 50;
              const focalY = coverPhoto?.focalY || 50;

              return (
                <div
                  key={col.id}
                  onClick={() => navigate(`/portfolio/${col.slug}`)}
                  className="mipa-card"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/portfolio/${col.slug}`); }}
                  style={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    backgroundColor: '#FFFDF6',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--mipa-beige)',
                    boxShadow: 'var(--mipa-shadow-sm)',
                    transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                  }}
                >
                  <div style={{ position: 'relative', height: '260px', overflow: 'hidden', backgroundColor: '#2C221E' }}>
                    <img
                      src={col.coverPhotoUrl || coverPhoto?.url || '/hero.png'}
                      alt={col.title}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        transition: 'transform 0.6s ease',
                        ...getFocalPointStyle(focalX, focalY),
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(44, 34, 30, 0.7) 0%, transparent 60%)',
                      }}
                    />

                    {/* Concept badge */}
                    <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(96, 70, 52, 0.85)',
                          backdropFilter: 'blur(4px)',
                          color: '#EFE6C9',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '20px',
                        }}
                      >
                        {col.conceptName || 'CONCEPT'}
                      </span>
                    </div>

                    {/* Photo count indicator */}
                    <div style={{ position: 'absolute', bottom: '12px', right: '12px' }}>
                      <span
                        style={{
                          backgroundColor: 'rgba(0, 0, 0, 0.5)',
                          color: '#FFFDF6',
                          fontSize: '0.72rem',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                        }}
                      >
                        {col.photosCount || col.photos?.length || 1} ảnh
                      </span>
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.5rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
                        {col.title}
                      </h3>
                      <p style={{ color: '#6E5F55', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                        {col.description}
                      </p>
                    </div>

                    <div style={{ marginTop: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', fontSize: '0.85rem', fontWeight: 600 }}>
                      Xem chi tiết bộ ảnh <ArrowRight size={15} />
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
