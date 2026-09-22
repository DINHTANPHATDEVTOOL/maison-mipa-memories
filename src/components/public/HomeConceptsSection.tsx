// ==============================================================================
// Maison MIPA Memories — Concept-First Discovery Section
// Art Direction: High visual weight photography, editorial varied 2-3 column rhythm.
// Authentic data from getPublicConcepts(). Zero fake popularity badges.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicConcepts, updateConcept } from '../../services/portfolioService';
import type { Concept } from '../../types';
import { ArrowRight } from 'lucide-react';
import { EditorialImagePlaceholder } from './EditorialImagePlaceholder';
import { InPlaceImageEditor } from '../common/InPlaceImageEditor';

export const HomeConceptsSection: React.FC = () => {
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

  if (hasError) {
    return (
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#FAF8F3', textAlign: 'center' }}>
        <div style={{ color: '#8C6E53', fontSize: '0.9rem' }}>Không thể tải danh mục concept vào lúc này.</div>
      </section>
    );
  }

  if (concepts.length === 0) {
    return (
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#FAF8F3', textAlign: 'center' }}>
        <div style={{ color: '#8C6E53', fontSize: '0.9rem' }}>Hiện chưa có concept nào được công bố.</div>
      </section>
    );
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
                color: '#70533C',
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
              Mỗi concept tại tiệm ảnh Maison MIPA được xây dựng tỉ mỉ về bối cảnh, ánh sáng và phục trang để tôn vinh trọn vẹn cảm xúc chân thật nhất của bạn.
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
              borderBottom: '1px solid #70533C',
              paddingBottom: '3px',
              transition: 'color 0.2s ease, border-color 0.2s ease',
            }}
          >
            Xem tất cả concept <ArrowRight size={15} />
          </Link>
        </div>

        {/* Curated Concept Quick Navigation Tags */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.6rem',
            marginBottom: '2.5rem',
          }}
        >
          {[
            { label: 'Chân Dung Nghệ Thuật', to: '/concept' },
            { label: 'Kỷ Yếu & Tốt Nghiệp', to: '/concept' },
            { label: 'Áo Dài Duyên Dáng', to: '/concept' },
            { label: 'Chụp Đồ Án Tốt Nghiệp', to: '/concept' },
            { label: 'Couple & Kỷ Niệm', to: '/concept' },
            { label: 'Lễ Tết Sum Vầy', to: '/concept' },
            { label: 'Giáng Sinh Ấm Áp', to: '/concept' },
          ].map((tag, idx) => (
            <Link
              key={idx}
              to={tag.to}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '0.45rem 1rem',
                borderRadius: '20px',
                backgroundColor: '#FFFDF9',
                border: '1px solid rgba(140, 110, 83, 0.25)',
                color: '#604634',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#604634';
                e.currentTarget.style.color = '#FFFDF9';
                e.currentTarget.style.borderColor = '#604634';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFDF9';
                e.currentTarget.style.color = '#604634';
                e.currentTarget.style.borderColor = 'rgba(140, 110, 83, 0.25)';
              }}
            >
              ✦ {tag.label}
            </Link>
          ))}
        </div>

        {/* Asymmetric Editorial Grid with Responsive Class */}
        <div className="concept-editorial-grid">
          {concepts.map((concept, index) => {
            let cardClass = 'concept-card-triplet';
            let aspectRatio = '4/3';
            if (index === 0) {
              cardClass = 'concept-card-feature-left';
              aspectRatio = '16/10';
            } else if (index === 1) {
              cardClass = 'concept-card-feature-right';
              aspectRatio = '4/5';
            }

            const categoryLabel = 'Concept Maison MIPA';

            return (
              <article
                key={concept.id}
                className={`mipa-concept-card ${cardClass}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Photography Frame */}
                <InPlaceImageEditor
                  assetId={`concept_${concept.slug}`}
                  currentImageUrl={concept.coverPhotoUrl || ''}
                  label={`Concept: ${concept.name}`}
                  onImageUpdated={(newUrl) => {
                    updateConcept(concept.id, { coverPhotoUrl: newUrl });
                    setConcepts((prev) =>
                      prev.map((c) => (c.id === concept.id ? { ...c, coverPhotoUrl: newUrl } : c))
                    );
                  }}
                  onImageDeleted={() => {
                    updateConcept(concept.id, { coverPhotoUrl: '' });
                    setConcepts((prev) =>
                      prev.map((c) => (c.id === concept.id ? { ...c, coverPhotoUrl: '' } : c))
                    );
                  }}
                  containerStyle={{ marginBottom: '1.15rem' }}
                >
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
                    }}
                  >
                    {concept.coverPhotoUrl ? (
                      <img
                        src={concept.coverPhotoUrl}
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
                    ) : (
                      <EditorialImagePlaceholder
                        aspectRatio={aspectRatio}
                        caption={concept.name}
                      />
                    )}
                  </Link>
                </InPlaceImageEditor>

                {/* Concept Information */}
                <div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: '#70533C',
                      fontWeight: 600,
                      marginBottom: '0.45rem',
                    }}
                  >
                    {categoryLabel}
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: index === 0 ? 'clamp(1.85rem, 2.4vw, 2.25rem)' : 'clamp(1.4rem, 1.8vw, 1.65rem)',
                      fontWeight: 500,
                      color: '#29231F',
                      margin: '0 0 0.65rem 0',
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
                      fontSize: '0.96rem',
                      lineHeight: 1.6,
                      color: '#604634',
                      margin: '0 0 1rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontWeight: 300,
                    }}
                  >
                    {concept.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                    <Link
                      to={`/concept/${concept.slug}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.95rem',
                        color: '#29231F',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Xem concept <ArrowRight size={14} />
                    </Link>

                    {concept.bookable && (
                      <Link
                        to={`/booking?concept=${concept.slug}`}
                        style={{
                          fontSize: '0.92rem',
                          color: '#70533C',
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
