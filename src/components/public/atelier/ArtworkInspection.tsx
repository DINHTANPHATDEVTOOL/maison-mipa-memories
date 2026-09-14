// ==============================================================================
// Maison MIPA — Darkroom Curatorial Artwork Inspection Modal (Blockers 12, 13, 16, 32)
// ==============================================================================
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import type { AtelierArtwork } from './atelierTypes';

const KNOWN_BOOKABLE_SLUGS = new Set([
  'parisian-romance',
  'vintage-cinematic',
  'french-haute-couture',
  'la-famille-douce',
  'bebe-soleil',
  'corporate-noir',
]);

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
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  // Blocker 13: Accessibility behavior (focus trap, Escape key, body scroll lock, restore focus)
  useEffect(() => {
    if (!artwork) return;

    // Save previous active element to restore focus on close
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    // Escape key listener on document
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab trap
      if (e.key === 'Tab' && modalContentRef.current) {
        const focusableElements = modalContentRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElement.current?.focus?.();
    };
  }, [artwork, onClose]);

  if (!artwork) return null;

  const isBookableConcept = Boolean(artwork.conceptSlug && KNOWN_BOOKABLE_SLUGS.has(artwork.conceptSlug));

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
    >
      <div
        ref={modalContentRef}
        style={{
          backgroundColor: '#201914',
          color: '#FBF6EE',
          borderRadius: '6px',
          maxWidth: '880px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.65)',
          border: '1px solid rgba(198, 164, 95, 0.35)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Close Button */}
        <button
          ref={closeBtnRef}
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
            padding: '2.5rem 2rem',
          }}
        >
          {/* Artwork Frame Preview */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                border: '8px solid #382A1F',
                outline: '1px solid rgba(198, 164, 95, 0.6)',
                padding: '8px',
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
                  maxHeight: '360px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
            {artwork.plaqueNumber && (
              <span
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.74rem',
                  color: '#C6A45F',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                }}
              >
                {artwork.plaqueNumber}
              </span>
            )}
          </div>

          {/* Curatorial Text Content */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {artwork.frenchTitle && (
              <div
                style={{
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.18em',
                  color: '#E0C287',
                  marginBottom: '0.4rem',
                }}
              >
                {artwork.frenchTitle}
              </div>
            )}
            <h3
              id="atelier-artwork-title"
              style={{
                fontFamily: 'var(--editorial-font-heading, serif)',
                fontSize: '1.65rem',
                color: '#FAF4EB',
                marginBottom: '0.85rem',
                lineHeight: 1.25,
                fontWeight: 600,
              }}
            >
              {artwork.title}
            </h3>

            <p
              style={{
                fontSize: '0.9rem',
                color: '#D1C4B7',
                lineHeight: 1.6,
                marginBottom: '1.25rem',
              }}
            >
              {artwork.description}
            </p>

            {/* Meta details if real */}
            {(artwork.dimensions || artwork.conceptSlug) && (
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(198, 164, 95, 0.2)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {artwork.dimensions && (
                  <div style={{ fontSize: '0.8rem', color: '#E0C287' }}>
                    <strong>Kích thước:</strong> {artwork.dimensions}
                  </div>
                )}
                {artwork.conceptSlug && (
                  <div style={{ fontSize: '0.8rem', color: '#D1C4B7' }}>
                    <strong>Concept:</strong> {artwork.conceptSlug}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {/* Blocker 12: Real concept slug CTA vs generic CTA */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBooking(isBookableConcept ? artwork.conceptSlug : undefined);
                }}
                className="public-btn-primary"
                style={{
                  padding: '0.7rem 1.4rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                }}
              >
                <span>{isBookableConcept ? 'Đặt lịch concept này' : 'Đặt lịch chụp'}</span>
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
                  padding: '0.7rem 1.3rem',
                  fontSize: '0.88rem',
                }}
              >
                <span>Xem thêm tác phẩm</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
