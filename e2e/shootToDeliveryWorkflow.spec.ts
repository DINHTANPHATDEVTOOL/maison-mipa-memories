import { test, expect } from '@playwright/test';

test.describe('Maison MIPA — Shoot to Delivery Workflow V1 E2E Suite (Phase 25)', () => {

  test('1. Full End-to-End Shoot to Delivery Lifecycle: Manager, Customer & Staff', async ({ page }) => {
    // =========================================================================
    // STEP 1: Manager logs in and navigates to Management Operations
    // =========================================================================
    await page.goto('/');
    await page.getByRole('button', { name: /Đăng nhập/i }).click();
    await page.getByPlaceholder(/Nhập email/i).fill('phat.manager@maisonmipa.vn');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();

    // Verify Manager logged in
    await expect(page.locator('text=Lê Tấn Phát').first()).toBeVisible();

    // Go to Management Dashboard
    await page.locator('text=Lê Tấn Phát').first().click();
    await page.getByRole('link', { name: /Studio Manager OS/i }).click();
    await expect(page).toHaveURL(/\/management/);

    // Verify 9 Operations Queues are rendered
    await expect(page.locator('text=SẮP CHỤP').first()).toBeVisible();
    await expect(page.locator('text=ĐÃ CHECK-IN').first()).toBeVisible();
    await expect(page.locator('text=ĐANG CHỤP').first()).toBeVisible();
    await expect(page.locator('text=CHỜ SYNC ẢNH').first()).toBeVisible();
    await expect(page.locator('text=KHÁCH CHỌN ẢNH').first()).toBeVisible();
    await expect(page.locator('text=ĐANG HẬU KỲ').first()).toBeVisible();
    await expect(page.locator('text=CHỜ DUYỆT').first()).toBeVisible();
    await expect(page.locator('text=ĐÃ GIAO').first()).toBeVisible();
    await expect(page.locator('text=HOÀN TẤT').first()).toBeVisible();

    // =========================================================================
    // STEP 2: Find a CONFIRMED or existing booking to step through the workflow
    // =========================================================================
    // Click on "Tất cả trạng thái" filter pill to ensure all bookings are listed
    const allPill = page.getByRole('button', { name: /Tất cả trạng thái/i });
    if (await allPill.isVisible()) {
      await allPill.click();
    }

    // Select the first booking in the list
    const firstBookingCard = page.locator('div[style*="cursor: pointer"]').first();
    await expect(firstBookingCard).toBeVisible({ timeout: 10000 });
    await firstBookingCard.click();

    // Verify Timeline is visible in the right column
    await expect(page.getByText('TIẾN TRÌNH CHI TIẾT (TIMELINE):')).toBeVisible();

    // Check if check-in button or next operation action is available
    const checkInBtn = page.getByRole('button', { name: /CHECK-IN KHÁCH|XÁC NHẬN KHÁCH CHECK-IN/i }).first();
    if (await checkInBtn.isVisible()) {
      await checkInBtn.click();
      await page.waitForTimeout(1000);
    }

    // Start shoot if available
    const startShootBtn = page.getByRole('button', { name: /BẮT ĐẦU BUỔI CHỤP/i }).first();
    if (await startShootBtn.isVisible()) {
      await startShootBtn.click();
      await page.waitForTimeout(1000);
    }

    // Complete shoot if available
    const completeShootBtn = page.getByRole('button', { name: /HOÀN TẤT BUỔI CHỤP/i }).first();
    if (await completeShootBtn.isVisible()) {
      await completeShootBtn.click();
      await page.waitForTimeout(1000);
    }

    // If in SHOOT_COMPLETED or AWAITING_SELECTION, test Sync Proofs
    const syncProofsBtn = page.getByRole('button', { name: /ĐỒNG BỘ ẢNH PROOFS/i }).first();
    if (await syncProofsBtn.isVisible()) {
      await syncProofsBtn.click();
      await page.waitForTimeout(1000);
    }

    // If bypass selection is available, verify modal opens
    const bypassBtn = page.getByRole('button', { name: /Bỏ Qua Khâu Chọn Ảnh/i }).first();
    if (await bypassBtn.isVisible()) {
      await bypassBtn.click();
      await expect(page.getByText('BỎ QUA KHÂU KHÁCH CHỌN ẢNH')).toBeVisible();
      // Close modal
      await page.getByRole('button', { name: 'Hủy Bỏ' }).click();
    }

    // Log out manager
    await page.locator('text=Lê Tấn Phát').first().click();
    await page.getByRole('button', { name: /Đăng xuất/i }).click();

    // =========================================================================
    // STEP 3: Customer Portal & Photo Selection Gallery
    // =========================================================================
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).first().click();
    await page.getByPlaceholder(/Nhập email/i).fill('minhanh.nguyen@gmail.com');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
    await expect(page.locator('text=Nguyễn Minh Anh').first()).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL(/\/account/);

    // Verify Customer Portal renders
    await expect(page.getByText(/Lịch Chụp Của Tôi|CUSTOMER PORTAL/i).first()).toBeVisible();

    // If an awaiting-selection booking exists, "Chọn Ảnh Hậu Kỳ" will be visible
    const selectPhotosBtn = page.getByRole('button', { name: /Chọn Ảnh Hậu Kỳ/i }).first();
    if (await selectPhotosBtn.isVisible()) {
      await selectPhotosBtn.click();

      // Verify CustomerProofGallery modal opens
      await expect(page.getByText('CHỌN ẢNH HẬU KỲ')).toBeVisible();
      await expect(page.getByText(/Đã chọn:/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /XÁC NHẬN DANH SÁCH ẢNH/i })).toBeVisible();

      // Close gallery
      await page.getByRole('button', { name: /Đóng/i }).first().click();
    }

    // If any booking is DELIVERED, verify "XEM ẢNH" is visible
    const deliveredText = page.locator('text=Ảnh đã được giao').first();
    if (await deliveredText.isVisible()) {
      await expect(page.getByRole('link', { name: /XEM ẢNH/i }).first()).toBeVisible();
    }
  });

  test('2. Responsive Mobile Customer Proof Gallery', async ({ page }) => {
    // Set mobile viewport (iPhone 12 / Modern mobile)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Open mobile navigation menu
    await page.getByLabel(/Mở menu điều hướng/i).click();
    await page.getByRole('button', { name: /Đăng nhập \/ Đăng ký/i }).click();
    await page.getByPlaceholder(/Nhập email/i).fill('minhanh.nguyen@gmail.com');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();

    // Customer portal responsive header automatically navigated to /account
    await expect(page).toHaveURL(/\/account/);
    await expect(page.getByText(/Lịch Chụp Của Tôi|CUSTOMER PORTAL/i).first()).toBeVisible({ timeout: 15000 });

    // Verify responsive layout elements render cleanly without horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });
});
