import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Output directories: test-results/ and conversation artifacts (without committing to public/)
const TEST_RESULTS_DIR = path.resolve(process.cwd(), 'test-results/screenshots');
const CONVERSATION_DIR =
  process.env.ARTIFACT_DIR ||
  path.resolve(process.env.APPDATA || process.env.USERPROFILE || '.', '.gemini/antigravity-ide/brain/1bb9ddf6-52d0-46a5-aaf7-4e5792bcd475/screenshots');

[TEST_RESULTS_DIR, CONVERSATION_DIR].forEach((dir) => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Graceful fallback if conversation directory cannot be created in non-standard OS
  }
});

async function saveScreenshot(page: any, filename: string, options?: any) {
  const testResultsPath = path.join(TEST_RESULTS_DIR, filename);
  const tasks: Promise<any>[] = [page.screenshot({ path: testResultsPath, ...options })];

  try {
    if (fs.existsSync(CONVERSATION_DIR)) {
      const convPath = path.join(CONVERSATION_DIR, filename);
      tasks.push(page.screenshot({ path: convPath, ...options }));
    }
  } catch {}

  await Promise.all(tasks);
}

test.describe('Maison MIPA Immersive Cinematic Visual Review Gate', () => {

  test('Capture all required desktop & mobile cinematic stills', async ({ page }) => {
    test.setTimeout(60000);
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
    await page.evaluate(() => window.scrollTo(0, 180));
    await page.waitForTimeout(400);
    await saveScreenshot(page, '02_hero_after_slight_scroll.png');

    // 3. Selected works 3D composition
    const selectedWorks = page.locator('section').filter({ hasText: /BỘ SƯU TẬP & BỐI CẢNH/i });
    await selectedWorks.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '03_selected_works.png');

    // 4. Full-bleed image transition section
    const fullBleed = page.locator('section').filter({ hasText: /SAIGON ATELIER|LE TEMPS SUSPENDU/i });
    await fullBleed.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, window.scrollY));
    await page.waitForTimeout(500);
    await saveScreenshot(page, '04_full_bleed_section.png');

    // 5. Services editorial rows with scroll choreography
    const servicesSection = page.locator('#services');
    await servicesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '05_services.png');

    // 6. Maison story narrative & 4-step timeline
    const storySection = page.locator('section').filter({ hasText: /Một căn phòng ngập tràn ánh sáng/i });
    await storySection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '06_maison_story.png');

    // 7. Darkroom exhibition gallery moment
    const darkroom = page.locator('section').filter({ hasText: /KHÔNG GIAN TRIỂN LÃM \/ DARKROOM/i });
    await darkroom.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '07_darkroom_section.png');

    // 8. Portfolio hover state with custom cursor
    const darkroomCard = darkroom.locator('[data-cursor="XEM"]').first();
    if (await darkroomCard.isVisible()) {
      await darkroomCard.hover();
      await page.waitForTimeout(300);
    }
    await saveScreenshot(page, '08_portfolio_hover_state.png');

    // 9. Pricing menu
    const pricingSection = page.locator('#packages');
    await pricingSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '09_pricing.png');

    // 10. Cinematic final image CTA
    const finalCta = page.locator('section').filter({ hasText: /Hẹn một buổi chụp cùng Maison MIPA/i });
    await finalCta.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '10_final_cta.png');

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

    // 12. Mobile Selected Works
    const mobileSelected = page.locator('section').filter({ hasText: /BỘ SƯU TẬP & BỐI CẢNH/i });
    await mobileSelected.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '12_mobile_selected_works.png');

    // 13. Mobile Booking Step 1
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '13_mobile_booking_step.png');
  });
});
