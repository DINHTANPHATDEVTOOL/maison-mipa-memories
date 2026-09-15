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
          BẮT ĐẦU CÙNG MAISON MIPA
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
          Bạn đã có ý tưởng cho buổi chụp?
        </h2>

        <p
          style={{
            fontSize: '1.05rem',
            lineHeight: 1.65,
            color: 'rgba(255, 253, 249, 0.8)',
            margin: '0 auto 2.5rem auto',
            maxWidth: '620px',
            fontWeight: 300,
          }}
        >
          Đội ngũ Maison MIPA sẵn sàng lắng nghe và đồng hành cùng bạn từ việc lựa chọn concept, trang phục cho đến từng khung hình hoàn hảo nhất.
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
      </div>
    </section>
  );
};

export default HomeConsultationCtaSection;
