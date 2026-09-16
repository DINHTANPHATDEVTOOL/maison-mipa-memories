// ==============================================================================
// Maison MIPA Memories — Concept Catalog Preview Section
// Editorial invitation to explore the full visual catalog of concepts at /concept.
// ==============================================================================
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';

export const HomeConceptCatalogPreview: React.FC = () => {
  return (
    <section
      aria-label="Khám Phá Danh Mục Concept"
      style={{
        padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
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
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(2.5rem, 5vw, 5rem)',
            alignItems: 'center',
          }}
        >
          {/* Visual Side */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/11',
              borderRadius: '2px',
              overflow: 'hidden',
              backgroundColor: '#EDE7DC',
            }}
          >
            <img
              src="/studio.png"
              alt="Maison MIPA Concept Catalog"
              loading="lazy"
              decoding="async"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '1.25rem',
                left: '1.25rem',
                backgroundColor: 'rgba(250, 248, 243, 0.94)',
                backdropFilter: 'blur(8px)',
                padding: '0.6rem 1.2rem',
                borderRadius: '2px',
                border: '1px solid rgba(140, 110, 83, 0.2)',
                fontSize: '0.8rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#29231F',
                fontWeight: 500,
              }}
            >
              VISUAL CATALOG / 2026
            </div>
          </div>

          {/* Editorial Content Side */}
          <div style={{ maxWidth: '580px' }}>
            <span
              style={{
                display: 'block',
                fontSize: '0.72rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8C6E53',
                fontWeight: 600,
                marginBottom: '0.75rem',
              }}
            >
              DANH MỤC CONCEPT
            </span>
            <h2
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 500,
                color: '#29231F',
                lineHeight: 1.15,
                margin: '0 0 1rem 0',
              }}
            >
              Tìm kiếm nguồn cảm hứng cho buổi chụp của bạn
            </h2>
            <p
              style={{
                fontSize: '1rem',
                lineHeight: 1.65,
                color: '#604634',
                margin: '0 0 1.75rem 0',
                fontWeight: 300,
              }}
            >
              Từ phong cách cổ điển lãng mạn nước Pháp, chân dung đen trắng tối giản đến những khung hình gia đình ấm áp. Khám phá catalog concept chi tiết với hướng dẫn trang phục và bối cảnh được chuẩn bị sẵn.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link
                to="/concept"
                className="public-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 2rem',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <BookOpen size={16} /> Xem trọn bộ danh mục Concept
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeConceptCatalogPreview;
