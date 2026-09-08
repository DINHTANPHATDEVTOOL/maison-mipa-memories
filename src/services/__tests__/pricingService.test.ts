import { describe, it, expect } from 'vitest';
import { calculatePricing } from '../pricingService';

describe('Pricing Engine (Single Source of Truth)', () => {
  const basePackage = {
    price: 2490000,
    durationMinutes: 120,
    depositAmount: 747000,
  };

  const sampleAddons = [
    { price: 400000, durationMinutes: 30 }, // Makeup
    { price: 200000, durationMinutes: 15 }, // Hair
  ];

  it('calculates standard package price without addons or discounts', () => {
    const result = calculatePricing({
      packageItem: basePackage,
    });

    expect(result.packagePrice).toBe(2490000);
    expect(result.addonTotal).toBe(0);
    expect(result.subtotal).toBe(2490000);
    expect(result.discountTotal).toBe(0);
    expect(result.totalAmount).toBe(2490000);
    expect(result.depositAmount).toBe(747000);
    expect(result.totalDurationMinutes).toBe(120);
  });

  it('accumulates addon prices and addon durations correctly', () => {
    const result = calculatePricing({
      packageItem: basePackage,
      addons: sampleAddons,
    });

    expect(result.packagePrice).toBe(2490000);
    expect(result.addonTotal).toBe(600000);
    expect(result.subtotal).toBe(3090000);
    expect(result.totalAmount).toBe(3090000);
    // 120 mins package + 30 mins makeup + 15 mins hair = 165 mins
    expect(result.totalDurationMinutes).toBe(165);
  });

  it('applies percentage discount voucher correctly', () => {
    const result = calculatePricing({
      packageItem: basePackage,
      addons: sampleAddons,
      promotion: {
        discountPercent: 20, // 20% off
        minOrder: 1000000,
        isActive: true,
      },
    });

    // Subtotal: 3,090,000đ. 20% = 618,000đ
    expect(result.subtotal).toBe(3090000);
    expect(result.discountTotal).toBe(618000);
    expect(result.totalAmount).toBe(3090000 - 618000);
  });

  it('respects minOrder constraint on vouchers', () => {
    const lowCostPackage = {
      price: 400000,
      durationMinutes: 60,
    };

    const result = calculatePricing({
      packageItem: lowCostPackage,
      promotion: {
        discountPercent: 20,
        minOrder: 1000000, // min order 1 million VND
        isActive: true,
      },
    });

    expect(result.subtotal).toBe(400000);
    expect(result.discountTotal).toBe(0); // Not eligible
    expect(result.totalAmount).toBe(400000);
  });

  it('caps discount at maxDiscount limit', () => {
    const result = calculatePricing({
      packageItem: { price: 5000000, durationMinutes: 180 },
      promotion: {
        discountPercent: 50, // 50% = 2,500,000đ
        maxDiscount: 500000, // capped at 500,000đ
        minOrder: 1000000,
        isActive: true,
      },
    });

    expect(result.subtotal).toBe(5000000);
    expect(result.discountTotal).toBe(500000);
    expect(result.totalAmount).toBe(4500000);
  });

  it('ignores inactive promotion vouchers', () => {
    const result = calculatePricing({
      packageItem: basePackage,
      promotion: {
        discountPercent: 30,
        isActive: false,
      },
    });

    expect(result.discountTotal).toBe(0);
    expect(result.totalAmount).toBe(basePackage.price);
  });

  it('calculates 30% default deposit if package does not specify explicit deposit', () => {
    const pkgWithoutDeposit = {
      price: 2000000,
      durationMinutes: 90,
    };

    const result = calculatePricing({
      packageItem: pkgWithoutDeposit,
    });

    expect(result.depositAmount).toBe(600000); // 30% of 2,000,000đ
  });

  it('prevents negative totals even with large fixed discounts', () => {
    const result = calculatePricing({
      packageItem: { price: 500000, durationMinutes: 60 },
      promotion: {
        discountAmount: 1000000, // fixed discount larger than price
        isActive: true,
      },
    });

    expect(result.subtotal).toBe(500000);
    expect(result.discountTotal).toBe(500000);
    expect(result.totalAmount).toBe(0);
    expect(result.depositAmount).toBe(0);
  });
});
