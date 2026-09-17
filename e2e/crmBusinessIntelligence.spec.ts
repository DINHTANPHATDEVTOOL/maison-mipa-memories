import { test, expect } from '@playwright/test';

test.describe('Maison MIPA — CRM & Business Intelligence V1 E2E Suite', () => {

  test('1. Full Manager CRM, Customer 360, Follow-up, Financial Ledger & BI Analytics Flow', async ({ page }) => {
    // =========================================================================
    // STEP 1: Manager login
    // =========================================================================
    await page.goto('/');
    await page.getByRole('button', { name: /Đăng nhập/i }).click();
    await page.getByPlaceholder(/Nhập email/i).fill('phat.manager@maisonmipa.vn');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();

    // Verify Manager logged in
    await expect(page.locator('text=Lê Tấn Phát').first()).toBeVisible({ timeout: 10000 });

    // Navigate to Management OS
    await page.locator('text=Lê Tấn Phát').first().click();
    await page.getByRole('link', { name: /Studio Manager OS/i }).click();
    await expect(page).toHaveURL(/\/management/);

    // =========================================================================
    // STEP 2: Scenario A & B — Open CRM customer list and search
    // =========================================================================
    const crmTabBtn = page.getByRole('button', { name: /CRM khách hàng/i });
    await expect(crmTabBtn).toBeVisible();
    await crmTabBtn.click();

    await expect(page.getByText('Khách Hàng & Customer 360')).toBeVisible();

    // Search for existing customer
    const searchInput = page.getByPlaceholder(/Tìm theo tên, SĐT, email/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('Minh Anh');
    await page.waitForTimeout(500);

    // =========================================================================
    // STEP 3: Scenario C — Open Customer 360
    // =========================================================================
    // Click on customer row or "Chi Tiết 360°"
    const detailBtn = page.getByRole('button', { name: /Chi Tiết 360°/i }).first();
    await expect(detailBtn).toBeVisible();
    await detailBtn.click();

    // Verify Customer 360 drawer opens
    await expect(page.getByText('CUSTOMER 360 PROFILE')).toBeVisible();
    await expect(page.getByText('Giá Trị Booking')).toBeVisible();
    await expect(page.getByText('Thực Thu (Cash In)')).toBeVisible();

    // =========================================================================
    // STEP 4: Scenario D — Add Consultation Interaction
    // =========================================================================
    const addInteractionBtn = page.getByRole('button', { name: /Ghi nhận tương tác/i });
    await expect(addInteractionBtn).toBeVisible();
    await addInteractionBtn.click();

    await expect(page.getByText('Ghi Nhận Tương Tác CRM')).toBeVisible();
    await page.getByPlaceholder(/Chi tiết trao đổi với khách/i).fill('Khách muốn concept Parisian Chic vào chiều thứ 7');
    await page.getByRole('button', { name: /Lưu Tương Tác/i }).click();

    // =========================================================================
    // STEP 5: Scenario E & F — Create Follow-up task & Mark Done
    // =========================================================================
    const addFollowUpBtn = page.getByRole('button', { name: /Giao follow-up/i });
    await expect(addFollowUpBtn).toBeVisible();
    await addFollowUpBtn.click();

    await expect(page.getByText('Tạo Nhiệm Vụ Follow-up')).toBeVisible();
    await page.getByPlaceholder(/VD: Gọi điện nhắc khách chọn ảnh/i).fill('Gửi bảng màu makeup concept Parisian');
    await page.getByRole('button', { name: /Tạo Nhiệm Vụ/i }).click();

    // Switch to Follow-up tab inside Customer 360
    const followUpTab = page.locator('button', { hasText: /Follow-up \(/i }).first();
    await expect(followUpTab).toBeVisible();
    await followUpTab.click();
    await expect(page.getByText('Gửi bảng màu makeup concept Parisian')).toBeVisible();

    // Close Customer 360 drawer
    await page.getByLabel('Đóng bảng chi tiết khách hàng').click();

    // =========================================================================
    // STEP 6: Scenario G & H — Financial Ledger Dashboard & Record Balance
    // =========================================================================
    const financeTabBtn = page.getByRole('button', { name: /Tài chính/i });
    await expect(financeTabBtn).toBeVisible();
    await financeTabBtn.click();

    await expect(page.getByText('Quản Lý Thu Tiền & Sổ Quỹ Studio')).toBeVisible();
    await expect(page.getByText('Giá Trị Booking Đã Chốt')).toBeVisible();
    await expect(page.getByText('Thực Thu Thực Tế (Net Cash)')).toBeVisible();

    // Click "Xác Nhận Đã Thu Tiền"
    const collectBtn = page.getByRole('button', { name: /Xác Nhận Đã Thu Tiền/i });
    await expect(collectBtn).toBeVisible();
    await collectBtn.click();

    await expect(page.getByText('Xác Nhận Đã Thu Phần Còn Lại')).toBeVisible();
    await page.getByRole('button', { name: /Xác Nhận Thu Tiền/i }).click();
    await page.waitForTimeout(500);

    // =========================================================================
    // STEP 7: Scenario I, J, K, L, M — BI Analytics & Funnel & Retention
    // =========================================================================
    const analyticsTabBtn = page.getByRole('button', { name: /Phân tích & BI/i });
    await expect(analyticsTabBtn).toBeVisible();
    await analyticsTabBtn.click();

    await expect(page.getByText('Báo Cáo Hoạt Động & Phân Tích Kinh Doanh')).toBeVisible();
    await expect(page.getByText('🌐 Giờ Việt Nam (Asia/Ho_Chi_Minh)')).toBeVisible();

    // Filter "Tháng Này"
    const thisMonthBtn = page.getByRole('button', { name: /Tháng Này/i });
    await expect(thisMonthBtn).toBeVisible();
    await thisMonthBtn.click();

    // Funnel analytics
    await expect(page.getByText('Phễu Chuyển Đổi (Cohort Funnel Analytics)')).toBeVisible();
    await expect(page.getByText('Yêu cầu tư vấn', { exact: true })).toBeVisible();

    // Service performance loads
    await expect(page.getByText('Hiệu Suất Theo Gói Dịch Vụ')).toBeVisible();

    // Concept performance loads
    await expect(page.getByText('Concept Được Chọn Nhiều Nhất')).toBeVisible();

    // Returning customers retention metric loads
    await expect(page.getByText('Khách Quay Lại (Retention)')).toBeVisible();

    // Studio Room Utilization
    await expect(page.getByText('Hiệu Suất & Công Suất Phòng Studio (Room Utilization)')).toBeVisible();
  });

  test('2. Scenario N — Customer role is denied management CRM access', async ({ page }) => {
    // Log in as Customer
    await page.goto('/');
    await page.getByRole('button', { name: /Đăng nhập/i }).click();
    await page.getByPlaceholder(/Nhập email/i).fill('minhanh.nguyen@gmail.com');
    await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
    await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();

    await expect(page.locator('text=Nguyễn Minh Anh').first()).toBeVisible({ timeout: 10000 });

    // Directly attempt accessing /management
    await page.goto('/management');

    // Customer role is blocked by RoleGuard and sees AccessDeniedPage (403)
    await expect(page.getByText('403')).toBeVisible();
    await expect(page.getByText('Quyền Truy Cập Bị Từ Chối')).toBeVisible();
    await expect(page.getByText('Khách Hàng & Customer 360')).not.toBeVisible();
  });
});
