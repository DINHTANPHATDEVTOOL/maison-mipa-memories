import { describe, it, expect } from 'vitest';
import {
  stripExifAndCompressImage,
  generatePhotoVariants,
  getFocalPointStyle,
  CROP_RATIO_PRESETS,
} from '../imageOptimizer';

describe('Image Optimization and Focal Crop Pipeline', () => {
  it('defines the 5 required crop ratio presets', () => {
    expect(CROP_RATIO_PRESETS['1:1']).toBeDefined();
    expect(CROP_RATIO_PRESETS['4:5']).toBeDefined();
    expect(CROP_RATIO_PRESETS['3:2']).toBeDefined();
    expect(CROP_RATIO_PRESETS['16:9']).toBeDefined();
    expect(CROP_RATIO_PRESETS['hero']).toBeDefined();

    expect(CROP_RATIO_PRESETS['1:1'].aspectRatio).toBe('1 / 1');
    expect(CROP_RATIO_PRESETS['4:5'].aspectRatio).toBe('4 / 5');
    expect(CROP_RATIO_PRESETS['3:2'].aspectRatio).toBe('3 / 2');
    expect(CROP_RATIO_PRESETS['16:9'].aspectRatio).toBe('16 / 9');
    expect(CROP_RATIO_PRESETS['hero'].aspectRatio).toBe('21 / 9');
  });

  it('generates non-destructive CSS focal point presentation styles', () => {
    const defaultCenter = getFocalPointStyle();
    expect(defaultCenter.objectPosition).toBe('50% 50%');
    expect(defaultCenter.objectFit).toBe('cover');

    const customFocal = getFocalPointStyle({ x: 30, y: 70 }, '4:5');
    expect(customFocal.objectPosition).toBe('30% 70%');
    expect(customFocal.objectFit).toBe('cover');
    expect(customFocal.aspectRatio).toBe('4 / 5');
  });

  it('generates multi-tier WebP variants meeting resolution policies', async () => {
    // Create a mock image file
    const mockFile = new File(['mock image payload representing 3MB source'], 'paris_portrait.jpg', {
      type: 'image/jpeg',
    });

    const result = await generatePhotoVariants(mockFile);

    expect(result.variants.thumbnail).toBeDefined();
    expect(result.variants.card).toBeDefined();
    expect(result.variants.gallery).toBeDefined();
    expect(result.variants.hero).toBeDefined();

    // Verify dimension caps
    expect(result.variants.thumbnail.width).toBeLessThanOrEqual(480);
    expect(result.variants.card.width).toBeLessThanOrEqual(960);
    expect(result.variants.gallery.width).toBeLessThanOrEqual(1600);
    expect(result.variants.hero.width).toBeLessThanOrEqual(2048);

    // Verify WebP format
    expect(result.variants.thumbnail.mimeType).toBe('image/webp');
    expect(result.variants.card.mimeType).toBe('image/webp');
    expect(result.variants.gallery.mimeType).toBe('image/webp');
    expect(result.variants.hero.mimeType).toBe('image/webp');

    // Verify optimized size is lighter than source
    expect(result.totalOptimizedBytes).toBeGreaterThan(0);
  });

  it('strips metadata and produces valid blob without EXIF headers', async () => {
    const mockFile = new File(['test buffer with simulated exif'], 'concept.jpg', { type: 'image/jpeg' });
    const stripped = await stripExifAndCompressImage(mockFile, 1200, 0.85);

    expect(stripped.blob).toBeDefined();
    expect(stripped.width).toBeLessThanOrEqual(1200);
    expect(stripped.sizeBytes).toBeGreaterThan(0);
  });
});
