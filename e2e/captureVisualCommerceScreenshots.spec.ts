import { test, expect } from '@playwright/test';

test.describe('Visual Commerce Redesign Screenshots', () => {
  test.setTimeout(180000);

  test('Capture Desktop (1440x900) and Mobile (390x844) Visual Reviews', async ({ page }, testInfo) => {
    // -------------------------------------------------------------
    // DESKTOP 1440x900
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const heroSection = page.locator('.mipa-visual-commerce-hero');
    await expect(heroSection).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('vc_01_desktop_homepage_hero.png'),
    });

    // 2. Concepts section (REQUIRED)
    const conceptsSection = page.locator('#concepts');
    await expect(conceptsSection).toBeVisible();
    await conceptsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath('vc_02_desktop_concepts_section.png'),
    });

    // 3. Services section (REQUIRED)
    const servicesSection = page.locator('#services');
    await expect(servicesSection).toBeVisible();
    await servicesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath('vc_03_desktop_services.png'),
    });

    // 4. Selected Stories (REQUIRED)
    const storiesSection = page.locator('#portfolio');
    await expect(storiesSection).toBeVisible();
    await storiesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath('vc_04_desktop_selected_stories.png'),
    });

    // 5. Pricing preview (REQUIRED)
    const pricingSection = page.locator('#bang-gia');
    await expect(pricingSection).toBeVisible();
    await pricingSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath('vc_05_desktop_pricing.png'),
    });

    // 6. Homepage bottom CTA (REQUIRED)
    const bottomCta = page.locator('section[aria-label="Tư Vấn & Đặt Lịch"]');
    await expect(bottomCta).toBeVisible();
    await bottomCta.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath('vc_06_desktop_bottom_cta.png'),
    });

    // 7. Concept listing
    await page.goto('/concept');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_07_desktop_concept_listing.png'),
    });

    // 8. Concept detail
    await page.goto('/concept/parisian-romance');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_08_desktop_concept_detail.png'),
    });

    // 9. Portfolio
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_09_desktop_portfolio.png'),
    });

    // 10. Service detail
    await page.goto('/dich-vu/couple');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_10_desktop_service_detail.png'),
    });

    // -------------------------------------------------------------
    // MOBILE 390x844
    // -------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });

    // 11. Mobile Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const mobileHero = page.locator('.mipa-visual-commerce-hero');
    await expect(mobileHero).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('vc_11_mobile_homepage_hero.png'),
    });

    // 12. Mobile Concept section
    const mobileConcepts = page.locator('#concepts');
    await expect(mobileConcepts).toBeVisible();
    await mobileConcepts.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: testInfo.outputPath('vc_12_mobile_concept_section.png'),
    });

    // 13. Mobile nav (REQUIRED)
    const mobileMenuBtn = page.locator('button[aria-label="Mở menu điều hướng"]');
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();
    await page.waitForTimeout(400);
    const mobileNavSheet = page.locator('nav a, header nav, header a').first();
    await expect(mobileNavSheet).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath('vc_13_mobile_nav.png'),
    });

    // 14. Mobile Concept detail
    await page.goto('/concept/parisian-romance');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_14_mobile_concept_detail.png'),
    });

    // 15. Mobile Pricing
    await page.goto('/bang-gia');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_15_mobile_pricing.png'),
    });

    // 16. Mobile Booking entry
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({
      path: testInfo.outputPath('vc_16_mobile_booking_entry.png'),
    });
  });
});
