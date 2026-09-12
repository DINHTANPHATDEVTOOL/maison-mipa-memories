import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/phatd/.gemini/antigravity-ide/brain/1bb9ddf6-52d0-46a5-aaf7-4e5792bcd475/screenshots';
const PUBLIC_DIR = path.resolve(process.cwd(), 'public/screenshots/editorial');

// Ensure output directories exist
[ARTIFACT_DIR, PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function saveScreenshot(page: any, filename: string, options?: any) {
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  const publicPath = path.join(PUBLIC_DIR, filename);
  return Promise.all([
    page.screenshot({ path: artifactPath, ...options }),
    page.screenshot({ path: publicPath, ...options }),
  ]);
}

test.describe('Maison MIPA Editorial Redesign — 14 Screenshot Review Gate', () => {

  test('Capture all 14 required screenshots', async ({ page }) => {
    // -------------------------------------------------------------------------
    // DESKTOP SCREENSHOTS (1440 x 900)
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '01_homepage_hero.png');

    // 2. Homepage selected works
    const conceptsSection = page.locator('section').filter({ hasText: /BỘ SƯU TẬP & BỐI CẢNH/i });
    await conceptsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '02_homepage_selected_works.png');

    // 3. Homepage services
    const servicesSection = page.locator('#services');
    await servicesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '03_homepage_services.png');

    // 4. Homepage pricing
    const pricingSection = page.locator('#packages');
    await pricingSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '04_homepage_pricing.png');

    // 5. Homepage final CTA
    const finalCtaSection = page.locator('section').filter({ hasText: /Hẹn một buổi chụp cùng Maison MIPA/i });
    await finalCtaSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '05_homepage_final_cta.png');

    // 12. Portfolio page
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '12_portfolio_page.png');

    // 13. Services page
    await page.goto('/dich-vu');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '13_services_page.png');

    // 14. Pricing page
    await page.goto('/bang-gia');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '14_pricing_page.png');

    // 8. Booking step 1: Service selection
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '08_booking_step1_service.png');

    // 9. Booking step 2: Package & Concept selection
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '09_booking_step2_package_concept.png');

    // 10. Booking step 3: Date & time selection
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '10_booking_step3_date_time.png');

    // Proceed to Step 4 (Add-ons)
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();
    await page.waitForTimeout(300);

    // Proceed to Step 5 (Customer Info)
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();
    await page.waitForTimeout(300);
    // Fill customer info to allow step 6
    await page.getByPlaceholder('Họ và tên').fill('Nguyễn Hà My');
    await page.getByPlaceholder('Số điện thoại').fill('0908123456');
    await page.getByPlaceholder('Email').fill('hamy@example.com');

    // 11. Booking step 6: Final review & deposit payment
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();
    await page.waitForTimeout(500);
    await saveScreenshot(page, '11_booking_step6_final_review.png');

    // -------------------------------------------------------------------------
    // MOBILE SCREENSHOTS (390 x 844)
    // -------------------------------------------------------------------------
    await page.setViewportSize({ width: 390, height: 844 });

    // 6. Mobile homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);
    await saveScreenshot(page, '06_mobile_homepage_hero.png');

    // 7. Mobile homepage navigation open
    const hamburgerBtn = page.getByRole('button', { name: 'Menu' });
    await hamburgerBtn.click();
    await page.waitForTimeout(400);
    await saveScreenshot(page, '07_mobile_homepage_nav_open.png');
  });

});
