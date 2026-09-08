import React from 'react';
import { INITIAL_PACKAGES } from '../../mockData';
import { Check, Sparkles, Calendar } from 'lucide-react';

interface PackagesSectionProps {
  onOpenBooking: () => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({ onOpenBooking }) => {
  return (
    <section id="packages" className="mipa-container" style={{ padding: '3rem 0.85rem', backgroundColor: '#FFFDF6', maxWidth: '1250px', margin: '0 auto' }}>
      <div>
        
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            TRANH MINH BẠCH - TRỌN GÓI
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem' }}>
            Bảng Giá Gói Chụp Studio
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '0.95rem' }}>
            Cam kết không phát sinh chi phí ẩn. Tặng toàn bộ file ảnh gốc chất lượng cao cho mọi gói chụp.
          </p>
        </div>

        <div className="mipa-grid-3" style={{ display: 'grid', gap: '2rem' }}>
          {INITIAL_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`mipa-card ${pkg.recommended ? 'mipa-card-gold' : ''}`}
              style={{
                padding: '2rem',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transform: pkg.recommended ? 'scale(1.04)' : 'none',
                boxShadow: pkg.recommended ? '0 20px 45px rgba(198, 164, 95, 0.25)' : 'var(--mipa-shadow-sm)',
              }}
            >
              <div>
                {pkg.popularTag && (
                  <div style={{
                    position: 'absolute',
                    top: '-14px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#C6A45F',
                    color: '#FFFDF6',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.3rem 1rem',
                    borderRadius: '20px',
                    boxShadow: '0 4px 10px rgba(198, 164, 95, 0.3)',
                  }}>
                    ★ {pkg.popularTag}
                  </div>
                )}

                <h3 style={{ fontSize: '1.6rem', color: '#604634', marginBottom: '0.5rem', marginTop: '0.5rem' }}>{pkg.name}</h3>
                
                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#8C6E53', marginBottom: '1.5rem', fontFamily: 'var(--mipa-font-heading)' }}>
                  {pkg.price.toLocaleString('vi-VN')} <span style={{ fontSize: '1rem', fontWeight: 400 }}>đ</span>
                </div>

                <div style={{ borderTop: '1px solid rgba(140, 110, 83, 0.15)', paddingTop: '1.2rem', marginBottom: '1.5rem' }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} style={{ fontSize: '0.88rem', color: '#2C221E', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                        <Check size={16} color="#C6A45F" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div>
                <button
                  onClick={onOpenBooking}
                  className={pkg.recommended ? 'btn-mipa-gold' : 'btn-mipa-primary'}
                  style={{ width: '100%', padding: '0.85rem' }}
                >
                  <Calendar size={16} /> Đặt Lịch Gói Này
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
