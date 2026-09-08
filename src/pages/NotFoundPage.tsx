import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { SeoHead } from '../components/seo/SeoHead';

export const NotFoundPage: React.FC = () => {
  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3rem 1rem',
      textAlign: 'center',
    }}>
      <SeoHead
        title="404 - Không Tìm Thấy Trang | Maison MIPA Memories"
        description="Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển."
        noIndex={true}
      />
      <div className="mipa-card" style={{
        maxWidth: '560px',
        padding: '3rem 2rem',
        borderRadius: '24px',
        border: '1px solid var(--mipa-beige)',
        boxShadow: 'var(--mipa-shadow-lg)',
      }}>
        <div style={{
          fontSize: '4.5rem',
          fontWeight: 800,
          fontFamily: 'var(--mipa-font-heading)',
          color: '#8C6E53',
          lineHeight: 1,
          marginBottom: '1rem',
        }}>
          404
        </div>
        <h1 style={{
          fontSize: '1.8rem',
          color: '#604634',
          marginBottom: '1rem',
        }}>
          Trang Không Tồn Tại
        </h1>
        <p style={{
          color: '#6E5F55',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          marginBottom: '2rem',
        }}>
          Đường dẫn bạn vừa truy cập có thể đã thay đổi hoặc không còn khả dụng trên hệ thống Maison MIPA Memories.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            to="/"
            role="button"
            className="btn-mipa-gold"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <Home size={16} /> Về Trang Chủ
          </Link>
          <Link
            to="/dich-vu"
            role="button"
            className="btn-mipa-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '20px',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} /> Xem Dịch Vụ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
