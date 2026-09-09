// ==============================================================================
// Maison MIPA Memories - Emotional Final CTA Section (#6 & #16)
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowRight, Sparkles } from 'lucide-react';

interface FinalCtaSectionProps {
  onOpenBooking: () => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onOpenBooking }) => {
  const navigate = useNavigate();

  return (
    <section style={{ padding: '5rem 1rem', backgroundColor: '#604634', color: '#FFFDF6', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 1rem', backgroundColor: 'rgba(239, 230, 201, 0.15)', color: '#EFE6C9', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.2rem' }}>
          <Sparkles size={14} color="#C6A45F" /> KHỞI ĐẦU BỘ ẢNH CỦA BẠN
        </div>

        <h2
          style={{
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            marginBottom: '1.2rem',
            fontFamily: 'var(--mipa-font-heading)',
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#FFFDF6',
          }}
        >
          Hãy Để Thời Gian Ngưng Đọng<br />
          <span style={{ fontStyle: 'italic', fontWeight: 400, color: '#EFE6C9' }}>
            Trong Từng Khung Hình Yêu Thương
          </span>
        </h2>

        <p
          style={{
            color: '#EFE6C9',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            maxWidth: '650px',
            margin: '0 auto 2.5rem',
            opacity: 0.9,
          }}
        >
          Đặt lịch chụp ngay hôm nay để nhận trọn vẹn ưu đãi tư vấn bối cảnh, hỗ trợ trang phục và toàn bộ file ảnh gốc chất lượng cao.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={onOpenBooking}
            className="btn-mipa-gold"
            style={{ padding: '0.9rem 2.2rem', fontSize: '1.05rem', display: 'inline-flex', alignItems: 'center', gap: '0.6rem' }}
          >
            <Camera size={18} /> Đặt Lịch Chụp Ngay
          </button>

          <button
            onClick={() => navigate('/portfolio')}
            style={{
              padding: '0.9rem 2rem',
              fontSize: '1rem',
              backgroundColor: 'transparent',
              border: '1px solid rgba(239, 230, 201, 0.4)',
              color: '#FFFDF6',
              borderRadius: '24px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            Khám Phá Portfolio <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default FinalCtaSection;
