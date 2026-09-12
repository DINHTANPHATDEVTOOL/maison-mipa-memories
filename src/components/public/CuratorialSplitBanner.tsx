// ==============================================================================
// Maison MIPA Memories — Curatorial Split Editorial Banner
// Concept: Banner Tạp Chí Thời Trang Đôi (Vogue / Elle French Editorial Spread)
// Features: Gold drop-cap quote, curatorial wax seal, archival film rebate borders
// ==============================================================================
import React from 'react';
import { Sparkles, Quote, Award } from 'lucide-react';

export const CuratorialSplitBanner: React.FC = () => {
  return (
    <section
      data-testid="curatorial-split-banner"
      className="editorial-section curatorial-split-banner"
      aria-label="Tuyên ngôn nghệ thuật & Bố cục tạp chí thời trang"
      style={{
        backgroundColor: '#16110E',
        borderTop: '1px solid rgba(198, 164, 95, 0.18)',
        borderBottom: '1px solid rgba(198, 164, 95, 0.18)',
        padding: '5rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="editorial-container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: '3.5rem',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Curatorial Philosophy & Wax Seal */}
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.3rem 0.85rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(198, 164, 95, 0.08)',
                border: '1px solid rgba(198, 164, 95, 0.22)',
                marginBottom: '1.25rem',
              }}
            >
              <Quote size={13} style={{ color: '#C6A45F' }} />
              <span
                style={{
                  fontSize: '0.72rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: '#E0C287',
                  fontWeight: 600,
                }}
              >
                PHILOSOPHIE ARTISTIQUE • 2026
              </span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, serif)',
                fontSize: 'clamp(2rem, 3.2vw, 2.7rem)',
                lineHeight: 1.2,
                color: '#FBF6EE',
                marginBottom: '1.5rem',
                fontWeight: 500,
              }}
            >
              "Ánh sáng không chỉ để nhìn thấy, mà để cảm nhận khoảnh khắc vĩnh cửu."
            </h2>

            <p
              style={{
                fontSize: '0.96rem',
                color: '#D1C4B7',
                lineHeight: 1.7,
                marginBottom: '1.75rem',
              }}
            >
              Tại Maison MIPA, chúng tôi chối từ những biểu cảm sắp đặt gượng gạo hay kỹ thuật hậu kỳ
              nhân tạo vô hồn. Mỗi khung hình là sự kết hợp giữa ánh sáng tự nhiên qua rèm lụa Pháp,
              không gian gỗ sồi ấm áp và cảm xúc thả lỏng nguyên bản của chính bạn.
            </p>

            {/* Atelier Studio Certification Emblem */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: '6px',
                backgroundColor: '#201813',
                border: '1px solid rgba(198, 164, 95, 0.25)',
                maxWidth: '420px',
              }}
            >
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(198, 164, 95, 0.15)',
                  border: '1.5px solid #C6A45F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Award size={22} style={{ color: '#E0C287' }} />
              </div>

              <div>
                <div
                  style={{
                    fontFamily: 'var(--editorial-font-heading, serif)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#FBF6EE',
                    lineHeight: 1.2,
                  }}
                >
                  Cam Kết Chuẩn Nghệ Thuật Fine Art
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#C6A45F',
                    marginTop: '2px',
                  }}
                >
                  100% Khách Hàng Nhận Đủ File Gốc • Màu Da Tự Nhiên
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Overlapping Dual Archival Photo Prints with Film Rebate Border */}
          <div
            style={{
              position: 'relative',
              height: '420px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Background Secondary Print (Tilted -4deg) */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '68%',
                maxWidth: '340px',
                height: '320px',
                backgroundColor: '#1E1611',
                border: '1px solid rgba(198, 164, 95, 0.3)',
                padding: '10px',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.65)',
                transform: 'rotate(-4deg)',
                zIndex: 1,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src="/studio.png"
                  alt="Maison MIPA Atelier Saigon"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'brightness(0.92)',
                  }}
                />
                {/* Film Rebate Number */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    left: '8px',
                    fontFamily: 'monospace',
                    fontSize: '0.62rem',
                    color: '#E0C287',
                    letterSpacing: '0.15em',
                  }}
                >
                  KODAK PORTRA 400 • 36 EXP
                </div>
              </div>
            </div>

            {/* Foreground Primary Print (Tilted +3deg) */}
            <div
              style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                width: '68%',
                maxWidth: '340px',
                height: '320px',
                backgroundColor: '#241C16',
                border: '2px solid rgba(198, 164, 95, 0.5)',
                padding: '12px',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.75)',
                transform: 'rotate(3deg)',
                zIndex: 2,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <img
                  src="/hero.png"
                  alt="Parisian Romance Monologue"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                {/* French Atelier Stamp */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(21, 17, 14, 0.85)',
                    border: '1px solid #C6A45F',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '2px',
                    fontSize: '0.6rem',
                    letterSpacing: '0.12em',
                    color: '#E0C287',
                    fontWeight: 600,
                  }}
                >
                  COLLECTION PRIVÉE 2026
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CuratorialSplitBanner;
