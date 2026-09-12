// ==============================================================================
// Maison MIPA — Darkroom Curatorial Artwork Inspection Panel
// ==============================================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import type { AtelierArtwork } from './atelierTypes';

interface ArtworkInspectionProps {
  artwork: AtelierArtwork | null;
  onClose: () => void;
  onOpenBooking: (conceptSlug?: string) => void;
}

export const ArtworkInspection: React.FC<ArtworkInspectionProps> = ({
  artwork,
  onClose,
  onOpenBooking,
}) => {
  const navigate = useNavigate();

  if (!artwork) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="atelier-artwork-title"
      data-testid="artwork-inspection-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 12, 10, 0.88)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        animation: 'fadeIn 0.25s ease-out forwards',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#201914',
          color: '#FBF6EE',
          borderRadius: '8px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(198, 164, 95, 0.35)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng thông tin tác phẩm"
          data-testid="close-inspection-btn"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(198, 164, 95, 0.3)',
            color: '#FAF4EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'background 0.2s ease',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            padding: '2.5rem',
          }}
        >
          {/* Artwork Frame Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                border: '10px solid #382A1F',
                outline: '1px solid #C6A45F',
                padding: '10px',
                backgroundColor: '#261E18',
                boxShadow: '0 15px 35px rgba(0, 0, 0, 0.6)',
                maxWidth: '100%',
              }}
            >
              <img
                src={artwork.imageUrl}
                alt={artwork.title}
                style={{
                  width: '100%',
                  maxHeight: '380px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            <span
              style={{
                marginTop: '0.75rem',
                fontSize: '0.76rem',
                color: '#C6A45F',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {artwork.plaqueNumber}
            </span>
          </div>

          {/* Curatorial Text Content */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                color: '#E0C287',
                marginBottom: '0.4rem',
              }}
            >
              {artwork.frenchTitle}
            </div>
            <h3
              id="atelier-artwork-title"
              style={{
                fontFamily: 'var(--editorial-font-heading, serif)',
                fontSize: '1.75rem',
                color: '#FAF4EB',
                marginBottom: '1rem',
                lineHeight: 1.25,
              }}
            >
              {artwork.title}
            </h3>

            <p
              style={{
                fontSize: '0.92rem',
                color: '#D1C4B7',
                lineHeight: 1.6,
                marginBottom: '1.25rem',
              }}
            >
              {artwork.description}
            </p>

            <div
              style={{
                padding: '1rem',
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(198, 164, 95, 0.2)',
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
              }}
            >
              <div style={{ fontSize: '0.82rem', color: '#E0C287' }}>
                <strong>Kích thước tiêu chuẩn:</strong> {artwork.dimensions}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#D1C4B7' }}>
                <strong>Concept:</strong> {artwork.conceptSlug}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBooking(artwork.conceptSlug);
                }}
                className="public-btn-primary"
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                }}
              >
                <span>Đặt Lịch Chụp Concept Này</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/portfolio');
                }}
                className="public-btn-secondary"
                style={{
                  padding: '0.75rem 1.4rem',
                  fontSize: '0.9rem',
                }}
              >
                <span>Xem Thêm Ảnh</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
