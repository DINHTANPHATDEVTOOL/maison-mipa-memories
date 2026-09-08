import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home, Sparkles } from 'lucide-react';
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
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title="Portfolio Bộ Sưu Tập Kỷ Niệm Thơ Mộng | Maison MIPA Memories"
        description="Chiêm ngưỡng bộ sưu tập hình ảnh nghệ thuật phong cách Pháp thực tế tại Maison MIPA Memories: Couple, Wedding, Studio Room, Baby, Portrait nghệ thuật."
        canonicalPath="/portfolio"
        jsonLd={generateBreadcrumbSchema(breadcrumbs)}
      />

      {/* Breadcrumb */}
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
            Portfolio
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <header className="mipa-container" style={{
        maxWidth: '1350px',
        margin: '1.5rem auto 1rem',
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
          <Sparkles size={14} color="#C6A45F" /> GALERIE DE MAISON MIPA
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: '#604634',
          marginBottom: '1rem',
          fontWeight: 700,
        }}>
          Bộ Sưu Tập Kỷ Niệm Thơ Mộng
        </h1>
        <p style={{
          color: '#6E5F55',
          fontSize: '1.05rem',
          maxWidth: '720px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Mỗi bức ảnh là một tác phẩm được chăm chút từ ánh sáng, góc máy đến cảm xúc tự nhiên nhất của bạn.
        </p>
      </header>

      {/* Gallery Section */}
      <PortfolioSection />

      {/* Booking Prompt */}
      {onOpenBooking && (
        <div className="mipa-container" style={{ maxWidth: '1250px', margin: '3rem auto 0', padding: '0 1rem', textAlign: 'center' }}>
          <div style={{
            padding: '2.5rem 2rem',
            backgroundColor: '#FFFDF6',
            borderRadius: '24px',
            border: '1px solid var(--mipa-beige)',
          }}>
            <h2 style={{ fontSize: '1.8rem', color: '#604634', marginBottom: '0.6rem' }}>
              Bạn muốn có một bộ ảnh mang đậm dấu ấn riêng?
            </h2>
            <p style={{ color: '#6E5F55', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
              Hãy để Maison MIPA cùng bạn kiến tạo những khung hình đáng nhớ nhất.
            </p>
            <button
              onClick={onOpenBooking}
              className="btn-mipa-gold"
              style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}
            >
              Đặt Lịch Chụp Ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioPage;
