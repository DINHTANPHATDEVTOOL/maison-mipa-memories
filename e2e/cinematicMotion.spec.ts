import { test, expect } from '@playwright/test';

test.describe('Maison MIPA Cinematic Motion & Responsive QA', () => {

  test('1. No runtime errors or unhandled exceptions on homepage scroll', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Smooth scroll down entire homepage
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    expect(errors).toHaveLength(0);
  });

  test('2. Prefers-reduced-motion disables 3D tilts and animations immediately', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify H1 text is visible without transform delay
    const h1 = page.locator('h1.editorial-h1');
    await expect(h1).toBeVisible();

    // Verify custom cursor is NOT active/rendered
    const cursor = page.locator('[aria-hidden="true"]').filter({ hasText: 'XEM' });
    await expect(cursor).toHaveCount(0);
  });

  test('3. Responsive QA across viewports: no horizontal overflow', async ({ page }) => {
    const viewports = [320, 375, 390, 430, 768, 1024, 1280, 1440];

    for (const width of viewports) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      expect(hasHorizontalScroll, `Width ${width}px should not have horizontal overflow`).toBeFalsy();
    }
  });

  test('4. Route transition does not block navigation or trap focus', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Navigate to Portfolio
    await page.getByRole('button', { name: 'Portfolio', exact: true }).click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.locator('h1')).toContainText('Bộ sưu tập hình ảnh');

    // Navigate to Services
    await page.getByRole('button', { name: 'Dịch vụ', exact: true }).click();
    await expect(page).toHaveURL(/\/dich-vu/);
    await expect(page.locator('h1')).toContainText('Dịch vụ chụp ảnh');

    // Navigate to Pricing
    await page.getByRole('button', { name: 'Bảng giá', exact: true }).click();
    await expect(page).toHaveURL(/\/bang-gia/);
    await expect(page.locator('h1')).toContainText('Bảng giá dịch vụ');

    // Back to Home
    await page.getByRole('button', { name: 'Trang chủ', exact: true }).click();
    await expect(page).toHaveURL('/');
  });

  test('5. Portfolio collection click transitions to detail page', async ({ page }) => {
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');

    const firstCard = page.locator('[data-cursor="XEM"]').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page).toHaveURL(/\/portfolio\/.+/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: /Đặt concept này/i })).toBeVisible();
  });

  test('6. Booking funnel works smoothly', async ({ page }) => {
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=Bước 1/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    await expect(page.locator('text=Bước 2/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    await expect(page.locator('text=Bước 3/6')).toBeVisible();
  });
});
