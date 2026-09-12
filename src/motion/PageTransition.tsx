import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useReducedMotion } from './useReducedMotion';
import { MOTION_CONFIG } from './motionConfig';

interface PageTransitionProps {
  children: React.ReactNode;
}

/**
 * Public Route Transition Wrapper.
 * Applies a restrained editorial fade and subtle vertical rise on public page changes.
 * Completely bypassed when reduced motion is preferred or on private/administrative routes.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced || !containerRef.current) return;

    // Check if current route is a public route
    const isPublic =
      ['/', '/dich-vu', '/bang-gia', '/portfolio', '/booking'].includes(location.pathname) ||
      location.pathname.startsWith('/dich-vu/') ||
      location.pathname.startsWith('/portfolio/');

    if (!isPublic) return;

    // Smooth subtle entry transition
    gsap.fromTo(
      containerRef.current,
      {
        opacity: 0,
        y: 8,
      },
      {
        opacity: 1,
        y: 0,
        duration: MOTION_CONFIG.duration.fast,
        ease: MOTION_CONFIG.ease.soft,
        clearProps: 'transform,opacity',
      }
    );
  }, [location.pathname, prefersReduced]);

  return (
    <div ref={containerRef} className="w-full flex-1 flex flex-col">
      {children}
    </div>
  );
};

export default PageTransition;
