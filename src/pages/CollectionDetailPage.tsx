// ==============================================================================
// Maison MIPA Memories - Collection Detail Page (/portfolio/:slug)
// Photo-first visual commerce structure:
// Cinematic Header -> Title & authoritative description -> Rhythmic Photo Essay Gallery
// -> Darkroom Lightbox -> Authoritative related concept/service -> Booking CTA
// Zero unrelated photo fallbacks; zero invented relations.
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getCollectionBySlug, getPublicConcepts } from '../services/portfolioService';
import { getServices } from '../services/catalogService';
import { getPhotoObjectPosition, getPhotoOrientation } from '../utils/photoUtils';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import type { PortfolioCollection, PortfolioPhoto, Concept, ServiceCategory } from '../types';
import { ChevronRight, Home, Layers } from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { DarkroomLightbox } from '../components/public/DarkroomLightbox';

interface CollectionDetailPageProps {
  onOpenBooking?: (conceptSlug?: string) => void;
}

interface PhotoEssayBlock {
  type: 'hero' | 'pair' | 'centered' | 'asymmetric';
  photos: { photo: PortfolioPhoto; index: number }[];
}

const EMPTY_PHOTOS: PortfolioPhoto[] = [];

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

  const photos = collection?.photos || EMPTY_PHOTOS;

  const coverPhoto = collection
    ? (collection.coverPhotoId
        ? photos.find(p => p.id === collection.coverPhotoId)
        : photos.find(p => p.url === collection.coverPhotoUrl)
          ?? photos.find(p => p.featured)
          ?? photos[0])
    : undefined;

  const coverUrl = coverPhoto?.url || collection?.coverPhotoUrl;

  // Partition photos into visual essay blocks with varying rhythm
  const photoBlocks = useMemo(() => {
    if (!photos || photos.length === 0) return [];
    const blocks: PhotoEssayBlock[] = [];
    let i = 0;
    const pattern: Array<'hero' | 'pair' | 'centered' | 'asymmetric'> = [
      'hero',
      'pair',
      'centered',
      'asymmetric',
    ];
    let patternIdx = 0;

    while (i < photos.length) {
      const remaining = photos.length - i;
      const type = pattern[patternIdx % pattern.length];
      patternIdx++;

      if (type === 'hero') {
        blocks.push({
          type: 'hero',
          photos: [{ photo: photos[i], index: i }],
        });
        i += 1;
      } else if (type === 'pair') {
        if (remaining >= 2) {
          blocks.push({
            type: 'pair',
            photos: [
              { photo: photos[i], index: i },
              { photo: photos[i + 1], index: i + 1 },
            ],
          });
          i += 2;
        } else {
          blocks.push({
            type: 'centered',
            photos: [{ photo: photos[i], index: i }],
          });
          i += 1;
        }
      } else if (type === 'centered') {
        blocks.push({
          type: 'centered',
          photos: [{ photo: photos[i], index: i }],
        });
        i += 1;
      } else if (type === 'asymmetric') {
        if (remaining >= 2) {
          blocks.push({
            type: 'asymmetric',
            photos: [
              { photo: photos[i], index: i },
              { photo: photos[i + 1], index: i + 1 },
            ],
          });
          i += 2;
        } else {
          blocks.push({
            type: 'centered',
            photos: [{ photo: photos[i], index: i }],
          });
          i += 1;
        }
      }
    }
    return blocks;
  }, [photos]);

  const renderPhotoItem = (photo: PortfolioPhoto, idx: number, customAspect?: string) => {
    const isPortrait = getPhotoOrientation(photo) === 'PORTRAIT';
    const aspect = customAspect || (isPortrait ? '4 / 5' : '3 / 2');

    return (
      <button
        type="button"
        key={photo.id || idx}
        onClick={() => setActivePhotoIndex(idx)}
        className="editorial-image-frame vc-image-frame"
        aria-label={`Xem ảnh ${idx + 1} của ${photos.length}: ${photo.altText || collection?.title}`}
        style={{
          borderRadius: '4px',
          overflow: 'hidden',
          cursor: 'pointer',
          backgroundColor: '#EDE7DC',
          position: 'relative',
          aspectRatio: aspect,
          border: '1px solid rgba(140, 110, 83, 0.15)',
          width: '100%',
          padding: 0,
          margin: 0,
          background: 'none',
          font: 'inherit',
          textAlign: 'inherit',
          display: 'block',
        }}
      >
        <img
          src={photo.url}
          alt={photo.altText || `${collection?.title} - Ảnh ${idx + 1}`}
          loading="lazy"
          decoding="async"
          width={photo.width}
          height={photo.height}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            objectFit: 'cover',
            objectPosition: getPhotoObjectPosition(photo),
          }}
        />

        {/* Hover / focus caption overlay */}
        <div
          className="photo-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(21, 17, 14, 0.88) 0%, transparent 60%)',
            display: 'flex',
            alignItems: 'flex-end',
            padding: '1.2rem',
            opacity: 0,
            transition: 'opacity var(--motion-normal) ease',
          }}
        >
          <div>
            <div style={{ color: '#EFE6C9', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.05em' }}>
              #{idx + 1} / {photos.length}
            </div>
            {photo.caption && (
              <div style={{ color: '#FFFDF9', fontSize: '0.92rem', fontWeight: 500, marginTop: '0.2rem' }}>
                {photo.caption}
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

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
          <Link to="/portfolio" className="vc-primary-button" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={16} /> Quay lại danh mục
          </Link>
        </div>
      </div>
    );
  }

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
      <header style={{ maxWidth: '1350px', margin: '1.5rem auto 3rem', padding: '0 1.5rem' }}>
        <div
          style={{
            position: 'relative',
            borderRadius: '4px',
            overflow: 'hidden',
            minHeight: '440px',
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
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: getPhotoObjectPosition(coverPhoto),
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
              background: 'linear-gradient(to top, rgba(21, 17, 14, 0.94) 0%, rgba(21, 17, 14, 0.45) 55%, transparent 100%)',
            }}
          />

          <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(1.5rem, 5vw, 3.5rem)', maxWidth: '850px' }}>
            {collection.conceptName && (
              <div className="vc-overline" style={{ color: '#EFE6C9', marginBottom: '0.6rem' }}>
                CONCEPT • {collection.conceptName}
              </div>
            )}

            <h1
              className="vc-display"
              style={{
                color: '#FFFDF9',
                margin: '0 0 1rem 0',
                lineHeight: 1.15,
                fontWeight: 500,
              }}
            >
              {collection.title}
            </h1>

            {collection.description && (
              <p className="vc-copy" style={{ color: '#EFE6C9', margin: '0 0 1.8rem 0', maxWidth: '650px', fontWeight: 300 }}>
                {collection.description}
              </p>
            )}

            {/* Direct Booking CTA */}
            <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleBookConcept}
                className="vc-primary-button"
                style={{ backgroundColor: '#EFE6C9', color: '#29231F' }}
              >
                Đặt concept này
              </button>

              <span style={{ color: 'rgba(239, 230, 201, 0.8)', fontSize: '0.88rem' }}>
                {photos.length} tác phẩm tuyển chọn
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Rhythmic Photo Essay Gallery */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="vc-section-title" style={{ margin: 0 }}>
            Bộ ảnh chi tiết
          </h2>
          <span style={{ fontSize: '0.85rem', color: '#8C6E53' }}>
            Nhấp để mở Darkroom Lightbox (← / → / Esc)
          </span>
        </div>

        {/* Photo Essay Blocks */}
        <div className="photo-essay-container">
          {photoBlocks.map((block, bIdx) => {
            if (block.type === 'hero') {
              const { photo, index } = block.photos[0];
              return (
                <div key={`block-${bIdx}`} className="photo-essay-hero-block">
                  {renderPhotoItem(photo, index, '16 / 10')}
                </div>
              );
            }

            if (block.type === 'pair') {
              return (
                <div key={`block-${bIdx}`} className="photo-essay-pair-block">
                  {block.photos.map(({ photo, index }) => renderPhotoItem(photo, index, '4 / 5'))}
                </div>
              );
            }

            if (block.type === 'centered') {
              const { photo, index } = block.photos[0];
              return (
                <div key={`block-${bIdx}`} className="photo-essay-centered-block">
                  {renderPhotoItem(photo, index, '4 / 5')}
                </div>
              );
            }

            if (block.type === 'asymmetric') {
              return (
                <div key={`block-${bIdx}`} className="photo-essay-asymmetric-block">
                  {block.photos.map(({ photo, index }, idx) =>
                    renderPhotoItem(photo, index, idx === 0 ? '16 / 10' : '4 / 5')
                  )}
                </div>
              );
            }

            return null;
          })}
        </div>

        {/* Authoritative Related Concept or Service */}
        {(relatedConcept || relatedService) && (
          <section style={{ marginTop: '4.5rem', padding: '2.5rem', backgroundColor: '#FFFDF9', borderRadius: '4px', border: '1px solid rgba(140, 110, 83, 0.2)' }}>
            <span className="vc-overline" style={{ display: 'block', marginBottom: '0.5rem' }}>
              THÔNG TIN LIÊN QUAN
            </span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              <div>
                {relatedConcept && (
                  <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.8rem', color: '#29231F', margin: '0 0 0.4rem 0', fontWeight: 500 }}>
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
                    className="vc-primary-button"
                  >
                    Xem concept này
                  </Link>
                )}
                {relatedService && (
                  <Link
                    to={`/dich-vu/${relatedService.slug || relatedService.id}`}
                    className="vc-secondary-button"
                  >
                    Xem dịch vụ
                  </Link>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Bottom Booking Prompt */}
        <div style={{ marginTop: '4rem', textAlign: 'center', padding: '3.5rem 1.5rem', backgroundColor: '#FFFDF9', borderRadius: '4px', border: '1px solid rgba(140, 110, 83, 0.2)' }}>
          <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '2.2rem', color: '#29231F', marginBottom: '0.8rem', fontWeight: 500 }}>
            Lưu giữ khoảnh khắc theo phong cách này
          </h3>
          <p className="vc-copy" style={{ maxWidth: '580px', margin: '0 auto 1.8rem' }}>
            Đặt lịch trực tiếp để Maison MIPA chuẩn bị không gian, ánh sáng và bối cảnh chuẩn xác cho buổi chụp của bạn.
          </p>
          <button
            onClick={handleBookConcept}
            className="vc-primary-button"
            style={{ padding: '0.85rem 2.4rem' }}
          >
            Đặt lịch chụp ngay
          </button>
        </div>
      </main>

      {/* Accessible Darkroom Lightbox (#15110E presentation) */}
      {activePhotoIndex !== null && photos.length > 0 && (
        <DarkroomLightbox
          photos={photos}
          currentIndex={activePhotoIndex}
          collectionTitle={collection.title}
          onClose={() => setActivePhotoIndex(null)}
          onSelectIndex={(index) => setActivePhotoIndex(index)}
        />
      )}
    </div>
  );
};

export default CollectionDetailPage;
