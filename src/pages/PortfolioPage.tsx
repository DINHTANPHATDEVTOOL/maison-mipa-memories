// ==============================================================================
// Maison MIPA Memories — Portfolio Page (/portfolio)
// Repositioned as: SELECTED STORIES / BỘ ẢNH & CÂU CHUYỆN
// Uses real published collections from portfolioService.
// Distinct states: LOADING, ERROR, EMPTY, READY.
// Editorial varied rhythm, zero fake fallbacks.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, RotateCcw } from 'lucide-react';
import { getPublicCollections } from '../services/portfolioService';
import type { PortfolioCollection } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';

interface PortfolioPageProps {
  onOpenBooking?: () => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<PortfolioCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchCollections = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getPublicCollections();
      setCollections(data);
    } catch (err) {
      console.warn('Lỗi tải danh mục bộ ảnh:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Portfolio', url: getCanonicalUrl('/portfolio') },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Bộ Sưu Tập Ký Ức & Câu Chuyện Thực Tế | Tiệm Ảnh Maison MIPA Memories"
        description="Bộ sưu tập ký ức và câu chuyện thực tế tại Tiệm ảnh Maison MIPA Memories: Những khung hình tình yêu, tổ ấm gia đình, kỷ yếu thanh xuân và chân dung nghệ thuật được kể lại bằng cảm xúc tự nhiên."
        canonicalPath="/portfolio"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb Navigation */}
      <nav
        aria-label="Breadcrumb"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '1.5rem 1.5rem 0',
        }}
      >
        <ol
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            color: '#8C6E53',
            flexWrap: 'wrap',
          }}
        >
          <li>
            <Link to="/" style={{ color: '#8C6E53', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={13} color="#8C6E53" /></li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            Portfolio
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header
        style={{
          maxWidth: '1350px',
          margin: '2.5rem auto 3.5rem',
          padding: '0 1.5rem',
          textAlign: 'center',
        }}
      >
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
          SELECTED STORIES / BỘ ẢNH &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
        </span>
        <h1
          style={{
            fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
            fontSize: 'clamp(2.5rem, 5vw, 4rem)',
            fontWeight: 500,
            color: '#29231F',
            lineHeight: 1.15,
            margin: '0 0 1rem 0',
          }}
        >
          Bộ Sưu Tập Ký Ức & Câu Chuyện Tổ Ấm
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: '#604634',
            maxWidth: '680px',
            margin: '0 auto',
            fontWeight: 300,
          }}
        >
          Mỗi bức ảnh là một mảnh ghép của tổ ấm, nơi tình yêu, nụ cười và những rung cảm chân phương nhất của từng vị khách ghé thăm Maison MIPA được trân trọng và lưu giữ vĩnh cửu.
        </p>
      </header>

      {/* Content Area */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* 1. LOADING STATE (Editorial Skeleton Grid) */}
        {isLoading && (
          <div className="story-editorial-grid">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className={n === 1 ? 'mipa-story-card story-card-feature' : 'mipa-story-card story-card-half'}
                style={{
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ aspectRatio: '16/10', backgroundColor: 'rgba(140, 110, 83, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: '#8C6E53', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Đang tải câu chuyện...</span>
                </div>
                <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ height: '12px', width: '30%', backgroundColor: 'rgba(140, 110, 83, 0.12)', borderRadius: '3px' }} />
                  <div style={{ height: '22px', width: '65%', backgroundColor: 'rgba(140, 110, 83, 0.18)', borderRadius: '4px' }} />
                  <div style={{ height: '14px', width: '90%', backgroundColor: 'rgba(140, 110, 83, 0.08)', borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 2. ERROR STATE */}
        {!isLoading && hasError && (
          <div
            style={{
              padding: '4rem 2rem',
              backgroundColor: '#FFFDF9',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              textAlign: 'center',
              maxWidth: '540px',
              margin: '0 auto',
            }}
          >
            <h2 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.8rem', color: '#29231F', marginBottom: '0.75rem' }}>
              Không thể tải danh sách bộ ảnh
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#604634', marginBottom: '1.75rem' }}>
              Đã có lỗi xảy ra trong quá trình kết nối. Quý khách vui lòng thử lại.
            </p>
            <button
              onClick={fetchCollections}
              className="public-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.75rem' }}
            >
              <RotateCcw size={15} /> Thử lại
            </button>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!isLoading && !hasError && collections.length === 0 && (
          <div
            style={{
              padding: '4rem 2rem',
              backgroundColor: '#FFFDF9',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              textAlign: 'center',
              maxWidth: '540px',
              margin: '0 auto',
            }}
          >
            <p style={{ fontSize: '1rem', color: '#8C6E53', margin: 0 }}>
              Hiện chưa có bộ ảnh nào được công bố.
            </p>
          </div>
        )}

        {/* 4. READY STATE: Editorial Varied Rhythm Grid */}
        {!isLoading && !hasError && collections.length > 0 && (
          <div className="story-editorial-grid">
            {collections.map((col, index) => {
              let cardClass = 'story-card-half';
              let aspectRatio = '16/10';
              if (index % 5 === 0) {
                cardClass = 'story-card-feature';
                aspectRatio = '16/10';
              } else if (index % 5 === 1) {
                cardClass = 'story-card-tall';
                aspectRatio = '4/5';
              }

              const coverUrl = col.coverPhotoUrl || (col.photos && col.photos[0]?.url);

              return (
                <article
                  key={col.id}
                  className={`mipa-story-card ${cardClass}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(140, 110, 83, 0.2)',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                  }}
                >
                  {/* Visual Photography Frame */}
                  <Link
                    to={`/portfolio/${col.slug}`}
                    data-cursor="XEM"
                    style={{
                      display: 'block',
                      position: 'relative',
                      width: '100%',
                      aspectRatio,
                      overflow: 'hidden',
                      backgroundColor: '#EDE7DC',
                      textDecoration: 'none',
                    }}
                  >
                    {coverUrl ? (
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
                          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
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
                        caption={col.title}
                      />
                    )}
                  </Link>

                  {/* Metadata */}
                  <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                    <div>
                      {col.conceptName && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: '#8C6E53',
                            fontWeight: 500,
                            marginBottom: '0.4rem',
                          }}
                        >
                          {col.conceptName}
                        </div>
                      )}

                      <h2
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '1.65rem',
                          fontWeight: 500,
                          color: '#29231F',
                          margin: '0 0 0.6rem 0',
                          lineHeight: 1.2,
                        }}
                      >
                        <Link
                          to={`/portfolio/${col.slug}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          {col.title}
                        </Link>
                      </h2>

                      {col.description && (
                        <p
                          style={{
                            fontSize: '0.9rem',
                            lineHeight: 1.55,
                            color: '#604634',
                            margin: '0 0 1.25rem 0',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            fontWeight: 300,
                          }}
                        >
                          {col.description}
                        </p>
                      )}
                    </div>

                    <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(140, 110, 83, 0.15)' }}>
                      <Link
                        to={`/portfolio/${col.slug}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.88rem',
                          color: '#29231F',
                          fontWeight: 500,
                          textDecoration: 'none',
                        }}
                      >
                        Xem bộ ảnh <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Bottom Booking CTA */}
        <section
          style={{
            marginTop: '5rem',
            padding: 'clamp(2.5rem, 5vw, 4rem) 2rem',
            backgroundColor: '#1E1815',
            color: '#FAF8F3',
            borderRadius: '6px',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              fontWeight: 500,
              color: '#FFFDF9',
              marginBottom: '0.75rem',
            }}
          >
            Lưu giữ câu chuyện của riêng bạn
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: 'rgba(255, 253, 249, 0.8)',
              maxWidth: '540px',
              margin: '0 auto 2rem auto',
              fontWeight: 300,
            }}
          >
            Mỗi khoảnh khắc trôi qua đều xứng đáng được ghi lại một cách chân thực và ý nghĩa nhất.
          </p>
          <button
            onClick={() => {
              if (onOpenBooking) onOpenBooking();
              else navigate('/booking');
            }}
            className="public-btn-primary"
            style={{
              padding: '0.85rem 2.25rem',
              fontSize: '0.95rem',
              backgroundColor: '#FAF8F3',
              color: '#29231F',
            }}
          >
            Đặt lịch chụp trực tuyến
          </button>
        </section>
      </main>
    </div>
  );
};

export default PortfolioPage;
