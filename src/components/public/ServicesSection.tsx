// ==============================================================================
// Maison MIPA Memories - Editorial Services Section (#6 & #16)
// Connected to real catalogService. No mockData imports. Editorial aesthetics.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices } from '../../services/catalogService';
import type { ServiceCategory } from '../../types';
import { ArrowRight, Sparkles } from 'lucide-react';

interface ServicesSectionProps {
  onSelectService?: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadServicesData() {
      try {
        const data = await getServices();
        if (mounted) setServices(data);
      } catch (err) {
        console.error('Lỗi tải danh mục dịch vụ:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadServicesData();
    return () => { mounted = false; };
  }, []);

  const handleServiceClick = (srv: ServiceCategory) => {
    if (onSelectService) {
      onSelectService(srv.id);
    } else {
      navigate(`/dich-vu/${srv.slug}`);
    }
  };

  if (isLoading || services.length === 0) return null;

  return (
    <section id="services" className="mipa-container" style={{ padding: '4rem 1rem', maxWidth: '1350px', margin: '0 auto' }}>
      <div>
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2.5rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            DỊCH VỤ CHỤP ẢNH NGHỆ THUẬT
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
            Bạn Muốn Lưu Giữ Khoảnh Khắc Nào?
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
            Từ những ánh nhìn say đắm của lứa đôi đến khoảnh khắc sum vầy trọn vẹn của gia đình, mỗi gói chụp đều được định hình theo tinh thần Quiet Luxury.
          </p>
        </div>

        <div className="mipa-grid-3" style={{ display: 'grid', gap: '2rem' }}>
          {services.map((srv, idx) => {
            const fallbackImage = idx % 2 === 0 ? '/hero.png' : '/studio.png';
            const displayImage = srv.image && !srv.image.includes('unsplash') ? srv.image : fallbackImage;

            return (
              <div
                key={srv.id}
                onClick={() => handleServiceClick(srv)}
                className="mipa-card"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleServiceClick(srv); }}
                style={{
                  borderRadius: '24px',
                  overflow: 'hidden',
                  backgroundColor: '#FFFDF6',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: '1px solid var(--mipa-beige)',
                  boxShadow: 'var(--mipa-shadow-sm)',
                  transition: 'transform 0.4s ease, box-shadow 0.4s ease',
                }}
              >
                <div>
                  <div style={{ position: 'relative', height: '240px', overflow: 'hidden', backgroundColor: '#2C221E' }}>
                    <img
                      src={displayImage}
                      alt={srv.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.6s ease',
                      }}
                    />
                    {srv.badge && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          backgroundColor: '#604634',
                          color: '#EFE6C9',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.3rem 0.8rem',
                          borderRadius: '20px',
                        }}
                      >
                        ★ {srv.badge}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.35rem', color: '#604634', marginBottom: '0.5rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
                      {srv.name}
                    </h3>
                    <p style={{ color: '#6E5F55', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                      {srv.description}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '0 1.5rem 1.5rem' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      color: '#8C6E53',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                    }}
                  >
                    Xem Chi Tiết & Báo Giá <ArrowRight size={15} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
