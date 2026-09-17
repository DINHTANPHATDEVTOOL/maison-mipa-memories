// ==============================================================================
// Maison MIPA Memories — Drawer (Slide-over panel)
// Used for booking detail view and mobile menus
// ==============================================================================
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

type DrawerSide = 'right' | 'left';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  side?: DrawerSide;
  width?: string;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  side = 'right',
  width = '540px',
  footer,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9800,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(21, 17, 14, 0.65)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: 'fadeIn 200ms ease-out',
        }}
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
          position: 'relative',
          background: 'var(--mipa-surface)',
          borderLeft: side === 'right' ? '1px solid var(--mipa-border)' : 'none',
          borderRight: side === 'left' ? '1px solid var(--mipa-border)' : 'none',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: width,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          animation: `slideIn${side === 'right' ? 'Right' : 'Left'} 320ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        {/* Header */}
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
          <div style={{ minWidth: 0 }}>
            {title && (
              <h2
                style={{
                  fontFamily: 'var(--mipa-font-heading)',
                  fontSize: '1.2rem',
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
                  margin: '0.2rem 0 0',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
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
              transition: 'all var(--transition-fast)',
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
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
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

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>,
    document.body
  );
};

export default Drawer;
