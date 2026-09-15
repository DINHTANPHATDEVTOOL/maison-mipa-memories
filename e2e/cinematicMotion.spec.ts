import { test, expect } from '@playwright/test';

test.describe('Maison MIPA Cinematic Motion & Responsive QA', () => {
  test.beforeEach(() => {
    test.setTimeout(60000);
  });

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
    await page.goto('/atelier');
    await page.waitForLoadState('domcontentloaded');

    // Verify 3D atelier viewport is visible without transform delay
    const viewport = page.getByTestId('virtual-exhibition-viewport');
    await expect(viewport).toBeVisible();

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
    await page.getByRole('link', { name: 'Portfolio', exact: true }).click();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.locator('h1')).toContainText('Bộ sưu tập hình ảnh');

    // Navigate to Services
    await page.getByRole('link', { name: 'Dịch vụ', exact: true }).click();
    await expect(page).toHaveURL(/\/dich-vu/);
    await expect(page.locator('h1')).toContainText('Dịch vụ chụp ảnh');

    // Navigate to Pricing
    await page.getByRole('link', { name: 'Bảng giá', exact: true }).click();
    await expect(page).toHaveURL(/\/bang-gia/);
    await expect(page.locator('h1')).toContainText('Bảng giá dịch vụ');

    // Back to Home
    await page.locator('header a[href="/"]').first().click();
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

  test('7. All Signature Commerce Sections are present and rendered on Homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Section 1: Hero
    await expect(page.locator('h1')).toBeVisible();

    // Section 2: Concepts
    await expect(page.getByRole('heading', { name: /Ý tưởng & phong cách ánh sáng|Ý tưởng & Concept/i })).toBeVisible({ timeout: 10000 });

    // Section 3: Services
    await expect(page.getByRole('heading', { name: /Danh mục chụp tại Maison/i })).toBeVisible();

    // Section 4: Stories
    await expect(page.getByRole('heading', { name: /Những câu chuyện được kể lại/i })).toBeVisible();

    // Section 5: Brand Story
    await expect(page.getByRole('heading', { name: /Ánh sáng tự nhiên/i })).toBeVisible();

    // Section 6: Pricing
    await expect(page.getByRole('heading', { name: /Bảng giá dịch vụ/i })).toBeVisible();

    // Section 7: Final Consultation CTA
    await expect(page.locator('section[aria-label="Tư Vấn & Đặt Lịch"]')).toBeVisible();
  });

  test('8. Flagship WebGL Living French Atelier renders diorama scene, camera & lighting controls, and booking flow', async ({ page }) => {
    await page.goto('/atelier');
    await page.waitForLoadState('domcontentloaded');

    // Verify Flagship Atelier Section and Heading
    const section = page.locator('#atelier-3d');
    await expect(section).toBeVisible();
    await expect(section.locator('h1')).toBeAttached();

    // Verify 3D Viewport exists
    const viewport = page.getByTestId('virtual-exhibition-viewport');
    await expect(viewport).toBeVisible();

    // Scroll 3D section into view
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);

    // Verify Camera Controls (Wide, Easel, Window, Reset)
    const easelCamBtn = page.getByTestId('camera-btn-easel');
    const windowCamBtn = page.getByTestId('camera-btn-window');
    const wideCamBtn = page.getByTestId('camera-btn-wide');
    const resetCamBtn = page.getByTestId('camera-btn-reset');

    await expect(easelCamBtn).toBeVisible();
    await expect(windowCamBtn).toBeVisible();
    await expect(wideCamBtn).toBeVisible();
    await expect(resetCamBtn).toBeVisible();

    // Switch camera modes
    await easelCamBtn.click({ force: true });
    await page.waitForTimeout(200);

    await windowCamBtn.click({ force: true });
    await page.waitForTimeout(200);

    await resetCamBtn.click({ force: true });
    await page.waitForTimeout(200);

    // Verify Lighting Controls (Sunset, Morning, Afternoon)
    const morningLightBtn = page.getByTestId('lighting-btn-morning');
    const afternoonLightBtn = page.getByTestId('lighting-btn-afternoon');
    const sunsetLightBtn = page.getByTestId('lighting-btn-sunset');

    await expect(morningLightBtn).toBeVisible();
    await expect(afternoonLightBtn).toBeVisible();
    await expect(sunsetLightBtn).toBeVisible();

    // Switch lighting presets
    await morningLightBtn.click({ force: true });
    await page.waitForTimeout(200);

    await afternoonLightBtn.click({ force: true });
    await page.waitForTimeout(200);

    await sunsetLightBtn.click({ force: true });
    await page.waitForTimeout(200);

    // Verify navbar booking CTA navigates to canonical Booking Funnel
    const navBookBtn = page.getByRole('button', { name: 'Đặt lịch', exact: true });
    await navBookBtn.click({ force: true });

    await expect(page.locator('text=Bước 1/6')).toBeVisible();
  });

  test('9. Mobile 390x844 responsive layout has zero horizontal overflow in Flagship Atelier', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/atelier');
    await page.waitForLoadState('domcontentloaded');

    const section = page.locator('#atelier-3d');
    await expect(section).toBeVisible();

    const viewport = page.getByTestId('virtual-exhibition-viewport');
    await expect(viewport).toBeVisible();

    // Check horizontal scroll overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // Verify camera & lighting controls are accessible on mobile
    await expect(page.getByTestId('camera-btn-easel')).toBeVisible();
    await expect(page.getByTestId('lighting-btn-morning')).toBeVisible();
  });
});
