// ==============================================================================
// Maison MIPA Memories - Collection Detail Page (/portfolio/:slug)
// Photo-first visual commerce structure:
// Cinematic Header -> Title & authoritative description -> Rhythmic Photo Essay Gallery
// -> Darkroom Lightbox -> Authoritative related concept/service -> Booking CTA
// Zero unrelated photo fallbacks; zero invented relations.
// ==============================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { getCollectionBySlug, getCollectionBySlugSync, getPublicConcepts, deleteCollection, deletePortfolioPhoto, updateCollection, replacePortfolioPhoto } from '../services/portfolioService';
import { getServices } from '../services/catalogService';
import { getPhotoObjectPosition, getPhotoOrientation } from '../utils/photoUtils';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import type { PortfolioCollection, PortfolioPhoto, Concept, ServiceCategory } from '../types';
import { ChevronRight, Home, Layers, Edit3, Trash2, Plus, ShieldCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { DarkroomLightbox } from '../components/public/DarkroomLightbox';
import { InPlaceImageEditor } from '../components/common/InPlaceImageEditor';
import { useAuth } from '../context/AuthContext';
import { useSiteAssets } from '../context/SiteAssetContext';
import { PortfolioCollectionModal } from '../components/portfolio/PortfolioCollectionModal';
import { AddPhotoModal } from '../components/portfolio/AddPhotoModal';

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
  const location = useLocation();

  const { user, isRootOwner, role } = useAuth();
  const canManage = Boolean(user && (isRootOwner || role === 'ADMIN' || role === 'MANAGER'));

  // Instant zero-latency initialization: from router state or synchronous cache
  const routeStateCollection = (location.state as any)?.collection as PortfolioCollection | undefined;
  const initialCol =
    (routeStateCollection?.slug === slug ? routeStateCollection : null) ||
    (slug ? getCollectionBySlugSync(slug) : null);

  const [collection, setCollection] = useState<PortfolioCollection | null>(initialCol);
  const [relatedConcept, setRelatedConcept] = useState<Concept | null>(null);
  const [relatedService, setRelatedService] = useState<ServiceCategory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCol);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lightbox State
  const [activePhotoIndex, setActivePhotoIndex] = useState<number | null>(null);

  // Management Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddPhotoModalOpen, setIsAddPhotoModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<PortfolioPhoto | null>(null);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchCollection() {
      if (!slug) return;
      if (!collection) {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        // Fast path: if collection already has photos, no need to re-fetch collection immediately
        const colPromise =
          collection && collection.photos && collection.photos.length > 0
            ? Promise.resolve(collection)
            : getCollectionBySlug(slug);

        const data = await colPromise;

        if (mounted) {
          if (!data) {
            setErrorMessage('Không tìm thấy bộ sưu tập được yêu cầu.');
            setIsLoading(false);
            return;
          }
          setCollection(data);
          setIsLoading(false);
        }

        // Fetch related concepts and services in background without blocking visual rendering
        Promise.all([getPublicConcepts(), getServices()])
          .then(([allConcepts, allServices]) => {
            if (!mounted || !data) return;

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
          })
          .catch((e) => console.warn('Non-blocking related catalog load error:', e));
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.message || 'Lỗi khi tải bộ sưu tập.');
          setIsLoading(false);
        }
      }
    }

    fetchCollection();
    return () => {
      mounted = false;
    };
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

  const handleCollectionSaved = (updatedCol: PortfolioCollection) => {
    setCollection(updatedCol);
    if (updatedCol.slug && updatedCol.slug !== slug) {
      navigate(`/portfolio/${updatedCol.slug}`, { replace: true, state: { collection: updatedCol } });
    }
  };

  const handleDeleteCollection = async () => {
    if (!collection?.id) return;
    setIsDeleting(true);
    try {
      await deleteCollection(collection.id);
      setIsDeleteModalOpen(false);
      navigate('/portfolio', { replace: true });
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa bộ sưu tập.');
      setIsDeleting(false);
    }
  };

  const handlePhotoAdded = (newPhoto: PortfolioPhoto) => {
    setCollection((prev) => {
      if (!prev) return null;
      const updatedPhotos = [...(prev.photos || []), newPhoto];
      return {
        ...prev,
        photos: updatedPhotos,
        photosCount: updatedPhotos.length,
        coverPhotoUrl: prev.coverPhotoUrl || newPhoto.url,
      };
    });
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete?.id) return;
    setIsDeletingPhoto(true);
    try {
      await deletePortfolioPhoto(photoToDelete.id);
      setCollection((prev) => {
        if (!prev) return null;
        const updated = (prev.photos || []).filter((p) => p.id !== photoToDelete.id);
        return {
          ...prev,
          photos: updated,
          photosCount: updated.length,
        };
      });
      setPhotoToDelete(null);
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa ảnh.');
    } finally {
      setIsDeletingPhoto(false);
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
      <div key={photo.id || idx} style={{ position: 'relative', width: '100%' }}>
        {canManage && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setPhotoToDelete(photo);
            }}
            title="Xóa ảnh này khỏi bộ sưu tập"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 35,
              backgroundColor: 'rgba(21, 17, 14, 0.85)',
              color: '#FEB2B2',
              border: '1px solid rgba(229, 62, 62, 0.5)',
              borderRadius: '4px',
              padding: '0.35rem 0.65rem',
              fontSize: '0.74rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          >
            <Trash2 size={12} /> Xóa ảnh
          </button>
        )}
        <InPlaceImageEditor
          assetId={`portfolio_photo_${collection?.slug}_${photo.id || idx}`}
          currentImageUrl={photo.url}
          label={`Ảnh #${idx + 1}: ${photo.altText || collection?.title || 'Bộ ảnh'}`}
          onImageUpdated={async (newUrl) => {
            setCollection((prev) => {
              if (!prev) return null;
              const updated = (prev.photos || []).map((p, i) =>
                i === idx ? { ...p, url: newUrl } : p
              );
              return { ...prev, photos: updated };
            });
            if (photo.id) {
              try {
                await replacePortfolioPhoto(photo.id, newUrl);
              } catch (err) {
                console.warn('Lỗi lưu ảnh thay thế:', err);
              }
            }
          }}
          onImageDeleted={async () => {
            setCollection((prev) => {
              if (!prev) return null;
              const updated = (prev.photos || []).filter((_, i) => i !== idx);
              return { ...prev, photos: updated };
            });
            if (photo.id) {
              try {
                await deletePortfolioPhoto(photo.id);
              } catch (err) {
                console.warn('Lỗi xóa ảnh:', err);
              }
            }
          }}
          containerStyle={{ width: '100%', display: 'block' }}
        >
          <button
            type="button"
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
                background: 'linear-gradient(to top, rgba(21, 17, 14, 0.82) 0%, rgba(21, 17, 14, 0.1) 40%, transparent 100%)',
                opacity: 0,
                transition: 'opacity 0.25s ease',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}>
                <div>
                  {photo.caption && (
                    <p style={{ color: '#FBF6EE', fontSize: '0.88rem', margin: '0 0 0.2rem 0', fontWeight: 400 }}>
                      {photo.caption}
                    </p>
                  )}
                  <span style={{ color: '#D1C4B7', fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Ảnh {idx + 1} / {photos.length}
                  </span>
                </div>
                <span style={{ color: '#C6A45F', fontSize: '0.8rem', fontWeight: 500, letterSpacing: '0.05em' }}>
                  Phóng to ↗
                </span>
              </div>
            </div>
          </button>
        </InPlaceImageEditor>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '85vh', backgroundColor: '#FAF8F3', padding: '2rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '1350px', margin: '0 auto' }}>
          {/* Skeleton Breadcrumbs */}
          <div style={{ width: '220px', height: '14px', backgroundColor: 'rgba(140, 110, 83, 0.15)', borderRadius: '4px', marginBottom: '2rem' }} />
          {/* Skeleton Hero Frame */}
          <div
            style={{
              width: '100%',
              height: '420px',
              borderRadius: '4px',
              backgroundColor: '#EDE7DC',
              backgroundImage: 'linear-gradient(90deg, #EDE7DC 0%, #F5EFE6 50%, #EDE7DC 100%)',
              backgroundSize: '200% 100%',
              animation: 'marqueeScroll 2s linear infinite',
              marginBottom: '3rem',
            }}
          />
          {/* Skeleton Photo Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            <div style={{ height: '380px', backgroundColor: 'rgba(140, 110, 83, 0.12)', borderRadius: '4px' }} />
            <div style={{ height: '380px', backgroundColor: 'rgba(140, 110, 83, 0.12)', borderRadius: '4px' }} />
          </div>
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

      {/* Admin Action Bar for Root Owner / Admin */}
      {canManage && (
        <div
          style={{
            backgroundColor: '#29231F',
            color: '#FAF8F3',
            borderBottom: '1px solid #C6A45F',
            padding: '0.65rem 1.5rem',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          }}
        >
          <div
            style={{
              maxWidth: '1350px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck size={16} color="#C6A45F" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, letterSpacing: '0.04em', color: '#EFE6C9' }}>
                QUẢN TRỊ BỘ SƯU TẬP
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '3px',
                  backgroundColor: collection.status === 'PUBLISHED' ? 'rgba(72, 187, 120, 0.2)' : 'rgba(237, 137, 54, 0.2)',
                  color: collection.status === 'PUBLISHED' ? '#68D391' : '#F6AD55',
                  fontWeight: 600,
                }}
              >
                ● {collection.status === 'PUBLISHED' ? 'ĐÃ XUẤT BẢN' : collection.status === 'DRAFT' ? 'BẢN NHÁP' : 'LƯU TRỮ'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  backgroundColor: '#C6A45F',
                  color: '#29231F',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={13} /> Sửa Bộ Ảnh Này
              </button>

              <button
                type="button"
                onClick={() => setIsAddPhotoModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  backgroundColor: 'rgba(255, 253, 249, 0.12)',
                  color: '#FAF8F3',
                  border: '1px solid rgba(255, 253, 249, 0.3)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} /> Thêm Ảnh
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  backgroundColor: 'rgba(229, 62, 62, 0.18)',
                  color: '#FEB2B2',
                  border: '1px solid rgba(229, 62, 62, 0.4)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={13} /> Xóa Bộ Sưu Tập
              </button>
            </div>
          </div>
        </div>
      )}

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
        <InPlaceImageEditor
          assetId={`portfolio_col_hero_${collection.slug}`}
          currentImageUrl={coverUrl || '/studio.png'}
          label={`Ảnh bìa: ${collection.title}`}
          onImageUpdated={async (newUrl) => {
            setCollection((prev) => (prev ? { ...prev, coverPhotoUrl: newUrl } : null));
            if (collection.id) {
              try {
                await updateCollection(collection.id, { coverPhotoUrl: newUrl });
              } catch (err) {
                console.warn('Lỗi lưu ảnh bìa bộ sưu tập:', err);
              }
            }
          }}
          onImageDeleted={async () => {
            setCollection((prev) => (prev ? { ...prev, coverPhotoUrl: '' } : null));
            if (collection.id) {
              try {
                await updateCollection(collection.id, { coverPhotoUrl: '' });
              } catch (err) {
                console.warn('Lỗi xóa ảnh bìa bộ sưu tập:', err);
              }
            }
          }}
          containerStyle={{ width: '100%', position: 'relative' }}
        >
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <h1
                  className="vc-display"
                  style={{
                    color: '#FFFDF9',
                    margin: 0,
                    lineHeight: 1.15,
                    fontWeight: 500,
                  }}
                >
                  {collection.title}
                </h1>

                {canManage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditModalOpen(true);
                    }}
                    title="Chỉnh sửa tiêu đề & lời tựa bộ ảnh"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem',
                      backgroundColor: 'rgba(198, 164, 95, 0.9)',
                      color: '#29231F',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    }}
                  >
                    <Edit3 size={13} /> Sửa Tiêu Đề & Lời Tựa
                  </button>
                )}
              </div>

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
        </InPlaceImageEditor>
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

        {/* Admin Add Photos button */}
        {canManage && (
          <div style={{ margin: '2.5rem auto 1rem', textAlign: 'center' }}>
            <button
              type="button"
              onClick={() => setIsAddPhotoModalOpen(true)}
              style={{
                padding: '0.9rem 2.25rem',
                backgroundColor: '#FFFDF9',
                border: '2px dashed rgba(140, 110, 83, 0.35)',
                borderRadius: '6px',
                color: '#604634',
                fontSize: '0.92rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.55rem',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <Plus size={18} color="#8C6E53" /> Thêm Ảnh Mới Vào Bộ Sưu Tập Này
            </button>
          </div>
        )}

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

      {/* Edit Collection Modal */}
      {isEditModalOpen && (
        <PortfolioCollectionModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          collection={collection}
          onSaved={handleCollectionSaved}
        />
      )}

      {/* Add Photo Modal */}
      {isAddPhotoModalOpen && (
        <AddPhotoModal
          isOpen={isAddPhotoModalOpen}
          onClose={() => setIsAddPhotoModalOpen(false)}
          collectionId={collection.id}
          collectionTitle={collection.title}
          onPhotoAdded={handlePhotoAdded}
        />
      )}

      {/* Delete Collection Confirmation Modal */}
      {isDeleteModalOpen && (
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
          onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '8px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#FFF5F5',
                color: '#E53E3E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto',
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.6rem', color: '#29231F', margin: '0 0 0.6rem 0' }}>
              Xác nhận xóa bộ sưu tập?
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#604634', margin: '0 0 1.5rem 0', lineHeight: 1.6 }}>
              Hành động này sẽ xóa vĩnh viễn bộ ảnh <strong>"{collection.title}"</strong> khỏi Portfolio. Quá trình này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsDeleteModalOpen(false)}
                style={{
                  padding: '0.65rem 1.4rem',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  borderRadius: '4px',
                  color: '#604634',
                  fontSize: '0.88rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteCollection}
                style={{
                  padding: '0.65rem 1.6rem',
                  backgroundColor: '#E53E3E',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FAF8F3',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: isDeleting ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                {isDeleting ? 'Đang xóa...' : 'Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Photo Confirmation Modal */}
      {photoToDelete && (
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
          onClick={() => !isDeletingPhoto && setPhotoToDelete(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              borderRadius: '8px',
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '1.4rem', color: '#29231F', margin: '0 0 0.5rem 0' }}>
              Xóa ảnh khỏi bộ sưu tập?
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#604634', margin: '0 0 1.25rem 0' }}>
              Ảnh này sẽ được gỡ khỏi bộ ảnh "{collection.title}".
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={() => setPhotoToDelete(null)}
                style={{
                  padding: '0.55rem 1.2rem',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  borderRadius: '4px',
                  color: '#604634',
                  fontSize: '0.85rem',
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeletingPhoto}
                onClick={confirmDeletePhoto}
                style={{
                  padding: '0.55rem 1.4rem',
                  backgroundColor: '#E53E3E',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#FAF8F3',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: isDeletingPhoto ? 'wait' : 'pointer',
                }}
              >
                {isDeletingPhoto ? 'Đang xóa...' : 'Xóa Ảnh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CollectionDetailPage;
