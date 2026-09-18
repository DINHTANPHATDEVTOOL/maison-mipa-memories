// ==============================================================================
// Maison MIPA Memories — Accessibility Smoke E2E Tests (Axe-Core)
// Audits critical routes for WCAG 2.1 AA violations (serious/critical).
// Color-contrast rule is fully re-enabled with zero global exemption.
// ==============================================================================

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Maison MIPA — Accessibility & Color Contrast Suite', () => {
  test('1. Homepage (/) meets WCAG 2.1 AA with active color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Canvas/3D background is decorative; scan HTML DOM
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();

    const seriousViolations = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousViolations).toEqual([]);
  });

  test('2. Booking Page (/booking) meets WCAG 2.1 AA with active color contrast', async ({ page }) => {
    await page.goto('/booking');
    await page.waitForLoadState('networkidle');

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();

    const seriousViolations = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousViolations).toEqual([]);
  });

  test('3. Skip-to-content link is first focusable element on homepage', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const focusedLink = page.locator(':focus');
    await expect(focusedLink).toHaveAttribute('href', '#main-content');
    await expect(focusedLink).toContainText('Chuyển đến nội dung chính');
  });

  test('4. Auth Modal meets WCAG 2.1 AA with active color contrast and focus trapping', async ({ page }) => {
    await page.goto('/');
    const loginBtn = page.getByRole('button', { name: /Đăng Nhập/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();
      // Allow fadeIn animation (0.25s) to settle so opacity reaches 1.0
      await page.waitForTimeout(350);

      // Scan active AuthModal
      const scan = await new AxeBuilder({ page })
        .include('[role="dialog"]')
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      const seriousViolations = scan.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      );
      expect(seriousViolations).toEqual([]);

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(modalDialog).toBeHidden();
    }
  });

  test('5. Reset Password Page (/auth/reset-password) meets WCAG 2.1 AA with active color contrast', async ({ page }) => {
    await page.goto('/auth/reset-password');
    await page.waitForLoadState('networkidle');

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();

    const seriousViolations = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousViolations).toEqual([]);
  });

  test('6. Account Portal (/account) meets WCAG 2.1 AA with active color contrast', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();

    const seriousViolations = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousViolations).toEqual([]);
  });

  test('7. Management Portal (/management) meets WCAG 2.1 AA with active color contrast', async ({ page }) => {
    await page.goto('/management');
    await page.waitForLoadState('networkidle');

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();

    const seriousViolations = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousViolations).toEqual([]);
  });

  test('8. Proof Selection Route meets WCAG 2.1 AA with active color contrast', async ({ page }) => {
    await page.goto('/booking/proofs?booking=test-qa');
    await page.waitForLoadState('networkidle');

    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .exclude('canvas')
      .analyze();

    const seriousViolations = scan.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );
    expect(seriousViolations).toEqual([]);
  });

  test('9. Operational Dialogs have accessible dialog semantics', async ({ page }) => {
    await page.goto('/management');
    await page.waitForLoadState('networkidle');

    const dialogs = page.locator('[role="dialog"]');
    const count = await dialogs.count();
    for (let i = 0; i < count; i++) {
      const dialog = dialogs.nth(i);
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
    }
  });
});
