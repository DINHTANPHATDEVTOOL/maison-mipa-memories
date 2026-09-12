/**
 * Maison MIPA Memories — Motion Configuration & Cinematic Constants
 * Philosophy: 80% Calm, 20% Wow. Art-directed, photography-first motion.
 */

export const MOTION_CONFIG = {
  // GSAP standard easings for refined editorial transitions
  ease: {
    soft: 'power2.out',
    cinematic: 'power3.out',
    expressive: 'expo.out',
    smooth: 'sine.inOut',
    // CSS cubic-bezier equivalents
    cssSoft: 'cubic-bezier(0.25, 1, 0.5, 1)',
    cssCinematic: 'cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Restrained durations in seconds (for GSAP) and ms (for CSS)
  duration: {
    instant: 0.15,
    fast: 0.28,
    medium: 0.6,
    slow: 1.1,
    heroSettle: 1.3,
  },

  durationMs: {
    fast: 280,
    medium: 600,
    slow: 1100,
  },

  // Subtle depth ranges (desktop only)
  depth: {
    subtleX: 8,
    subtleY: 6,
    tiltRotateX: 1.0, // max degrees
    tiltRotateY: 1.5, // max degrees
    cardZ: 20,
    stackZ: 40,
  },

  // Perspective scene definitions
  perspective: {
    desktop: '1200px',
    deep: '1400px',
    close: '800px',
  },

  // Physical photo stack angles
  stackAngles: [-3, 2, -1, 3] as const,
} as const;

export default MOTION_CONFIG;
