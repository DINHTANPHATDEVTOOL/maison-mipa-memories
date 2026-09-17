import { test, expect } from '@playwright/test';

test.describe('Maison MIPA — Studio Operations V2 E2E Suite', () => {

  test('1. Full Manager Studio Operations: Today Board, Tomorrow Prep, Workforce & Inventory Flow', async ({ page }) => {
    // =========================================================================
    // STEP 1: Manager login & navigate to Management OS
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
    // STEP 2: Open "Hôm nay" Daily Operations Board
    // =========================================================================
    const todayTabBtn = page.getByRole('button', { name: /Hôm nay/i });
    await expect(todayTabBtn).toBeVisible();
    await todayTabBtn.click();

    await expect(page.getByText('Hôm Nay — Bảng Vận Hành Trực Tiếp')).toBeVisible();
    await expect(page.getByText('Tiến Độ Chụp Hôm Nay')).toBeVisible();
    await expect(page.getByText('Cảnh Báo Thiếu Nhân Sự')).toBeVisible();

    // =========================================================================
    // STEP 3: Open "Chuẩn bị ngày mai" Tomorrow Prep Board
    // =========================================================================
    const tomorrowTabBtn = page.getByRole('button', { name: /Chuẩn bị ngày mai/i });
    await expect(tomorrowTabBtn).toBeVisible();
    await tomorrowTabBtn.click();

    await expect(page.getByText('Chuẩn Bị Ngày Mai — Checklist Sẵn Sàng Vận Hành')).toBeVisible();
    await expect(page.getByText('Phòng Studio').first()).toBeVisible();
    await expect(page.getByText('Nhiếp ảnh gia').first()).toBeVisible();
    await expect(page.getByText('Máy & Ống kính').first()).toBeVisible();

    // =========================================================================
    // STEP 4: Open "Lịch vận hành" Operations Calendar
    // =========================================================================
    const opsCalendarBtn = page.getByRole('button', { name: /Lịch vận hành/i });
    await expect(opsCalendarBtn).toBeVisible();
    await opsCalendarBtn.click();

    await expect(page.getByText('Operations Calendar — Lịch Vận Hành Studio')).toBeVisible();
    await expect(page.getByText('Lịch Chụp Studio (Bookings)')).toBeVisible();
    await expect(page.getByText('Nhân sự Nghỉ Phép (Leaves)')).toBeVisible();

    // =========================================================================
    // STEP 5: Open "Nhân sự & Lịch trực" Workforce Scheduling
    // =========================================================================
    const workforceBtn = page.getByRole('button', { name: /Nhân sự & Lịch trực/i });
    await expect(workforceBtn).toBeVisible();
    await workforceBtn.click();

    await expect(page.getByText('Workforce Scheduling — Lịch Trực & Phép Năm')).toBeVisible();
    await expect(page.getByText('Danh sách Nhân sự')).toBeVisible();

    // Switch to Leave Management subtab
    const leaveSubTabBtn = page.getByRole('button', { name: /Quản lý Nghỉ phép/i });
    await expect(leaveSubTabBtn).toBeVisible();
    await leaveSubTabBtn.click();
    await expect(page.getByText('Danh Sách Yêu Cầu Nghỉ Phép')).toBeVisible();

    // Open create leave modal
    const createLeaveBtn = page.getByRole('button', { name: /Tạo đơn nghỉ phép/i });
    await expect(createLeaveBtn).toBeVisible();
    await createLeaveBtn.click();

    await expect(page.getByText('Tạo Đơn Xin Nghỉ Phép')).toBeVisible();
    await page.getByPlaceholder(/Ghi rõ lý do/i).fill('Nghỉ phép gia đình');
    await page.getByRole('button', { name: /Gửi yêu cầu/i }).click();

    // =========================================================================
    // STEP 6: Open "Thiết bị & Kho" Resource Inventory
    // =========================================================================
    const resourcesBtn = page.getByRole('button', { name: /Thiết bị & Kho/i });
    await expect(resourcesBtn).toBeVisible();
    await resourcesBtn.click();

    await expect(page.getByText('Resource Inventory — Kho Tài Nguyên & Thiết Bị')).toBeVisible();
    await expect(page.getByText('CAM-001')).toBeVisible();

    // Perform checkout handoff
    const checkoutBtn = page.getByRole('button', { name: /Xuất/i }).first();
    await expect(checkoutBtn).toBeVisible();
    await checkoutBtn.click();

    await expect(page.getByText('Bàn Giao Xuất Kho Thiết Bị')).toBeVisible();
    await page.getByRole('button', { name: /Xác nhận xuất kho/i }).click();

    // Verify inventory updated
    await expect(page.getByText(/Đã xuất kho thiết bị/i)).toBeVisible();
  });
});
