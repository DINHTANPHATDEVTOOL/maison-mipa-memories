import React from 'react';
import { INITIAL_SERVICES } from '../../mockData';
import { Sparkles, ArrowRight, Heart, Users, Camera, Gift, Smile } from 'lucide-react';

interface ServicesSectionProps {
  onSelectService: (serviceId: string) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ onSelectService }) => {
  return (
    <section id="services" className="mipa-container" style={{ padding: '3rem 0.85rem', backgroundColor: '#F8F3E6', maxWidth: '1350px', margin: '0 auto' }}>
      <div>
        
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            CÁC GÓI CHỤP CHỦ ĐẠO
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem' }}>
            Bạn muốn lưu giữ khoảnh khắc nào?
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '0.95rem' }}>
            Mỗi bộ ảnh tại Maison MIPA là một câu chuyện cảm xúc được thiết kế riêng với bối cảnh ánh sáng & đạo cụ bài bản.
          </p>
        </div>

        <div className="mipa-grid-3" style={{ display: 'grid', gap: '2rem' }}>
          {INITIAL_SERVICES.map((srv) => (
            <div
              key={srv.id}
              className="mipa-card"
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ position: 'relative', height: '230px', overflow: 'hidden' }}>
                  <img
                    src={srv.image}
                    alt={srv.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  {srv.badge && (
                    <span style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      backgroundColor: '#604634',
                      color: '#EFE6C9',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.3rem 0.8rem',
                      borderRadius: '20px',
                    }}>
                      ★ {srv.badge}
                    </span>
                  )}
                </div>

                <div style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#604634', marginBottom: '0.5rem' }}>{srv.name}</h3>
                  <p style={{ color: '#6E5F55', fontSize: '0.9rem', lineHeight: 1.5 }}>{srv.description}</p>
                </div>
              </div>

              <div style={{ padding: '0 1.5rem 1.5rem' }}>
                <button
                  onClick={() => onSelectService(srv.id)}
                  className="btn-mipa-secondary"
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  Đặt Lịch Chụp {srv.name} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
