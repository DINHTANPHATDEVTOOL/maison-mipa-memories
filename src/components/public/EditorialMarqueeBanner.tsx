// ==============================================================================
// Maison MIPA Memories — Editorial Marquee Ribbon Banner
// Concept: Dải Băng Chuyền Typography Vàng Ánh Kim (Haute Couture Running Ribbon)
// ==============================================================================
import React from 'react';
import { Sparkles } from 'lucide-react';

export const EditorialMarqueeBanner: React.FC = () => {
  const marqueeItems = [
    'MAISON MIPA MEMORIES',
    'ATELIER DE PHOTOGRAPHIE D’ART',
    'SÀI GÒN — PARIS',
    '100% FILE ẢNH GỐC NGUYÊN BẢN',
    'TRIỂN LÃM KHÔNG GIAN 3 CHIỀU',
    'ÁNH SÁNG TỰ NHIÊN THƠ MỘNG',
    'TIRAGE D’ART FINE ART HAHNEMÜHLE',
    'EST. 2020 • SAIGON ATELIER',
  ];

  return (
    <div
      aria-label="Tuyên ngôn nghệ thuật Maison MIPA"
      style={{
        width: '100%',
        backgroundColor: '#110D0A',
        borderTop: '1px solid rgba(198, 164, 95, 0.25)',
        borderBottom: '1px solid rgba(198, 164, 95, 0.25)',
        padding: '0.85rem 0',
        overflow: 'hidden',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div className="editorial-marquee-track">
        {[0, 1].map((copyIndex) => (
          <div
            key={copyIndex}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2.5rem',
              paddingRight: '2.5rem',
              whiteSpace: 'nowrap',
            }}
          >
            {marqueeItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--editorial-font-heading, serif)',
                    fontSize: '0.95rem',
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: '#E0C287',
                    fontWeight: 600,
                  }}
                >
                  {item}
                </span>
                <Sparkles size={11} style={{ color: '#C6A45F', opacity: 0.8 }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditorialMarqueeBanner;
