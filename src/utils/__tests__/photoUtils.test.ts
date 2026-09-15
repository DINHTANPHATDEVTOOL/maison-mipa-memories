import { describe, it, expect } from 'vitest';
import {
  getPhotoObjectPosition,
  getPhotoOrientation,
  getPhotoAspectRatio,
} from '../photoUtils';

describe('photoUtils helper suite', () => {
  describe('getPhotoObjectPosition', () => {
    it('returns focal coordinates when both focalX and focalY are present', () => {
      expect(getPhotoObjectPosition({ focalX: 30, focalY: 70 })).toBe('30% 70%');
      expect(getPhotoObjectPosition({ focalX: 0, focalY: 100 })).toBe('0% 100%');
    });

    it('clamps focal coordinates between 0 and 100', () => {
      expect(getPhotoObjectPosition({ focalX: -10, focalY: 150 })).toBe('0% 100%');
    });

    it('falls back to 50% 50% when focal metadata is absent or invalid', () => {
      expect(getPhotoObjectPosition(null)).toBe('50% 50%');
      expect(getPhotoObjectPosition(undefined)).toBe('50% 50%');
      expect(getPhotoObjectPosition({})).toBe('50% 50%');
      expect(getPhotoObjectPosition({ focalX: undefined, focalY: 40 })).toBe('50% 50%');
      expect(getPhotoObjectPosition({ focalX: NaN, focalY: NaN })).toBe('50% 50%');
    });
  });

  describe('getPhotoOrientation', () => {
    it('correctly identifies PORTRAIT photos', () => {
      expect(getPhotoOrientation({ width: 800, height: 1200 })).toBe('PORTRAIT'); // ratio 0.67
    });

    it('correctly identifies LANDSCAPE photos', () => {
      expect(getPhotoOrientation({ width: 1920, height: 1080 })).toBe('LANDSCAPE'); // ratio 1.77
      expect(getPhotoOrientation({ width: 1200, height: 800 })).toBe('LANDSCAPE'); // ratio 1.5
    });

    it('correctly identifies SQUARE photos', () => {
      expect(getPhotoOrientation({ width: 1000, height: 1000 })).toBe('SQUARE'); // ratio 1.0
      expect(getPhotoOrientation({ width: 1000, height: 1100 })).toBe('SQUARE'); // ratio 0.91
    });

    it('defaults to LANDSCAPE when dimensions are missing', () => {
      expect(getPhotoOrientation(null)).toBe('LANDSCAPE');
      expect(getPhotoOrientation({})).toBe('LANDSCAPE');
    });
  });

  describe('getPhotoAspectRatio', () => {
    it('returns exact width/height ratio string when available', () => {
      expect(getPhotoAspectRatio({ width: 1200, height: 800 })).toBe('1200 / 800');
    });

    it('defaults to 16/10 when dimensions are missing or invalid', () => {
      expect(getPhotoAspectRatio(null)).toBe('16/10');
      expect(getPhotoAspectRatio({ width: 0, height: 0 })).toBe('16/10');
    });
  });
});
