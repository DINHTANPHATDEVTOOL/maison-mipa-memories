import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/phatd/.gemini/antigravity-ide/brain/1d2f34af-872e-4bad-9c1f-747d989db7b5/screenshots';
const PUBLIC_DIR = path.resolve(process.cwd(), 'public/screenshots');

// Ensure output directories exist
[ARTIFACT_DIR, PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

test.describe('Capture Screenshot Gate Assets', () => {

  test('1. Desktop Screenshots (1440x900)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_homepage.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'desktop_homepage.png'), fullPage: false });

    // Portfolio
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_portfolio.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'desktop_portfolio.png'), fullPage: false });

    // Collection Detail
    await page.goto('/portfolio/parisian-romance-autumn');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_collection_detail.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'desktop_collection_detail.png'), fullPage: false });

    // Booking Funnel
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'desktop_booking.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'desktop_booking.png'), fullPage: false });
  });

  test('2. Mobile 360 Screenshots (360x800)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });

    // Mobile Homepage
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_homepage.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'mobile_homepage.png'), fullPage: false });

    // Mobile Portfolio
    await page.goto('/portfolio');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_portfolio.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'mobile_portfolio.png'), fullPage: false });

    // Mobile Collection Detail
    await page.goto('/portfolio/parisian-romance-autumn');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.locator('h1').waitFor({ state: 'visible', timeout: 10000 });
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_collection_detail.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'mobile_collection_detail.png'), fullPage: false });

    // Open Lightbox
    const firstPhoto = page.getByRole('button', { name: /Xem ảnh/i }).first();
    await firstPhoto.scrollIntoViewIfNeeded();
    await firstPhoto.click({ force: true });
    const dialog = page.getByRole('dialog', { name: /Chi tiết ảnh/i });
    await dialog.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(600); // allow lightbox fade animation
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_collection_lightbox.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'mobile_collection_lightbox.png'), fullPage: false });
    await page.keyboard.press('Escape');

    // Mobile Booking Funnel
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'mobile_booking.png'), fullPage: false });
    await page.screenshot({ path: path.join(PUBLIC_DIR, 'mobile_booking.png'), fullPage: false });
  });

});
