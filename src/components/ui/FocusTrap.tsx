// ==============================================================================
// Maison MIPA Memories — Accessible Focus Trap Component & Hook
// Traps keyboard focus inside modals, handles Escape, restores prior focus,
// and locks background scrolling. Meets WCAG 2.1 AA dialog criteria.
// ==============================================================================

import React, { useEffect, useRef, type ReactNode } from 'react';

interface FocusTrapProps {
  children: ReactNode;
  active?: boolean;
  onEscape?: () => void;
  className?: string;
  style?: React.CSSProperties;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active = true,
  onEscape,
  className,
  style,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // 1. Store currently focused element before modal opened
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 2. Lock background body scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 3. Focus first meaningful focusable element inside the modal
    const focusTimer = setTimeout(() => {
      if (containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          containerRef.current.focus();
        }
      }
    }, 50);

    // 4. Trap Tab and Shift+Tab keydown events
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current) return;

      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault();
          onEscape();
        }
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      );

      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: if on first element, wrap to last
        if (document.activeElement === firstElement || document.activeElement === containerRef.current) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;

      // 5. Restore previous focus upon unmount
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [active, onEscape]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      tabIndex={-1}
      className={className}
      style={{ outline: 'none', ...style }}
    >
      {children}
    </div>
  );
};
