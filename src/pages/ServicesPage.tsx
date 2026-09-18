// ==============================================================================
// Maison MIPA Memories — Services Page (/dich-vu)
// Redesigned for Visual Commerce: Photography-first, alternating editorial rows.
// Distinct states: LOADING, ERROR, EMPTY, READY.
// Zero unrelated photo fallbacks; verified badges only.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, RotateCcw } from 'lucide-react';
import { getServices } from '../services/catalogService';
import type { ServiceCategory } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { EditorialImagePlaceholder } from '../components/public/EditorialImagePlaceholder';

interface ServicesPageProps {
  onOpenBooking: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  const fetchServices = async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const data = await getServices();
      setServices(data);
    } catch (err) {
      console.warn('Lỗi tải danh mục dịch vụ:', err);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Dịch vụ', url: getCanonicalUrl('/dich-vu') },
  ];

  return (
    <div style={{ backgroundColor: '#FAF8F3', minHeight: '85vh', paddingBottom: '6rem' }}>
      <SeoHead
        title="Dịch Vụ Chụp Ảnh Nghệ Thuật | Maison MIPA Memories"
        description="Khám phá các dịch vụ chụp ảnh phong cách Pháp tinh tế tại Maison MIPA Memories: Couple, Chân dung cá nhân, Gia đình, Em bé và Nghệ thuật."
        canonicalPath="/dich-vu"
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
            Dịch vụ
          </li>
        </ol>
      </nav>

      {/* Editorial Header */}
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
          MAISON MIPA / DỊCH VỤ &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
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
          Dịch vụ chụp ảnh nghệ thuật
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
          Mỗi gói dịch vụ tại Maison MIPA được thiết kế để gìn giữ những dấu mốc thiêng liêng nhất của cuộc đời bạn — từ tình yêu đôi lứa, chân dung cá nhân đến nụ cười đầm ấm của cả gia đình trong ngôi nhà ký ức.
        </p>
      </header>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1.5rem' }}>
        {/* 1. LOADING STATE */}
        {isLoading && (
          <div style={{ padding: '6rem 1.5rem', textAlign: 'center', color: '#8C6E53', fontSize: '0.95rem' }}>
            Đang tải danh mục dịch vụ...
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
              Không thể tải danh mục dịch vụ
            </h2>
            <p style={{ fontSize: '0.92rem', color: '#604634', marginBottom: '1.75rem' }}>
              Đã có lỗi xảy ra trong quá trình tải dữ liệu. Quý khách vui lòng thử lại.
            </p>
            <button
              onClick={fetchServices}
              className="public-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.75rem' }}
            >
              <RotateCcw size={15} /> Thử lại
            </button>
          </div>
        )}

        {/* 3. EMPTY STATE */}
        {!isLoading && !hasError && services.length === 0 && (
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
              Hiện chưa có dịch vụ chụp ảnh nào được công bố.
            </p>
          </div>
        )}

        {/* 4. READY STATE: Alternating Editorial Rows (IMAGE | TEXT, TEXT | IMAGE) */}
        {!isLoading && !hasError && services.length > 0 && (
          <div className="services-editorial-layout" style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(3rem, 6vw, 5.5rem)' }}>
            {services.map((srv, index) => {
              const isReverse = index % 2 === 1;
              const serviceSlug = srv.slug || srv.id.replace('srv_', '');

              return (
                <article
                  key={srv.id}
                  className={`service-editorial-row ${isReverse ? 'service-editorial-reverse' : ''}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                    gap: 'clamp(2rem, 5vw, 4.5rem)',
                    alignItems: 'center',
                    paddingBottom: 'clamp(3rem, 6vw, 5.5rem)',
                    borderBottom: index < services.length - 1 ? '1px solid rgba(140, 110, 83, 0.18)' : 'none',
                  }}
                >
                  {/* Media Column */}
                  <div
                    className="service-editorial-media editorial-image-frame vc-image-frame"
                    style={{
                      order: isReverse ? 2 : 1,
                      position: 'relative',
                      width: '100%',
                      aspectRatio: '16/11',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      backgroundColor: '#EDE7DC',
                    }}
                  >
                    <Link to={`/dich-vu/${serviceSlug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                      {srv.image ? (
                        <img
                          src={srv.image}
                          alt={srv.name}
                          loading="lazy"
                          decoding="async"
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
                          caption={srv.name}
                        />
                      )}
                    </Link>

                    {/* Verified badge only */}
                    {srv.badge && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: '#29231F',
                          color: '#FFFDF9',
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          padding: '0.25rem 0.65rem',
                          borderRadius: '2px',
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {srv.badge}
                      </span>
                    )}
                  </div>

                  {/* Info Column */}
                  <div
                    className="service-editorial-info"
                    style={{
                      order: isReverse ? 1 : 2,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          fontSize: '2.4rem',
                          fontWeight: 400,
                          color: 'rgba(140, 110, 83, 0.45)',
                          lineHeight: 1,
                        }}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="vc-overline">
                        DỊCH VỤ CHỤP ẢNH
                      </span>
                    </div>

                    <h2
                      style={{
                        fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                        fontSize: 'clamp(2rem, 3.8vw, 2.75rem)',
                        fontWeight: 500,
                        color: '#29231F',
                        lineHeight: 1.2,
                        margin: '0 0 1rem 0',
                      }}
                    >
                      <Link
                        to={`/dich-vu/${serviceSlug}`}
                        style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s ease' }}
                      >
                        {srv.name}
                      </Link>
                    </h2>

                    <p
                      className="vc-copy"
                      style={{
                        margin: '0 0 2rem 0',
                      }}
                    >
                      {srv.description}
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <Link
                        to={`/dich-vu/${serviceSlug}`}
                        className="vc-primary-button"
                      >
                        Xem dịch vụ <ArrowRight size={14} />
                      </Link>

                      <button
                        onClick={() => {
                          if (srv.id) {
                            navigate(`/booking?service=${srv.id}`);
                          } else {
                            onOpenBooking();
                          }
                        }}
                        className="vc-secondary-button"
                      >
                        Đặt lịch
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Bottom Consultation Box */}
        <section
          style={{
            marginTop: '5rem',
            padding: 'clamp(2.5rem, 5vw, 4rem) 2rem',
            backgroundColor: '#FFFDF9',
            borderRadius: '4px',
            border: '1px solid rgba(140, 110, 83, 0.25)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
              fontWeight: 500,
              color: '#29231F',
              marginBottom: '0.75rem',
            }}
          >
            Bạn cần tư vấn phong cách chụp phù hợp?
          </h2>
          <p
            style={{
              fontSize: '0.95rem',
              lineHeight: 1.6,
              color: '#604634',
              maxWidth: '580px',
              margin: '0 auto 2rem auto',
              fontWeight: 300,
            }}
          >
            Đội ngũ Maison MIPA luôn sẵn sàng lắng nghe và tư vấn bối cảnh ánh sáng phù hợp nhất với mong muốn của bạn.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/concept"
              className="vc-primary-button"
            >
              Khám phá concept
            </Link>
            <Link
              to="/bang-gia"
              className="vc-secondary-button"
            >
              Xem bảng giá dịch vụ
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ServicesPage;
