import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, Home } from 'lucide-react';
import { getServices, getPackages } from '../services/catalogService';
import type { ServiceCategory, PackageItem } from '../types';
import { SeoHead, generateServiceSchema, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { SITE_CONFIG, getCanonicalUrl } from '../config/site';
import { NotFoundPage } from './NotFoundPage';

interface ServiceDetailPageProps {
  onOpenBooking: () => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({ onOpenBooking }) => {
  const { slug } = useParams<{ slug: string }>();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([getServices(), getPackages()]).then(([srvs, pkgs]) => {
      if (active) {
        if (srvs.length > 0) setServices(srvs);
        if (pkgs.length > 0) setPackages(pkgs);
      }
    });
    return () => { active = false; };
  }, []);

  // Find configuration for this service slug
  const serviceConfig = SITE_CONFIG.services.find((s) => s.slug === slug);
  const serviceData = services.find((s) => s.slug === slug);

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
    <div style={{ backgroundColor: 'var(--editorial-bg)', minHeight: '80vh', paddingBottom: '5rem' }}>
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
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '1.5rem 1.5rem 0',
      }}>
        <ol style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: 'var(--editorial-text-secondary)',
        }}>
          <li>
            <Link to="/" style={{ color: 'var(--editorial-text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={13} color="var(--editorial-brown-accent)" /></li>
          <li>
            <Link to="/dich-vu" style={{ color: 'var(--editorial-text-secondary)', textDecoration: 'none' }}>
              Dịch vụ
            </Link>
          </li>
          <li><ChevronRight size={13} color="var(--editorial-brown-accent)" /></li>
          <li style={{ fontWeight: 500, color: 'var(--editorial-brown)' }} aria-current="page">
            {serviceConfig?.shortTitle || serviceData?.name}
          </li>
        </ol>
      </nav>

      {/* Service Header Section */}
      <header style={{
        maxWidth: '1240px',
        margin: '2.5rem auto 4rem',
        padding: '0 1.5rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          alignItems: 'center',
          gap: '3.5rem',
        }}>
          <div>
            <span className="editorial-overline">MAISON MIPA SPECIALTY</span>

            <h1 className="editorial-h1" style={{ marginBottom: '1.2rem', lineHeight: 1.15 }}>
              {title}
            </h1>

            <p className="editorial-lead" style={{ marginBottom: '2.2rem' }}>
              {description}
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={onOpenBooking}
                className="public-btn-primary"
              >
                Đặt lịch chụp
              </button>
              <Link
                to="/bang-gia"
                className="public-btn-secondary"
              >
                Xem bảng giá <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div>
            <div style={{
              borderRadius: '4px',
              overflow: 'hidden',
              backgroundColor: '#241D1A',
              maxHeight: '480px',
            }}>
              <img
                src={image}
                alt={title}
                loading="eager"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Pricing Packages Section for this Service */}
      <section style={{ maxWidth: '1240px', margin: '0 auto 4rem', padding: '0 1.5rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 3rem' }}>
          <span className="editorial-overline">BẢNG GIÁ DỊCH VỤ</span>
          <h2 className="editorial-h2">
            Gói chụp cho {serviceConfig?.shortTitle || serviceData?.name}
          </h2>
          <p className="editorial-copy">
            Chi phí niêm yết rõ ràng, nhận đầy đủ file gốc và phòng chụp riêng tư suốt buổi.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '2rem',
        }}>
          {(packages.filter(p => serviceData?.id ? p.serviceId === serviceData.id : true).length > 0
            ? packages.filter(p => serviceData?.id ? p.serviceId === serviceData.id : true)
            : packages
          ).map((pkg) => (
            <div
              key={pkg.id}
              className={`booking-card-option ${pkg.recommended ? 'selected' : ''}`}
              style={{
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {pkg.popularTag && (
                  <div style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'var(--editorial-brown-accent)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginBottom: '0.4rem',
                  }}>
                    {pkg.popularTag === 'POPULAR' ? 'Được chọn nhiều' : pkg.popularTag}
                  </div>
                )}
                <h3 style={{
                  fontFamily: 'var(--editorial-font-heading)',
                  fontSize: '1.5rem',
                  color: 'var(--editorial-brown)',
                  marginBottom: '0.4rem',
                  fontWeight: 600,
                }}>
                  {pkg.name}
                </h3>
                <div style={{
                  fontFamily: 'var(--editorial-font-heading)',
                  fontSize: '1.8rem',
                  fontWeight: 600,
                  color: 'var(--editorial-brown)',
                  marginBottom: '1.2rem',
                }}>
                  {pkg.price.toLocaleString('vi-VN')} <span style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--editorial-text-muted)' }}>đ</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} style={{ fontSize: '0.86rem', color: 'var(--editorial-text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <Check size={14} color="var(--editorial-brown-accent)" style={{ marginTop: '3px', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={onOpenBooking}
                className={pkg.recommended ? 'public-btn-primary' : 'public-btn-secondary'}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Đặt lịch gói này
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Internal Navigation Links Bar */}
      <footer style={{
        maxWidth: '1240px',
        margin: '0 auto',
        padding: '2rem 1.5rem 0',
        borderTop: '1px solid var(--editorial-divider)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <Link
          to="/dich-vu"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--editorial-brown)', textDecoration: 'none', fontWeight: 500, fontSize: '0.88rem' }}
        >
          <ArrowLeft size={15} /> Quay lại danh sách dịch vụ
        </Link>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link
            to="/portfolio"
            style={{ color: 'var(--editorial-text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}
          >
            Xem bộ sưu tập ảnh →
          </Link>
          <Link
            to="/bang-gia"
            style={{ color: 'var(--editorial-text-secondary)', textDecoration: 'none', fontSize: '0.88rem' }}
          >
            Bảng giá trọn gói →
          </Link>
        </div>
      </footer>
    </div>
  );
};

export default ServiceDetailPage;
