// ==============================================================================
// Maison MIPA Memories — Portfolio Page (/portfolio)
// Repositioned as: SELECTED STORIES / BỘ ẢNH & CÂU CHUYỆN
// Uses real published collections from portfolioService.
// Distinct states: LOADING, ERROR, EMPTY, READY.
// Editorial varied rhythm, zero fake fallbacks.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, RotateCcw, Plus, Edit3, Trash2, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { getPublicCollections, deleteCollection } from '../services/portfolioService';
import type { PortfolioCollection } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { InPlaceImageEditor } from '../components/common/InPlaceImageEditor';
import { useAuth } from '../context/AuthContext';
import { useSiteAssets } from '../context/SiteAssetContext';
import { PortfolioCollectionModal } from '../components/portfolio/PortfolioCollectionModal';

interface PortfolioPageProps {
  onOpenBooking?: () => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const { isRootOwner, role } = useAuth();
  const { isQuickEditModeActive } = useSiteAssets();
  const canManage = Boolean(isRootOwner || role === 'ADMIN' || role === 'MANAGER' || isQuickEditModeActive);

  const [collections, setCollections] = useState<PortfolioCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  // Management Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<PortfolioCollection | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<PortfolioCollection | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleCollectionSaved = (savedCol: PortfolioCollection) => {
    if (editingCollection) {
      setCollections((prev) => prev.map((c) => (c.id === savedCol.id ? savedCol : c)));
      setEditingCollection(null);
    } else {
      setCollections((prev) => [savedCol, ...prev]);
      setIsCreateModalOpen(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!deletingCollection) return;
    setIsDeleting(true);
    try {
      await deleteCollection(deletingCollection.id);
      setCollections((prev) => prev.filter((c) => c.id !== deletingCollection.id));
      setDeletingCollection(null);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa bộ sưu tập.');
    } finally {
      setIsDeleting(false);
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

      {/* Admin Action Bar */}
      {canManage && (
        <div
          style={{
            maxWidth: '1350px',
            margin: '1.25rem auto 0',
            padding: '0 1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              padding: '0.9rem 1.4rem',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(198, 164, 95, 0.45)',
              borderRadius: '6px',
              boxShadow: '0 4px 14px rgba(41, 35, 31, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <ShieldCheck size={18} color="#8C6E53" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#29231F', letterSpacing: '0.04em' }}>
                QUẢN TRỊ PORTFOLIO
              </span>
              <span style={{ fontSize: '0.8rem', color: '#8C6E53' }}>
                • {collections.length} bộ sưu tập
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="public-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.15rem',
                fontSize: '0.84rem',
                backgroundColor: '#29231F',
                color: '#FAF8F3',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              <Plus size={15} /> Thêm Bộ Sưu Tập Mới
            </button>
          </div>
        </div>
      )}

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
            {[0, 1, 2, 3].map((idx) => {
              const cardClass = idx === 0 ? 'story-card-feature' : idx === 1 ? 'story-card-tall' : 'story-card-half';
              const aspectRatio = idx === 1 ? '4/5' : '16/10';
              return (
                <div
                  key={idx}
                  className={`mipa-story-card ${cardClass}`}
                  style={{
                    backgroundColor: '#FFFDF9',
                    border: '1px solid rgba(140, 110, 83, 0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ aspectRatio, backgroundColor: 'rgba(140, 110, 83, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ color: '#8C6E53', fontSize: '0.8rem', letterSpacing: '0.1em' }}>Đang tải câu chuyện...</span>
                  </div>
                  <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    <div style={{ height: '12px', width: '30%', backgroundColor: 'rgba(140, 110, 83, 0.12)', borderRadius: '3px' }} />
                    <div style={{ height: '22px', width: '65%', backgroundColor: 'rgba(140, 110, 83, 0.18)', borderRadius: '4px' }} />
                    <div style={{ height: '14px', width: '90%', backgroundColor: 'rgba(140, 110, 83, 0.08)', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
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
            <p style={{ fontSize: '1rem', color: '#8C6E53', marginBottom: canManage ? '1.5rem' : 0 }}>
              Hiện chưa có bộ ảnh nào được công bố.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="public-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1.5rem',
                }}
              >
                <Plus size={16} /> Thêm Bộ Sưu Tập Đầu Tiên
              </button>
            )}
          </div>
        )}

        {/* 4. READY STATE: Editorial Varied Rhythm Grid (8+4=12, 6+6=12) */}
        {!isLoading && !hasError && collections.length > 0 && (
          <div className="story-editorial-grid">
            {collections.map((col, index) => {
              const cycle = index % 4;
              let cardClass = 'story-card-half';
              let aspectRatio = '16/10';

              if (cycle === 0) {
                cardClass = 'story-card-feature';
                aspectRatio = '16/10';
              } else if (cycle === 1) {
                cardClass = 'story-card-tall';
                aspectRatio = '4/5';
              } else {
                cardClass = 'story-card-half';
                aspectRatio = '16/10';
              }

              const coverUrl = col.coverPhotoUrl || (col.photos && col.photos[0]?.url);

              return (
                <article
                  key={col.id}
                  className={`mipa-story-card ${cardClass}`}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    border: '1px solid rgba(140, 110, 83, 0.2)',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
                    minWidth: 0,
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Admin Quick Action Controls */}
                  {canManage && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '0.75rem',
                        right: '0.75rem',
                        zIndex: 25,
                        display: 'flex',
                        gap: '0.35rem',
                        backgroundColor: 'rgba(255, 253, 249, 0.94)',
                        backdropFilter: 'blur(8px)',
                        padding: '0.3rem 0.45rem',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
                        border: '1px solid rgba(140, 110, 83, 0.3)',
                      }}
                    >
                      <button
                        type="button"
                        title="Chỉnh sửa thông tin bộ sưu tập"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingCollection(col);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#29231F',
                          color: '#FAF8F3',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <Edit3 size={12} /> Sửa
                      </button>
                      <button
                        type="button"
                        title="Xóa bộ sưu tập này"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingCollection(col);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#B44',
                          color: '#FFF',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  )}

                  {/* Visual Photography Frame */}
                  <InPlaceImageEditor
                    assetId={`portfolio_col_cover_${col.slug}`}
                    currentImageUrl={coverUrl || '/studio.png'}
                    label={`Ảnh bìa bộ ảnh: ${col.title}`}
                    onImageUpdated={(newUrl) => {
                      setCollections((prev) =>
                        prev.map((item) =>
                          item.id === col.id ? { ...item, coverPhotoUrl: newUrl } : item
                        )
                      );
                    }}
                    onImageDeleted={() => {
                      setCollections((prev) =>
                        prev.map((item) =>
                          item.id === col.id ? { ...item, coverPhotoUrl: '' } : item
                        )
                      );
                    }}
                  >
                    <Link
                      to={`/portfolio/${col.slug}`}
                      state={{ collection: col }}
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
                  </InPlaceImageEditor>

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
                          state={{ collection: col }}
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
                        state={{ collection: col }}
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

      {/* Create Collection Modal */}
      {isCreateModalOpen && (
        <PortfolioCollectionModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          collection={null}
          onSaved={handleCollectionSaved}
        />
      )}

      {/* Edit Collection Modal */}
      {editingCollection && (
        <PortfolioCollectionModal
          isOpen={Boolean(editingCollection)}
          onClose={() => setEditingCollection(null)}
          collection={editingCollection}
          onSaved={handleCollectionSaved}
        />
      )}

      {/* Delete Collection Confirmation Modal */}
      {deletingCollection && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(21, 17, 14, 0.75)',
            backdropFilter: 'blur(5px)',
            padding: '1.25rem',
          }}
          onClick={() => !isDeleting && setDeletingCollection(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#B44' }}>
              <AlertTriangle size={24} />
              <h3 style={{ margin: 0, fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.5rem', color: '#29231F' }}>
                Xác Nhận Xóa Bộ Sưu Tập
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', lineHeight: 1.6, color: '#604634', marginBottom: '1.5rem' }}>
              Quý khách có chắc chắn muốn xóa bộ sưu tập <strong>&ldquo;{deletingCollection.title}&rdquo;</strong> không? Hành động này sẽ gỡ bỏ bộ sưu tập khỏi danh sách hiển thị và lưu trữ.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingCollection(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  borderRadius: '4px',
                  color: '#604634',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCollection}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.35rem',
                  backgroundColor: '#B44',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FFF',
                  fontWeight: 500,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.88rem',
                }}
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Đang xóa...' : 'Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
