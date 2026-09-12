import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';

/**
 * Desktop Custom Exhibition Cursor.
 * Renders a restrained circular badge ("XEM") when hovering exhibition photographs.
 * Strictly hidden on mobile, touch screens, and when reduced motion is preferred.
 * Uses pure Vanilla CSS inline styling.
 */
export const CustomCursor: React.FC = () => {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [cursorText, setCursorText] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    // Only run on desktop devices with fine pointer and hover capability
    const hasHover = typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!hasHover || prefersReduced || !cursorRef.current) return;

    const el = cursorRef.current;
    
    // Quick smooth tracking using GSAP quickTo
    const xTo = gsap.quickTo(el, 'x', { duration: 0.22, ease: 'power2.out' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.22, ease: 'power2.out' });

    const handleMouseMove = (e: MouseEvent) => {
      xTo(e.clientX);
      yTo(e.clientY);

      // Check if hovering over element with data-cursor attribute or within portfolio gallery
      const target = e.target as HTMLElement | null;
      const cursorTarget = target?.closest('[data-cursor]') as HTMLElement | null;

      if (cursorTarget) {
        const text = cursorTarget.getAttribute('data-cursor') || 'XEM';
        setCursorText(text);
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    };

    const handleMouseLeave = () => {
      setIsActive(false);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.body.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [prefersReduced]);

  if (prefersReduced) return null;

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 9999,
        opacity: isActive ? 1 : 0,
        transform: `translate(-50%, -50%) scale(${isActive ? 1 : 0.4})`,
        transition: 'opacity 0.25s ease, transform 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(31, 26, 23, 0.85)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          border: '1px solid rgba(248, 243, 235, 0.25)',
          color: '#F8F3EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          letterSpacing: '0.25em',
          fontWeight: 500,
          textTransform: 'uppercase',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          userSelect: 'none',
        }}
      >
        {cursorText}
      </div>
    </div>
  );
};

export default CustomCursor;
