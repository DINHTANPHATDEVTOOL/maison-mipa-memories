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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.8rem' }}>
            <img
              src="/logo-transparent-256.png"
              alt="Maison MIPA Memories Logo"
              style={{
                width: '44px',
                height: '44px',
                objectFit: 'contain',
                filter: 'brightness(1.15)',
              }}
            />
            <div>
              <div style={{
                fontFamily: 'var(--mipa-font-heading)',
                fontSize: '1.45rem',
                letterSpacing: '0.06em',
                color: '#FFFDF9',
                lineHeight: 1.1,
              }}>
                MAISON MIPA
              </div>
              <div style={{
                fontSize: '0.72rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#B89B62',
              }}>
                Nhà Là Nơi Lưu Giữ Ký Ức
              </div>
            </div>
          </div>
          <p style={{
            fontSize: '0.88rem',
            lineHeight: 1.7,
            color: 'rgba(255, 253, 249, 0.75)',
            maxWidth: '320px',
            margin: 0,
          }}>
            {SITE_CONFIG.brandStoryShort}
          </p>
          {/* Social Links with TikTok & Facebook Fanpage & Zalo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '1.25rem' }}>
            <a
              href={SITE_CONFIG.social.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Fanpage Facebook Maison MIPA"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 253, 249, 0.08)',
                color: '#FFFDF9',
                fontSize: '0.82rem',
                textDecoration: 'none',
                border: '1px solid rgba(184, 155, 98, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>Fanpage</span>
            </a>

            <a
              href={SITE_CONFIG.social.tiktok}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok Tiệm ảnh Maison MIPA"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 253, 249, 0.08)',
                color: '#FFFDF9',
                fontSize: '0.82rem',
                textDecoration: 'none',
                border: '1px solid rgba(184, 155, 98, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46V11.8a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-2.91-1.07 4.89 4.89 0 0 1-1.44-2.16h5.31z"/>
              </svg>
              <span>TikTok</span>
            </a>

            <a
              href={SITE_CONFIG.social.zalo}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Zalo Tư Vấn Tiệm Ảnh"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 253, 249, 0.08)',
                color: '#FFFDF9',
                fontSize: '0.82rem',
                textDecoration: 'none',
                border: '1px solid rgba(184, 155, 98, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Zalo</span>
            </a>
          </div>
        </div>

        {/* Tiệm Ảnh Info */}
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
            Tiệm Ảnh & Liên Hệ
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
            <div style={{ fontSize: '0.82rem', color: '#B89B62', marginTop: '0.35rem' }}>
              ✦ Tiệm ảnh chụp kỷ niệm cá nhân, đôi lứa & gia đình
            </div>
          </div>
        </div>

        {/* Concepts Phổ Biến */}
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
            Concept Chụp Ảnh
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.55rem',
            fontSize: '0.85rem',
            color: 'rgba(255, 253, 249, 0.8)',
          }}>
            {[
              { name: 'Nàng Thơ Trong Trẻo', slug: 'nang-tho' },
              { name: 'Chụp Áo Dài Duyên Dáng', slug: 'chup-ao-dai-duyen-dang' },
              { name: 'Kỷ Yếu & Tốt Nghiệp', slug: 'chup-ky-yeu-tot-nghiep' },
              { name: 'Ảnh Couple & Parisian', slug: 'parisian-romance' },
              { name: 'Tiệc Sinh Nhật Rực Rỡ', slug: 'sinh-nhat-lung-linh' },
              { name: 'Gia Đình Sum Vầy & Tổ Ấm', slug: 'la-famille-douce' },
            ].map((c) => (
              <Link
                key={c.slug}
                to={`/concept/${c.slug}`}
                style={{ color: 'rgba(255, 253, 249, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}
              >
                • {c.name}
              </Link>
            ))}
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
            <Link to="/concept" style={{ color: 'rgba(255, 253, 249, 0.75)', textDecoration: 'none', transition: 'color 0.2s' }}>
              Ý tưởng & Concept
            </Link>
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
          © {new Date().getFullYear()} {SITE_CONFIG.siteName}. Bảo lưu mọi quyền.
        </div>
        <div>
          {SITE_CONFIG.contact.address.formatted}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
