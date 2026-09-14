// ==============================================================================
// Maison MIPA Memories — Concept-First Discovery Section
// Art Direction: High visual weight photography, editorial varied 2-3 column rhythm.
// Authentic data from getPublicConcepts(). Zero fake popularity badges.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicConcepts } from '../../services/portfolioService';
import type { Concept } from '../../types';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HomeConceptsSectionProps {
  onOpenBookingWithConcept?: (slug: string) => void;
}

// Category fallback helper based on slug/name keywords
function getConceptCategoryLabel(concept: Concept): string {
  const text = `${concept.slug} ${concept.name} ${concept.description}`.toLowerCase();
  if (text.includes('wedding') || text.includes('haute') || text.includes('cưới')) return 'Cưới & Haute Couture';
  if (text.includes('romance') || text.includes('couple') || text.includes('đôi')) return 'Couple & Tình Yêu';
  if (text.includes('famille') || text.includes('gia đình')) return 'Gia Đình & Tổ Ấm';
  if (text.includes('ange') || text.includes('baby') || text.includes('bé')) return 'Em Bé & Chân Dung Đầu Đời';
  if (text.includes('monochrome') || text.includes('chân dung') || text.includes('portrait')) return 'Chân Dung Nghệ Thuật';
  if (text.includes('vintage') || text.includes('loft') || text.includes('cinematic')) return 'Điện Ảnh & Cổ Điển';
  return 'Chân Dung & Nghệ Thuật';
}

export const HomeConceptsSection: React.FC<HomeConceptsSectionProps> = ({
  onOpenBookingWithConcept,
}) => {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const data = await getPublicConcepts();
        if (mounted) {
          setConcepts(data.slice(0, 5)); // Curated top 5 for varied rhythm
        }
      } catch (err) {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section style={{ padding: '6rem 1.5rem', backgroundColor: '#FAF8F3', textAlign: 'center' }}>
        <div style={{ color: '#8C6E53', fontSize: '0.9rem' }}>Đang tải danh mục concept...</div>
      </section>
    );
  }

  if (hasError || concepts.length === 0) {
    return null; // transparent fail-closed
  }

  return (
    <section
      id="concepts"
      aria-label="Concept Nổi Bật"
      style={{
        padding: 'clamp(4rem, 8vw, 7.5rem) 1.5rem',
        backgroundColor: '#FAF8F3',
        borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
        }}
      >
        {/* Editorial Section Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'clamp(2.5rem, 5vw, 4rem)',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              CONCEPT NỔI BẬT
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 0.75rem 0',
              }}
            >
              Ý tưởng & phong cách ánh sáng
            </h2>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#604634',
                margin: 0,
                fontWeight: 300,
              }}
            >
              Mỗi concept tại Maison MIPA được xây dựng tỉ mỉ về bối cảnh, ánh sáng và bảng màu để tôn vinh trọn vẹn cảm xúc riêng của bạn.
            </p>
          </div>

          <Link
            to="/concept"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#604634',
              fontSize: '0.92rem',
              fontWeight: 500,
              textDecoration: 'none',
              borderBottom: '1px solid #8C6E53',
              paddingBottom: '3px',
              transition: 'color 0.2s ease, border-color 0.2s ease',
            }}
          >
            Xem tất cả concept <ArrowRight size={15} />
          </Link>
        </div>

        {/* Asymmetric Editorial Grid (Varied Rhythm: Large / Tall / Wide) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 'clamp(1.5rem, 3vw, 2.5rem)',
          }}
        >
          {concepts.map((concept, index) => {
            // Asymmetric rhythm mapping
            // Item 0: 7 cols wide (Featured hero concept)
            // Item 1: 5 cols portrait
            // Item 2: 4 cols standard
            // Item 3: 4 cols standard
            // Item 4: 4 cols standard
            let colSpan = 'span 4';
            let aspectRatio = '4/3';
            if (index === 0) {
              colSpan = 'span 7';
              aspectRatio = '16/10';
            } else if (index === 1) {
              colSpan = 'span 5';
              aspectRatio = '4/5';
            }

            const category = getConceptCategoryLabel(concept);
            const coverImage = concept.coverPhotoUrl || (index % 2 === 0 ? '/hero.png' : '/studio.png');

            return (
              <article
                key={concept.id}
                className="mipa-concept-card"
                style={{
                  gridColumn: colSpan,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Photography Frame */}
                <Link
                  to={`/concept/${concept.slug}`}
                  style={{
                    display: 'block',
                    position: 'relative',
                    width: '100%',
                    aspectRatio,
                    overflow: 'hidden',
                    borderRadius: '2px',
                    backgroundColor: '#EDE7DC',
                    textDecoration: 'none',
                    marginBottom: '1rem',
                  }}
                >
                  <img
                    src={coverImage}
                    alt={concept.name}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                      transition: 'transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.035)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1.0)';
                    }}
                  />
                </Link>

                {/* Concept Information */}
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#8C6E53',
                      fontWeight: 500,
                      marginBottom: '0.35rem',
                    }}
                  >
                    {category}
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: index === 0 ? '1.85rem' : '1.45rem',
                      fontWeight: 500,
                      color: '#29231F',
                      margin: '0 0 0.5rem 0',
                      lineHeight: 1.2,
                    }}
                  >
                    <Link
                      to={`/concept/${concept.slug}`}
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {concept.name}
                    </Link>
                  </h3>

                  <p
                    style={{
                      fontSize: '0.88rem',
                      lineHeight: 1.55,
                      color: '#604634',
                      margin: '0 0 0.85rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontWeight: 300,
                    }}
                  >
                    {concept.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link
                      to={`/concept/${concept.slug}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.85rem',
                        color: '#29231F',
                        fontWeight: 500,
                        textDecoration: 'none',
                      }}
                    >
                      Xem concept <ArrowRight size={13} />
                    </Link>

                    {concept.bookable && (
                      <Link
                        to={`/booking?concept=${concept.slug}`}
                        style={{
                          fontSize: '0.82rem',
                          color: '#8C6E53',
                          fontWeight: 500,
                          textDecoration: 'underline',
                          textUnderlineOffset: '3px',
                        }}
                      >
                        Đặt lịch concept này
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeConceptsSection;
