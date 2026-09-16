import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const REVIEW_DIR = path.resolve(process.cwd(), 'test-results/visual-commerce-review');

test.beforeAll(() => {
  if (!fs.existsSync(REVIEW_DIR)) {
    fs.mkdirSync(REVIEW_DIR, { recursive: true });
  }
});

test.describe('Visual Commerce Review Screenshot Suite', () => {
  test.setTimeout(180000);

  test('Capture Desktop (1440x900) Visual Review Stills', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // 1. Desktop: Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hero = page.locator('.mipa-visual-commerce-hero');
    await expect(hero).toBeVisible();

    const heroHeading = hero.locator('h1');
    await expect(heroHeading).toBeVisible();

    // Deterministic wait for hero animation completion (marker or computed opacity >= 0.95)
    await page.waitForFunction(() => {
      const el = document.querySelector('.mipa-visual-commerce-hero');
      const h1 = el?.querySelector('h1');
      if (!el || !h1) return false;
      const opacity = parseFloat(window.getComputedStyle(h1).opacity);
      return el.getAttribute('data-hero-ready') === 'true' || opacity >= 0.95;
    }, { timeout: 10000 });

    // Verify copy & CTAs are clearly visible before capturing
    await expect(heroHeading).toContainText('Những câu chuyện được giữ lại bằng ánh sáng');
    await expect(hero.locator('p').first()).toBeVisible();
    await expect(hero.locator('a:has-text("Khám phá concept")').first()).toBeVisible();
    await expect(hero.locator('button:has-text("Đặt lịch chụp")').first()).toBeVisible();

    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_homepage_hero.png'),
    });

    // 2. Desktop: Concepts section
    const conceptsSection = page.locator('#concepts');
    await expect(conceptsSection).toBeVisible();
    await conceptsSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_concepts.png'),
    });

    // 3. Desktop: Services section
    const servicesSection = page.locator('#services');
    await expect(servicesSection).toBeVisible();
    await servicesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_services.png'),
    });

    // 4. Desktop: Stories section
    const storiesSection = page.locator('#portfolio');
    await expect(storiesSection).toBeVisible();
    await storiesSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_stories.png'),
    });

    // 5. Desktop: Pricing section
    const pricingSection = page.locator('#bang-gia');
    await expect(pricingSection).toBeVisible();
    await pricingSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_pricing.png'),
    });

    // 6. Desktop: Collection detail
    await page.goto('/portfolio/parisian-romance');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_collection_detail.png'),
    });

    // 7. Desktop: Booking (PAGE presentation mode)
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.booking-wizard-page-wrapper')).toBeVisible();
    await expect(page.locator('.modal-overlay')).toHaveCount(0);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'desktop_booking.png'),
    });
  });

  test('Capture Mobile (390x844) Visual Review Stills', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    // 1. Mobile: Homepage hero
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const hero = page.locator('.mipa-visual-commerce-hero');
    await expect(hero).toBeVisible();

    const heroHeading = hero.locator('h1');
    await expect(heroHeading).toBeVisible();

    await page.waitForFunction(() => {
      const el = document.querySelector('.mipa-visual-commerce-hero');
      const h1 = el?.querySelector('h1');
      if (!el || !h1) return false;
      const opacity = parseFloat(window.getComputedStyle(h1).opacity);
      return el.getAttribute('data-hero-ready') === 'true' || opacity >= 0.95;
    }, { timeout: 10000 });

    await expect(heroHeading).toContainText('Những câu chuyện được giữ lại bằng ánh sáng');
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'mobile_homepage_hero.png'),
    });

    // 2. Mobile: Concept section
    const mobileConcepts = page.locator('#concepts');
    await expect(mobileConcepts).toBeVisible();
    await mobileConcepts.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'mobile_concept_section.png'),
    });

    // 3. Mobile: Navigation drawer/menu
    const mobileMenuBtn = page.locator('button[aria-label="Mở menu điều hướng"]');
    await expect(mobileMenuBtn).toBeVisible();
    await mobileMenuBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'mobile_nav.png'),
    });

    // Close menu before proceeding
    const closeBtn = page.locator('button[aria-label="Đóng menu"]');
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(200);
    }

    // 4. Mobile: Pricing
    await page.goto('/bang-gia');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'mobile_pricing.png'),
    });

    // 5. Mobile: Booking (PAGE presentation mode & verify public sticky bar is hidden)
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.booking-wizard-page-wrapper')).toBeVisible();
    // Verify no modal overlay and no dark backdrop
    await expect(page.locator('.modal-overlay')).toHaveCount(0);
    // Verify public sticky floating bar is NOT on /booking
    await expect(page.locator('a[aria-label="Tư vấn Maison MIPA"]')).toHaveCount(0);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(REVIEW_DIR, 'mobile_booking.png'),
    });

    // Verify 390x844 has no horizontal overflow
    const hasHorizontalScroll390 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll390).toBe(false);
  });

  test('Verify Mobile 320x800 Responsiveness on Booking', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto('/booking');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.booking-wizard-page-wrapper')).toBeVisible();

    const hasHorizontalScroll320 = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalScroll320).toBe(false);
  });
});
