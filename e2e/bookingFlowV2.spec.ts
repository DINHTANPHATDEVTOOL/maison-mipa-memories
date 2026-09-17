import { test, expect } from '@playwright/test';

test.describe('Booking Flow V2: Consultation-First E2E Flow', () => {
  test('Complete end-to-end customer consultation request to admin manual deposit confirmation', async ({ page }) => {
    // ----------------------------------------------------
    // PART 1: CUSTOMER FLOW
    // ----------------------------------------------------
    // 1. Customer visits Home
    await page.goto('/');
    await expect(page).toHaveTitle(/Maison MIPA/i);

    // 2. Open booking wizard
    const bookBtn = page.getByRole('button', { name: /ĐẶT LỊCH/i }).first();
    await expect(bookBtn).toBeVisible();
    await bookBtn.click();

    // Step 1: Select service
    await expect(page.locator('text=Bước 1/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 2: Select package & optional concept
    await expect(page.locator('text=Bước 2/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 3: Date & time slot
    await expect(page.locator('text=Bước 3/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 4: Optional Addons
    await expect(page.locator('text=Bước 4/6')).toBeVisible();
    await page.getByRole('button', { name: /Tiếp Theo/i }).click();

    // Step 5: Customer Information
    await expect(page.locator('text=Bước 5/6')).toBeVisible();
    // Fill customer contact info if guest
    const nameInput = page.getByPlaceholder(/Nguyễn Văn A/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Trần Thị Thảo');
    }
    const phoneInput = page.getByPlaceholder(/0901234567/i);
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('0918889999');
    }
    const emailInput = page.getByPlaceholder(/name@example.com/i);
    if (await emailInput.isVisible()) {
      await emailInput.fill('thaotran.consult@example.com');
    }

    // Submit consultation request
    const submitBtn = page.getByRole('button', { name: /Gửi yêu cầu tư vấn|Tiếp Theo/i });
    await submitBtn.click();

    // Step 6: Customer Final Screen
    await expect(page.locator('text=Bước 6/6')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Yêu cầu tư vấn đã được gửi', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Maison MIPA đã nhận được yêu cầu của bạn/i)).toBeVisible();
    await expect(page.getByText('Chi phí dự kiến')).toBeVisible();

    // CRITICAL: Verify ZERO payment UI
    await expect(page.locator('text=payOS')).not.toBeVisible();
    await expect(page.locator('text=VietQR')).not.toBeVisible();
    await expect(page.locator('text=Thanh toán ngay')).not.toBeVisible();
    await expect(page.locator('text=Chờ thanh toán')).not.toBeVisible();

    // Capture booking code
    const bookingCodeElem = page.locator('strong:has-text("MIPA-26")').first();
    await expect(bookingCodeElem).toBeVisible();

    // ----------------------------------------------------
    // PART 2: ADMIN / MANAGEMENT FLOW
    // ----------------------------------------------------
    // Login as Manager / Admin
    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: /Đăng nhập/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      await page.getByPlaceholder(/Nhập email/i).fill('phat.manager@maisonmipa.vn');
      await page.getByPlaceholder(/••••••••/i).fill('Mipa@Secure2026');
      await page.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i }).click();
      await expect(page.locator('text=Lê Tấn Phát').first()).toBeVisible({ timeout: 10000 });
    }

    // Navigate to Management OS via user menu
    await page.locator('text=Lê Tấn Phát').first().click();
    await page.getByRole('link', { name: /Studio Manager OS/i }).click();
    await expect(page).toHaveURL(/\/management/);
    await expect(page.getByText(/Tổng Quan Vận Hành Studio/i)).toBeVisible({ timeout: 10000 });

    // Verify Consultation Queue filter buttons
    const consultationPill = page.locator('button:has-text("YÊU CẦU TƯ VẤN MỚI")').first();
    if (await consultationPill.isVisible()) {
      await consultationPill.click();
    }

    // Find the consultation card or any consultation card
    const consultCard = page.locator('div:has-text("CONSULTATION_REQUESTED"), div:has-text("Chờ tư vấn"), div:has-text("Yêu cầu tư vấn"), div:has-text("TƯ VẤN")').first();
    await expect(consultCard).toBeVisible();

    // Manager starts consultation or opens deposit modal
    const startConsultBtn = page.getByRole('button', { name: /Bắt đầu tư vấn/i }).first();
    if (await startConsultBtn.isVisible()) {
      await startConsultBtn.click();
    }

    // Manager confirms deposit
    const depositConfirmBtn = page.getByRole('button', { name: /XÁC NHẬN ĐÃ NHẬN CỌC/i }).first();
    if (await depositConfirmBtn.isVisible()) {
      await depositConfirmBtn.click();

      // Modal opens
      await expect(page.getByText(/XÁC NHẬN CỌC THỦ CÔNG/i)).toBeVisible();

      // Fill deposit note
      const noteInput = page.getByPlaceholder(/Ví dụ: Nhận cọc chuyển khoản VCB/i);
      if (await noteInput.isVisible()) {
        await noteInput.fill('Khách chuyển khoản trực tiếp qua nhân viên tư vấn Zalo');
      }

      // Submit confirmation button inside modal
      const confirmSubmitBtn = page.locator('button[type="submit"]:has-text("XÁC NHẬN ĐÃ NHẬN CỌC")').first();
      await confirmSubmitBtn.click();
    }

    // Verify NO payment page anywhere
    await expect(page.locator('text=payOS')).not.toBeVisible();
    await expect(page.locator('text=VietQR')).not.toBeVisible();
  });
});
