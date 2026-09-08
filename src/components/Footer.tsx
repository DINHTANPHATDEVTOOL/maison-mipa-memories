import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Share2, Globe, Clock } from 'lucide-react';
import { SITE_CONFIG } from '../config/site';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#2C221E',
      color: '#EFE6C9',
      padding: '3rem 1rem 2rem',
      borderTop: '2px solid #8C6E53',
    }}>
      <div className="mipa-grid-4 mipa-container" style={{
        maxWidth: '1350px',
        margin: '0 auto',
        gap: '2rem',
        marginBottom: '2.5rem',
      }}>
        {/* Brand Col */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#C6A45F',
              color: '#2C221E',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--mipa-font-heading)',
              fontSize: '1.3rem',
            }}>
              M
            </div>
            <div>
              <div style={{ fontFamily: 'var(--mipa-font-heading)', fontSize: '1.4rem', fontWeight: 700, color: '#EFE6C9' }}>
                MAISON MIPA
              </div>
              <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D9C9A5' }}>
                Memories Studio
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.88rem', color: '#D9C9A5', lineHeight: 1.6, maxWidth: '320px' }}>
            Hệ thống đặt lịch & Quản lý vận hành Studio chụp ảnh nghệ thuật cao cấp. Lưu giữ những ký ức ngọt ngào nhất của bạn.
          </p>
        </div>

        {/* Studio Info */}
        <div>
          <h4 style={{ fontSize: '1.1rem', color: '#EFE6C9', marginBottom: '1rem', borderBottom: '1px solid rgba(217, 201, 165, 0.2)', paddingBottom: '0.5rem' }}>
            Địa Chỉ & Liên Hệ
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#D9C9A5' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <MapPin size={16} color="#C6A45F" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{SITE_CONFIG.contact.address.formatted}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Phone size={16} color="#C6A45F" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                Hotline:{' '}
                <a
                  href={`tel:${SITE_CONFIG.contact.phoneE164}`}
                  style={{ color: '#EFE6C9', textDecoration: 'none', fontWeight: 600 }}
                >
                  {SITE_CONFIG.contact.hotline}
                </a>{' '}
                ({SITE_CONFIG.contact.openingHours.schemaOpens} - {SITE_CONFIG.contact.openingHours.schemaCloses})
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Mail size={16} color="#C6A45F" style={{ flexShrink: 0, marginTop: '2px' }} />
              <a
                href={`mailto:${SITE_CONFIG.contact.email}`}
                style={{ color: '#EFE6C9', textDecoration: 'none' }}
              >
                {SITE_CONFIG.contact.email}
              </a>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div>
          <h4 style={{ fontSize: '1.1rem', color: '#EFE6C9', marginBottom: '1rem', borderBottom: '1px solid rgba(217, 201, 165, 0.2)', paddingBottom: '0.5rem' }}>
            Giờ Mở Cửa Studio
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#D9C9A5' }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Clock size={15} color="#C6A45F" />
              <span>Thứ Hai - Thứ Sáu: <strong>{SITE_CONFIG.contact.openingHours.weekday}</strong></span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Clock size={15} color="#C6A45F" />
              <span>Thứ Bảy - Chủ Nhật: <strong>{SITE_CONFIG.contact.openingHours.weekend}</strong></span>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#C6A45F', marginTop: '0.4rem' }}>
              * Khuyến khích đặt lịch trực tuyến trước 24h
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '1.1rem', color: '#EFE6C9', marginBottom: '1rem', borderBottom: '1px solid rgba(217, 201, 165, 0.2)', paddingBottom: '0.5rem' }}>
            Liên Kết & Kết Nối
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
            <Link to="/dich-vu" style={{ color: '#D9C9A5', textDecoration: 'none' }}>→ Dịch vụ chụp ảnh</Link>
            <Link to="/bang-gia" style={{ color: '#D9C9A5', textDecoration: 'none' }}>→ Bảng giá trọn gói</Link>
            <Link to="/portfolio" style={{ color: '#D9C9A5', textDecoration: 'none' }}>→ Portfolio nghệ thuật</Link>
            <Link to="/booking" style={{ color: '#D9C9A5', textDecoration: 'none' }}>→ Đặt lịch trực tuyến</Link>
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <a
              href={SITE_CONFIG.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Maison MIPA"
              style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(239, 230, 201, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Share2 size={18} color="#C6A45F" />
            </a>
            <a
              href={SITE_CONFIG.social.zalo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Zalo Maison MIPA"
              style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(239, 230, 201, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Globe size={18} color="#C6A45F" />
            </a>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: '1350px',
        margin: '0 auto',
        borderTop: '1px solid rgba(217, 201, 165, 0.15)',
        paddingTop: '1.5rem',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: '#D9C9A5',
      }}>
        © 2026 {SITE_CONFIG.siteName}. All Rights Reserved. Hotline: {SITE_CONFIG.contact.hotline} • {SITE_CONFIG.contact.address.formatted}
      </div>
    </footer>
  );
};

export default Footer;
