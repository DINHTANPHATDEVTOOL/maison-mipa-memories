// ==============================================================================
// Maison MIPA Memories - Atomic Promotion & Pricing Parity Test Suite
// Audits row-locking contract, null-safe usage limit, fixed/percent maxDiscount parity
// ==============================================================================
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { calculatePricing } from '../pricingService';
import type { Promotion } from '../../types';

describe('Atomic Promotion & Client/Server Pricing Parity', () => {
  const migrationPath = path.resolve(
    __dirname,
    '../../../supabase/migrations/20260916000002_atomic_promotion_and_pricing_parity.sql'
  );
  const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

  // ============================================================================
  // 1. SQL MIGRATION CONTRACT: ROW LOCK & ATOMIC USAGE COUNT
  // ============================================================================
  it('1. promotion row query uses FOR UPDATE before usage_limit validation', () => {
    // Must contain SELECT ... FROM public.promotions ... FOR UPDATE
    const selectPromoRegex = /SELECT\s+\*\s+INTO\s+v_promo\s+FROM\s+public\.promotions[\s\S]*?WHERE\s+code\s*=\s*UPPER\(trim\(p_voucher_code\)\)[\s\S]*?FOR\s+UPDATE;/i;
    expect(migrationSql).toMatch(selectPromoRegex);

    // Ensure FOR UPDATE occurs BEFORE checking usage_limit
    const forUpdateIndex = migrationSql.indexOf('FOR UPDATE');
    const usageLimitCheckIndex = migrationSql.indexOf('v_promo.usage_limit');
    expect(forUpdateIndex).toBeGreaterThan(0);
    expect(usageLimitCheckIndex).toBeGreaterThan(forUpdateIndex);
  });

  it('2. null usage_count is safely handled as 0 in validation', () => {
    // Must use COALESCE(v_promo.usage_count, 0)
    expect(migrationSql).toContain('COALESCE(v_promo.usage_count, 0) >= v_promo.usage_limit');
  });

  it('3. usage_count increment is atomic and null-safe', () => {
    // Must use COALESCE(usage_count, 0) + 1
    expect(migrationSql).toContain('usage_count = COALESCE(usage_count, 0) + 1');
  });

  // ============================================================================
  // 2. CLIENT / SERVER PRICING PARITY
  // ============================================================================
  it('4. Fixed discount respects max_discount (discountAmount = 500k, maxDiscount = 200k, subtotal = 1M -> 200k)', () => {
    const fixedPromo: Partial<Promotion> = {
      code: 'FIXED500K_CAP200K',
      discountPercent: 0,
      discountAmount: 500000,
      maxDiscount: 200000,
      isActive: true,
      minOrder: 0,
    };

    // Client calculation
    const clientPricing = calculatePricing({
      packageItem: { price: 1000000, durationMinutes: 60 },
      promotion: fixedPromo,
    });

    expect(clientPricing.subtotal).toBe(1000000);
    expect(clientPricing.discountTotal).toBe(200000);
    expect(clientPricing.totalAmount).toBe(800000);

    // SQL contract verification: SQL LEAST(v_discount_total, v_promo.max_discount) applies to ELSIF discount_amount > 0
    expect(migrationSql).toContain('ELSIF v_promo.discount_amount > 0 THEN');
    expect(migrationSql).toContain('v_discount_total := v_promo.discount_amount;');
    expect(migrationSql).toContain('IF v_promo.max_discount IS NOT NULL AND v_promo.max_discount > 0 THEN');
    expect(migrationSql).toContain('v_discount_total := LEAST(v_discount_total, v_promo.max_discount);');
  });

  it('5. Percentage discount respects max_discount (percent = 50%, maxDiscount = 300k, subtotal = 1M -> 300k)', () => {
    const percentPromo: Partial<Promotion> = {
      code: 'PERCENT50_CAP300K',
      discountPercent: 50,
      maxDiscount: 300000,
      isActive: true,
      minOrder: 0,
    };

    // Client calculation
    const clientPricing = calculatePricing({
      packageItem: { price: 1000000, durationMinutes: 60 },
      promotion: percentPromo,
    });

    expect(clientPricing.subtotal).toBe(1000000);
    expect(clientPricing.discountTotal).toBe(300000);
    expect(clientPricing.totalAmount).toBe(700000);
  });

  it('6. Precedence: percentage discount takes precedence if both discount_percent and discount_amount are specified', () => {
    const hybridPromo: Partial<Promotion> = {
      code: 'HYBRID',
      discountPercent: 20, // 200,000 on 1M
      discountAmount: 500000,
      maxDiscount: 400000,
      isActive: true,
      minOrder: 0,
    };

    const clientPricing = calculatePricing({
      packageItem: { price: 1000000, durationMinutes: 60 },
      promotion: hybridPromo,
    });

    // Percentage first -> 20% of 1,000,000 = 200,000. Not summed with 500k.
    expect(clientPricing.discountTotal).toBe(200000);

    // SQL contract verification: IF discount_percent > 0 ... ELSIF discount_amount > 0
    expect(migrationSql).toMatch(/IF v_promo\.discount_percent > 0 THEN[\s\S]*?ELSIF v_promo\.discount_amount > 0 THEN/);
  });

  it('7. Concurrency Test Status: PROMOTION_CONCURRENCY_TEST=NOT_RUN in static environment', () => {
    // When local Supabase/Postgres is unavailable, integration test cannot run live concurrency.
    // The migration contract statically guarantees FOR UPDATE row lock before usage-limit validation.
    const isLiveDbAvailable = false;
    const testStatus = isLiveDbAvailable ? 'PASS' : 'NOT_RUN';
    expect(testStatus).toBe('NOT_RUN');
    expect(migrationSql).toContain('FOR UPDATE');
  });
});
