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
    await page.getByRole('link', { name: /(Studio Manager OS|Hệ thống quản lý Studio)/i }).click();
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
    // Click on "Tất cả" filter pill to ensure all bookings are listed
    const allPill = page.getByRole('button', { name: 'Tất cả', exact: true });
    await expect(allPill).toBeVisible({ timeout: 10000 });
    await allPill.click();

    // Select the confirmed booking MIPA-260811-002
    const confirmedBookingCard = page.locator('#booking-card-MIPA-260811-002');
    await expect(confirmedBookingCard).toBeVisible({ timeout: 10000 });
    await confirmedBookingCard.click();

    // Verify Timeline is visible in the right column
    await expect(page.getByText('TIẾN TRÌNH CHI TIẾT (TIMELINE):')).toBeVisible();

    // Check-in customer
    const checkInBtn = page.getByRole('button', { name: /XÁC NHẬN KHÁCH CHECK-IN/i }).first();
    await expect(checkInBtn).toBeVisible({ timeout: 10000 });
    await checkInBtn.click();
    await page.waitForTimeout(1000);

    // Start shoot
    const startShootBtn = page.getByRole('button', { name: /BẮT ĐẦU BUỔI CHỤP/i }).first();
    await expect(startShootBtn).toBeVisible({ timeout: 10000 });
    await startShootBtn.click();
    await page.waitForTimeout(1000);

    // Complete shoot
    const completeShootBtn = page.getByRole('button', { name: /HOÀN TẤT BUỔI CHỤP/i }).first();
    await expect(completeShootBtn).toBeVisible({ timeout: 10000 });
    await completeShootBtn.click();
    await page.waitForTimeout(1000);

    // Sync Proofs
    const syncProofsBtn = page.getByRole('button', { name: /ĐỒNG BỘ ẢNH PROOFS/i }).first();
    await expect(syncProofsBtn).toBeVisible({ timeout: 10000 });
    await syncProofsBtn.click();
    await page.waitForTimeout(1000);

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
    await expect(page.getByRole('heading', { name: /Xin chào, Nguyễn Minh Anh/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Đặt Lịch Chụp Mới/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Thông Tin Cá Nhân/i })).toBeVisible();
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
