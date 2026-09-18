// ==============================================================================
// Maison MIPA Memories — Bottom Consultation & Booking CTA Section
// Direct conversion funnel without fake lead forms.
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SITE_CONFIG } from '../../config/site';
import { Calendar, PhoneCall } from 'lucide-react';

interface HomeConsultationCtaSectionProps {
  onOpenBooking: () => void;
}

export const HomeConsultationCtaSection: React.FC<HomeConsultationCtaSectionProps> = ({
  onOpenBooking,
}) => {
  const navigate = useNavigate();

  return (
    <section
      aria-label="Tư Vấn & Đặt Lịch"
      style={{
        padding: 'clamp(4.5rem, 9vw, 8rem) 1.5rem',
        backgroundColor: '#1E1815',
        color: '#FAF8F3',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '780px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#D4AF37',
            fontWeight: 600,
            marginBottom: '1rem',
          }}
        >
          MAISON MIPA MEMORIES &bull; NHÀ LÀ NƠI LƯU GIỮ KÝ ỨC
        </span>

        <h2
          style={{
            fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
            fontSize: 'clamp(2.3rem, 5vw, 3.8rem)',
            fontWeight: 500,
            color: '#FFFDF9',
            lineHeight: 1.15,
            margin: '0 0 1.25rem 0',
          }}
        >
          Cùng Tiệm Ảnh Maison MIPA Viết Tiếp Ký Ức Cho Tổ Ấm Của Bạn
        </h2>

        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: 'rgba(255, 253, 249, 0.85)',
            margin: '0 auto 2.5rem auto',
            maxWidth: '640px',
            fontWeight: 300,
          }}
        >
          Mỗi buổi chụp tại tiệm ảnh Maison MIPA là một lần trở về &ldquo;ngôi nhà thứ hai&rdquo; — ấm áp, an yên và đong đầy tình cảm. Hãy cùng chúng tôi nâng niu những khoảnh khắc quý giá nhất bên những người bạn yêu thương.
        </p>

        {/* Real Action Triggers */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={onOpenBooking}
            className="public-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.95rem 2.25rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              backgroundColor: '#FAF8F3',
              color: '#29231F',
              borderRadius: '4px',
              cursor: 'pointer',
              border: 'none',
              transition: 'transform 0.2s ease, background-color 0.2s ease',
            }}
          >
            <Calendar size={17} /> Đặt lịch chụp trực tuyến
          </button>

          <a
            href={`tel:${SITE_CONFIG.contact.phoneE164 || '0966616546'}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.95rem 2rem',
              fontSize: '0.95rem',
              fontWeight: 500,
              color: '#FFFDF9',
              backgroundColor: 'rgba(255, 253, 249, 0.12)',
              border: '1px solid rgba(255, 253, 249, 0.35)',
              borderRadius: '4px',
              textDecoration: 'none',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 253, 249, 0.22)';
              e.currentTarget.style.borderColor = '#FFFDF9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 253, 249, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 253, 249, 0.35)';
            }}
          >
            <PhoneCall size={17} /> Hotline: {SITE_CONFIG.contact.hotline}
          </a>
        </div>

        {/* Social Connect Quick Badges */}
        <div
          style={{
            marginTop: '2.25rem',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.88rem', color: 'rgba(255, 253, 249, 0.7)' }}>
            Nhắn tin tư vấn trực tiếp cùng Tiệm qua:
          </span>
          <a
            href={SITE_CONFIG.social.facebook}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#D4AF37',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
              borderBottom: '1px solid rgba(212, 175, 55, 0.45)',
              paddingBottom: '2px',
            }}
          >
            Fanpage Facebook →
          </a>
          <a
            href={SITE_CONFIG.social.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#D4AF37',
              fontSize: '0.9rem',
              fontWeight: 600,
              textDecoration: 'none',
              borderBottom: '1px solid rgba(212, 175, 55, 0.45)',
              paddingBottom: '2px',
            }}
          >
            Kênh TikTok Tiệm Ảnh →
          </a>
        </div>
      </div>
    </section>
  );
};

export default HomeConsultationCtaSection;
