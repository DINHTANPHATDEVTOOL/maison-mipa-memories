// ==============================================================================
// Maison MIPA Memories — Modal UI Primitive
// Accessible: Escape key, backdrop click, focus trap, scroll lock
// ==============================================================================
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  footer?: React.ReactNode;
  hideCloseButton?: boolean;
  /** Prevent closing by clicking backdrop or pressing Escape */
  persistent?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = '560px',
  footer,
  hideCloseButton = false,
  persistent = false,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape key handler
  useEffect(() => {
    if (!open || persistent) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, persistent]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const el = panelRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    el.addEventListener('keydown', handleTab);
    first?.focus();
    return () => el.removeEventListener('keydown', handleTab);
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={e => {
        if (!persistent && e.target === overlayRef.current) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(21, 17, 14, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        zIndex: 9900,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div
        ref={panelRef}
        style={{
          background: 'var(--mipa-surface)',
          border: '1px solid var(--mipa-border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 2rem)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        {(title || !hideCloseButton) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid var(--mipa-border-subtle)',
              flexShrink: 0,
            }}
          >
            <div>
              {title && (
                <h2
                  style={{
                    fontFamily: 'var(--mipa-font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--mipa-gold-light)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  style={{
                    fontFamily: 'var(--mipa-font-body)',
                    fontSize: '0.8125rem',
                    color: 'var(--mipa-text-muted)',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {!hideCloseButton && (
              <button
                onClick={onClose}
                aria-label="Đóng"
                style={{
                  background: 'transparent',
                  border: '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--mipa-text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'color var(--transition-fast), background var(--transition-fast)',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--mipa-text)';
                  e.currentTarget.style.background = 'rgba(251, 246, 238, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--mipa-text-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid var(--mipa-border-subtle)',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
