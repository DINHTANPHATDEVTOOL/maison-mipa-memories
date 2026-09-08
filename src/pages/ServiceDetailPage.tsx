import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, ChevronRight, Home, Sparkles } from 'lucide-react';
import { INITIAL_PACKAGES, INITIAL_SERVICES } from '../mockData';
import { SeoHead, generateServiceSchema, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';
import { NotFoundPage } from './NotFoundPage';

interface ServiceDetailPageProps {
  onOpenBooking: () => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ onOpenBooking }) => {
  const { slug } = useParams<{ slug: string }>();

  // Find configuration for this service slug
  const serviceConfig = SITE_CONFIG.services.find((s) => s.slug === slug);
  const serviceData = INITIAL_SERVICES.find((s) => s.slug === slug);

  // If slug is not found in either config or data, render NotFound
  if (!serviceConfig && !serviceData) {
    return <NotFoundPage />;
  }

  const title = serviceConfig?.h1 || `${serviceData?.name} — Maison MIPA Memories`;
  const metaTitle = `${serviceConfig?.shortTitle || serviceData?.name} | Maison MIPA Memories Studio`;
  const description = serviceConfig?.description || serviceData?.description || '';
  const canonicalPath = `/dich-vu/${slug}`;
  const canonicalUrl = getCanonicalUrl(canonicalPath);
  const image = serviceConfig?.image || serviceData?.image || SITE_CONFIG.assets.defaultOgImage;

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Dịch vụ', url: getCanonicalUrl('/dich-vu') },
    { name: serviceConfig?.shortTitle || serviceData?.name || 'Chi tiết', url: canonicalUrl },
  ];

  const serviceSchema = generateServiceSchema({
    name: serviceConfig?.name || serviceData?.name || 'Chụp ảnh nghệ thuật',
    description: description,
    url: canonicalUrl,
    image: image,
    lowPrice: SITE_CONFIG.pricing.minPrice,
    highPrice: SITE_CONFIG.pricing.maxPrice,
  });

  const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs);

  return (
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title={metaTitle}
        description={description}
        canonicalPath={canonicalPath}
        ogImage={image}
        keywords={serviceConfig?.keywords}
        jsonLd={[serviceSchema, breadcrumbSchema]}
      />

      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" style={{
        maxWidth: '1350px',
        margin: '0 auto',
        padding: '1.2rem 1rem 0',
      }}>
        <ol style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: '#8C6E53',
        }}>
          <li>
            <Link to="/" style={{ color: '#8C6E53', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={14} color="#C6A45F" /></li>
          <li>
            <Link to="/dich-vu" style={{ color: '#8C6E53', textDecoration: 'none' }}>
              Dịch vụ
            </Link>
          </li>
          <li><ChevronRight size={14} color="#C6A45F" /></li>
          <li style={{ fontWeight: 600, color: '#604634' }} aria-current="page">
            {serviceConfig?.shortTitle || serviceData?.name}
          </li>
        </ol>
      </nav>

      {/* Service Header Section */}
      <header className="mipa-container" style={{
        maxWidth: '1350px',
        margin: '1.5rem auto 3rem',
        padding: '0 1rem',
      }}>
        <div className="mipa-grid-2" style={{ alignItems: 'center', gap: '2.5rem' }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 1rem',
              backgroundColor: '#EFE6C9',
              color: '#604634',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              marginBottom: '1rem',
            }}>
              <Sparkles size={14} color="#C6A45F" /> MAISON MIPA SPECIALTY
            </div>

            <h1 style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.2rem)',
              lineHeight: 1.15,
              color: '#604634',
              marginBottom: '1.2rem',
              fontWeight: 700,
            }}>
              {title}
            </h1>

            <p style={{
              fontSize: '1.1rem',
              color: '#6E5F55',
              lineHeight: 1.7,
              marginBottom: '2rem',
              maxWidth: '560px',
            }}>
              {description}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={onOpenBooking}
                className="btn-mipa-gold"
                style={{ padding: '0.85rem 1.8rem', fontSize: '1rem' }}
              >
                <Camera size={18} /> Đặt Lịch Chụp Ngay
              </button>
              <Link
                to="/bang-gia"
                role="button"
                className="btn-mipa-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.85rem 1.6rem',
                  borderRadius: '20px',
                  textDecoration: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                }}
              >
                Xem Bảng Giá <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div>
            <div style={{
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(96, 70, 52, 0.15)',
              border: '4px solid #FFFFFF',
              maxHeight: '440px',
            }}>
              <img
                src={image}
                alt={title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Packages Section for this Service */}
      <section className="mipa-container" style={{ maxWidth: '1250px', margin: '0 auto 3rem', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            CÁC GÓI CHỤP PHÙ HỢP
          </div>
          <h2 style={{ fontSize: '2.2rem', color: '#604634', marginTop: '0.4rem' }}>
            Bảng Giá Gói Chụp Cho {serviceConfig?.shortTitle || serviceData?.name}
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '0.95rem' }}>
            Giá trọn gói rõ ràng, cam kết tặng toàn bộ file gốc và phòng chụp riêng tư 100%.
          </p>
        </div>

        <div className="mipa-grid-3" style={{ display: 'grid', gap: '2rem' }}>
          {INITIAL_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`mipa-card ${pkg.recommended ? 'mipa-card-gold' : ''}`}
              style={{
                padding: '2rem',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
              }}
            >
              <div>
                {pkg.popularTag && (
                  <div style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#C6A45F',
                    color: '#FFFDF6',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.3rem 1rem',
                    borderRadius: '20px',
                  }}>
                    ★ {pkg.popularTag}
                  </div>
                )}
                <h3 style={{ fontSize: '1.5rem', color: '#604634', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{pkg.name}</h3>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#8C6E53', marginBottom: '1.2rem', fontFamily: 'var(--mipa-font-heading)' }}>
                  {pkg.price.toLocaleString('vi-VN')} <span style={{ fontSize: '1rem', fontWeight: 400 }}>đ</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} style={{ fontSize: '0.85rem', color: '#2C221E', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <Check size={15} color="#C6A45F" style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={onOpenBooking}
                className={pkg.recommended ? 'btn-mipa-gold' : 'btn-mipa-primary'}
                style={{ width: '100%', padding: '0.8rem' }}
              >
                Đặt Lịch Gói Này
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Internal Navigation Links Bar */}
      <footer className="mipa-container" style={{
        maxWidth: '1250px',
        margin: '0 auto',
        padding: '2rem 1rem 0',
        borderTop: '1px solid rgba(140, 110, 83, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <Link
          to="/dich-vu"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', textDecoration: 'none', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Quay lại danh sách dịch vụ
        </Link>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link
            to="/portfolio"
            style={{ color: '#604634', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
          >
            Xem Portfolio Gallery →
          </Link>
          <Link
            to="/bang-gia"
            style={{ color: '#604634', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}
          >
            Bảng Giá Toàn Bộ →
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default ServiceDetailPage;
