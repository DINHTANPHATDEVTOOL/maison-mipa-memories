import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Home } from 'lucide-react';
import { SeoHead } from '../components/seo/SeoHead';
import type { UserRole } from '../types';

interface AccessDeniedPageProps {
  requiredRoles?: UserRole[];
  currentRole?: UserRole;
  onOpenAuthModal?: () => void;
}

export const AccessDeniedPage: React.FC<AccessDeniedPageProps> = ({
  requiredRoles = ['ADMIN'],
  currentRole = 'GUEST',
  onOpenAuthModal,
}) => {
  const isGuest = currentRole === 'GUEST';

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
        title="403 - Quyền Truy Cập Bị Từ Chối | Maison MIPA Memories"
        description="Bạn không có quyền truy cập vào khu vực này."
        noIndex={true}
      />
      <div className="mipa-card" style={{
        maxWidth: '560px',
        padding: '3rem 2rem',
        borderRadius: '24px',
        border: '2px solid #9D174D',
        boxShadow: 'var(--mipa-shadow-lg)',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(157, 23, 77, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          color: '#9D174D',
        }}>
          <ShieldAlert size={36} />
        </div>

        <div style={{
          fontSize: '2.5rem',
          fontWeight: 800,
          fontFamily: 'var(--mipa-font-heading)',
          color: '#9D174D',
          lineHeight: 1,
          marginBottom: '0.5rem',
        }}>
          403 FORBIDDEN
        </div>

        <h1 style={{
          fontSize: '1.5rem',
          color: '#604634',
          marginBottom: '1rem',
        }}>
          Quyền Truy Cập Bị Từ Chối
        </h1>

        <p style={{
          color: '#6E5F55',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          marginBottom: '1.5rem',
        }}>
          {isGuest
            ? 'Khu vực này yêu cầu đăng nhập tài khoản có thẩm quyền để tiếp tục.'
            : `Tài khoản hiện tại (${currentRole}) không có quyền hạn truy cập khu vực yêu cầu [${requiredRoles.join(', ')}].`}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {isGuest && onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="btn-mipa-gold"
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '20px',
                fontWeight: 600,
              }}
            >
              Đăng Nhập Ngay
            </button>
          )}

          <Link
            to="/"
            role="button"
            className="btn-mipa-primary"
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
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
