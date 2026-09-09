import { test, expect } from '@playwright/test';

test.describe('Maison MIPA Memories Smoke Tests', () => {

  test('1. Homepage load thành công', async ({ page }) => {
    await page.goto('/');

    // Check title contains brand name
    await expect(page).toHaveTitle(/Maison MIPA/i);

    // Verify Brand Logo in Navbar
    await expect(page.locator('text=MAISON MIPA').first()).toBeVisible();

    // Verify main navigation links
    await expect(page.getByRole('button', { name: 'Trang chủ', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dịch vụ', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bảng giá', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Portfolio', exact: true })).toBeVisible();

    // Verify Call-to-action buttons
    await expect(page.getByRole('button', { name: /ĐẶT LỊCH/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Đăng Nhập', exact: true })).toBeVisible();
  });

  test('2. Auth modal mở được và chuyển đổi tab đăng nhập / đăng ký', async ({ page }) => {
    await page.goto('/');

    // Click Login button to open Auth Modal
    await page.getByRole('button', { name: 'Đăng Nhập', exact: true }).click();

    // Verify Auth Modal is displayed
    const authHeader = page.locator('text=MAISON MIPA MEMORIES AUTH');
    await expect(authHeader).toBeVisible();
    await expect(page.locator('text=Welcome Back ♡ Đăng Nhập')).toBeVisible();

    // Switch to Register tab
    await page.getByRole('button', { name: /ĐĂNG KÝ NHANH/i }).click();
    await expect(page.getByPlaceholder('Nguyễn Văn A')).toBeVisible();

    // Switch back to Login tab inside modal
    await page.locator('div[style*="z-index: 3000"]').getByRole('button', { name: 'ĐĂNG NHẬP', exact: true }).click();
    await expect(page.getByPlaceholder(/Nhập email/i)).toBeVisible();
  });

  test('3. Booking Wizard happy path bằng fixture/mock phù hợp', async ({ page }) => {
    await page.goto('/');

    // 1. Log in as customer
    await page.getByRole('button', { name: 'Đăng Nhập', exact: true }).click();
    await page.getByPlaceholder(/Nhập email/i).fill('minhanh.nguyen@gmail.com');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();

    // Assert logged in
    await expect(page.locator('text=Nguyễn Minh Anh').first()).toBeVisible();

    // 2. Open Booking Wizard
    await page.getByRole('button', { name: /ĐẶT LỊCH/i }).first().click();

    // Step 1: Services
    await expect(page.locator('text=Bước 1/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 2: Packages
    await expect(page.locator('text=Bước 2/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 3: Date and Time
    await expect(page.locator('text=Bước 3/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 4: Add-ons
    await expect(page.locator('text=Bước 4/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 5: Customer Details
    await expect(page.locator('text=Bước 5/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 6: Review & Payment
    await expect(page.locator('text=Bước 6/6')).toBeVisible();
    await page.getByRole('button', { name: /XÁC NHẬN ĐÃ CHUYỂN CỌC/i }).click();

    // Step 7: Confirmation receipt
    await expect(page.locator('text=Booking Của Bạn Đã Xác Nhận!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=MÃ BOOKING NỘI BỘ')).toBeVisible();
    await expect(page.locator('text=MIPA-26').first()).toBeVisible();
  });

  test('4. Protected area không cho guest/customer trái quyền truy cập', async ({ page }) => {
    // 1. As GUEST, navigating to /staff or /management triggers guard
    await page.goto('/staff');
    await expect(page.getByText('403 FORBIDDEN')).toBeVisible();

    // 2. Login as CUSTOMER
    await page.goto('/');
    await page.getByRole('button', { name: 'Đăng Nhập', exact: true }).click();
    await page.getByPlaceholder(/Nhập email/i).fill('minhanh.nguyen@gmail.com');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();

    // As Customer, user has access to "Lịch của tôi", but NOT to Staff Portal or Management
    await expect(page.locator('text=Nguyễn Minh Anh').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lịch của tôi', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Quản Lý Studio OS/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Ca chụp & Lịch/i })).not.toBeVisible();
  });

  test('5. Deep link trực tiếp vào /portfolio và refresh không bị 404', async ({ page }) => {
    await page.goto('/portfolio');
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.getByRole('heading', { name: /Bộ Sưu Tập Kỷ Niệm Thơ Mộng/i })).toBeVisible();

    // Refresh page
    await page.reload();
    await expect(page).toHaveURL(/\/portfolio/);
    await expect(page.getByRole('heading', { name: /Bộ Sưu Tập Kỷ Niệm Thơ Mộng/i })).toBeVisible();
  });

  test('6. Deep link trực tiếp vào /dich-vu/couple và refresh không bị 404', async ({ page }) => {
    await page.goto('/dich-vu/couple');
    await expect(page).toHaveURL(/\/dich-vu\/couple/);
    await expect(page.getByRole('heading', { name: /Chụp Ảnh Couple & Kỷ Niệm Tình Yêu/i })).toBeVisible();

    // Refresh page
    await page.reload();
    await expect(page).toHaveURL(/\/dich-vu\/couple/);
    await expect(page.getByRole('heading', { name: /Chụp Ảnh Couple & Kỷ Niệm Tình Yêu/i })).toBeVisible();
  });

  test('7. Điều hướng Back & Forward trên trình duyệt đúng UI', async ({ page }) => {
    // 1. Start at Home
    await page.goto('/');
    await expect(page.locator('text=MAISON MIPA').first()).toBeVisible();

    // 2. Click Dịch vụ in Navbar
    await page.getByRole('button', { name: 'Dịch vụ', exact: true }).click();
    await expect(page).toHaveURL(/\/dich-vu/);
    await expect(page.getByRole('heading', { name: /Dịch Vụ Chụp Ảnh Nghệ Thuật/i })).toBeVisible();

    // 3. Click Couple detail
    await page.locator('a[href="/dich-vu/couple"]').first().click();
    await expect(page).toHaveURL(/\/dich-vu\/couple/);
    await expect(page.getByRole('heading', { name: /Chụp Ảnh Couple & Kỷ Niệm Tình Yêu/i })).toBeVisible();

    // 4. Browser Back -> should return to /dich-vu
    await page.goBack();
    await expect(page).toHaveURL(/\/dich-vu/);
    await expect(page.getByRole('heading', { name: /Dịch Vụ Chụp Ảnh Nghệ Thuật/i })).toBeVisible();

    // 5. Browser Forward -> should return to /dich-vu/couple
    await page.goForward();
    await expect(page).toHaveURL(/\/dich-vu\/couple/);
    await expect(page.getByRole('heading', { name: /Chụp Ảnh Couple & Kỷ Niệm Tình Yêu/i })).toBeVisible();
  });

});

