import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Home, Sparkles } from 'lucide-react';
import { INITIAL_SERVICES } from '../mockData';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';

interface ServicesPageProps {
  onOpenBooking: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onOpenBooking }) => {

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Dịch vụ', url: getCanonicalUrl('/dich-vu') },
  ];

  return (
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title="Dịch Vụ Chụp Ảnh Nghệ Thuật Cao Cấp | Maison MIPA Memories"
        description="Khám phá các dịch vụ chụp ảnh phong cách Pháp tinh tế tại Maison MIPA Memories: Couple, Portrait, Family, Baby, Graduation trọn gói chuyên nghiệp."
        canonicalPath="/dich-vu"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
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
          <li style={{ fontWeight: 600, color: '#604634' }} aria-current="page">
            Dịch vụ
          </li>
        </ol>
      </nav>

      {/* Hero Header */}
      <header className="mipa-container" style={{
        maxWidth: '1350px',
        margin: '1.5rem auto 2.5rem',
        padding: '0 1rem',
        textAlign: 'center',
      }}>
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
          marginBottom: '0.8rem',
        }}>
          <Sparkles size={14} color="#C6A45F" /> DANH MỤC GÓI CHỤP STUDIO
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: '#604634',
          marginBottom: '1rem',
          fontWeight: 700,
        }}>
          Dịch Vụ Chụp Ảnh Nghệ Thuật Maison MIPA
        </h1>
        <p style={{
          color: '#6E5F55',
          fontSize: '1.05rem',
          maxWidth: '720px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Mỗi bộ ảnh là một câu chuyện cảm xúc riêng biệt. Không gian ánh sáng Châu Âu ấm áp cùng đội ngũ sáng tạo tận tâm giúp bạn ghi lại những ký ức trọn vẹn nhất.
        </p>
      </header>

      {/* Services Grid */}
      <main className="mipa-container" style={{ maxWidth: '1350px', margin: '0 auto', padding: '0 1rem' }}>
        <div className="mipa-grid-3" style={{ display: 'grid', gap: '2rem' }}>
          {INITIAL_SERVICES.map((srv) => (
            <article
              key={srv.id}
              className="mipa-card"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ position: 'relative', height: '240px', overflow: 'hidden' }}>
                  <img
                    src={srv.image}
                    alt={srv.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.4s ease',
                    }}
                  />
                  {srv.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '14px',
                      right: '14px',
                      backgroundColor: '#604634',
                      color: '#EFE6C9',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.8rem',
                      borderRadius: '20px',
                    }}>
                      ★ {srv.badge}
                    </span>
                  )}
                </div>

                <div style={{ padding: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', color: '#604634', marginBottom: '0.5rem', fontWeight: 700 }}>
                    {srv.name}
                  </h2>
                  <p style={{ color: '#6E5F55', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {srv.description}
                  </p>
                </div>
              </div>

              <div style={{ padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link
                  to={`/dich-vu/${srv.slug}`}
                  role="button"
                  className="btn-mipa-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.75rem',
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                  }}
                >
                  Xem Chi Tiết & Bảng Giá <ArrowRight size={15} />
                </Link>
                <button
                  onClick={onOpenBooking}
                  className="btn-mipa-gold"
                  style={{
                    padding: '0.7rem',
                    fontSize: '0.88rem',
                  }}
                >
                  Đặt Lịch Ngay
                </button>
              </div>
            </article>
          ))}
        </div>

        {/* Global CTA Box */}
        <section style={{
          marginTop: '3.5rem',
          padding: '2.5rem 2rem',
          backgroundColor: '#FFFDF6',
          borderRadius: '24px',
          border: '1px solid var(--mipa-beige)',
          boxShadow: 'var(--mipa-shadow-sm)',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', marginBottom: '0.6rem' }}>
            Bạn cần tư vấn concept riêng hoặc gói chụp tùy chỉnh?
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '0.95rem', maxWidth: '640px', margin: '0 auto 1.5rem' }}>
            Đội ngũ tư vấn Maison MIPA sẵn sàng lắng nghe và thiết kế buổi chụp phù hợp nhất với phong cách và ngân sách của bạn.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/bang-gia"
              role="button"
              className="btn-mipa-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.8rem 1.5rem',
                borderRadius: '20px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Xem Bảng Giá Trọn Gói
            </Link>
            <Link
              to="/portfolio"
              role="button"
              className="btn-mipa-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.8rem 1.5rem',
                borderRadius: '20px',
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              Xem Portfolio Hình Ảnh
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ServicesPage;
