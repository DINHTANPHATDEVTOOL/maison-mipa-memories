import React from 'react';
import { Link } from 'react-router-dom';
import { SITE_CONFIG } from '../config/site';

export const Footer: React.FC = () => {
  return (
    <footer style={{
      backgroundColor: '#241E1A',
      color: '#FAF8F3',
      padding: '4rem 1.5rem 2.5rem',
      borderTop: '1px solid rgba(255, 253, 249, 0.08)',
    }}>
      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '2.5rem 2rem',
        marginBottom: '3rem',
      }}>
        {/* Brand Col */}
        <div>
          <div style={{
            fontFamily: 'var(--mipa-font-heading)',
            fontSize: '1.75rem',
            letterSpacing: '0.08em',
            marginBottom: '0.4rem',
            color: '#FFFDF9',
          }}>
            MAISON MIPA
          </div>
          <div style={{
            fontSize: '0.75rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: '#B89B62',
            marginBottom: '1.25rem',
          }}>
            Memories Studio • Sài Gòn
          </div>
          <p style={{
            fontSize: '0.88rem',
            lineHeight: 1.7,
            color: 'rgba(255, 253, 249, 0.65)',
            maxWidth: '300px',
            margin: 0,
          }}>
            Studio chụp ảnh phong cách Pháp ấm áp và tự nhiên tại Sài Gòn. Lưu giữ những khoảnh khắc chân thật và nguyên bản nhất.
          </p>
        </div>

        {/* Studio Info */}
        <div>
          <h4 style={{
            fontFamily: 'var(--mipa-font-body)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#B89B62',
            marginBottom: '1.25rem',
          }}>
            Studio & Liên Hệ
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            color: 'rgba(255, 253, 249, 0.75)',
          }}>
            <div>{SITE_CONFIG.contact.address.formatted}</div>
            <div>
              Hotline:{' '}
              <a
                href={`tel:${SITE_CONFIG.contact.phoneE164}`}
                style={{ color: '#FFFDF9', textDecoration: 'none', fontWeight: 500 }}
              >
                {SITE_CONFIG.contact.hotline}
              </a>
            </div>
            <div>
              <a
                href={`mailto:${SITE_CONFIG.contact.email}`}
                style={{ color: 'rgba(255, 253, 249, 0.75)', textDecoration: 'none' }}
              >
                {SITE_CONFIG.contact.email}
              </a>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div>
          <h4 style={{
            fontFamily: 'var(--mipa-font-body)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#B89B62',
            marginBottom: '1.25rem',
          }}>
            Giờ Mở Cửa
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            fontSize: '0.88rem',
            lineHeight: 1.6,
            color: 'rgba(255, 253, 249, 0.75)',
          }}>
            <div>Thứ Hai – Thứ Sáu: {SITE_CONFIG.contact.openingHours.weekday}</div>
            <div>Thứ Bảy – Chủ Nhật: {SITE_CONFIG.contact.openingHours.weekend}</div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 253, 249, 0.5)', marginTop: '0.25rem' }}>
              Nhận lịch chụp tất cả các ngày trong tuần
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{
            fontFamily: 'var(--mipa-font-body)',
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#B89B62',
            marginBottom: '1.25rem',
          }}>
            Khám Phá
          </h4>
          <nav style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            fontSize: '0.88rem',
          }}>
            <Link to="/dich-vu" style={{ color: 'rgba(255, 253, 249, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Dịch vụ chụp ảnh
            </Link>
            <Link to="/bang-gia" style={{ color: 'rgba(255, 253, 249, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Bảng giá trọn gói
            </Link>
            <Link to="/portfolio" style={{ color: 'rgba(255, 253, 249, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Bộ sưu tập hình ảnh
            </Link>
            <Link to="/booking" style={{ color: '#FFFDF9', textDecoration: 'none', fontWeight: 500 }}>
              Đặt lịch chụp trực tuyến
            </Link>
          </nav>
        </div>
      </div>

      <div style={{
        maxWidth: '1240px',
        margin: '0 auto',
        borderTop: '1px solid rgba(255, 253, 249, 0.1)',
        paddingTop: '1.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '0.8rem',
        color: 'rgba(255, 253, 249, 0.5)',
      }}>
        <div>
          © 2026 {SITE_CONFIG.siteName}. Bảo lưu mọi quyền.
        </div>
        <div>
          {SITE_CONFIG.contact.address.formatted}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
