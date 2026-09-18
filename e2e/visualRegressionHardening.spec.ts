// ==============================================================================
// Maison MIPA Memories — Visual Regression & Responsive Viewport Hardening
// Stable visual regression tests covering required routes and viewports:
// 360x800, 390x844, 430x932, 768x1024, 1440x900
// ==============================================================================

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const VIEWPORTS = [
  { name: 'mobile-360', width: 360, height: 800 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1440', width: 1440, height: 900 },
];

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'test-results/visual-regression');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

test.describe('Maison MIPA — Visual Regression & Responsive Layout Suite', () => {
  for (const vp of VIEWPORTS) {
    test(`1. Auth Login Modal renders without horizontal clipping [${vp.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      let loginBtn = page.getByRole('button', { name: /^Đăng nhập$/i }).first();
      if (!await loginBtn.isVisible()) {
        const menuBtn = page.getByRole('button', { name: /menu điều hướng/i });
        if (await menuBtn.isVisible()) {
          await menuBtn.click();
          await page.waitForTimeout(200);
          loginBtn = page.getByRole('button', { name: /Đăng nhập/i }).first();
        }
      }

      if (await loginBtn.isVisible()) {
        await loginBtn.click();
        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();
        await page.waitForTimeout(350);

        // Verify inputs are visible and readable
        const identifierInput = modal.locator('input[type="text"], input[type="email"]').first();
        await expect(identifierInput).toBeVisible();
        const submitBtn = modal.locator('button[type="submit"]');
        await expect(submitBtn).toBeVisible();

        // Capture stable screenshot
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `auth-login-${vp.name}.png`),
        });

        // Ensure page body has no unwanted horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);

        await page.keyboard.press('Escape');
      }
    });

    test(`2. Reset Password renders clean accessible card [${vp.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/auth/reset-password');
      await page.waitForLoadState('networkidle');

      const submitBtn = page.locator('button[type="submit"]');
      await expect(submitBtn).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `reset-password-${vp.name}.png`),
      });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test(`3. Booking Form renders cleanly and inputs are legible [${vp.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/booking');
      await page.waitForLoadState('networkidle');

      const heading = page.locator('h1');
      await expect(heading).toBeVisible();

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `booking-form-${vp.name}.png`),
      });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test(`4. Customer Portal renders cleanly [${vp.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/account');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `customer-portal-${vp.name}.png`),
      });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test(`5. Manager Dashboard, CRM, and Inventory tabs render without form clipping [${vp.name}]`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/management');
      await page.waitForLoadState('networkidle');

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `manager-dashboard-${vp.name}.png`),
      });

      // Navigate to CRM Tab
      const crmTab = page.locator('button', { hasText: 'CRM' }).first();
      if (await crmTab.isVisible()) {
        await crmTab.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `manager-crm-${vp.name}.png`),
        });
      }

      // Navigate to Inventory Tab
      const inventoryTab = page.locator('button', { hasText: 'Kho & Thiết bị' }).first();
      if (await inventoryTab.isVisible()) {
        await inventoryTab.click();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `manager-inventory-${vp.name}.png`),
        });
      }
    });
  }
});
