import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Output directory: test-results/ (without committing to public/)
const TEST_RESULTS_DIR = path.resolve(process.cwd(), 'test-results/screenshots');

try {
  if (!fs.existsSync(TEST_RESULTS_DIR)) {
    fs.mkdirSync(TEST_RESULTS_DIR, { recursive: true });
  }
} catch {
  // Graceful fallback
}

async function saveScreenshot(page: any, filename: string, options?: any) {
  const testResultsPath = path.join(TEST_RESULTS_DIR, filename);
  await page.screenshot({ path: testResultsPath, ...options });
}

test.describe('Maison MIPA Immersive Cinematic Visual Review Gate', () => {

  test('Capture all required desktop & mobile cinematic stills', async ({ page }) => {
    test.setTimeout(120000);
    // -------------------------------------------------------------------------
    // DESKTOP SCREENSHOTS (1440 x 900)
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Hero initial arrival
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);
    await saveScreenshot(page, '01_hero_initial.png');

    // 2. Hero after slight scroll (exit drift & perspective tilt)
    await page.evaluate(() => window.scrollTo(0, 240));
    await page.waitForTimeout(400);
    await saveScreenshot(page, '02_hero_after_slight_scroll.png');

    // 3. Concepts section
    const conceptsSection = page.locator('#concepts');
    if (await conceptsSection.isVisible()) {
      await conceptsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await saveScreenshot(page, '03_selected_works.png');
    }

    // 4. Services section
    const servicesSection = page.locator('#services');
    if (await servicesSection.isVisible()) {
      await servicesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await saveScreenshot(page, '05_services.png');
    }

    // 5. Selected stories
    const storiesSection = page.locator('#portfolio');
    if (await storiesSection.isVisible()) {
      await storiesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await saveScreenshot(page, '04_full_bleed_section.png');
    }

    // 6. Maison brand story
    const storySection = page.locator('section').filter({ hasText: /Ánh sáng tự nhiên/i }).first();
    if (await storySection.isVisible()) {
      await storySection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await saveScreenshot(page, '06_maison_story.png');
    }

    // 7. Pricing menu
    const pricingSection = page.locator('#bang-gia');
    if (await pricingSection.isVisible()) {
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await saveScreenshot(page, '09_pricing.png');
    }

    // 8. Cinematic final image CTA
    const finalCta = page.locator('section[aria-label="Tư Vấn & Đặt Lịch"]');
    if (await finalCta.isVisible()) {
      await finalCta.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await saveScreenshot(page, '10_final_cta.png');
    }

    // Public Pages
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '12_portfolio_page.png');

    await page.goto('/dich-vu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '13_services_page.png');

    await page.goto('/bang-gia');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '14_pricing_page.png');

    // -------------------------------------------------------------------------
    // MOBILE SCREENSHOTS (390 x 844)
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });

    // 11. Mobile Hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '11_mobile_hero.png');

    // 12. Mobile Concepts
    const mobileConcepts = page.locator('#concepts');
    if (await mobileConcepts.isVisible()) {
      await mobileConcepts.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      await saveScreenshot(page, '12_mobile_selected_works.png');
    }

    // 13. Mobile Booking Step 1
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '13_mobile_booking_step.png');
  });
});
