// ==============================================================================
// Maison MIPA Memories — Editorial Services Section
// Art Direction: Alternating photography rows with generous whitespace.
// No card boxes, no shadows, no artificial badges. Real catalogService data.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices } from '../../services/catalogService';
import type { ServiceCategory } from '../../types';

interface ServicesSectionProps {
  onSelectService?: (serviceId: string, slug?: string) => void;
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
      onSelectService(srv.id, srv.slug);
    } else {
      navigate(`/dich-vu/${srv.slug}`);
    }
  };

  if (isLoading || services.length === 0) return null;

  return (
    <section id="services" className="editorial-section" style={{ backgroundColor: 'var(--editorial-paper)' }}>
      <div className="editorial-container">
        {/* Section Header with Natural Sentence Case */}
        <div style={{ marginBottom: '4rem', maxWidth: '640px' }}>
          <span className="editorial-overline">DỊCH VỤ CHỤP ẢNH</span>
          <h2 className="editorial-h2">Bạn muốn lưu lại điều gì?</h2>
          <p className="editorial-copy">
            Từ những buổi chụp đôi riêng tư, chân dung cá nhân đến những ngày sum vầy của gia đình, mỗi buổi chụp đều được chuẩn bị chỉn chu và kỹ lưỡng.
          </p>
        </div>

        {/* Alternating Editorial Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {services.map((srv, idx) => {
            const isReverse = idx % 2 === 1;
            const fallbackImage = idx % 2 === 0 ? '/hero.png' : '/studio.png';
            const displayImage = srv.image && !srv.image.includes('unsplash') ? srv.image : fallbackImage;

            return (
              <div
                key={srv.id}
                className={`editorial-service-row ${isReverse ? 'reverse' : ''}`}
              >
                {/* Photo Element */}
                <div
                  className="editorial-service-image"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleServiceClick(srv)}
                >
                  <div
                    className="editorial-image-frame"
                    style={{
                      height: '380px',
                      border: '1px solid rgba(96, 70, 52, 0.12)',
                    }}
                  >
                    <img
                      src={displayImage}
                      alt={srv.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                </div>

                {/* Text Content */}
                <div className="editorial-service-text" style={{ padding: '0 0.5rem' }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--editorial-brown-accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    0{idx + 1} / DỊCH VỤ
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading)',
                      fontSize: 'clamp(1.8rem, 3vw, 2.4rem)',
                      color: 'var(--editorial-brown)',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      margin: '0 0 1rem 0',
                    }}
                  >
                    {srv.name}
                  </h3>

                  <p className="editorial-copy" style={{ marginBottom: '1.5rem', lineHeight: 1.7 }}>
                    {srv.description}
                  </p>

                  <button
                    onClick={() => handleServiceClick(srv)}
                    className="public-btn-link"
                    style={{ fontSize: '0.95rem' }}
                  >
                    Khám phá dịch vụ {srv.name} →
                  </button>
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
