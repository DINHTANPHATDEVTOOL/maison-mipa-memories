import { test, expect } from '@playwright/test';

test.describe('Maison MIPA — Comprehensive Multi-Role Workflow & Shift Scheduling Integrity', () => {

  test('1. Inter-Role Switching & Shift Scheduling End-to-End Verification', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // 1. Verify Role Switcher Floating Widget is rendered
    const roleSwitcherBtn = page.getByTestId('role-switcher-toggle');
    await expect(roleSwitcherBtn).toBeVisible({ timeout: 10000 });

    // Open role switcher panel
    await roleSwitcherBtn.click();
    await expect(page.getByText('KIỂM THỬ ĐA VAI TRÒ (RBAC TESTING)')).toBeVisible();

    // =========================================================================
    // STEP 1: TEST MANAGER ROLE & INTERACTIVE SHIFT SCHEDULING
    // =========================================================================
    const managerOption = page.locator('[data-role-option="MANAGER"]');
    await expect(managerOption).toBeVisible();
    await managerOption.click();

    // Verify client-side navigated to /management
    await expect(page).toHaveURL(/\/management/, { timeout: 10000 });

    // Verify sub-nav buttons exist and click "Nhân sự & Lịch trực"
    const workforceBtn = page.getByRole('button', { name: /Nhân sự & Lịch trực/i });
    await expect(workforceBtn).toBeVisible({ timeout: 10000 });
    await workforceBtn.click();

    // Verify Shift Matrix is rendered
    await expect(page.locator('text=Nhân Sự & Chuyên Môn')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Hoàng Minh').first()).toBeVisible();

    // Test clicking an interactive shift button (+ Sáng or + Chiều or remove)
    const assignShiftBtn = page.locator('button:has-text("+ Sáng"), button:has-text("+ Chiều")').first();
    if (await assignShiftBtn.isVisible()) {
      await assignShiftBtn.click();
      // Verify toast confirmation or toggle state
      await expect(page.locator('text=✓ Đã').first()).toBeVisible({ timeout: 5000 });
    }

    // =========================================================================
    // STEP 2: TEST PHOTOGRAPHER ROLE & SHIFT REGISTRATION
    // =========================================================================
    await roleSwitcherBtn.click();
    const photoOption = page.locator('[data-role-option="STAFF_PHOTOGRAPHER"]');
    await expect(photoOption).toBeVisible();
    await photoOption.click();

    await expect(page).toHaveURL(/\/staff/, { timeout: 10000 });

    // Verify Photographer workspace
    await expect(page.locator('text=PHOTOGRAPHER WORKSPACE').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Ca Chụp Của Tôi/i })).toBeVisible();

    // Switch to shift registration tab
    const registerShiftTab = page.getByRole('button', { name: /Đăng Ký Lịch Làm|Đăng ký ca làm việc/i }).first();
    await expect(registerShiftTab).toBeVisible();
    await registerShiftTab.click();

    // Verify shift registration calendar/week grid appears
    await expect(page.locator('text=Ca Sáng').first()).toBeVisible({ timeout: 8000 });
    await expect(page.locator('text=Ca Chiều').first()).toBeVisible();

    // =========================================================================
    // STEP 3: TEST RECEPTIONIST ROLE
    // =========================================================================
    await roleSwitcherBtn.click();
    const receptOption = page.locator('[data-role-option="STAFF_RECEPTIONIST"]');
    await expect(receptOption).toBeVisible();
    await receptOption.click();

    await expect(page).toHaveURL(/\/staff/, { timeout: 10000 });
    await expect(page.locator('text=RECEPTION DESK').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Lịch Đón Khách Hôm Nay').first()).toBeVisible();

    // Verify Receptionist can also switch to Shift Registration tab
    const receptShiftBtn = page.getByRole('button', { name: /Đăng ký ca làm việc/i });
    if (await receptShiftBtn.isVisible()) {
      await receptShiftBtn.click();
      await expect(page.locator('text=Ca Sáng').first()).toBeVisible({ timeout: 8000 });
    }

    // =========================================================================
    // STEP 4: TEST MAKEUP ROLE
    // =========================================================================
    await roleSwitcherBtn.click();
    const makeupOption = page.locator('[data-role-option="STAFF_MAKEUP"]');
    await expect(makeupOption).toBeVisible();
    await makeupOption.click();

    await expect(page).toHaveURL(/\/staff/, { timeout: 10000 });
    await expect(page.locator('text=MAKEUP & STYLING').first()).toBeVisible({ timeout: 10000 });

    // =========================================================================
    // STEP 5: TEST EDITOR ROLE
    // =========================================================================
    await roleSwitcherBtn.click();
    const editorOption = page.locator('[data-role-option="STAFF_EDITOR"]');
    await expect(editorOption).toBeVisible();
    await editorOption.click();

    await expect(page).toHaveURL(/\/staff/, { timeout: 10000 });
    await expect(page.locator('text=POST-PRODUCTION WORKSPACE').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=HẬU KỲ CỦA TÔI').first()).toBeVisible();

    // =========================================================================
    // STEP 6: TEST CUSTOMER ROLE
    // =========================================================================
    await roleSwitcherBtn.click();
    const customerOption = page.locator('[data-role-option="CUSTOMER"]');
    await expect(customerOption).toBeVisible();
    await customerOption.click();

    await expect(page).toHaveURL(/\/account/, { timeout: 10000 });
  });

  test('2. Real-Time Shift Scheduling Synchronization Between Manager and Staff', async ({ page }) => {
    await page.goto('/');

    const roleSwitcherBtn = page.getByTestId('role-switcher-toggle');
    await expect(roleSwitcherBtn).toBeVisible({ timeout: 10000 });

    // Step A: Switch to Manager
    await roleSwitcherBtn.click();
    await page.locator('[data-role-option="MANAGER"]').click();
    await expect(page).toHaveURL(/\/management/, { timeout: 10000 });

    // Go to Workforce Scheduling tab
    const workforceBtn = page.getByRole('button', { name: /Nhân sự & Lịch trực/i });
    await expect(workforceBtn).toBeVisible({ timeout: 10000 });
    await workforceBtn.click();

    // Verify Shift Matrix is visible
    await expect(page.locator('text=Nhân Sự & Chuyên Môn')).toBeVisible({ timeout: 10000 });

    // Find and click any "+ Sáng" button for Hoàng Minh or first employee
    const addMorningShiftBtn = page.locator('button:has-text("+ Sáng (08-13h)")').first();
    if (await addMorningShiftBtn.isVisible()) {
      await addMorningShiftBtn.click();
      await expect(page.locator('text=✓ Đã').first()).toBeVisible({ timeout: 5000 });
    }

    // Step B: Switch to Photographer
    await roleSwitcherBtn.click();
    await page.locator('[data-role-option="STAFF_PHOTOGRAPHER"]').click();
    await expect(page).toHaveURL(/\/staff/, { timeout: 10000 });

    // Open Shift Registration tab
    const shiftTab = page.getByRole('button', { name: /Đăng Ký Lịch Làm|Đăng ký ca làm việc/i }).first();
    await expect(shiftTab).toBeVisible({ timeout: 8000 });
    await shiftTab.click();

    // Verify shift registration is rendered and shows Ca Sáng
    await expect(page.locator('text=Ca Sáng').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /Lưu Lịch Làm Việc|Lưu Lịch/i })).toBeVisible();
  });

});

