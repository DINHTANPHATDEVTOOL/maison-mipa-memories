import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, Home, LogIn, ShieldCheck, Sparkles } from 'lucide-react';
import { BookingWizard } from '../components/booking/BookingWizard';
import { SeoHead, generateBreadcrumbSchema } from '../components/seo/SeoHead';
import { getCanonicalUrl } from '../config/site';
import { useAuth } from '../context/AuthContext';
import type { Booking } from '../types';

interface BookingPageProps {
  onBookingSuccess: (newBooking: Booking) => void;
  existingBookings: Booking[];
  onOpenAuthModal: (tab?: 'LOGIN' | 'REGISTER', msg?: string) => void;
}

export const BookingPage: React.FC<BookingPageProps> = ({
  onBookingSuccess,
  existingBookings,
  onOpenAuthModal,
}) => {
  const { user, role } = useAuth();
  const isGuest = !user || role === 'GUEST';
  const [isWizardOpen, setIsWizardOpen] = useState(true);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Đặt lịch', url: getCanonicalUrl('/booking') },
  ];

  return (
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title="Đặt Lịch Chụp Ảnh Trực Tuyến 24/7 | Maison MIPA Memories"
        description="Đặt lịch chụp ảnh trực tuyến nhanh chóng tại Maison MIPA Memories. Lựa chọn concept, phòng studio riêng tư, dịch vụ makeup và thanh toán cọc an toàn."
        canonicalPath="/booking"
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
            Đặt lịch online
          </li>
        </ol>
      </nav>

      <header className="mipa-container" style={{
        maxWidth: '1350px',
        margin: '1.5rem auto 2rem',
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
          <Sparkles size={14} color="#C6A45F" /> QUY TRÌNH 6 BƯỚC ĐẶT LỊCH CHUẨN
        </div>
        <h1 style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: '#604634',
          marginBottom: '1rem',
          fontWeight: 700,
        }}>
          Đặt Lịch Chụp Ảnh Trực Tuyến
        </h1>
        <p style={{
          color: '#6E5F55',
          fontSize: '1.05rem',
          maxWidth: '720px',
          margin: '0 auto',
          lineHeight: 1.6,
        }}>
          Hệ thống kiểm tra lịch phòng và chuyên viên tự động theo thời gian thực. Đảm bảo 100% không trùng lịch, an tâm chuẩn bị cho ngày chụp.
        </p>
      </header>

      {/* Guest Notice if not logged in */}
      {isGuest ? (
        <div className="mipa-container" style={{ maxWidth: '800px', margin: '0 auto 2rem', padding: '0 1rem' }}>
          <div className="mipa-card" style={{
            padding: '2rem',
            borderRadius: '20px',
            border: '2px solid #C6A45F',
            backgroundColor: '#FFFDF6',
            textAlign: 'center',
          }}>
            <h2 style={{ fontSize: '1.4rem', color: '#604634', marginBottom: '0.6rem' }}>
              Quý khách vui lòng Đăng Nhập để hoàn tất đặt lịch
            </h2>
            <p style={{ color: '#6E5F55', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Tài khoản giúp bạn theo dõi trạng thái đơn đặt lịch, xem tiến độ chỉnh sửa ảnh và nhận album ảnh trực tuyến sau buổi chụp.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => onOpenAuthModal('LOGIN', '🔒 Quý khách vui lòng đăng nhập để tiến hành đặt lịch chụp')}
                className="btn-mipa-gold"
                style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
              >
                <LogIn size={16} /> Đăng Nhập Ngay
              </button>
              <button
                onClick={() => onOpenAuthModal('REGISTER')}
                className="btn-mipa-secondary"
                style={{ padding: '0.75rem 1.8rem', fontSize: '0.95rem' }}
              >
                Tạo Tài Khoản Mới
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mipa-container" style={{ maxWidth: '800px', margin: '0 auto 2rem', padding: '0 1rem', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1.2rem',
            borderRadius: '20px',
            backgroundColor: '#EFE6C9',
            color: '#604634',
            fontSize: '0.88rem',
            fontWeight: 600,
            marginBottom: '1rem',
          }}>
            <ShieldCheck size={16} color="#16A34A" /> Đang đặt lịch với tư cách: {user?.fullName} ({user?.email})
          </div>
          <div>
            {!isWizardOpen && (
              <button
                onClick={() => setIsWizardOpen(true)}
                className="btn-mipa-gold"
                style={{ padding: '0.8rem 2rem', fontSize: '1rem' }}
              >
                <Camera size={16} /> Mở Lại Bảng Đặt Lịch
              </button>
            )}
          </div>
        </div>
      )}

      {/* Booking Wizard Component */}
      {!isGuest && (
        <BookingWizard
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onBookingSuccess={(booking) => {
            onBookingSuccess(booking);
          }}
          existingBookings={existingBookings}
        />
      )}
    </div>
  );
};

export default BookingPage;
