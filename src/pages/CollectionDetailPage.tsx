// ==============================================================================
// Maison MIPA Memories - Collection Detail Page (/portfolio/:slug)
// Visual commerce structure:
// Hero photography -> Title & real description -> Gallery with accessible lightbox
// -> Real related concept/service (if relation exists) -> Booking CTA
// Zero unrelated photo fallbacks; zero invented relations.
// ==============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCollectionBySlug, getPublicConcepts } from '../services/portfolioService';
import { getServices } from '../services/catalogService';
import { getFocalPointStyle } from '../utils/imageOptimizer';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import type { PortfolioCollection, Concept, ServiceCategory } from '../types';
import {
  ChevronRight,
  Home,
  ArrowLeft,
  ArrowRight,
  X,
  Layers,
} from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';

interface CollectionDetailPageProps {
  onOpenBooking?: (conceptSlug?: string) => void;
}

export const CollectionDetailPage: React.FC<CollectionDetailPageProps> = ({ onOpenBooking }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<PortfolioCollection | null>(null);
  const [relatedConcept, setRelatedConcept] = useState<Concept | null>(null);
  const [relatedService, setRelatedService] = useState<ServiceCategory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox State
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchCollection() {
      if (!slug) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const [data, allConcepts, allServices] = await Promise.all([
          getCollectionBySlug(slug),
          getPublicConcepts(),
          getServices(),
        ]);

        if (mounted) {
          if (!data) {
            setErrorMessage('Không tìm thấy bộ sưu tập được yêu cầu.');
          } else {
            setCollection(data);

            // Find authoritative related concept if relation exists
            if (data.conceptId || data.conceptSlug) {
              const matchedCnc = allConcepts.find(
                (c) => c.id === data.conceptId || c.slug === data.conceptSlug
              );
              if (matchedCnc) {
                setRelatedConcept(matchedCnc);
                if (matchedCnc.serviceId) {
                  const matchedSrv = allServices.find((s) => s.id === matchedCnc.serviceId);
                  if (matchedSrv) setRelatedService(matchedSrv);
                }
              }
            } else if (data.serviceId) {
              const matchedSrv = allServices.find((s) => s.id === data.serviceId);
              if (matchedSrv) setRelatedService(matchedSrv);
            }
          }
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Lỗi khi tải bộ sưu tập.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchCollection();
    return () => { mounted = false; };
  }, [slug]);

  // Keyboard navigation for Lightbox
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (activePhotoIndex === null || !collection?.photos || collection.photos.length === 0) return;

      if (e.key === 'Escape') {
        setActivePhotoIndex(null);
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => (prev! + 1) % collection.photos!.length);
      } else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (prev! - 1 + collection.photos!.length) % collection.photos!.length);
      }
    },
    [activePhotoIndex, collection?.photos]
  );

  useEffect(() => {
    if (activePhotoIndex !== null) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      lightboxRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [activePhotoIndex, handleKeyDown]);

  const handleBookConcept = () => {
    const targetSlug = relatedConcept?.slug || collection?.conceptSlug;
    if (targetSlug) {
      if (onOpenBooking) {
        onOpenBooking(targetSlug);
      } else {
        navigate(`/booking?concept=${encodeURIComponent(targetSlug)}`);
      }
    } else if (relatedService?.id) {
      navigate(`/booking?service=${encodeURIComponent(relatedService.id)}`);
    } else {
      navigate('/booking');
    }
  };

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Portfolio', url: getCanonicalUrl('/portfolio') },
    { name: collection?.title || 'Chi tiết bộ ảnh', url: getCanonicalUrl(`/portfolio/${slug || ''}`) },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F3' }}>
        <div style={{ textAlign: 'center', color: '#8C6E53' }}>
          <p style={{ fontSize: '0.95rem' }}>Đang tải bộ sưu tập...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !collection) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F3' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.8rem', color: '#29231F', marginBottom: '0.8rem', fontWeight: 500 }}>
            Bộ sưu tập không khả dụng
          </h2>
          <p style={{ color: '#604634', marginBottom: '1.5rem' }}>{errorMessage || 'Bộ sưu tập này có thể đang ở chế độ nháp hoặc đã được cập nhật.'}</p>
          <Link to="/portfolio" className="public-btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} /> Quay lại danh mục
          </Link>
        </div>
      </div>
    );
  }

  const photos = collection.photos || [];
  const activePhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;
  const coverUrl = collection.coverPhotoUrl || (photos.length > 0 ? photos[0].url : undefined);

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '5rem' }}>
      <SeoHead
        title={`${collection.title} | Portfolio Maison MIPA`}
        description={collection.description || 'Chiêm ngưỡng trọn vẹn bộ sưu tập ảnh nghệ thuật phong cách Pháp tại Maison MIPA Memories.'}
        canonicalPath={`/portfolio/${collection.slug}`}
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" style={{ maxWidth: '1350px', margin: '0 auto', padding: '1.2rem 1.5rem 0' }}>
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#8C6E53', flexWrap: 'wrap' }}>
          <li>
            <Link to="/" style={{ color: '#8C6E53', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={14} color="#8C6E53" /></li>
          <li>
            <Link to="/portfolio" style={{ color: '#8C6E53', textDecoration: 'none' }}>
              Portfolio
            </Link>
          </li>
          <li><ChevronRight size={14} color="#8C6E53" /></li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            {collection.title}
          </li>
        </ol>
      </nav>

      {/* Cinematic Header / Hero Banner */}
      <header style={{ maxWidth: '1350px', margin: '1.5rem auto 2.5rem', padding: '0 1.5rem' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            minHeight: '420px',
            display: 'flex',
            alignItems: 'flex-end',
            backgroundColor: '#2C221E',
          }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={collection.title}
              fetchPriority="high"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                ...getFocalPointStyle(photos[0]?.focalX || 50, photos[0]?.focalY || 50),
              }}
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0 }}>
              <EditorialImagePlaceholder height="100%" caption={collection.title} />
            </div>
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(41, 35, 31, 0.95) 0%, rgba(41, 35, 31, 0.4) 50%, transparent 100%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(1.5rem, 5vw, 3.5rem)', maxWidth: '850px' }}>
            {collection.conceptName && (
              <div style={{ fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#EFE6C9', fontWeight: 600, marginBottom: '0.8rem' }}>
                CONCEPT: {collection.conceptName}
              </div>
            )}

            <h1
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2rem, 5vw, 3.4rem)',
                color: '#FFFDF9',
                margin: '0 0 1rem 0',
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {collection.title}
            </h1>

            {collection.description && (
              <p style={{ color: '#EFE6C9', fontSize: '1rem', lineHeight: 1.6, margin: '0 0 1.8rem 0', maxWidth: '650px', fontWeight: 300 }}>
                {collection.description}
              </p>
            )}

            {/* Direct CTA */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBookConcept}
                className="public-btn-primary"
                style={{ padding: '0.85rem 1.8rem', fontSize: '0.95rem' }}
              >
                Đặt concept này
              </button>

              <span style={{ color: 'rgba(239, 230, 201, 0.8)', fontSize: '0.88rem' }}>
                {photos.length} hình ảnh
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Section */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.8rem', color: '#29231F', margin: 0, fontWeight: 500 }}>
            Khung hình chi tiết
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#8C6E53' }}>
            Nhấp vào từng ảnh để phóng to (← / → / Esc)
          </span>
        </div>

        {/* Dynamic Responsive Image Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              onClick={() => setActivePhotoIndex(idx)}
              className="editorial-image-frame"
              role="button"
              aria-label={`Xem ảnh ${idx + 1}: ${photo.altText || collection.title}`}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setActivePhotoIndex(idx); }}
              style={{
                borderRadius: '4px',
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#EDE7DC',
                position: 'relative',
                aspectRatio: '3 / 2',
                border: '1px solid rgba(140, 110, 83, 0.15)',
                transition: 'transform 0.2s ease',
              }}
            >
              <img
                src={photo.url}
                alt={photo.altText || `${collection.title} - Ảnh ${idx + 1}`}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  transition: 'transform 0.4s ease',
                  ...getFocalPointStyle(photo.focalX, photo.focalY),
                }}
              />

              {/* Hover Overlay with caption */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(41, 35, 31, 0.85) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '1.2rem',
                }}
              >
                <div>
                  <div style={{ color: '#EFE6C9', fontSize: '0.75rem', fontWeight: 500 }}>
                    #{idx + 1} / {photos.length}
                  </div>
                  {photo.caption && (
                    <div style={{ color: '#FFFDF9', fontSize: '0.9rem', fontWeight: 500, marginTop: '0.2rem' }}>
                      {photo.caption}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Real Related Concept or Service Card (Only if authoritative relation exists) */}
        {(relatedConcept || relatedService) && (
          <section style={{ marginTop: '4rem', padding: '2.5rem', backgroundColor: '#FFFDF9', borderRadius: '4px', border: '1px solid rgba(140, 110, 83, 0.2)' }}>
            <span style={{ display: 'block', fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8C6E53', fontWeight: 600, marginBottom: '0.5rem' }}>
              THÔNG TIN LIÊN QUAN
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                {relatedConcept && (
                  <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.8rem', color: '#29231F', margin: '0 0 0.4rem 0' }}>
                    Concept: {relatedConcept.name}
                  </h3>
                )}
                {relatedService && (
                  <p style={{ fontSize: '0.95rem', color: '#604634', margin: 0 }}>
                    Dịch vụ: <strong>{relatedService.name}</strong>
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {relatedConcept && (
                  <Link
                    to={`/concept/${relatedConcept.slug}`}
                    className="public-btn-primary"
                    style={{ textDecoration: 'none', padding: '0.65rem 1.4rem', fontSize: '0.88rem' }}
                  >
                    Xem concept này
                  </Link>
                )}
                {relatedService && (
                  <Link
                    to={`/dich-vu/${relatedService.slug || relatedService.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.65rem 1.4rem',
                      fontSize: '0.88rem',
                      color: '#29231F',
                      backgroundColor: '#FAF8F3',
                      border: '1px solid rgba(140, 110, 83, 0.3)',
                      borderRadius: '4px',
                      textDecoration: 'none',
                    }}
                  >
                    Xem dịch vụ
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Bottom Booking Prompt */}
        <div style={{ marginTop: '4rem', textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: '#FFFDF9', borderRadius: '4px', border: '1px solid rgba(140, 110, 83, 0.2)' }}>
          <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '2rem', color: '#29231F', marginBottom: '0.8rem', fontWeight: 500 }}>
            Yêu thích phong cách của bộ ảnh này?
          </h3>
          <p style={{ fontSize: '0.95rem', color: '#604634', maxWidth: '600px', margin: '0 auto 1.8rem', fontWeight: 300 }}>
            Đặt lịch chụp trực tuyến để Maison MIPA chuẩn bị bối cảnh và trải nghiệm trọn vẹn cho bạn.
          </p>
          <button
            onClick={handleBookConcept}
            className="public-btn-primary"
            style={{ padding: '0.85rem 2.2rem', fontSize: '0.95rem' }}
          >
            Đặt lịch chụp ngay
          </button>
        </div>
      </main>

      {/* Accessible Fullscreen Lightbox */}
      {activePhoto && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Chi tiết ảnh ${activePhotoIndex! + 1} của ${photos.length}`}
          tabIndex={-1}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 20, 16, 0.98)',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '1.5rem',
            outline: 'none',
          }}
        >
          {/* Lightbox Top Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#FFFDF6' }}>
            <div style={{ fontSize: '0.9rem', color: '#EFE6C9', letterSpacing: '0.05em' }}>
              <strong>{collection.title}</strong> • {activePhotoIndex! + 1} / {photos.length}
            </div>

            <button
              onClick={() => setActivePhotoIndex(null)}
              aria-label="Đóng xem ảnh"
              style={{
                border: 'none',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#FFF',
                padding: '0.5rem',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={24} />
            </button>
          </div>

          {/* Lightbox Main Stage */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* Prev Button */}
            <button
              onClick={() => setActivePhotoIndex((activePhotoIndex! - 1 + photos.length) % photos.length)}
              aria-label="Ảnh trước đó"
              style={{
                position: 'absolute',
                left: '10px',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#FFF',
                padding: '0.8rem',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <ArrowLeft size={24} />
            </button>

            {/* Displayed Image */}
            <img
              src={activePhoto.url}
              alt={activePhoto.altText || `${collection.title} - Ảnh ${activePhotoIndex! + 1}`}
              style={{
                maxWidth: '90vw',
                maxHeight: '75vh',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
            />

            {/* Next Button */}
            <button
              onClick={() => setActivePhotoIndex((activePhotoIndex! + 1) % photos.length)}
              aria-label="Ảnh kế tiếp"
              style={{
                position: 'absolute',
                right: '10px',
                border: 'none',
                background: 'rgba(0, 0, 0, 0.6)',
                color: '#FFF',
                padding: '0.8rem',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 2,
              }}
            >
              <ArrowRight size={24} />
            </button>
          </div>

          {/* Lightbox Bottom Caption */}
          <div style={{ textAlign: 'center', color: '#EFE6C9', padding: '0.5rem' }}>
            {activePhoto.caption ? (
              <div style={{ fontSize: '1.05rem', fontWeight: 500, color: '#FFFDF6' }}>{activePhoto.caption}</div>
            ) : (
              <div style={{ fontSize: '0.85rem', color: '#EFE6C9' }}>Maison MIPA / Saigon</div>
            )}
            <div style={{ fontSize: '0.8rem', color: 'rgba(239, 230, 201, 0.6)', marginTop: '0.2rem' }}>
              Dùng phím mũi tên ← → trên bàn phím để chuyển ảnh, Esc để đóng.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionDetailPage;
