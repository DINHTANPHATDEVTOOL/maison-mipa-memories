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
import { ChevronRight, Home, ShieldCheck, UserCheck } from 'lucide-react';
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
    <div style={{ backgroundColor: 'var(--editorial-bg)', minHeight: '80vh', paddingBottom: '4rem' }}>
      <SeoHead
        title="Đặt lịch chụp ảnh trực tuyến 24/7 | Maison MIPA Memories"
        description="Đặt lịch chụp ảnh trực tuyến nhanh chóng tại Maison MIPA Memories. Lựa chọn concept, gói chụp, dịch vụ bổ sung và thanh toán cọc an toàn."
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
          color: 'var(--editorial-brown-secondary)',
        }}>
          <li>
            <Link to="/" style={{ color: 'var(--editorial-brown-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Home size={14} /> Trang chủ
            </Link>
          </li>
          <li><ChevronRight size={14} color="var(--editorial-accent)" /></li>
          <li style={{ fontWeight: 500, color: 'var(--editorial-brown)' }} aria-current="page">
            Đặt lịch
          </li>
        </ol>
      </nav>

      <header style={{
        maxWidth: '1350px',
        margin: '1.5rem auto 1.5rem',
        padding: '0 1rem',
        textAlign: 'center',
      }}>
        <div className="editorial-overline" style={{ marginBottom: '0.8rem' }}>
          MAISON MIPA / ĐẶT LỊCH
        </div>
        <h1 className="editorial-heading" style={{
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: 'var(--editorial-brown)',
          marginBottom: '0.8rem',
          fontWeight: 500,
        }}>
          Đặt lịch chụp ảnh
        </h1>
        <p className="editorial-copy" style={{
          maxWidth: '720px',
          margin: '0 auto',
        }}>
          Lựa chọn dịch vụ, concept, gói chụp và khung giờ phù hợp với bạn.
        </p>

        {/* User status badge or guest helper notice */}
        <div style={{ marginTop: '1.2rem' }}>
          {user ? (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.2rem',
              borderRadius: '4px',
              backgroundColor: 'var(--editorial-paper)',
              border: '1px solid var(--editorial-divider)',
              color: 'var(--editorial-brown)',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}>
              <ShieldCheck size={16} color="#16A34A" /> Đang đặt lịch với tư cách: {user.fullName || user.email}
            </div>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.45rem 1.2rem',
              borderRadius: '4px',
              backgroundColor: 'var(--editorial-paper)',
              border: '1px solid var(--editorial-divider)',
              color: 'var(--editorial-brown-secondary)',
              fontSize: '0.85rem',
              fontWeight: 500,
            }}>
              <UserCheck size={16} color="var(--editorial-accent)" /> Quý khách có thể tự do chọn gói & concept trước khi đăng nhập ở bước xác nhận.
            </div>
          )}
        </div>

        {!isWizardOpen && (
          <div style={{ marginTop: '1.5rem' }}>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="public-btn-primary"
              style={{ padding: '0.8rem 2rem' }}
            >
              Mở lại bảng đặt lịch
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
