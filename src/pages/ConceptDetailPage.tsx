// ==============================================================================
// Maison MIPA Memories — Concept Detail Page (/concept/:slug)
// Authoritative data, editorial gallery sequence, related packages, booking CTA.
// Strict state separation: LOADING, READY, NOT_FOUND (404), ERROR.
// Zero fake fallback photos; truthful bookable semantics; responsive mobile gallery.
// ==============================================================================
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getConceptBySlug, getPublicCollections } from '../services/portfolioService';
import { getServices, getPackages } from '../services/catalogService';
import type { Concept, ServiceCategory, PackageItem } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { ChevronRight, Home, Calendar, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';

interface ConceptDetailPageProps {
  onOpenBooking: () => void;
}

export const ConceptDetailPage: React.FC<ConceptDetailPageProps> = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [concept, setConcept] = useState<Concept | null>(null);
  const [relatedService, setRelatedService] = useState<ServiceCategory | null>(null);
  const [relatedPackages, setRelatedPackages] = useState<PackageItem[]>([]);
  const [galleryPhotos, setGalleryPhotos] = useState<{ url: string; altText: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const loadConceptDetail = useCallback(async () => {
    if (!slug) return;
    setIsLoading(true);
    setHasError(false);
    setNotFound(false);

    try {
      const found = await getConceptBySlug(slug);
      if (!found) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setConcept(found);

      // Fetch related collections & services in parallel
      const [collections, services, packages] = await Promise.all([
        getPublicCollections(found.id),
        getServices(),
        found.serviceId ? getPackages(found.serviceId) : Promise.resolve([]),
      ]);

      // Resolve service
      if (found.serviceId) {
        const srv = services.find((s) => s.id === found.serviceId);
        if (srv) setRelatedService(srv);
      }

      // Resolve packages matching strictly this concept's service
      const matchedPkgs = packages.filter((p) => p.serviceId === found.serviceId);
      setRelatedPackages(matchedPkgs.slice(0, 3));

      // Build deterministic editorial gallery photos from actual collections
      const photos: { url: string; altText: string }[] = [];
      if (found.coverPhotoUrl) {
        photos.push({ url: found.coverPhotoUrl, altText: `${found.name} — Cover` });
      }

      collections.forEach((col) => {
        if (col.photos) {
          col.photos.forEach((p) => {
            if (p.url && !photos.some((existing) => existing.url === p.url)) {
              photos.push({ url: p.url, altText: p.altText || found.name });
            }
          });
        }
      });

      setGalleryPhotos(photos);
    } catch (err) {
      console.error('Lỗi tải concept chi tiết:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadConceptDetail();
  }, [loadConceptDetail]);

  // 1. LOADING STATE
  if (isLoading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF8F3' }}>
        <div style={{ color: '#8C6E53', fontSize: '0.95rem' }}>Đang tải thông tin concept...</div>
      </div>
    );
  }

  // 2. ERROR STATE (Backend or Network Error)
  if (hasError) {
    return (
      <div style={{ minHeight: '70vh', padding: '6rem 1.5rem', textAlign: 'center', backgroundColor: '#FAF8F3' }}>
        <h1 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '2.5rem', color: '#29231F', marginBottom: '1rem' }}>
          Không thể tải thông tin concept.
        </h1>
        <p style={{ color: '#604634', marginBottom: '2rem' }}>
          Đã có lỗi xảy ra trong quá trình kết nối. Quý khách vui lòng thử lại hoặc quay lại danh mục.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => loadConceptDetail()}
            className="public-btn-primary"
            style={{ padding: '0.75rem 2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <RotateCcw size={16} /> Thử lại
          </button>
          <Link
            to="/concept"
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: '#FAF8F3',
              color: '#29231F',
              border: '1px solid #8C6E53',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Quay lại concept
          </Link>
        </div>
      </div>
    );
  }

  // 3. NOT FOUND STATE (Authoritative 404 - concept is null in DB)
  if (notFound || !concept) {
    return (
      <div style={{ minHeight: '70vh', padding: '6rem 1.5rem', textAlign: 'center', backgroundColor: '#FAF8F3' }}>
        <h1 style={{ fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)', fontSize: '2.5rem', color: '#29231F', marginBottom: '1rem' }}>
          Không tìm thấy concept
        </h1>
        <p style={{ color: '#604634', marginBottom: '2rem' }}>
          Concept bạn tìm kiếm không tồn tại hoặc đã tạm dừng cung cấp.
        </p>
        <Link to="/concept" className="public-btn-primary" style={{ padding: '0.75rem 2rem', textDecoration: 'none' }}>
          Quay lại danh mục concept
        </Link>
      </div>
    );
  }

  // 4. READY STATE
  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Concept', url: getCanonicalUrl('/concept') },
    { name: concept.name, url: getCanonicalUrl(`/concept/${concept.slug}`) },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '100vh', paddingBottom: '6rem' }}>
      <SeoHead
        title={`${concept.name} — Concept Chụp Ảnh Nghệ Thuật | Maison MIPA`}
        description={concept.description || `Khám phá phong cách chụp ảnh ${concept.name} tại Maison MIPA Memories Studio Sài Gòn.`}
        canonicalPath={`/concept/${concept.slug}`}
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
          <li>
            <Link to="/concept" style={{ color: '#8C6E53', textDecoration: 'none' }}>
              Concept
            </Link>
          </li>
          <li><ChevronRight size={13} color="#8C6E53" /></li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            {concept.name}
          </li>
        </ol>
      </nav>

      {/* 01. Hero Photography Section */}
      <section
        style={{
          maxWidth: '1350px',
          margin: '2rem auto 3.5rem',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2rem, 5vw, 4.5rem)',
            alignItems: 'center',
          }}
        >
          {/* Main Visual Frame - Real image or neutral placeholder */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/11',
              borderRadius: '2px',
              overflow: 'hidden',
              backgroundColor: '#EDE7DC',
            }}
          >
            {concept.coverPhotoUrl ? (
              <img
                src={concept.coverPhotoUrl}
                alt={concept.name}
                fetchPriority="high"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            ) : (
              <EditorialImagePlaceholder
                aspectRatio="16/11"
                caption={concept.name}
              />
            )}
          </div>

          {/* Metadata & Description */}
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              {relatedService ? relatedService.name : 'CONCEPT MAISON MIPA'}
            </div>

            <h1
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 1.25rem 0',
              }}
            >
              {concept.name}
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.65,
                color: '#604634',
                margin: '0 0 2rem 0',
                fontWeight: 300,
              }}
            >
              {concept.description}
            </p>

            {/* CTAs with Truthful Bookable Semantics */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {concept.bookable ? (
                <button
                  onClick={() => navigate(`/booking?concept=${concept.slug}`)}
                  className="public-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.9rem 2.25rem',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                  }}
                >
                  <Calendar size={16} /> Đặt lịch concept này
                </button>
              ) : (
                <div
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: '#FFFDF9',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    borderRadius: '4px',
                    fontSize: '0.88rem',
                    color: '#8C6E53',
                  }}
                >
                  Hiện chưa mở đặt lịch
                </div>
              )}

              <Link
                to="/concept"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.9rem',
                  color: '#604634',
                  textDecoration: 'none',
                }}
              >
                ← Quay lại danh mục
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 02. Editorial Sequence Gallery (Responsive CSS Grid: 1-col on mobile <= 767px) */}
      {galleryPhotos.length > 1 && (
        <section
          style={{
            maxWidth: '1350px',
            margin: '4rem auto',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ marginBottom: '2.5rem', borderTop: '1px solid rgba(140, 110, 83, 0.2)', paddingTop: '2.5rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              HÌNH ẢNH CONCEPT
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '2.2rem',
                fontWeight: 500,
                color: '#29231F',
                margin: 0,
              }}
            >
              Góc nhìn & bối cảnh
            </h2>
          </div>

          <div className="concept-gallery-grid">
            {galleryPhotos.map((photo, idx) => {
              const itemClass = idx === 0 ? 'gallery-item-wide' : 'gallery-item-half';
              const aspect = idx === 0 ? '21/9' : '4/5';

              return (
                <div
                  key={idx}
                  className={itemClass}
                  style={{
                    borderRadius: '2px',
                    overflow: 'hidden',
                    backgroundColor: '#EDE7DC',
                    aspectRatio: aspect,
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.altText}
                    loading="lazy"
                    decoding="async"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 03. Relevant Packages & Booking CTA (Strictly matching concept serviceId) */}
      {relatedPackages.length > 0 && (
        <section
          style={{
            maxWidth: '1350px',
            margin: '4rem auto 0',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.5rem',
              }}
            >
              GÓI CHỤP PHÙ HỢP
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '2.3rem',
                fontWeight: 500,
                color: '#29231F',
                margin: 0,
              }}
            >
              Lựa chọn gói chụp cho concept này
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {relatedPackages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.25)',
                  borderRadius: '4px',
                  padding: '2rem 1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: '#8C6E53',
                      fontWeight: 600,
                      marginBottom: '0.4rem',
                    }}
                  >
                    {pkg.durationMinutes} PHÚT {pkg.editedPhotosCount > 0 ? `• ${pkg.editedPhotosCount} ẢNH HẬU KỲ` : ''}
                  </div>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: '1.6rem',
                      color: '#29231F',
                      margin: '0 0 0.5rem 0',
                    }}
                  >
                    {pkg.name}
                  </h3>
                  <div style={{ fontSize: '1.5rem', fontWeight: 600, color: '#29231F', marginBottom: '1.25rem' }}>
                    {new Intl.NumberFormat('vi-VN').format(pkg.price)} đ
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pkg.editedPhotosCount > 0 && (
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                        <Check size={15} color="#8C6E53" /> Hậu kỳ chuyên sâu {pkg.editedPhotosCount} ảnh
                      </li>
                    )}
                    {pkg.features && pkg.features.slice(0, 3).map((f, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: '#604634' }}>
                        <Check size={15} color="#8C6E53" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() =>
                    navigate(`/booking?concept=${concept.slug}&service=${pkg.serviceId}&package=${pkg.id}`)
                  }
                  className="public-btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                  }}
                >
                  Đặt lịch gói này
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ConceptDetailPage;
