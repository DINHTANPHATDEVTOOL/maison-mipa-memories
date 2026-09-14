import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { PortfolioSection } from '../components/public/PortfolioSection';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';

interface PortfolioPageProps {
  onOpenBooking?: () => void;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ onOpenBooking }) => {
  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Portfolio', url: getCanonicalUrl('/portfolio') },
  ];

  return (
    <div style={{ backgroundColor: 'var(--editorial-bg)', minHeight: '80vh', paddingBottom: '5rem' }}>
      <SeoHead
        title="Bộ Sưu Tập Hình Ảnh Nghệ Thuật | Maison MIPA Memories"
        description="Chiêm ngưỡng bộ sưu tập hình ảnh nghệ thuật phong cách Pháp thực tế tại Maison MIPA Memories: Couple, Wedding, Studio Room, Baby, Portrait nghệ thuật."
        canonicalPath="/portfolio"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb */}
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
            Portfolio
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header style={{
        maxWidth: '1240px',
        margin: '2rem auto 1rem',
        padding: '0 1.5rem',
        textAlign: 'center',
      }}>
        <span className="editorial-overline">GALERIE DE MAISON MIPA</span>
        <h1 className="editorial-h1" style={{ marginBottom: '1rem' }}>
          Bộ sưu tập hình ảnh
        </h1>
        <p className="editorial-lead" style={{ margin: '0 auto' }}>
          Mỗi bức ảnh là một khoảnh khắc được chăm chút từ ánh sáng, góc máy đến cảm xúc tự nhiên nhất của bạn.
        </p>
      </header>

      {/* Gallery Section */}
      <div style={{ padding: '0 1.5rem' }}>
        <PortfolioSection onOpenBooking={onOpenBooking} hideHeader={true} />
      </div>

      {/* Booking Prompt */}
      {onOpenBooking && (
        <div style={{ maxWidth: '1000px', margin: '4rem auto 0', padding: '0 1.5rem', textAlign: 'center' }}>
          <div style={{
            padding: '3rem 2rem',
            backgroundColor: 'var(--editorial-paper)',
            borderRadius: '4px',
            border: '1px solid var(--editorial-divider)',
          }}>
            <h2 className="editorial-h2" style={{ fontSize: '2rem', marginBottom: '0.6rem' }}>
              Bạn muốn có một bộ ảnh mang dấu ấn riêng?
            </h2>
            <p className="editorial-copy" style={{ maxWidth: '540px', margin: '0 auto 2rem' }}>
              Hãy để Maison MIPA cùng bạn lưu giữ những khoảnh khắc nhẹ nhàng và nguyên bản.
            </p>
            <button
              onClick={onOpenBooking}
              className="public-btn-primary"
            >
              Đặt lịch chụp
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
