/**
 * Safe View Transitions API integration with progressive enhancement and fallback.
 * Adheres strictly to @media (prefers-reduced-motion: reduce).
 */
export function safeStartViewTransition(
  updateCallback: () => void,
  fallback?: () => void
): void {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (
    !prefersReduced &&
    typeof document !== 'undefined' &&
    'startViewTransition' in document &&
    typeof (document as any).startViewTransition === 'function'
  ) {
    try {
      (document as any).startViewTransition(() => {
        updateCallback();
      });
      return;
    } catch {
      // Fallback on unexpected View Transition error
    }
  }

  if (fallback) {
    fallback();
  } else {
    updateCallback();
  }
}
