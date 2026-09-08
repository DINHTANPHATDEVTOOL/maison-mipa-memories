import { describe, it, expect } from 'vitest';
import { SITE_CONFIG, getCanonicalUrl } from '../site';
import {
  generateStudioLocalBusinessSchema,
  generateServiceSchema,
  generateBreadcrumbSchema,
} from '../../components/seo/SeoHead';
import { INITIAL_PACKAGES } from '../../mockData';
import fs from 'node:fs';
import path from 'node:path';

describe('SITE_CONFIG - Single Source of Truth for Brand, SEO & Pricing', () => {
  it('has consistent hotline and phone numbers', () => {
    expect(SITE_CONFIG.contact.hotline).toBe('0966 616 546');
    expect(SITE_CONFIG.contact.phoneE164).toBe('+84966616546');
    expect(SITE_CONFIG.contact.email).toBe('contact@maisonmipa.vn');
    expect(SITE_CONFIG.contact.address.formatted).toContain('88 Phan Sào Nam');
    expect(SITE_CONFIG.contact.address.formatted).toContain('Quận Tân Bình');
  });

  it('price range matches package catalog prices', () => {
    const minPackagePrice = Math.min(...INITIAL_PACKAGES.map((p) => p.price));
    const maxPackagePrice = Math.max(...INITIAL_PACKAGES.map((p) => p.price));

    expect(SITE_CONFIG.pricing.minPrice).toBe(minPackagePrice);
    expect(SITE_CONFIG.pricing.maxPrice).toBe(maxPackagePrice);
    expect(SITE_CONFIG.pricing.priceRangeSchema).toBe(`${minPackagePrice}VND - ${maxPackagePrice}VND`);
  });

  it('generates canonical URLs following strict trailing-slash conventions', () => {
    // Only homepage root has trailing slash
    expect(getCanonicalUrl('/')).toBe('https://maisonmipa.io.vn/');
    expect(getCanonicalUrl('')).toBe('https://maisonmipa.io.vn/');

    // All other public routes must NOT have trailing slash
    expect(getCanonicalUrl('/dich-vu')).toBe('https://maisonmipa.io.vn/dich-vu');
    expect(getCanonicalUrl('/dich-vu/couple')).toBe('https://maisonmipa.io.vn/dich-vu/couple');
    expect(getCanonicalUrl('/dich-vu/portrait/')).toBe('https://maisonmipa.io.vn/dich-vu/portrait');
    expect(getCanonicalUrl('/bang-gia')).toBe('https://maisonmipa.io.vn/bang-gia');
    expect(getCanonicalUrl('/portfolio')).toBe('https://maisonmipa.io.vn/portfolio');
    expect(getCanonicalUrl('/booking')).toBe('https://maisonmipa.io.vn/booking');
  });

  it('generates valid PhotographicStudio LocalBusiness schema', () => {
    const schema = generateStudioLocalBusinessSchema();
    expect(schema['@type']).toBe('PhotographicStudio');
    expect(schema.name).toBe(SITE_CONFIG.siteName);
    expect(schema.telephone).toBe(SITE_CONFIG.contact.phoneE164);
    expect(schema.priceRange).toBe(SITE_CONFIG.pricing.priceRangeSchema);
    expect(schema.address.streetAddress).toBe(SITE_CONFIG.contact.address.streetAddress);
    expect(schema.openingHoursSpecification.opens).toBe('08:00');
    expect(schema.openingHoursSpecification.closes).toBe('21:00');
  });

  it('generates valid Service schema with aggregate pricing', () => {
    const serviceSchema = generateServiceSchema({
      name: 'Couple Photography',
      description: 'Lưu giữ khoảnh khắc ngọt ngào của hai bạn.',
      url: 'https://maisonmipa.io.vn/dich-vu/couple',
    });

    expect(serviceSchema['@type']).toBe('Service');
    expect(serviceSchema.name).toBe('Couple Photography');
    expect(serviceSchema.provider.name).toBe(SITE_CONFIG.siteName);
    expect(serviceSchema.provider.telephone).toBe(SITE_CONFIG.contact.phoneE164);
    expect(serviceSchema.offers.priceCurrency).toBe('VND');
    expect(serviceSchema.offers.lowPrice).toBe(SITE_CONFIG.pricing.minPrice);
    expect(serviceSchema.offers.highPrice).toBe(SITE_CONFIG.pricing.maxPrice);
  });

  it('generates valid BreadcrumbList schema', () => {
    const breadcrumbs = [
      { name: 'Trang chủ', url: 'https://maisonmipa.io.vn/' },
      { name: 'Dịch vụ', url: 'https://maisonmipa.io.vn/dich-vu' },
      { name: 'Couple', url: 'https://maisonmipa.io.vn/dich-vu/couple' },
    ];
    const schema = generateBreadcrumbSchema(breadcrumbs);

    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toHaveLength(3);
    expect(schema.itemListElement[0].position).toBe(1);
    expect(schema.itemListElement[0].name).toBe('Trang chủ');
    expect(schema.itemListElement[2].item).toBe('https://maisonmipa.io.vn/dich-vu/couple');
  });

  it('ensures index.html static fallback matches SITE_CONFIG phone and price', () => {
    const indexHtmlPath = path.resolve(__dirname, '../../../index.html');
    const indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');

    // Check telephone in JSON-LD
    expect(indexHtml).toContain(`"telephone": "${SITE_CONFIG.contact.phoneE164}"`);
    // Check noscript hotline
    expect(indexHtml).toContain(SITE_CONFIG.contact.hotline);
    // Check price range
    expect(indexHtml).toContain(`"priceRange": "${SITE_CONFIG.pricing.priceRangeSchema}"`);
  });
});
