// ==============================================================================
// Maison MIPA Memories — Service Detail Page (/dich-vu/:slug)
// Hierarchy: Hero -> Session feeling -> Related concepts -> Selected work -> Packages -> Booking CTA
// Strict data integrity: Only concepts, packages, and stories matching this service.
// Zero unrelated photo fallbacks; zero invented package inclusions.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, Check } from 'lucide-react';
import { getServices, getPackages } from '../services/catalogService';
import { getPublicConcepts, getPublicCollections } from '../services/portfolioService';
import type { ServiceCategory, PackageItem, Concept, PortfolioCollection } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';
import { NotFoundPage } from './NotFoundPage';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';
import { InPlaceImageEditor } from '../components/common/InPlaceImageEditor';

interface ServiceDetailPageProps {
  onOpenBooking: () => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ onOpenBooking }) => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [relatedConcepts, setRelatedConcepts] = useState<Concept[]>([]);
  const [selectedWorks, setSelectedWorks] = useState<PortfolioCollection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    async function loadServiceData() {
      try {
        const [srvs, pkgs, concepts, collections] = await Promise.all([
          getServices(),
          getPackages(),
          getPublicConcepts(),
          getPublicCollections(),
        ]);
        if (active) {
          setServices(srvs);
          setPackages(pkgs);

          const matchedSrv = srvs.find((s) => s.slug === slug || s.id === slug);
          if (matchedSrv) {
            // Strict relation filtering: only concepts matching this service
            const relConcepts = concepts.filter((c) => c.serviceId === matchedSrv.id);
            setRelatedConcepts(relConcepts);

            // Strict relation filtering: only collections matching this service
            const relCollections = collections.filter((col) => col.serviceId === matchedSrv.id);
            setSelectedWorks(relCollections.slice(0, 4));
          } else {
            setRelatedConcepts([]);
            setSelectedWorks([]);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải dữ liệu chi tiết dịch vụ:', err);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadServiceData();
    return () => {
      active = false;
    };
  }, [slug]);

  const serviceConfig = SITE_CONFIG.services.find((s) => s.slug === slug);
  const serviceData = services.find((s) => s.slug === slug || s.id === slug);

  if (!isLoading && !serviceConfig && !serviceData) {
    return <NotFoundPage />;
  }

  const title = serviceConfig?.h1 || `${serviceData?.name || 'Dịch vụ'} — Maison MIPA Memories`;
  const shortTitle = serviceConfig?.shortTitle || serviceData?.name || 'Dịch vụ';
  const description = serviceConfig?.description || serviceData?.description || '';
  const canonicalPath = `/dich-vu/${slug}`;
  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const image = serviceData?.image || serviceConfig?.image;

  // Strict packages for this service ONLY
  const srvPackages = serviceData?.id
    ? packages.filter((p) => p.serviceId === serviceData.id)
    : [];

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Dịch vụ', url: getCanonicalUrl('/dich-vu') },
    { name: shortTitle, url: canonicalUrl },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title={`${shortTitle} | Tiệm Ảnh Maison MIPA Memories`}
        description={description}
        canonicalPath={canonicalPath}
        ogImage={image}
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
            <Link to="/dich-vu" style={{ color: '#8C6E53', textDecoration: 'none' }}>
              Dịch vụ
            </Link>
          </li>
          <li><ChevronRight size={13} color="#8C6E53" /></li>
          <li style={{ fontWeight: 500, color: '#29231F' }} aria-current="page">
            {shortTitle}
          </li>
        </ol>
      </nav>

      {/* 01. Service Hero (Photography First) */}
      <header
        style={{
          maxWidth: '1350px',
          margin: '2rem auto 4.5rem',
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
          <div>
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
              DỊCH VỤ CHỤP ẢNH
            </span>
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
              {title}
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
              {description}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => {
                  if (serviceData?.id) {
                    navigate(`/booking?service=${serviceData.id}`);
                  } else {
                    onOpenBooking();
                  }
                }}
                className="public-btn-primary"
                style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}
              >
                Đặt lịch dịch vụ này
              </button>
              <Link
                to="/bang-gia"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.85rem 1.75rem',
                  fontSize: '0.92rem',
                  color: '#29231F',
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  borderRadius: '4px',
                  textDecoration: 'none',
                }}
              >
                Xem toàn bộ bảng giá <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <InPlaceImageEditor
            assetId={`service_detail_hero_${serviceData?.id || slug}`}
            currentImageUrl={image || ''}
            label={`Dịch vụ: ${title}`}
            onImageUpdated={(newUrl) => {
              setServices((prev) =>
                prev.map((s) => (s.id === serviceData?.id ? { ...s, coverPhotoUrl: newUrl, imageUrl: newUrl } : s))
              );
            }}
            onImageDeleted={() => {
              setServices((prev) =>
                prev.map((s) => (s.id === serviceData?.id ? { ...s, coverPhotoUrl: '', imageUrl: '' } : s))
              );
            }}
          >
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
              {image ? (
                <img
                  src={image}
                  alt={title}
                  fetchPriority="high"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <EditorialImagePlaceholder
                  aspectRatio="16/11"
                  caption={shortTitle}
                />
              )}
            </div>
          </InPlaceImageEditor>
        </div>
      </header>

      {/* 02. What the Session Feels Like (Atmosphere & Sensory - Observational) */}
      <section
        style={{
          maxWidth: '1350px',
          margin: '0 auto 4rem',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFDF9',
            border: '1px solid rgba(140, 110, 83, 0.2)',
            borderRadius: '4px',
            padding: 'clamp(2rem, 4vw, 3rem)',
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
              marginBottom: '0.5rem',
            }}
          >
            TRẢI NGHIỆM BUỔI CHỤP
          </span>
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: '2rem',
              color: '#29231F',
              marginBottom: '1rem',
            }}
          >
            Không gian nhẹ nhàng & tự nhiên
          </h2>
          <p
            style={{
              fontSize: '1rem',
              lineHeight: 1.7,
              color: '#604634',
              maxWidth: '840px',
              margin: 0,
              fontWeight: 300,
            }}
          >
            Tại Maison MIPA, chúng tôi chú trọng sự thoải mái và tự nhiên trong từng buổi chụp, giúp bạn lưu giữ những khung hình chân thật và giàu cảm xúc.
          </p>
        </div>
      </section>

      {/* 03. Related Concepts (Strictly matching current service) */}
      {relatedConcepts.length > 0 && (
        <section
          style={{
            maxWidth: '1350px',
            margin: '0 auto 4.5rem',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ marginBottom: '2rem' }}>
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
              CONCEPT GỢI Ý
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '2.2rem',
                color: '#29231F',
                margin: 0,
              }}
            >
              Các concept phù hợp cho {shortTitle}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {relatedConcepts.map((cnc) => (
              <div
                key={cnc.id}
                style={{
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <Link to={`/concept/${cnc.slug}`} style={{ display: 'block', aspectRatio: '16/10', overflow: 'hidden' }}>
                  {cnc.coverPhotoUrl ? (
                    <img
                      src={cnc.coverPhotoUrl}
                      alt={cnc.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <EditorialImagePlaceholder
                      aspectRatio="16/10"
                      caption={cnc.name}
                    />
                  )}
                </Link>
                <div style={{ padding: '1.25rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading)',
                      fontSize: '1.35rem',
                      color: '#29231F',
                      margin: '0 0 0.4rem 0',
                    }}
                  >
                    <Link to={`/concept/${cnc.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {cnc.name}
                    </Link>
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#604634', margin: '0 0 0.85rem 0', lineHeight: 1.5 }}>
                    {cnc.description}
                  </p>
                  <Link
                    to={`/concept/${cnc.slug}`}
                    style={{ fontSize: '0.82rem', color: '#8C6E53', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Xem chi tiết concept →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 04. Selected Stories (Strictly matching current service) */}
      {selectedWorks.length > 0 && (
        <section
          style={{
            maxWidth: '1350px',
            margin: '0 auto 4.5rem',
            padding: '0 1.5rem',
          }}
        >
          <div style={{ marginBottom: '2rem' }}>
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
              CÂU CHUYỆN THỰC TẾ
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '2.2rem',
                color: '#29231F',
                margin: 0,
              }}
            >
              Bộ ảnh thực hiện cho {shortTitle}
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {selectedWorks.map((work) => (
              <div
                key={work.id}
                style={{
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <Link to={`/portfolio/${work.slug}`} style={{ display: 'block', aspectRatio: '16/10', overflow: 'hidden' }}>
                  {work.coverPhotoUrl ? (
                    <img
                      src={work.coverPhotoUrl}
                      alt={work.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <EditorialImagePlaceholder
                      aspectRatio="16/10"
                      caption={work.title}
                    />
                  )}
                </Link>
                <div style={{ padding: '1.25rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading)',
                      fontSize: '1.35rem',
                      color: '#29231F',
                      margin: '0 0 0.4rem 0',
                    }}
                  >
                    <Link to={`/portfolio/${work.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {work.title}
                    </Link>
                  </h3>
                  <Link
                    to={`/portfolio/${work.slug}`}
                    style={{ fontSize: '0.82rem', color: '#8C6E53', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Xem bộ ảnh →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 05. Packages for this Service (Strictly this service) */}
      <section
        style={{
          maxWidth: '1350px',
          margin: '0 auto 4.5rem',
          padding: '0 1.5rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
            BẢNG GIÁ GÓI CHỤP
          </span>
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: '2.3rem',
              color: '#29231F',
              margin: 0,
            }}
          >
            Gói chụp cho {shortTitle}
          </h2>
        </div>

        {isLoading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                style={{
                  backgroundColor: '#FFFDF9',
                  border: '1px solid rgba(140, 110, 83, 0.15)',
                  borderRadius: '4px',
                  padding: '2rem 1.75rem',
                  minHeight: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.8rem',
                }}
              >
                <div style={{ height: '12px', width: '35%', backgroundColor: 'rgba(140, 110, 83, 0.12)', borderRadius: '3px' }} />
                <div style={{ height: '26px', width: '70%', backgroundColor: 'rgba(140, 110, 83, 0.18)', borderRadius: '4px' }} />
                <div style={{ height: '36px', width: '45%', backgroundColor: 'rgba(140, 110, 83, 0.15)', borderRadius: '4px', marginTop: '0.5rem' }} />
                <div style={{ height: '48px', width: '100%', backgroundColor: 'rgba(140, 110, 83, 0.08)', borderRadius: '4px', marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        ) : srvPackages.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              backgroundColor: '#FFFDF9',
              borderRadius: '4px',
              border: '1px solid rgba(140, 110, 83, 0.2)',
              textAlign: 'center',
              color: '#8C6E53',
              fontSize: '0.92rem',
            }}
          >
            Hiện chưa có gói chụp được công bố cho dịch vụ này.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {srvPackages.map((pkg) => (
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
                  <div style={{ fontSize: '0.72rem', letterSpacing: '0.12em', color: '#8C6E53', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                    {pkg.durationMinutes} PHÚT {pkg.editedPhotosCount > 0 ? `• ${pkg.editedPhotosCount} ẢNH HẬU KỲ` : ''}
                  </div>
                  <h3 style={{ fontFamily: 'var(--editorial-font-heading)', fontSize: '1.6rem', color: '#29231F', margin: '0 0 0.5rem 0' }}>
                    {pkg.name}
                  </h3>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#29231F', marginBottom: '1.25rem', fontFamily: 'var(--editorial-font-heading)' }}>
                    Chỉ từ {new Intl.NumberFormat('vi-VN').format(pkg.price)} VNĐ
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
                    navigate(
                      serviceData?.id
                        ? `/booking?service=${serviceData.id}&package=${pkg.id}`
                        : `/booking?package=${pkg.id}`
                    )
                  }
                  className="public-btn-primary"
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
                >
                  Đặt gói này
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 06. Bottom Consultation CTA */}
      <section
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: '0 1.5rem',
        }}
      >
        <div
          style={{
            backgroundColor: '#1E1815',
            color: '#FAF8F3',
            borderRadius: '6px',
            padding: 'clamp(2.5rem, 5vw, 4rem)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)',
              color: '#FFFDF9',
              marginBottom: '0.75rem',
            }}
          >
            Sẵn sàng cho buổi chụp {shortTitle}?
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'rgba(255, 253, 249, 0.8)',
              maxWidth: '540px',
              margin: '0 auto 2rem auto',
            }}
          >
            Chọn ngày chụp yêu thích và đặt lịch trực tuyến ngay để Maison MIPA chuẩn bị chu đáo cho bạn.
          </p>
          <button
            onClick={() => {
              if (serviceData?.id) navigate(`/booking?service=${serviceData.id}`);
              else onOpenBooking();
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
        </div>
      </section>
    </div>
  );
};

export default ServiceDetailPage;
