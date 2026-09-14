import { useLayoutEffect, useEffect, useRef, type RefObject } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register ScrollTrigger once globally
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Reusable GSAP Context hook to safely scope selectors and kill ScrollTriggers on unmount.
 * Prevents memory leaks and duplicate trigger registration in React 18/19.
 *
 * @param effect Callback containing GSAP animations
 * @param scope Ref to the parent container
 * @param dependencies Dependency list to recreate context if parameters change
 */
export function useGsapContext(
  effect: (context: gsap.Context) => void,
  scope?: RefObject<HTMLElement | null>,
  dependencies: unknown[] = []
): void {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useIsomorphicLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const isJsdom = typeof navigator !== 'undefined' && navigator.userAgent.includes('jsdom');

    try {
      const ctx = gsap.context((self) => {
        try {
          effectRef.current(self);
        } catch (e) {
          if (isJsdom) return;
          console.warn('GSAP Context error:', e);
        }
      }, scope?.current || undefined);

      return () => {
        try {
          ctx.revert();
        } catch {}
      };
    } catch (err) {
      if (isJsdom) return;
      console.warn('GSAP initialization error:', err);
    }
  }, dependencies);
}

export { gsap, ScrollTrigger };
export default useGsapContext;
