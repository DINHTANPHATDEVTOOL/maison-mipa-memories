import React from 'react';
import { Camera, MapPin, Phone, Mail, Clock, Share2, Globe } from 'lucide-react';

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
            Địa Chỉ & Liện Hệ
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem', color: '#D9C9A5' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}><MapPin size={16} color="#C6A45F" /> 88 Phan Sào Nam, Quận Tân Bình, TP. Hồ Chí Minh</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}><Phone size={16} color="#C6A45F" /> Hotline: 0966 616 546 (08:00 - 21:00)</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}><Mail size={16} color="#C6A45F" /> contact@maisonmipa.vn</div>
          </div>
        </div>

        {/* Operating Hours */}
        <div>
          <h4 style={{ fontSize: '1.1rem', color: '#EFE6C9', marginBottom: '1rem', borderBottom: '1px solid rgba(217, 201, 165, 0.2)', paddingBottom: '0.5rem' }}>
            Giờ Mở Cửa Studio
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem', color: '#D9C9A5' }}>
            <div>Thứ Hai - Thứ Sáu: <strong>08:30 — 19:00</strong></div>
            <div>Thứ Bảy - Chủ Nhật: <strong>08:00 — 20:30</strong></div>
            <div style={{ fontSize: '0.78rem', color: '#C6A45F', marginTop: '0.4rem' }}>* Khuyến khích đặt lịch trực tuyến trước 24h</div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '1.1rem', color: '#EFE6C9', marginBottom: '1rem', borderBottom: '1px solid rgba(217, 201, 165, 0.2)', paddingBottom: '0.5rem' }}>
            Kết Nối MIPA
          </h4>
          <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(239, 230, 201, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Share2 size={18} color="#C6A45F" />
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: 'rgba(239, 230, 201, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Globe size={18} color="#C6A45F" />
            </div>
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
        © 2026 Maison MIPA Memories. All Rights Reserved. Designed & Built for Studio Management & Customer Booking.
      </div>
    </footer>
  );
};
