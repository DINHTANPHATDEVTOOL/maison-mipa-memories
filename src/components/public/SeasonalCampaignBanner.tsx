// ==============================================================================
// Maison MIPA Memories — Seasonal Exhibition Privilege Banner
// Concept: Banner Đặc Sắc Mùa Kỷ Niệm & Cưới Paris 2026
// Features: 3 Luxury Atelier Privilege cards, gold foil badges, wax seal emblem
// ==============================================================================
import React from 'react';
import { Award, Gift, Image, ShieldCheck, ArrowRight, Sparkles } from 'lucide-react';

interface SeasonalCampaignBannerProps {
  onOpenBooking: () => void;
}

export const SeasonalCampaignBanner: React.FC<SeasonalCampaignBannerProps> = ({
  onOpenBooking,
}) => {
  const privileges = [
    {
      id: 'priv-1',
      icon: Gift,
      badge: 'ĐẶC QUYỀN I',
      title: 'Tặng Album Photobook Mở Phẳng',
      specs: 'Kích thước 20 × 20 cm • Giấy ép lụa cao cấp chống nước • Bìa da dập chìm',
      description: 'Mỗi cuốn photobook được in thủ công tỉ mỉ, lưu giữ những trang ảnh mở phẳng 180° trọn vẹn cảm xúc.',
    },
    {
      id: 'priv-2',
      icon: Image,
      badge: 'ĐẶC QUYỀN II',
      title: 'Tặng 01 Khung Ảnh Gỗ Sồi Lớn',
      specs: 'Kích thước 60 × 90 cm • Gỗ sồi nhập khẩu • Kính mỹ thuật chống lóa',
      description: 'Bức tranh gia đình / couple hoàn chỉnh để treo trang trọng tại phòng khách hoặc không gian riêng tư.',
    },
    {
      id: 'priv-3',
      icon: ShieldCheck,
      badge: 'ĐẶC QUYỀN III',
      title: 'Trọn Bộ 100% File Ảnh Gốc',
      specs: 'Độ phân giải nguyên bản • Bàn giao hỏa tốc 24h qua Cloud riêng biệt',
      description: 'Cam kết minh bạch tuyệt đối, bạn sở hữu toàn bộ file ảnh gốc chất lượng cao mà không tốn thêm bất kỳ phụ phí.',
    },
  ];

  return (
    <section
      data-testid="seasonal-campaign-banner"
      className="editorial-section seasonal-privilege-banner"
      aria-label="Đặc quyền mùa chụp Maison MIPA 2026"
      style={{
        backgroundColor: '#19130F',
        borderTop: '1px solid rgba(198, 164, 95, 0.15)',
        borderBottom: '1px solid rgba(198, 164, 95, 0.15)',
        padding: '4.5rem 0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Background Radial Light Glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '350px',
          background: 'radial-gradient(ellipse at center, rgba(198, 164, 95, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="editorial-container">
        {/* Banner Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 3rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.3rem 0.9rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(198, 164, 95, 0.1)',
              border: '1px solid rgba(198, 164, 95, 0.28)',
              marginBottom: '0.85rem',
            }}
          >
            <Sparkles size={13} style={{ color: '#C6A45F' }} />
            <span
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#E0C287',
                fontWeight: 600,
              }}
            >
              PRIVILÈGES D’ATELIER • SỰ KIỆN NGHỆ THUẬT 2026
            </span>
          </div>

          <h2
            className="editorial-h2"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
              marginBottom: '0.85rem',
              color: '#FBF6EE',
            }}
          >
            Đặc Quyền Mùa Triển Lãm & Kỷ Niệm
          </h2>

          <p
            className="editorial-copy"
            style={{
              fontSize: '1rem',
              color: '#D1C4B7',
              margin: '0 auto',
            }}
          >
            Dành cho tất cả khách hàng đặt lịch chụp trực tuyến tại Maison MIPA trong tuần này.
          </p>
        </div>

        {/* 3 Privilege Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.75rem',
            marginBottom: '3rem',
          }}
        >
          {privileges.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: '#221A15',
                  border: '1px solid rgba(198, 164, 95, 0.22)',
                  borderRadius: '6px',
                  padding: '2.2rem 1.8rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.3s ease, border-color 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#C6A45F';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'rgba(198, 164, 95, 0.22)';
                }}
              >
                {/* Gold Top Border Accent Line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, #C6A45F, transparent)',
                  }}
                />

                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(198, 164, 95, 0.12)',
                        border: '1px solid rgba(198, 164, 95, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} style={{ color: '#E0C287' }} />
                    </div>

                    <span
                      style={{
                        fontSize: '0.68rem',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: '#C6A45F',
                        fontWeight: 600,
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, serif)',
                      fontSize: '1.45rem',
                      fontWeight: 600,
                      color: '#FBF6EE',
                      marginBottom: '0.5rem',
                      lineHeight: 1.25,
                    }}
                  >
                    {item.title}
                  </h3>

                  <div
                    style={{
                      fontSize: '0.78rem',
                      color: '#E0C287',
                      fontStyle: 'italic',
                      marginBottom: '1rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.specs}
                  </div>

                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: '#D1C4B7',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Strip */}
        <div
          style={{
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onOpenBooking}
            className="public-btn-primary"
            style={{
              padding: '0.85rem 2.2rem',
              fontSize: '0.95rem',
              fontWeight: 600,
            }}
          >
            <span>Nhận Trọn Bộ Đặc Quyền & Đặt Lịch</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default SeasonalCampaignBanner;
