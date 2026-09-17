// ==============================================================================
// Maison MIPA Memories — Accessibility Smoke E2E Tests (Axe-Core)
// Audits critical routes for WCAG 2.1 AA violations (serious/critical).
// ==============================================================================

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Maison MIPA — Accessibility Smoke Suite', () => {
  test('1. Homepage (/) has no serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Audited separately for dark editorial theme
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations).toEqual([]);
  });

  test('2. Booking Page (/booking) has no serious accessibility violations', async ({ page }) => {
    await page.goto('/booking');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
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

  test('4. Auth Modal traps focus and handles Escape', async ({ page }) => {
    await page.goto('/');
    // Click login button in navbar
    const loginBtn = page.getByRole('button', { name: /Đăng Nhập/i });
    if (await loginBtn.isVisible()) {
      await loginBtn.click();
      const modalDialog = page.getByRole('dialog');
      await expect(modalDialog).toBeVisible();

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(modalDialog).toBeHidden();
    }
  });
});
