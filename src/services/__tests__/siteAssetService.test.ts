import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSiteAssets,
  getInitialSiteAssets,
  updateSiteAssetImage,
  resetSiteAssetToDefault,
  deleteSiteAssetImage,
  DEFAULT_SITE_ASSETS,
  convertToWebpBlob,
} from '../siteAssetService';

describe('Site Asset Management Service Suite', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. returns full set of default site assets on initial call', async () => {
    const assets = await getSiteAssets();
    expect(assets.home_hero_banner).toBeDefined();
    expect(assets.home_hero_banner.imageUrl).toBe('/hero.png');
    expect(assets.home_curatorial_banner).toBeDefined();
    expect(assets.service_couple).toBeDefined();
    expect(assets.service_portrait).toBeDefined();
    expect(assets.service_graduation).toBeDefined();
    expect(assets.atelier_room_1).toBeDefined();
  });

  it('2. converts file to WebP blob and strips metadata', async () => {
    const fakeFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const blob = await convertToWebpBlob(fakeFile);
    expect(blob).toBeDefined();
  });

  it('3. updates asset image and persists to local cache in offline/demo mode', async () => {
    const fakeFile = new File(['fake image data'], 'hero-upload.jpg', { type: 'image/jpeg' });
    const updated = await updateSiteAssetImage('home_hero_banner', fakeFile, 'user_owner');

    expect(updated.id).toBe('home_hero_banner');
    expect(updated.imageUrl).toBeDefined();
    expect(updated.updatedBy).toBe('user_owner');

    const freshAssets = await getSiteAssets();
    expect(freshAssets.home_hero_banner.imageUrl).toBe(updated.imageUrl);
  });

  it('4. resets asset back to default brand image', async () => {
    const fakeFile = new File(['custom data'], 'custom.webp', { type: 'image/webp' });
    await updateSiteAssetImage('home_hero_banner', fakeFile);

    const reset = await resetSiteAssetToDefault('home_hero_banner');
    expect(reset.imageUrl).toBe(DEFAULT_SITE_ASSETS.home_hero_banner.imageUrl);

    const freshAssets = await getSiteAssets();
    expect(freshAssets.home_hero_banner.imageUrl).toBe('/hero.png');
  });

  it('5. getInitialSiteAssets synchronously reads from localStorage to prevent flash of old image', () => {
    const customAsset = {
      id: 'home_hero_banner',
      page: 'HOME' as const,
      label: 'Hero',
      imageUrl: 'https://storage.supabase.co/asset_test.webp',
    };
    localStorage.setItem('maison_mipa_site_assets_cache', JSON.stringify({
      home_hero_banner: customAsset,
    }));

    const initial = getInitialSiteAssets();
    expect(initial.home_hero_banner.imageUrl).toBe('https://storage.supabase.co/asset_test.webp');
  });

  it('6. deleteSiteAssetImage removes custom asset and restores default brand image', async () => {
    const fakeFile = new File(['upload data'], 'new-hero.webp', { type: 'image/webp' });
    await updateSiteAssetImage('home_hero_banner', fakeFile);

    const deleted = await deleteSiteAssetImage('home_hero_banner');
    expect(deleted.imageUrl).toBe('/hero.png');
  });
});
