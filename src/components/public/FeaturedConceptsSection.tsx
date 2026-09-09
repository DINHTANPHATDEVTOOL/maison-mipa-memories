// ==============================================================================
// Maison MIPA Memories - Featured Concepts Showcase Section (#16 & #6)
// Connected to real portfolioService data. Direct CTA to bookable concepts.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPublicConcepts } from '../../services/portfolioService';
import type { Concept } from '../../types';
import { Sparkles, ArrowRight, Calendar } from 'lucide-react';

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
          // Take top 3 or 4 bookable concepts
          setConcepts(data.filter((c) => c.bookable).slice(0, 4));
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

  const handleSelectConcept = (conceptSlug: string) => {
    if (onOpenBooking) {
      onOpenBooking(conceptSlug);
    } else {
      navigate(`/booking?concept=${conceptSlug}`);
    }
  };

  return (
    <section className="mipa-container" style={{ padding: '3.5rem 1rem', maxWidth: '1350px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2.5rem' }}>
        <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
          CONCEPTS NGHỆ THUẬT ĐẶC TRƯNG
        </div>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
          Những Bối Cảnh Được Yêu Thích Nhất
        </h2>
        <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
          Mỗi concept được kiến tạo riêng biệt với bảng màu, ánh sáng và đạo cụ thủ công tinh xảo.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.8rem' }}>
        {concepts.map((concept, idx) => {
          const fallbackCover = idx % 2 === 0 ? '/hero.png' : '/studio.png';
          const coverImage = concept.coverPhotoUrl || fallbackCover;

          return (
            <div
              key={concept.id}
              className="mipa-card"
              style={{
                borderRadius: '22px',
                overflow: 'hidden',
                backgroundColor: '#FFFDF6',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: '1px solid var(--mipa-beige)',
                boxShadow: 'var(--mipa-shadow-sm)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              <div>
                <div style={{ height: '220px', position: 'relative', overflow: 'hidden', backgroundColor: '#2C221E' }}>
                  <img
                    src={coverImage}
                    alt={concept.name}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                    <span style={{ backgroundColor: 'rgba(96, 70, 52, 0.85)', backdropFilter: 'blur(4px)', color: '#EFE6C9', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.7rem', borderRadius: '14px', textTransform: 'uppercase' }}>
                      <Sparkles size={12} style={{ display: 'inline', marginRight: '4px' }} /> BOOKABLE
                    </span>
                  </div>
                </div>

                <div style={{ padding: '1.4rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: '#604634', marginBottom: '0.4rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
                    {concept.name}
                  </h3>
                  <p style={{ color: '#6E5F55', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>
                    {concept.description}
                  </p>
                </div>
              </div>

              <div style={{ padding: '0 1.4rem 1.4rem', display: 'flex', gap: '0.8rem' }}>
                <button
                  onClick={() => handleSelectConcept(concept.slug)}
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.65rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Calendar size={15} /> Đặt Concept
                </button>
                <button
                  onClick={() => navigate('/portfolio')}
                  className="btn-mipa-secondary"
                  style={{ padding: '0.65rem 0.9rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Xem bộ ảnh mẫu"
                >
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default FeaturedConceptsSection;
