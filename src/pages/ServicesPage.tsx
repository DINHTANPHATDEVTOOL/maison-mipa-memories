import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home } from 'lucide-react';
import { getServices } from '../services/catalogService';
import type { ServiceCategory } from '../types';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';

interface ServicesPageProps {
  onOpenBooking: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenBooking }) => {
  const [services, setServices] = useState<ServiceCategory[]>([]);

  useEffect(() => {
    let active = true;
    getServices().then((res) => {
      if (active && res.length > 0) setServices(res);
    });
    return () => { active = false; };
  }, []);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Dịch vụ', url: getCanonicalUrl('/dich-vu') },
  ];

  return (
    <div style={{ backgroundColor: 'var(--editorial-bg)', minHeight: '80vh', paddingBottom: '5rem' }}>
      <SeoHead
        title="Dịch Vụ Chụp Ảnh Nghệ Thuật | Maison MIPA Memories"
        description="Khám phá các dịch vụ chụp ảnh phong cách Pháp tinh tế tại Maison MIPA Memories: Couple, Portrait, Family, Baby, Graduation trọn gói chuyên nghiệp."
        canonicalPath="/dich-vu"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
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
          <li style={{ fontWeight: 500, color: 'var(--editorial-brown)' }} aria-current="page">
            Dịch vụ
          </li>
        </ol>
      </nav>

      {/* Hero Header */}
      <header style={{
        maxWidth: '1240px',
        margin: '2rem auto 2.5rem',
        padding: '0 1.5rem',
        textAlign: 'center',
      }}>
        <span className="editorial-overline">MAISON MIPA / DỊCH VỤ</span>
        <h1 className="editorial-h1" style={{ marginBottom: '1rem' }}>
          Dịch vụ chụp ảnh nghệ thuật
        </h1>
        <p className="editorial-lead" style={{ margin: '0 auto' }}>
          Mỗi bộ ảnh là một câu chuyện cảm xúc riêng biệt. Ánh sáng tự nhiên và không gian studio ấm cúng giúp bạn lưu lại những kỷ niệm chân thật nhất.
        </p>
      </header>

      {/* Services Grid */}
      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 1.5rem' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '2.5rem',
        }}>
          {services.map((srv) => (
            <article
              key={srv.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
              }}
            >
              <div>
                <div style={{ position: 'relative', height: '260px', overflow: 'hidden', borderRadius: '4px', backgroundColor: '#241D1A' }}>
                  <img
                    src={srv.image}
                    alt={srv.name}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  {srv.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: 'var(--editorial-brown)',
                      color: '#FFFDF9',
                      fontSize: '0.7rem',
                      fontWeight: 500,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '2px',
                      letterSpacing: '0.04em',
                    }}>
                      {srv.badge}
                    </span>
                  )}
                </div>

                <div style={{ paddingTop: '1.2rem' }}>
                  <h2 style={{
                    fontFamily: 'var(--editorial-font-heading)',
                    fontSize: '1.5rem',
                    color: 'var(--editorial-brown)',
                    marginBottom: '0.4rem',
                    fontWeight: 600,
                  }}>
                    {srv.name}
                  </h2>
                  <p className="editorial-copy" style={{ margin: 0 }}>
                    {srv.description}
                  </p>
                </div>
              </div>

              <div style={{ paddingTop: '1.2rem', display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/dich-vu/${srv.slug}`}
                  className="public-btn-secondary"
                  style={{
                    fontSize: '0.88rem',
                    padding: '0.65rem 1.2rem',
                  }}
                >
                  Xem chi tiết & bảng giá <ArrowRight size={14} />
                </Link>
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="public-btn-primary"
                  style={{
                    fontSize: '0.88rem',
                    padding: '0.65rem 1.2rem',
                  }}
                >
                  Đặt lịch chụp
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Global Consultation Prompt */}
        <section style={{
          marginTop: '4.5rem',
          padding: '3rem 2rem',
          backgroundColor: 'var(--editorial-paper)',
          borderRadius: '4px',
          border: '1px solid var(--editorial-divider)',
          textAlign: 'center',
        }}>
          <h2 className="editorial-h2" style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>
            Bạn cần tư vấn concept riêng cho buổi chụp?
          </h2>
          <p className="editorial-copy" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
            Đội ngũ Maison MIPA sẵn sàng trò chuyện cùng bạn để chuẩn bị trang phục, ý tưởng và bối cảnh phù hợp nhất.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/bang-gia"
              className="public-btn-secondary"
            >
              Xem bảng giá trọn gói
            </Link>
            <Link
              to="/portfolio"
              className="public-btn-secondary"
            >
              Xem bộ sưu tập hình ảnh
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ServicesPage;
