// ==============================================================================
// Maison MIPA Memories — Selected Stories (Portfolio Repositioned)
// Art Direction: Art-directed rhythm, negative space, photography storytelling.
// Authentic data from getPublicCollections().
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicCollections } from '../../services/portfolioService';
import type { PortfolioCollection } from '../../types';
import { ArrowRight } from 'lucide-react';

export const HomeStoriesSection: React.FC = () => {
  const [collections, setCollections] = useState<PortfolioCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadCollections() {
      try {
        const data = await getPublicCollections();
        if (mounted) {
          setCollections(data.slice(0, 4));
        }
      } catch (err) {
        console.warn('Lỗi tải danh mục bộ ảnh:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadCollections();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading || collections.length === 0) return null;

  return (
    <section
      id="portfolio"
      aria-label="Selected Stories — Bộ Ảnh"
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
              SELECTED STORIES / BỘ ẢNH
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
              Những câu chuyện được kể lại
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
              Mỗi bộ ảnh là một kỷ niệm độc bản được ghi lại bằng cảm xúc mộc mạc và kỹ thuật xử lý màu phim tinh tế.
            </p>
          </div>

          <Link
            to="/portfolio"
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
            }}
          >
            Xem toàn bộ câu chuyện <ArrowRight size={15} />
          </Link>
        </div>

        {/* Art-Directed Stories Grid with Varied Rhythm */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: 'clamp(1.5rem, 3vw, 2.5rem)',
          }}
        >
          {collections.map((col, index) => {
            // Rhythm: Item 0 is 8-col wide feature, Item 1 is 4-col portrait; Items 2 & 3 are 6-cols
            let colSpan = 'span 6';
            let aspectRatio = '16/10';
            if (index === 0) {
              colSpan = 'span 8';
              aspectRatio = '16/10';
            } else if (index === 1) {
              colSpan = 'span 4';
              aspectRatio = '4/5';
            }

            const coverUrl =
              col.coverPhotoUrl || (col.photos && col.photos[0]?.url) || (index % 2 === 0 ? '/hero.png' : '/studio.png');

            return (
              <article
                key={col.id}
                style={{
                  gridColumn: colSpan,
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Visual Cover Frame */}
                <Link
                  to={`/portfolio/${col.slug}`}
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
                    src={coverUrl}
                    alt={col.title}
                    loading="lazy"
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

                {/* Metadata */}
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
                    {col.conceptName || 'Maison Story'}
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
                      to={`/portfolio/${col.slug}`}
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                      }}
                    >
                      {col.title}
                    </Link>
                  </h3>

                  <Link
                    to={`/portfolio/${col.slug}`}
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
                    Xem bộ ảnh <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeStoriesSection;
