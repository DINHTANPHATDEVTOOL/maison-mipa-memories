// ==============================================================================
// Maison MIPA Memories — Editorial Services Section with Choreographed Scroll
// Art Direction: Alternating photography rows with subtle directional entries,
// restrained image crop parallax (5-7%), no card boxes or shadows.
// ==============================================================================
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getServices } from '../../services/catalogService';
import type { ServiceCategory } from '../../types';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useGsapContext, gsap } from '../../motion/useGsapContext';
import { MOTION_CONFIG } from '../../motion/motionConfig';

interface ServicesSectionProps {
  onSelectService?: (serviceId: string, slug?: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const prefersReduced = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);
  const rowsRef = useRef<HTMLDivElement[]>([]);

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
    return () => {
      mounted = false;
    };
  }, []);

  // Choreographed row entry and crop parallax
  useGsapContext(() => {
    if (prefersReduced || !sectionRef.current || services.length === 0) return;

    rowsRef.current.forEach((row, idx) => {
      if (!row) return;
      const isReverse = idx % 2 === 1;
      const imageCol = row.querySelector('.editorial-service-image');
      const textCol = row.querySelector('.editorial-service-text');
      const innerImg = row.querySelector('.editorial-service-image img');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: row,
          start: 'top 82%',
          once: true,
        },
      });

      // Directional entries: 25px - 40px offsets
      if (imageCol && textCol) {
        tl.fromTo(
          imageCol,
          {
            x: isReverse ? 35 : -35,
            opacity: 0.85,
          },
          {
            x: 0,
            opacity: 1,
            duration: MOTION_CONFIG.duration.medium,
            ease: MOTION_CONFIG.ease.cinematic,
          },
          0
        );

        tl.fromTo(
          textCol,
          {
            x: isReverse ? -35 : 35,
            opacity: 0.85,
          },
          {
            x: 0,
            opacity: 1,
            duration: MOTION_CONFIG.duration.medium,
            ease: MOTION_CONFIG.ease.cinematic,
          },
          0.08
        );
      }

      // Very light image parallax inside crop
      if (innerImg) {
        gsap.fromTo(
          innerImg,
          { yPercent: 4 },
          {
            yPercent: -4,
            ease: 'none',
            scrollTrigger: {
              trigger: row,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          }
        );
      }
    });
  }, sectionRef, [prefersReduced, services]);

  const handleServiceClick = (srv: ServiceCategory) => {
    if (onSelectService) {
      onSelectService(srv.id, srv.slug);
    } else {
      navigate(`/dich-vu/${srv.slug}`);
    }
  };

  if (isLoading || services.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      id="services"
      className="editorial-section"
      style={{ backgroundColor: 'var(--editorial-paper)' }}
    >
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
                ref={(el) => {
                  if (el) rowsRef.current[idx] = el;
                }}
                className={`editorial-service-row ${isReverse ? 'reverse' : ''}`}
              >
                {/* Photo Element */}
                <div
                  className="editorial-service-image"
                  data-cursor="XEM"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleServiceClick(srv)}
                >
                  <div
                    className="editorial-image-frame overflow-hidden"
                    style={{
                      height: '380px',
                      border: '1px solid rgba(96, 70, 52, 0.12)',
                      borderRadius: '4px',
                    }}
                  >
                    <img
                      src={displayImage}
                      alt={srv.name}
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '110%',
                        objectFit: 'cover',
                        scale: prefersReduced ? '1' : '1.05',
                      }}
                    />
                  </div>
                </div>

                {/* Text Content */}
                <div className="editorial-service-text" style={{ padding: '0 0.5rem' }}>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: 'var(--editorial-brown-accent)',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom: '0.5rem',
                    }}
                  >
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
