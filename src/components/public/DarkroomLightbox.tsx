// ==============================================================================
// Maison MIPA Memories — Darkroom Lightbox Component
// Presentation: Darkroom minimal luxury (#15110E), photo centered
// Accessibility: role="dialog", aria-modal="true", keyboard nav, body scroll lock, focus restoration
// ==============================================================================
import React, { useEffect, useRef, useCallback } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import type { PortfolioPhoto } from '../../types';

interface DarkroomLightboxProps {
  photos: PortfolioPhoto[];
  currentIndex: number;
  collectionTitle: string;
  onClose: () => void;
  onSelectIndex: (index: number) => void;
}

export const DarkroomLightbox: React.FC<DarkroomLightboxProps> = ({
  photos,
  currentIndex,
  collectionTitle,
  onClose,
  onSelectIndex,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const activePhoto = photos[currentIndex] || photos[0];
  const total = photos.length;

  const handlePrev = useCallback(() => {
    if (total <= 1) return;
    onSelectIndex((currentIndex - 1 + total) % total);
  }, [currentIndex, total, onSelectIndex]);

  const handleNext = useCallback(() => {
    if (total <= 1) return;
    onSelectIndex((currentIndex + 1) % total);
  }, [currentIndex, total, onSelectIndex]);

  // Keyboard navigation & body scroll lock
  useEffect(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Focus dialog
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previouslyFocusedElement.current?.focus) {
        previouslyFocusedElement.current.focus();
      }
    };
  }, [onClose, handlePrev, handleNext]);

  if (!activePhoto) return null;

  const counterText = `${currentIndex + 1} / ${total}`;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết ảnh ${currentIndex + 1} của ${total} — ${collectionTitle}`}
      tabIndex={-1}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#15110E',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 'clamp(1rem, 3vw, 2rem)',
        outline: 'none',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Bar: Title, Counter & Close Button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#FFFDF9',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span
            style={{
              fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
              fontSize: '1.25rem',
              color: '#FFFDF9',
              fontWeight: 500,
            }}
          >
            {collectionTitle}
          </span>
          <span
            style={{
              fontSize: '0.78rem',
              letterSpacing: '0.12em',
              color: 'rgba(239, 230, 201, 0.7)',
              fontWeight: 600,
            }}
          >
            {counterText}
          </span>
        </div>

        <button
          onClick={onClose}
          aria-label="Đóng xem ảnh"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            width: '44px',
            height: '44px',
            border: 'none',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFDF9',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.22)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Centered Stage */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '1rem 0',
        }}
      >
        {/* Previous Button */}
        {total > 1 && (
          <button
            onClick={handlePrev}
            aria-label="Ảnh trước đó"
            style={{
              position: 'absolute',
              left: 'clamp(0.5rem, 2vw, 2rem)',
              minWidth: '44px',
              minHeight: '44px',
              width: '48px',
              height: '48px',
              border: 'none',
              backgroundColor: 'rgba(21, 17, 14, 0.65)',
              color: '#FFFDF9',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
              backdropFilter: 'blur(8px)',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(21, 17, 14, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(21, 17, 14, 0.65)';
            }}
          >
            <ArrowLeft size={20} />
          </button>
        )}

        {/* Displayed Image */}
        <img
          src={activePhoto.url}
          alt={activePhoto.altText || `${collectionTitle} — Ảnh ${currentIndex + 1}`}
          width={activePhoto.width}
          height={activePhoto.height}
          style={{
            maxWidth: '92vw',
            maxHeight: '76vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '2px',
            userSelect: 'none',
          }}
        />

        {/* Next Button */}
        {total > 1 && (
          <button
            onClick={handleNext}
            aria-label="Ảnh kế tiếp"
            style={{
              position: 'absolute',
              right: 'clamp(0.5rem, 2vw, 2rem)',
              minWidth: '44px',
              minHeight: '44px',
              width: '48px',
              height: '48px',
              border: 'none',
              backgroundColor: 'rgba(21, 17, 14, 0.65)',
              color: '#FFFDF9',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3,
              backdropFilter: 'blur(8px)',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(21, 17, 14, 0.95)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(21, 17, 14, 0.65)';
            }}
          >
            <ArrowRight size={20} />
          </button>
        )}
      </div>

      {/* Bottom Info Bar: Real caption & guidance */}
      <div style={{ textAlign: 'center', color: '#EFE6C9', padding: '0.5rem 0' }}>
        {activePhoto.caption && (
          <div
            style={{
              fontSize: '1rem',
              color: '#FFFDF9',
              fontWeight: 400,
              marginBottom: '0.25rem',
            }}
          >
            {activePhoto.caption}
          </div>
        )}
        <div
          style={{
            fontSize: '0.76rem',
            color: 'rgba(239, 230, 201, 0.6)',
            letterSpacing: '0.04em',
          }}
        >
          Dùng phím mũi tên ← → để duyệt ảnh, Esc để đóng.
        </div>
      </div>
    </div>
  );
};

export default DarkroomLightbox;
