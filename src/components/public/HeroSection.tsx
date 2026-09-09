// ==============================================================================
// Maison MIPA Memories - Editorial French Maison Hero Section (#6 & #16)
// Art direction: Editorial / French Maison / Quiet Luxury / Photography-first
// No fake social proof. Primary CTA: Đặt Lịch Chụp, Secondary: Xem Portfolio.
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, Sparkles, Sun, Shield, Image as ImageIcon } from 'lucide-react';

interface HeroSectionProps {
  onOpenBooking: () => void;
  onExplorePackages?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();

  return (
    <section
      className="mipa-container"
      style={{
        position: 'relative',
        padding: '2.5rem 1rem 3.5rem',
        maxWidth: '1350px',
        margin: '0 auto',
      }}
    >
      <div
        className="mipa-grid-2"
        style={{
          alignItems: 'center',
          gap: 'clamp(2rem, 5vw, 4rem)',
        }}
      >
        {/* Left Editorial Text Block */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 1rem',
              backgroundColor: '#EFE6C9',
              color: '#604634',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.08em',
              marginBottom: '1.2rem',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={14} color="#C6A45F" /> MAISON MIPA MEMORIES • STUDIO NGHỆ THUẬT
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              lineHeight: 1.12,
              color: '#604634',
              marginBottom: '1.2rem',
              fontWeight: 700,
              fontFamily: 'var(--mipa-font-heading)',
              letterSpacing: '-0.02em',
            }}
          >
            Capture the moment.<br />
            <span style={{ fontStyle: 'italic', color: '#8C6E53', fontWeight: 400 }}>
              Keep the memory.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.05rem',
              color: '#6E5F55',
              lineHeight: 1.7,
              marginBottom: '2.2rem',
              maxWidth: '520px',
            }}
          >
            Lưu giữ những rung động chân thật, ấm áp và nên thơ nhất qua lăng kính Parisian. Không gian ánh sáng tự nhiên với bối cảnh thiết kế độc bản tại Sài Gòn.
          </p>

          {/* Action Buttons: Primary "Đặt Lịch Chụp", Secondary "Xem Portfolio" */}
          <div
            className="mipa-flex-responsive"
            style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <button
              onClick={onOpenBooking}
              className="btn-mipa-gold"
              style={{
                padding: '0.9rem 2.2rem',
                fontSize: '1.05rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <Camera size={18} /> Đặt Lịch Chụp
            </button>

            <button
              onClick={() => navigate('/portfolio')}
              className="btn-mipa-secondary"
              style={{
                padding: '0.9rem 2rem',
                fontSize: '1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              Xem Portfolio <ArrowRight size={16} />
            </button>
          </div>

          {/* Genuine Studio Attributes (Zero Fake Metrics) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1.2rem',
              marginTop: '2.5rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid rgba(140, 110, 83, 0.15)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#604634', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                <Sun size={16} color="#C6A45F" /> Ánh Sáng Tự Nhiên
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6E5F55', lineHeight: 1.4 }}>
                Cửa sổ mái vòm và rèm lụa Pháp dịu dàng
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#604634', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                <Shield size={16} color="#C6A45F" /> Studio Riêng Tư
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6E5F55', lineHeight: 1.4 }}>
                Mỗi ca chụp chỉ phục vụ 1 khách hàng duy nhất
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#604634', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                <ImageIcon size={16} color="#C6A45F" /> Trọn Gói File Gốc
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6E5F55', lineHeight: 1.4 }}>
                Tặng 100% ảnh gốc chất lượng cao qua Google Drive
              </div>
            </div>
          </div>
        </div>

        {/* Right Hero Frame */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'relative',
              borderRadius: '28px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(96, 70, 52, 0.18)',
              border: '3px solid #FFFFFF',
              backgroundColor: '#2C221E',
            }}
          >
            <img
              src="/hero.png"
              alt="Maison MIPA Memories Studio Editorial Couple Session"
              fetchPriority="high"
              style={{
                width: '100%',
                maxHeight: '480px',
                height: 'auto',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          </div>

          {/* Subtle Editorial Label */}
          <div
            className="mipa-desktop-only"
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              padding: '0.7rem 1.1rem',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 253, 246, 0.95)',
              backdropFilter: 'blur(8px)',
              border: '1px solid #C6A45F',
              boxShadow: '0 8px 20px rgba(96, 70, 52, 0.12)',
            }}
          >
            <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.85rem' }}>
              Parisian Romance Session
            </div>
            <div style={{ fontSize: '0.75rem', color: '#8C6E53' }}>
              Concept độc quyền tại Maison MIPA Studio
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
