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

  test('7. All 7 Signature Moments are present and rendered on Homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Moment 1: Hero
    await expect(page.locator('h1.editorial-h1')).toBeVisible();
    await expect(page.getByText('MAISON MIPA / SAIGON')).toBeVisible();

    // Moment 2: Selected Works Perspective
    await expect(page.getByRole('heading', { name: /Bộ sưu tập concept chọn lọc/i })).toBeVisible();

    // Moment 3: Photo Stack Scene
    await expect(page.getByRole('heading', { name: /Những bản in trải rộng trên bàn làm việc/i })).toBeVisible();

    // Moment 4: Film Gate & Moving Matte Transition
    await expect(page.getByText(/02 \/ LE TEMPS SUSPENDU — SAIGON ATELIER/i)).toBeVisible();

    // Moment 5: Services Choreography
    await expect(page.getByRole('heading', { name: /Bạn muốn lưu lại điều gì/i })).toBeVisible();

    // Moment 6: Darkroom Exhibition Depth
    await expect(page.getByRole('heading', { name: /Tĩnh lặng trong từng khuôn hình/i })).toBeVisible();
    await expect(page.getByText(/KHOẢNH KHẮC NGUYÊN BẢN/i)).toBeVisible();

    // Moment 7: Final CTA Enter the Frame
    await expect(page.getByRole('heading', { name: /Hẹn một buổi chụp cùng Maison MIPA/i })).toBeVisible();
  });

  test('8. Flagship WebGL Living French Atelier renders diorama scene, camera & lighting controls, and booking flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify Flagship Atelier Section and Heading
    const section = page.locator('#atelier-3d');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: /Căn Phòng Triển Lãm Không Gian 3 Chiều/i })).toBeVisible();
    await expect(page.getByText(/MAISON MIPA \/ SAIGON • ATELIER VIRTUEL 3D & EXPOSITION/i)).toBeVisible();

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

    // Verify Diverse Banners (Marquee, Seasonal Privilege, Curatorial Split)
    await expect(page.locator('.editorial-marquee-track')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Đặc Quyền Mùa Triển Lãm & Kỷ Niệm/i })).toBeVisible();
    await expect(page.getByText(/Ánh sáng không chỉ để nhìn thấy, mà để cảm nhận khoảnh khắc vĩnh cửu/i)).toBeVisible();

    // Verify Booking CTA from Section Header navigates to canonical Booking Funnel
    const bookBtn = section.getByRole('button', { name: /Đặt Lịch Chụp Ngay/i });
    await bookBtn.click({ force: true });

    await expect(page).toHaveURL(/.*\/booking/);
    await expect(page.locator('text=Bước 1/6')).toBeVisible();
  });

  test('9. Mobile 390x844 responsive layout has zero horizontal overflow in Flagship Atelier', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
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
