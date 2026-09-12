import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MOTION_CONFIG } from './motionConfig';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export interface RevealOptions {
  trigger: Element | string;
  start?: string;
  delay?: number;
  duration?: number;
  markers?: boolean;
}

/**
 * A. IMAGE CURTAIN REVEAL
 * Subtle horizontal or directional curtain reveal via clip-path
 */
export function revealImageCurtain(
  target: Element | string,
  options?: Partial<RevealOptions>
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    {
      clipPath: 'inset(0% 100% 0% 0%)',
      opacity: 0.8,
    },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      opacity: 1,
      duration: options?.duration ?? MOTION_CONFIG.duration.slow,
      ease: MOTION_CONFIG.ease.cinematic,
      delay: options?.delay ?? 0,
      scrollTrigger: options?.trigger
        ? {
            trigger: options.trigger,
            start: options.start ?? 'top 82%',
            once: true,
          }
        : undefined,
    }
  );
}

/**
 * B. IMAGE VERTICAL REVEAL
 * Elegant bottom-to-top unmasking
 */
export function revealImageVertical(
  target: Element | string,
  options?: Partial<RevealOptions>
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    {
      clipPath: 'inset(100% 0% 0% 0%)',
      scale: 1.05,
    },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      scale: 1,
      duration: options?.duration ?? MOTION_CONFIG.duration.slow,
      ease: MOTION_CONFIG.ease.cinematic,
      delay: options?.delay ?? 0,
      scrollTrigger: options?.trigger
        ? {
            trigger: options.trigger,
            start: options.start ?? 'top 85%',
            once: true,
          }
        : undefined,
    }
  );
}

/**
 * C. TYPOGRAPHY REVEAL
 * Line-by-line reveal from behind an overflow:hidden line wrapper
 */
export function revealTypography(
  lines: Element[] | NodeListOf<Element> | string,
  options?: Partial<RevealOptions>
): gsap.core.Tween {
  return gsap.fromTo(
    lines,
    {
      yPercent: 105,
      opacity: 0,
    },
    {
      yPercent: 0,
      opacity: 1,
      duration: options?.duration ?? MOTION_CONFIG.duration.medium,
      stagger: 0.12,
      ease: MOTION_CONFIG.ease.cinematic,
      delay: options?.delay ?? 0,
      scrollTrigger: options?.trigger
        ? {
            trigger: options.trigger,
            start: options.start ?? 'top 88%',
            once: true,
          }
        : undefined,
    }
  );
}

/**
 * D. SOFT DEPTH REVEAL
 * Subtle scale and vertical rise for editorial layout elements
 */
export function revealSoftDepth(
  target: Element | string,
  options?: Partial<RevealOptions>
): gsap.core.Tween {
  return gsap.fromTo(
    target,
    {
      opacity: 0,
      y: 28,
      scale: 0.985,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: options?.duration ?? MOTION_CONFIG.duration.medium,
      ease: MOTION_CONFIG.ease.soft,
      delay: options?.delay ?? 0,
      scrollTrigger: options?.trigger
        ? {
            trigger: options.trigger,
            start: options.start ?? 'top 85%',
            once: true,
          }
        : undefined,
    }
  );
}
