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

  test('8. CSS 3D Spatial Virtual Exhibition Gallery renders room planes, handles interaction and opens curatorial modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Verify 3D Exhibition Section and Heading
    const section = page.locator('#atelier-3d');
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: /Căn Phòng Triển Lãm Không Gian 3 Chiều/i })).toBeVisible();

    // Verify 3D Room & Diorama Planes
    await expect(page.getByTestId('virtual-exhibition-viewport')).toBeVisible();
    await expect(page.getByTestId('diorama-foreground-curtain')).toBeVisible();
    await expect(page.getByTestId('diorama-foreground-camera')).toBeVisible();
    await expect(page.getByTestId('gallery-back-wall')).toBeVisible();
    await expect(page.getByTestId('gallery-parquet-floor')).toBeVisible();
    await expect(page.getByTestId('gallery-left-window')).toBeVisible();
    await expect(page.getByTestId('gallery-right-wall')).toBeVisible();
    await expect(page.getByTestId('diorama-center-easel')).toBeVisible();

    // Verify 3 Museum Frames on the back wall
    await expect(page.getByTestId('artwork-frame-art-01')).toBeVisible();
    await expect(page.getByTestId('artwork-frame-art-02')).toBeVisible();
    await expect(page.getByTestId('artwork-frame-art-03')).toBeVisible();

    // Verify Diverse Banners (Marquee, Seasonal, Curatorial Split)
    await expect(page.locator('.editorial-marquee-track')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Đặc Quyền Mùa Triển Lãm & Kỷ Niệm/i })).toBeVisible();
    await expect(page.getByText(/Ánh sáng không chỉ để nhìn thấy, mà để cảm nhận khoảnh khắc vĩnh cửu/i)).toBeVisible();

    // Hover & move pointer across 3D viewport to trigger camera motion
    const viewport = page.getByTestId('virtual-exhibition-viewport');
    await viewport.hover({ position: { x: 200, y: 150 } });
    await page.mouse.move(600, 300);

    // Switch lighting preset to Twilight (Hoàng Hôn Nghệ Thuật)
    const twilightBtn = page.getByRole('button', { name: /Hoàng Hôn Nghệ Thuật/i });
    await twilightBtn.click();
    await expect(page.getByText('05:45 PM')).toBeVisible();

    // Scroll 3D section into view
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    const centerFrame = page.getByTestId('artwork-frame-art-02');
    await centerFrame.focus();
    await centerFrame.press('Enter');

    // Assert Exhibition Modal content
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('heading', { name: /Vintage Loft & Cinematic — Chiều Sâu Điện Ảnh/i })).toBeVisible();
    await expect(modal.getByText(/Tirage Argentique Haute Résolution/i)).toBeVisible();
    await expect(modal.getByRole('button', { name: /Đặt Lịch Chụp Concept Này/i })).toBeVisible();

    // Close modal via close button
    const closeBtn = page.getByLabel('Đóng bảng thông tin tác phẩm');
    await closeBtn.click();
    await expect(modal).not.toBeVisible();
  });
});
