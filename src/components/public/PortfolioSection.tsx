import React, { useState } from 'react';

export const PortfolioSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const portfolioItems = [
    { id: 1, title: 'Warm French Studio', category: 'COUPLE', image: '/hero.png' },
    { id: 2, title: 'Maison Vintage Room 01', category: 'STUDIO', image: '/studio.png' },
    { id: 3, title: 'Baby Angel Concept', category: 'BABY', image: 'https://images.unsplash.com/photo-1544126592-807ade215a0c?auto=format&fit=crop&w=800&q=80' },
    { id: 4, title: 'Studio Pre-Wedding Luxury', category: 'WEDDING', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80' },
    { id: 5, title: 'Natural Family Glow', category: 'FAMILY', image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80' },
    { id: 6, title: 'Editorial Personal Portrait', category: 'PORTRAIT', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80' },
  ];

  const filteredItems = activeCategory === 'ALL'
    ? portfolioItems
    : portfolioItems.filter(i => i.category === activeCategory);

  return (
    <section id="portfolio" className="mipa-container" style={{ padding: '3rem 0.85rem', backgroundColor: '#F8F3E6', maxWidth: '1350px', margin: '0 auto' }}>
      <div>
        
        <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 2rem' }}>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.18em', color: '#8C6E53', fontWeight: 700 }}>
            GALERIE DE MAISON
          </div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.8rem)', color: '#604634', marginTop: '0.4rem', marginBottom: '0.8rem' }}>
            Portfolio Kỷ Niệm Thơ Mộng
          </h2>
          <p style={{ color: '#6E5F55', fontSize: '0.95rem' }}>
            Khám phá những khoảnh khắc được lưu giữ chân thực qua lăng kính nghệ thuật của Maison MIPA.
          </p>
        </div>

        {/* Category Filters */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'COUPLE', 'WEDDING', 'STUDIO', 'BABY', 'PORTRAIT'].map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                border: '1px solid var(--mipa-beige)',
                background: activeCategory === cat ? '#8C6E53' : '#FFFDF6',
                color: activeCategory === cat ? '#FFFDF6' : '#604634',
                padding: '0.5rem 1.2rem',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {cat === 'ALL' ? 'Tất Cả' : cat}
            </button>
          ))}
        </div>

        {/* Portfolio Gallery Grid */}
        <div className="mipa-grid-3" style={{ display: 'grid', gap: '1.5rem' }}>
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="mipa-card"
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                position: 'relative',
                height: '320px',
                cursor: 'pointer',
              }}
            >
              <img
                src={item.image}
                alt={item.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(44, 34, 30, 0.8) 0%, transparent 60%)',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '1.5rem',
              }}>
                <div>
                  <span style={{ color: '#EFE6C9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.category}</span>
                  <h4 style={{ color: '#FFFDF6', fontSize: '1.25rem', margin: '0.2rem 0 0 0' }}>{item.title}</h4>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
