// ==============================================================================
// Maison MIPA Memories — Core Services Section (Visual Discovery)
// Answers clearly: "What can I book here?" with photography-dominant categories.
// No icon-first service cards; authentic data from getServices().
// Zero unrelated photo fallbacks.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getServices } from '../../services/catalogService';
import type { ServiceCategory } from '../../types';
import { ArrowRight } from 'lucide-react';
import { EditorialImagePlaceholder } from './EditorialImagePlaceholder';
import { useSiteAssets } from '../../context/SiteAssetContext';
import { InPlaceImageEditor } from '../common/InPlaceImageEditor';

export const HomeServicesSection: React.FC = () => {
  const { getAssetUrl } = useSiteAssets();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    async function loadServicesData() {
      try {
        const data = await getServices();
        if (mounted) {
          setServices(data.slice(0, 6)); // 4-6 core services
        }
      } catch (err) {
        if (mounted) setHasError(true);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadServicesData();
    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FFFDF9', textAlign: 'center' }}>
        <div style={{ color: '#70533C', fontSize: '0.9rem' }}>Đang tải danh mục dịch vụ...</div>
      </section>
    );
  }

  if (hasError) {
    return (
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#FFFDF9', textAlign: 'center' }}>
        <div style={{ color: '#70533C', fontSize: '0.9rem' }}>Không thể tải danh mục dịch vụ vào lúc này.</div>
      </section>
    );
  }

  if (services.length === 0) {
    return (
      <section style={{ padding: '4rem 1.5rem', backgroundColor: '#FFFDF9', textAlign: 'center' }}>
        <div style={{ color: '#70533C', fontSize: '0.9rem' }}>Hiện chưa có dịch vụ nào được công bố.</div>
      </section>
    );
  }

  return (
    <section
      id="services"
      aria-label="Dịch Vụ Chụp Ảnh"
      style={{
        padding: 'clamp(4rem, 8vw, 7.5rem) 1.5rem',
        backgroundColor: '#FFFDF9',
        borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginBottom: 'clamp(2.5rem, 5vw, 4rem)',
            gap: '1.5rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ maxWidth: '640px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#70533C',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              DỊCH VỤ CHỤP ẢNH
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2.1rem, 4.5vw, 3.2rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 0.75rem 0',
              }}
            >
              Danh mục chụp tại tiệm ảnh Maison
            </h2>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.6,
                color: '#604634',
                margin: 0,
                fontWeight: 300,
              }}
            >
              Các gói chụp ảnh được thiết kế chuyên biệt cho từng dấu mốc: Chân dung, Kỷ yếu & Tốt nghiệp, Áo dài truyền thống, Chụp đồ án, Couple lãng mạn đến Lễ Tết & Giáng sinh ấm cúng.
            </p>
          </div>

          <Link
            to="/dich-vu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              color: '#604634',
              fontSize: '0.92rem',
              fontWeight: 500,
              textDecoration: 'none',
              borderBottom: '1px solid #70533C',
              paddingBottom: '3px',
            }}
          >
            Xem tất cả dịch vụ <ArrowRight size={15} />
          </Link>
        </div>

        {/* Services Grid (Photography First) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(1.5rem, 2.5vw, 2.5rem)',
          }}
        >
          {services.map((service) => {
            const serviceSlug = service.slug || service.id.replace('srv_', '');
            const displayImage = getAssetUrl(`service_${serviceSlug}`, service.image);

            return (
              <article
                key={service.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                {/* Visual Photography Frame */}
                <InPlaceImageEditor
                  assetId={`service_cover_${service.id}`}
                  currentImageUrl={displayImage || ''}
                  label={`Dịch vụ: ${service.name}`}
                  onImageUpdated={(newUrl) => {
                    setServices((prev) =>
                      prev.map((s) => (s.id === service.id ? { ...s, coverPhotoUrl: newUrl, imageUrl: newUrl } : s))
                    );
                  }}
                  onImageDeleted={() => {
                    setServices((prev) =>
                      prev.map((s) => (s.id === service.id ? { ...s, coverPhotoUrl: '', imageUrl: '' } : s))
                    );
                  }}
                  containerStyle={{ marginBottom: '1rem' }}
                >
                  <Link
                    to={`/dich-vu/${serviceSlug}`}
                    style={{
                      display: 'block',
                      width: '100%',
                      aspectRatio: '16/11',
                      overflow: 'hidden',
                      borderRadius: '2px',
                      backgroundColor: '#EDE7DC',
                      textDecoration: 'none',
                    }}
                  >
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={service.name}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.04)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1.0)';
                        }}
                      />
                    ) : (
                      <EditorialImagePlaceholder
                        aspectRatio="16/11"
                        caption={service.name}
                      />
                    )}
                  </Link>
                </InPlaceImageEditor>

                {/* Service Metadata */}
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      fontSize: '1.5rem',
                      fontWeight: 500,
                      color: '#29231F',
                      margin: '0 0 0.4rem 0',
                    }}
                  >
                    <Link
                      to={`/dich-vu/${serviceSlug}`}
                      style={{
                        color: 'inherit',
                        textDecoration: 'none',
                        transition: 'color 0.2s ease',
                      }}
                    >
                      {service.name}
                    </Link>
                  </h3>

                  <p
                    style={{
                      fontSize: '0.88rem',
                      lineHeight: 1.55,
                      color: '#604634',
                      margin: '0 0 0.85rem 0',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontWeight: 300,
                    }}
                  >
                    {service.description}
                  </p>

                  <Link
                    to={`/dich-vu/${serviceSlug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      fontSize: '0.85rem',
                      color: '#70533C',
                      fontWeight: 500,
                      textDecoration: 'none',
                    }}
                  >
                    Tìm hiểu dịch vụ <ArrowRight size={13} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomeServicesSection;
