import React from 'react';
import { Camera, ArrowRight, Heart, Star, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onOpenBooking: () => void;
  onExplorePackages: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenBooking, onExplorePackages }) => {
  return (
    <section className="mipa-grid-2 mipa-container" style={{
      position: 'relative',
      padding: '1.5rem 0.85rem 2.5rem',
      maxWidth: '1350px',
      margin: '0 auto',
      alignItems: 'center',
    }}>
      {/* Left Text Box */}
      <div>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.4rem 1rem',
          backgroundColor: '#EFE6C9',
          color: '#604634',
          borderRadius: '20px',
          fontSize: '0.82rem',
          fontWeight: 700,
          letterSpacing: '0.05em',
          marginBottom: '1.2rem',
        }}>
          <Camera size={15} color="#C6A45F" /> MAISON MIPA MEMORIES STUDIO
        </div>

        <h1 style={{
          fontSize: '3.6rem',
          lineHeight: 1.1,
          color: '#604634',
          marginBottom: '1.2rem',
          fontWeight: 700,
        }}>
          Capture the moment.<br />
          <span style={{ fontStyle: 'italic', color: '#8C6E53', fontWeight: 400 }}>Keep the memory.</span>
        </h1>

        <p style={{
          fontSize: '1.1rem',
          color: '#6E5F55',
          lineHeight: 1.6,
          marginBottom: '2rem',
          maxWidth: '520px',
        }}>
          Những khoảnh khắc chân thật, ngọt ngào & ấm áp nhất của cuộc sống xứng đáng được lưu giữ mãi mãi trong không gian Studio Châu Âu tinh tế.
        </p>

        <div className="mipa-flex-responsive" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ padding: '0.9rem 2rem', fontSize: '1.05rem' }}>
            <Camera size={18} /> ĐẶT LỊCH CHỤP NGAY
          </button>
          
          <button onClick={onExplorePackages} className="btn-mipa-secondary" style={{ padding: '0.9rem 1.8rem', fontSize: '1rem' }}>
            Xem Gói Bảng Giá <ArrowRight size={16} />
          </button>
        </div>

        {/* Studio Highlights Pills */}
        <div className="mipa-flex-responsive" style={{
          display: 'flex',
          gap: '1.5rem',
          marginTop: '2.5rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(140, 110, 83, 0.15)',
        }}>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#604634', fontFamily: 'var(--mipa-font-heading)' }}>
              4.9 ★★★★★
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
              Đánh giá từ 1,200+ khách hàng
            </div>
          </div>

          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#604634', fontFamily: 'var(--mipa-font-heading)' }}>
              100% Private
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
              Phòng Studio riêng tư khép kín
            </div>
          </div>

          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#604634', fontFamily: 'var(--mipa-font-heading)' }}>
              24h Express
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
              Nhận album ảnh online nhanh chóng
            </div>
          </div>
        </div>
      </div>

      {/* Right Hero Image Frame */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'relative',
          borderRadius: '30px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px rgba(96, 70, 52, 0.2)',
          border: '4px solid #FFFFFF',
        }}>
          <img
            src="/hero.png"
            alt="Maison MIPA Memories Studio Couple Session"
            style={{ width: '100%', maxHeight: '480px', height: 'auto', objectFit: 'cover', display: 'block' }}
          />
        </div>

        {/* Floating Badge Card (Desktop Only to prevent mobile viewport overflow) */}
        <div className="mipa-card mipa-desktop-only" style={{
          position: 'absolute',
          bottom: '15px',
          left: '15px',
          padding: '0.8rem 1rem',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.8rem',
          backgroundColor: '#FFFDF6',
          border: '1px solid #C6A45F',
          boxShadow: '0 8px 20px rgba(96, 70, 52, 0.15)',
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: '#8C6E53',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Heart size={18} fill="#FFF" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.85rem' }}>Couple & Wedding Memories</div>
            <div style={{ fontSize: '0.72rem', color: '#8C6E53' }}>Gói Signature 2.490.000đ được ưa chuộng</div>
          </div>
        </div>
      </div>
    </section>
  );
};
