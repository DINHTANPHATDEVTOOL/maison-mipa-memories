// ==============================================================================
// Maison MIPA Memories - Editorial Packages Section (#6 & #16)
// Connected to real catalogService. Transparent luxury inclusions, no SaaS pricing template.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { getPackages } from '../../services/catalogService';
import type { PackageItem } from '../../types';
import { Check, Calendar, Sparkles } from 'lucide-react';

interface PackagesSectionProps {
  onOpenBooking: () => void;
}

export const PackagesSection: React.FC<PackagesSectionProps> = ({ onOpenBooking }) => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    async function loadPackagesData() {
      try {
        const data = await getPackages();
        if (mounted) setPackages(data);
      } catch (err) {
        console.error('Lỗi tải bảng giá gói chụp:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadPackagesData();
    return () => { mounted = false; };
  }, []);

  if (isLoading || packages.length === 0) return null;

  return (
    <section id="packages" className="mipa-container" style={{ padding: '4rem 1rem', maxWidth: '1250px', margin: '0 auto' }}>
      <div>
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2.5rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            MINH BẠCH & TRỌN GÓI
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
            Bảng Giá Gói Chụp Nghệ Thuật
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '1rem', lineHeight: 1.6 }}>
            Cam kết không phát sinh phụ phí ẩn. Tặng toàn bộ file ảnh gốc chất lượng cao cho mọi gói chụp studio.
          </p>
        </div>

        <div className="mipa-grid-3" style={{ display: 'grid', gap: '2rem', alignItems: 'stretch' }}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`mipa-card ${pkg.recommended ? 'mipa-card-gold' : ''}`}
              style={{
                padding: '2.2rem 1.8rem',
                borderRadius: '24px',
                backgroundColor: '#FFFDF6',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                border: pkg.recommended ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                boxShadow: pkg.recommended ? '0 15px 35px rgba(198, 164, 95, 0.2)' : 'var(--mipa-shadow-sm)',
              }}
            >
              <div>
                {pkg.popularTag && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-13px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#604634',
                      color: '#EFE6C9',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.3rem 1rem',
                      borderRadius: '20px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                    }}
                  >
                    ★ {pkg.popularTag}
                  </div>
                )}

                <div style={{ fontSize: '0.78rem', color: '#8C6E53', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  GÓI CHỤP STUDIO
                </div>

                <h3 style={{ fontSize: '1.5rem', color: '#604634', marginBottom: '0.6rem', marginTop: '0.3rem', fontFamily: 'var(--mipa-font-heading)', fontWeight: 700 }}>
                  {pkg.name}
                </h3>

                <div style={{ fontSize: '2.2rem', fontWeight: 700, color: '#8C6E53', marginBottom: '1.5rem', fontFamily: 'var(--mipa-font-heading)' }}>
                  {pkg.price.toLocaleString('vi-VN')} <span style={{ fontSize: '1rem', fontWeight: 400, color: '#6E5F55' }}>đ</span>
                </div>

                <div style={{ borderTop: '1px solid rgba(140, 110, 83, 0.15)', paddingTop: '1.2rem', marginBottom: '1.8rem' }}>
                  <div style={{ fontSize: '0.82rem', color: '#8C6E53', fontWeight: 600, marginBottom: '0.8rem' }}>
                    Quyền lợi bao gồm:
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {pkg.features.map((feat, idx) => (
                      <li key={idx} style={{ fontSize: '0.88rem', color: '#2C221E', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', lineHeight: 1.4 }}>
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
                  style={{ width: '100%', padding: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.95rem' }}
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

export default PackagesSection;
