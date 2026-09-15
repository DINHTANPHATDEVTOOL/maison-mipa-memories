// ==============================================================================
// Maison MIPA Memories — Photography Utility Helpers
// Supports real focal points (focalX, focalY), aspect ratio, and orientation
// ==============================================================================

export interface PhotoFocalData {
  focalX?: number;
  focalY?: number;
  width?: number;
  height?: number;
}

/**
 * Returns CSS object-position using authoritative focal coordinates (0–100%).
 * Defaults to '50% 50%' when focal metadata is absent.
 */
export function getPhotoObjectPosition(photo?: PhotoFocalData | null): string {
  if (
    !photo ||
    typeof photo.focalX !== 'number' ||
    typeof photo.focalY !== 'number' ||
    isNaN(photo.focalX) ||
    isNaN(photo.focalY)
  ) {
    return '50% 50%';
  }
  const x = Math.max(0, Math.min(100, Math.round(photo.focalX)));
  const y = Math.max(0, Math.min(100, Math.round(photo.focalY)));
  return `${x}% ${y}%`;
}

export type PhotoOrientation = 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE';

/**
 * Derives orientation from real photo dimensions (width & height).
 * Portrait: ratio < 0.85
 * Landscape: ratio > 1.15
 * Square: 0.85 <= ratio <= 1.15
 */
export function getPhotoOrientation(photo?: PhotoFocalData | null): PhotoOrientation {
  if (!photo || !photo.width || !photo.height || photo.width <= 0 || photo.height <= 0) {
    return 'LANDSCAPE';
  }
  const ratio = photo.width / photo.height;
  if (ratio < 0.85) return 'PORTRAIT';
  if (ratio > 1.15) return 'LANDSCAPE';
  return 'SQUARE';
}

/**
 * Returns an intrinsic or appropriate aspect-ratio string for CSS.
 */
export function getPhotoAspectRatio(photo?: PhotoFocalData | null): string {
  if (!photo || !photo.width || !photo.height || photo.width <= 0 || photo.height <= 0) {
    return '16/10';
  }
  return `${photo.width} / ${photo.height}`;
}
