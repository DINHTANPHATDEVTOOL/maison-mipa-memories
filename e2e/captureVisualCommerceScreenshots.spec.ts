import { test } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const ARTIFACTS_DIR = 'C:/Users/phatd/.gemini/antigravity-ide/brain/1bb9ddf6-52d0-46a5-aaf7-4e5792bcd475/screenshots';

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

test.describe('Visual Commerce Redesign Screenshots', () => {
  test.setTimeout(180000);

  test('Capture Desktop (1440x900) and Mobile (390x844) Visual Reviews', async ({ page }) => {
    // -------------------------------------------------------------
    // DESKTOP 1440x900
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_01_desktop_homepage_hero.png'),
    });

    // 2. Concepts section
    const conceptsSection = page.locator('#concepts');
    if (await conceptsSection.count() > 0) {
      await conceptsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_02_desktop_concepts_section.png'),
      });
    }

    // 3. Services section
    const servicesSection = page.locator('#services');
    if (await servicesSection.count() > 0) {
      await servicesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_03_desktop_services.png'),
      });
    }

    // 4. Selected Stories
    const storiesSection = page.locator('#portfolio');
    if (await storiesSection.count() > 0) {
      await storiesSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_04_desktop_selected_stories.png'),
      });
    }

    // 5. Pricing preview
    const pricingSection = page.locator('#bang-gia');
    if (await pricingSection.count() > 0) {
      await pricingSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_05_desktop_pricing.png'),
      });
    }

    // 6. Homepage bottom CTA
    const bottomCta = page.locator('section[aria-label="Tư Vấn & Đặt Lịch"]');
    if (await bottomCta.count() > 0) {
      await bottomCta.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_06_desktop_bottom_cta.png'),
      });
    }

    // 7. Concept listing
    await page.goto('/concept');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_07_desktop_concept_listing.png'),
    });

    // 8. Concept detail
    await page.goto('/concept/parisian-romance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_08_desktop_concept_detail.png'),
    });

    // 9. Portfolio
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_09_desktop_portfolio.png'),
    });

    // 10. Service detail
    await page.goto('/dich-vu/couple');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_10_desktop_service_detail.png'),
    });

    // -------------------------------------------------------------
    // MOBILE 390x844
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });

    // 11. Mobile Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_11_mobile_homepage_hero.png'),
    });

    // 12. Mobile Concept section
    if (await conceptsSection.count() > 0) {
      await conceptsSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_12_mobile_concept_section.png'),
      });
    }

    // 13. Mobile nav
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
    const mobileMenuBtn = page.locator('button[aria-label="Mở menu điều hướng"]');
    if (await mobileMenuBtn.count() > 0) {
      await mobileMenuBtn.first().click();
      await page.waitForTimeout(800);
      await page.screenshot({
        path: path.join(ARTIFACTS_DIR, 'vc_13_mobile_nav.png'),
      });
    }

    // 14. Mobile Concept detail
    await page.goto('/concept/parisian-romance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_14_mobile_concept_detail.png'),
    });

    // 15. Mobile Pricing
    await page.goto('/bang-gia');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_15_mobile_pricing.png'),
    });

    // 16. Mobile Booking entry
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(ARTIFACTS_DIR, 'vc_16_mobile_booking_entry.png'),
    });
  });
});
