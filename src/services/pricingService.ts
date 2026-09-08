// ==============================================================================
// Maison MIPA Memories - Pricing Calculation Engine
// Single source of truth helper matching PostgreSQL authoritative calculation
// ==============================================================================
import type { PackageItem, Addon, Promotion } from '../types';

export interface PricingInput {
  packageItem: Pick<PackageItem, 'price' | 'durationMinutes'> & { depositAmount?: number };
  addons?: (Pick<Addon, 'price'> & { durationMinutes?: number })[];
  promotion?: Partial<Pick<Promotion, 'discountPercent' | 'discountAmount' | 'minOrder' | 'maxDiscount' | 'isActive'>> | null;
}

export interface PricingBreakdown {
  packagePrice: number;
  addonTotal: number;
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  depositAmount: number;
  totalDurationMinutes: number;
}

/**
 * Calculates pricing breakdown and total duration.
 * Both client preview and server-side RPC enforce this exact mathematical logic.
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const packagePrice = Math.max(0, Math.floor(input.packageItem.price || 0));
  const packageDuration = Math.max(15, Math.floor(input.packageItem.durationMinutes || 60));

  // Addons total & duration
  const addons = input.addons || [];
  const addonTotal = addons.reduce((sum, addon) => sum + Math.max(0, Math.floor(addon.price || 0)), 0);
  const addonDuration = addons.reduce((sum, addon) => sum + Math.max(0, Math.floor(addon.durationMinutes || 0)), 0);
  const totalDurationMinutes = packageDuration + addonDuration;

  const subtotal = packagePrice + addonTotal;

  // Promotion discount calculation
  let discountTotal = 0;
  if (input.promotion && (input.promotion.isActive !== false)) {
    const minOrder = input.promotion.minOrder || 0;
    if (subtotal >= minOrder) {
      if (input.promotion.discountPercent && input.promotion.discountPercent > 0) {
        const percent = Math.min(100, Math.max(0, input.promotion.discountPercent));
        discountTotal = Math.round(subtotal * (percent / 100));
      } else if (input.promotion.discountAmount && input.promotion.discountAmount > 0) {
        discountTotal = Math.floor(input.promotion.discountAmount);
      }

      if (input.promotion.maxDiscount && input.promotion.maxDiscount > 0) {
        discountTotal = Math.min(discountTotal, input.promotion.maxDiscount);
      }
    }
  }

  // Ensure discount doesn't exceed subtotal
  discountTotal = Math.min(subtotal, Math.max(0, discountTotal));
  const totalAmount = Math.max(0, subtotal - discountTotal);

  // Deposit calculation (package specific deposit, or 30% default)
  let depositAmount = input.packageItem.depositAmount;
  if (typeof depositAmount !== 'number' || depositAmount <= 0) {
    depositAmount = Math.round(totalAmount * 0.3);
  } else {
    depositAmount = Math.min(depositAmount, totalAmount);
  }

  return {
    packagePrice,
    addonTotal,
    subtotal,
    discountTotal,
    totalAmount,
    depositAmount,
    totalDurationMinutes,
  };
}
