import { test, expect } from '@playwright/test';

test.describe('Flagship WebGL Atelier Visual Capture & Video Recording', () => {
  test.beforeEach(() => {
    test.setTimeout(90000);
  });

  test('Desktop 1440x900 Flagship Atelier Cinematic Walkthrough', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // 1. Initial Hero Entrance
    await page.screenshot({ path: testInfo.outputPath('01_atelier_desktop_entrance.png') });

    // 2. Scroll into Atelier Section
    const section = page.locator('#atelier-3d');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: testInfo.outputPath('02_atelier_desktop_wide_view.png') });

    // 3. Switch to Sunset Lighting (17:45)
    const sunsetBtn = page.getByTestId('lighting-btn-sunset');
    await sunsetBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath('03_atelier_sunset_lighting.png') });

    // 4. Switch to Morning Lighting (09:30)
    const morningBtn = page.getByTestId('lighting-btn-morning');
    await morningBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath('04_atelier_morning_lighting.png') });

    // 5. Camera Mode: Tiêu điểm giá vẽ (Easel Dolly)
    const easelCamBtn = page.getByTestId('camera-btn-easel');
    await easelCamBtn.click({ force: true });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: testInfo.outputPath('05_atelier_easel_closeup.png') });

    // 6. Camera Mode: Góc nắng (Window Sunbeam)
    const windowCamBtn = page.getByTestId('camera-btn-window');
    await windowCamBtn.click({ force: true });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: testInfo.outputPath('06_atelier_window_sunbeam.png') });

    // 7. Camera Mode: Đặt lại (Reset to Wide)
    const resetCamBtn = page.getByTestId('camera-btn-reset');
    await resetCamBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath('07_atelier_reset_wide.png') });

    // 8. Scroll exit through homepage
    await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath('08_atelier_scroll_exit.png') });
  });

  test('Mobile 390x844 Flagship Atelier Walkthrough', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const section = page.locator('#atelier-3d');
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: testInfo.outputPath('09_mobile_atelier_entrance.png') });

    // Switch lighting
    const morningBtn = page.getByTestId('lighting-btn-morning');
    await morningBtn.click({ force: true });
    await page.waitForTimeout(1200);

    // Switch camera mode
    const easelCamBtn = page.getByTestId('camera-btn-easel');
    await easelCamBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: testInfo.outputPath('10_mobile_atelier_easel.png') });

    // Reset camera
    const resetCamBtn = page.getByTestId('camera-btn-reset');
    await resetCamBtn.click({ force: true });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: testInfo.outputPath('11_mobile_atelier_reset.png') });
  });
});
