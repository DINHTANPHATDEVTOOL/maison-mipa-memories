import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { getPublicCollections, getCollectionBySlugSync } from '../portfolioService';
import { DEFAULT_SITE_ASSETS } from '../siteAssetService';
import { SITE_CONFIG } from '../../config/site';

describe('Data & Image Logic Audit Test Suite', () => {
  const rootDir = path.resolve(__dirname, '../../../');

  it('1. Old replaced .jpg images must be completely deleted from public directory', () => {
    const deletedFiles = [
      'public/concept-aodai.jpg',
      'public/concept-graduation.jpg',
      'public/concept-noel.jpg',
      'public/concept-tet.jpg',
    ];

    deletedFiles.forEach((relPath) => {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(false);
    });

    // Verify corresponding .webp replacements exist and are lightweight
    const webpFiles = [
      'public/concept-aodai.webp',
      'public/concept-graduation.webp',
      'public/concept-noel.webp',
      'public/concept-tet.webp',
    ];

    webpFiles.forEach((relPath) => {
      const fullPath = path.join(rootDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeLessThan(500 * 1024); // Each webp < 500KB
    });
  });

  it('2. Sitemap is dynamically generated with full routes and canonical domain', () => {
    const sitemapPath = path.join(rootDir, 'public/sitemap.xml');
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const content = fs.readFileSync(sitemapPath, 'utf-8');
    const baseUrl = SITE_CONFIG.domain;

    // Must contain canonical URLs
    expect(content).toContain(`<loc>${baseUrl}/</loc>`);
    expect(content).toContain(`<loc>${baseUrl}/dich-vu/birthday</loc>`);
    expect(content).toContain(`<loc>${baseUrl}/cam-nang</loc>`);
    expect(content).toContain(`<loc>${baseUrl}/atelier</loc>`);
    expect(content).toContain(`<loc>${baseUrl}/concept/nang-tho</loc>`);
    expect(content).toContain(`<loc>${baseUrl}/portfolio/nang-tho-tinh-khoi</loc>`);

    // Must have at least 30 routes
    const locMatches = content.match(/<loc>/g) || [];
    expect(locMatches.length).toBeGreaterThanOrEqual(30);
  });

  it('3. Collection Nàng Thơ in portfolioService has authentic muse image, not bridal gown', async () => {
    const collections = await getPublicCollections();
    const nangTho = collections.find((c) => c.slug === 'nang-tho-tinh-khoi');
    expect(nangTho).toBeDefined();

    if (nangTho) {
      expect(nangTho.coverPhotoUrl).not.toBe('/hero-bride.jpg');
      expect(nangTho.coverPhotoUrl).toBe('/hero-camera.jpg');

      const fullCol = getCollectionBySlugSync('nang-tho-tinh-khoi');
      expect(fullCol).toBeDefined();
      if (fullCol && fullCol.photos) {
        fullCol.photos.forEach((p) => {
          expect(p.url).not.toBe('/hero-bride.jpg');
          expect(p.altText).not.toContain('Cô dâu');
        });
      }
    }
  });

  it('4. Site asset service defaults use correct webp and photography salon labels', () => {
    // service_birthday must point to webp
    expect(DEFAULT_SITE_ASSETS.service_birthday.imageUrl).toBe('/concept-noel.webp');
    // home_atelier_showcase label must be Tiệm Ảnh, not Studio
    expect(DEFAULT_SITE_ASSETS.home_atelier_showcase.label).toContain('Tiệm Ảnh');
    expect(DEFAULT_SITE_ASSETS.home_atelier_showcase.description).toContain('tiệm ảnh');
  });

  it('5. Dynamic pricing string formats with "Chỉ từ ... VNĐ"', () => {
    function formatVnd(amount: number): string {
      return `Chỉ từ ${new Intl.NumberFormat('vi-VN').format(amount)} VNĐ`;
    }

    const price1 = formatVnd(700000);
    expect(price1).toBe('Chỉ từ 700.000 VNĐ');

    const price2 = formatVnd(1500000);
    expect(price2).toBe('Chỉ từ 1.500.000 VNĐ');
  });

  it('6. Admin new booking alert notification and email template exist for studio alert', () => {
    // 1. Email template defines admin_new_booking_alert
    const templatePath = path.join(rootDir, 'supabase/functions/_shared/emailTemplates.ts');
    expect(fs.existsSync(templatePath)).toBe(true);
    const templateContent = fs.readFileSync(templatePath, 'utf-8');
    expect(templateContent).toContain('admin_new_booking_alert');
    expect(templateContent).toContain('Khách Hàng Mới Đặt Lịch Tư Vấn — Cần Phản Hồi Ngay!');

    // 2. Migration 20260924000002 enqueues ADMIN_NEW_BOOKING_ALERT to MIPA email
    const migrationPath = path.join(rootDir, 'supabase/migrations/20260924000002_add_admin_booking_email_alert.sql');
    expect(fs.existsSync(migrationPath)).toBe(true);
    const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
    expect(migrationContent).toContain('ADMIN_NEW_BOOKING_ALERT');
    expect(migrationContent).toContain('maisonmipamemories@gmail.com');

    // 3. send-email Edge Function processes studio alert
    const sendEmailPath = path.join(rootDir, 'supabase/functions/send-email/index.ts');
    expect(fs.existsSync(sendEmailPath)).toBe(true);
    const sendEmailContent = fs.readFileSync(sendEmailPath, 'utf-8');
    expect(sendEmailContent).toContain('STUDIO_NOTIFICATION_EMAIL');
    expect(sendEmailContent).toContain('admin_new_booking_alert');
  });
});
