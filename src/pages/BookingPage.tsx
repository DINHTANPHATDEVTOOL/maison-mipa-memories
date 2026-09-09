// ==============================================================================
// Maison MIPA Memories - Canonical Booking Funnel (/booking) (#6 & #16)
// Requirements:
// - Guests are NOT blocked on entry; can select Service, Package, Concept, Addons, Date, Slot
// - Query params support (?concept=<slug>)
// - Auth preservation on confirm step
// - No duplicate booking wizard modals
// ==============================================================================
import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, ChevronRight, Home, ShieldCheck, Sparkles, UserCheck } from 'lucide-react';
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
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialConceptSlug = searchParams.get('concept') || undefined;

  const [isWizardOpen, setIsWizardOpen] = useState(true);

  const breadcrumbs = [
    { name: 'Trang chủ', url: getCanonicalUrl('/') },
    { name: 'Đặt lịch', url: getCanonicalUrl('/booking') },
  ];

  return (
    <div style={{ backgroundColor: 'var(--mipa-background)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title="Đặt Lịch Chụp Ảnh Trực Tuyến 24/7 | Maison MIPA Memories"
        description="Đặt lịch chụp ảnh trực tuyến nhanh chóng tại Maison MIPA Memories. Lựa chọn concept nghệ thuật, phòng studio riêng tư, dịch vụ makeup và thanh toán cọc an toàn."
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
        margin: '1.5rem auto 1.5rem',
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
          marginBottom: '0.8rem',
          fontWeight: 700,
          fontFamily: 'var(--mipa-font-heading)',
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
          Lựa chọn concept, gói chụp, dịch vụ bổ sung và khung giờ trống theo thời gian thực.
        </p>

        {/* User status badge or guest helper notice */}
        <div style={{ marginTop: '1.2rem' }}>
          {user ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.2rem',
              borderRadius: '20px',
              backgroundColor: '#EFE6C9',
              color: '#604634',
              fontSize: '0.85rem',
              fontWeight: 600,
            }}>
              <ShieldCheck size={16} color="#16A34A" /> Đang đặt lịch với tư cách: {user.fullName || user.email}
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.2rem',
              borderRadius: '20px',
              backgroundColor: '#FFFDF6',
              border: '1px solid var(--mipa-beige)',
              color: '#8C6E53',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}>
              <UserCheck size={16} color="#C6A45F" /> Quý khách có thể tự do chọn gói & concept trước khi đăng nhập ở bước xác nhận.
            </div>
          )}
        </div>

        {!isWizardOpen && (
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="btn-mipa-gold"
              style={{ padding: '0.8rem 2rem', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Camera size={16} /> Mở Lại Bảng Đặt Lịch
            </button>
          </div>
        )}
      </header>

      {/* Booking Wizard Component is ALWAYS accessible to both Guests and Authenticated Users */}
      <BookingWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onBookingSuccess={onBookingSuccess}
        existingBookings={existingBookings}
        initialConceptSlug={initialConceptSlug}
        onRequireAuth={onOpenAuthModal}
      />
    </div>
  );
};

export default BookingPage;
