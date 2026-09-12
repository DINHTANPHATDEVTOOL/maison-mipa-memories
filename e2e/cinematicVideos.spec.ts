import { test, expect } from '@playwright/test';

test.use({ video: 'on' });

test.describe('Maison MIPA Cinematic Video Recordings (CI / Review Artifacts)', () => {

  test('VIDEO 1: Desktop Homepage Cinematic Scroll (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Smooth scroll down entire homepage to capture all 7 signature moments
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let currentY = 0;
        const totalHeight = document.body.scrollHeight;
        const step = 250;
        const interval = setInterval(() => {
          window.scrollBy(0, step);
          currentY += step;
          if (currentY >= totalHeight) {
            clearInterval(interval);
            resolve();
          }
        }, 120);
      });
    });

    await page.waitForTimeout(1000);
    // Verify reaching final CTA
    await expect(page.getByRole('heading', { name: /Hẹn một buổi chụp cùng Maison MIPA/i })).toBeVisible();
  });

  test('VIDEO 2: Portfolio Collection Transition & Lightbox (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    // Hover over first portfolio collection to show custom cursor "XEM"
    const firstCollection = page.locator('[data-cursor="XEM"]').first();
    await firstCollection.hover();
    await page.waitForTimeout(600);

    // Click to trigger View Transition
    await firstCollection.click();
    await page.waitForURL(/\/portfolio\/.+/);
    await page.waitForTimeout(1000);

    // Verify detail page loaded with hero and gallery
    await expect(page.locator('h1')).toBeVisible();

    // Open first photo in Lightbox if available
    const firstPhotoThumb = page.locator('img[loading="lazy"]').nth(1);
    if (await firstPhotoThumb.isVisible()) {
      await firstPhotoThumb.click();
      await page.waitForTimeout(800);
      // Press Right Arrow then Left Arrow
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(500);
      // Close with Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
    }
  });

  test('VIDEO 3: Mobile Homepage Interactions (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(800);

    // Scroll through mobile hero, concepts, and darkroom
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let currentY = 0;
        const totalHeight = 3500;
        const step = 200;
        const interval = setInterval(() => {
          window.scrollBy(0, step);
          currentY += step;
          if (currentY >= totalHeight) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });
    });

    await page.waitForTimeout(800);
  });
});
