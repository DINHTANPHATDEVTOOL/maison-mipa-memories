// ==============================================================================
// Maison MIPA Memories - Collection Detail Page (/portfolio/:slug) (#16 & #6)
// Requirements:
// - Cinematic cover
// - Gallery of collection photos with responsive sizing & focal point framing
// - Accessible Lightbox (keyboard arrows Left/Right, Escape, focus trap)
// - Alt text and captions
// - Bookable CTA: "Đặt Concept này" -> /booking?concept=<slug>
// - Canonical / SEO meta
// ==============================================================================
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCollectionBySlug } from '../services/portfolioService';
import { getFocalPointStyle } from '../utils/imageOptimizer';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import type { PortfolioCollection, PortfolioPhoto } from '../types';
import {
  ChevronRight,
  Home,
  Camera,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  X,
  Calendar,
  Layers,
} from 'lucide-react';

interface CollectionDetailPageProps {
  onOpenBooking?: (conceptSlug?: string) => void;
}

export const CollectionDetailPage: React.FC<CollectionDetailPageProps> = ({ onOpenBooking }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [collection, setCollection] = useState<PortfolioCollection | null>(null);
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
        const data = await getCollectionBySlug(slug);
        if (mounted) {
          if (!data) {
            setErrorMessage('Không tìm thấy bộ sưu tập được yêu cầu.');
          } else {
            setCollection(data);
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
      // Focus trap into lightbox
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
    const targetSlug = collection?.conceptSlug || collection?.slug;
    if (onOpenBooking) {
      onOpenBooking(targetSlug);
    } else {
      navigate(`/booking?concept=${encodeURIComponent(targetSlug || '')}`);
    }
  };

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Portfolio', url: getCanonicalUrl('/portfolio') },
    { name: collection?.title || 'Chi tiết bộ ảnh', url: getCanonicalUrl(`/portfolio/${slug || ''}`) },
  ];

  if (isLoading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--mipa-background)' }}>
        <div style={{ textAlign: 'center', color: '#604634' }}>
          <Sparkles size={32} color="#C6A45F" className="animate-spin" />
          <p style={{ marginTop: '1rem', fontSize: '1rem', fontStyle: 'italic' }}>Đang tải bộ sưu tập nghệ thuật...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !collection) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--mipa-background)' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', marginBottom: '0.8rem' }}>Bộ sưu tập không khả dụng</h2>
          <p style={{ color: '#6E5F55', marginBottom: '1.5rem' }}>{errorMessage || 'Bộ sưu tập này có thể đang ở chế độ nháp hoặc đã được cập nhật.'}</p>
          <Link to="/portfolio" className="btn-mipa-gold" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} /> Xem các bộ ảnh khác
          </Link>
        </div>
      </div>
    );
  }

  const photos = collection.photos || [];
  const activePhoto = activePhotoIndex !== null ? photos[activePhotoIndex] : null;

  return (
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '85vh', paddingBottom: '5rem' }}>
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
          <li><ChevronRight size={14} color="#C6A45F" /></li>
          <li>
            <Link to="/portfolio" style={{ color: '#8C6E53', textDecoration: 'none' }}>
              Portfolio
            </Link>
          </li>
          <li><ChevronRight size={14} color="#C6A45F" /></li>
          <li style={{ fontWeight: 600, color: '#604634' }} aria-current="page">
            {collection.title}
          </li>
        </ol>
      </nav>

      {/* Cinematic Header / Hero Banner */}
      <header style={{ maxWidth: '1350px', margin: '1.5rem auto 2.5rem', padding: '0 1.5rem' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: '28px',
            overflow: 'hidden',
            minHeight: '420px',
            display: 'flex',
            alignItems: 'flex-end',
            backgroundColor: '#2C221E',
            boxShadow: '0 20px 45px rgba(96, 70, 52, 0.2)',
          }}
        >
          <img
            src={collection.coverPhotoUrl || photos[0]?.url || '/hero.png'}
            alt={collection.title}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              ...getFocalPointStyle(photos[0]?.focalX || 50, photos[0]?.focalY || 50),
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(44, 34, 30, 0.95) 0%, rgba(44, 34, 30, 0.3) 50%, transparent 100%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(1.5rem, 5vw, 3.5rem)', maxWidth: '850px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.9rem', borderRadius: '20px', backgroundColor: 'rgba(239, 230, 201, 0.25)', color: '#EFE6C9', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.8rem', backdropFilter: 'blur(6px)' }}>
              <Sparkles size={14} color="#C6A45F" /> CONCEPT: {collection.conceptName || 'MAISON MIPA'}
            </div>

            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.4rem)', color: '#FFFDF6', margin: '0 0 1rem 0', fontFamily: 'var(--mipa-font-heading)', lineHeight: 1.15, fontWeight: 700 }}>
              {collection.title}
            </h1>

            <p style={{ color: '#EFE6C9', fontSize: '1.05rem', lineHeight: 1.6, margin: '0 0 1.8rem 0', maxWidth: '650px' }}>
              {collection.description}
            </p>

            {/* Direct CTA: Đặt Concept Này */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBookConcept}
                className="btn-mipa-gold"
                style={{ padding: '0.85rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}
              >
                <Calendar size={18} /> Đặt Concept Này
              </button>

              <span style={{ color: 'rgba(239, 230, 201, 0.8)', fontSize: '0.88rem' }}>
                {photos.length} hình ảnh nghệ thuật độc bản
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Gallery Section */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#604634', margin: 0, fontFamily: 'var(--mipa-font-heading)' }}>
            Khung Hình Chi Tiết
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#8C6E53' }}>
            Nhấp vào từng ảnh để phóng to và điều hướng bàn phím (← / → / Esc)
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
              className="mipa-card"
              role="button"
              aria-label={`Xem ảnh ${idx + 1}: ${photo.altText || collection.title}`}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setActivePhotoIndex(idx); }}
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                cursor: 'pointer',
                backgroundColor: '#2C221E',
                position: 'relative',
                aspectRatio: '3 / 2',
                boxShadow: 'var(--mipa-shadow-sm)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
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
                  transition: 'transform 0.5s ease',
                  ...getFocalPointStyle(photo.focalX, photo.focalY),
                }}
              />

              {/* Hover Overlay with caption */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(44, 34, 30, 0.8) 0%, transparent 60%)',
                  display: 'flex',
                  alignItems: 'flex-end',
                  padding: '1.2rem',
                  opacity: 0.9,
                }}
              >
                <div>
                  <div style={{ color: '#EFE6C9', fontSize: '0.75rem', fontWeight: 600 }}>
                    #{idx + 1} / {photos.length}
                  </div>
                  {photo.caption && (
                    <div style={{ color: '#FFFDF6', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>
                      {photo.caption}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Booking Prompt */}
        <div style={{ marginTop: '4rem', textAlign: 'center', padding: '3rem 1.5rem', backgroundColor: '#FFFDF6', borderRadius: '24px', border: '1px solid var(--mipa-beige)' }}>
          <h3 style={{ fontSize: '1.8rem', color: '#604634', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)' }}>
            Yêu thích phong cách của bộ ảnh này?
          </h3>
          <p style={{ color: '#6E5F55', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 1.8rem', lineHeight: 1.6 }}>
            Đặt lịch chụp ngay hôm nay để Maison MIPA cùng bạn kiến tạo những khung hình cảm xúc và thơ mộng nhất.
          </p>
          <button
            onClick={handleBookConcept}
            className="btn-mipa-gold"
            style={{ padding: '0.9rem 2.2rem', fontSize: '1.05rem' }}
          >
            <Camera size={18} /> Đặt Lịch Chụp Concept Này
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
            backgroundColor: 'rgba(28, 20, 16, 0.96)',
            backdropFilter: 'blur(10px)',
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
                background: 'rgba(255, 255, 255, 0.1)',
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
                background: 'rgba(0, 0, 0, 0.5)',
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
                borderRadius: '12px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
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
                background: 'rgba(0, 0, 0, 0.5)',
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
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#FFFDF6' }}>{activePhoto.caption}</div>
            ) : (
              <div style={{ fontSize: '0.9rem', color: '#C6A45F' }}>Maison MIPA Memories — Parisian Artistry</div>
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
