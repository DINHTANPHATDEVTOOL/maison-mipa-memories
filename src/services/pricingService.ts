// ==============================================================================
// Maison MIPA Memories - Pricing Calculation Engine
// Single source of truth helper matching PostgreSQL authoritative calculation
// ==============================================================================
import type { PackageItem, Addon, Promotion } from '../types';

export const DEFAULT_EXTRA_SLOT_PRICE = 100000; // 100,000 VNĐ per additional slot
export const EXTRA_SLOT_PRICE_STORAGE_KEY = 'mipa_extra_slot_price';

/**
 * Gets configured price for each additional consecutive shoot slot.
 * Default: 100,000 VND per extra slot.
 */
export function getExtraSlotPrice(): number {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(EXTRA_SLOT_PRICE_STORAGE_KEY);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Could not read extra slot price from storage:', err);
  }
  return DEFAULT_EXTRA_SLOT_PRICE;
}

/**
 * Sets configured price for each additional consecutive shoot slot (Admin only).
 * Dispatches 'mipa_pricing_updated' event to synchronize all active components.
 */
export function setExtraSlotPrice(price: number): number {
  const safePrice = Math.max(0, Math.floor(price));
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(EXTRA_SLOT_PRICE_STORAGE_KEY, String(safePrice));
      window.dispatchEvent(new CustomEvent('mipa_pricing_updated', {
        detail: { extraSlotPrice: safePrice },
      }));
    }
  } catch (err) {
    console.warn('Could not save extra slot price to storage:', err);
  }
  return safePrice;
}

export interface PricingInput {
  packageItem: Pick<PackageItem, 'price' | 'durationMinutes'> & { depositAmount?: number };
  addons?: (Pick<Addon, 'price'> & { durationMinutes?: number })[];
  promotion?: Partial<Pick<Promotion, 'discountPercent' | 'discountAmount' | 'minOrder' | 'maxDiscount' | 'isActive'>> | null;
  slotsCount?: number;
  extraSlotPrice?: number;
}

export interface PricingBreakdown {
  packagePrice: number;
  addonTotal: number;
  extraSlotTotal: number;
  extraSlotsCount: number;
  extraSlotUnitPrice: number;
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

  // Extra consecutive slots calculation (Ca đầu giá bình thường, mỗi ca thêm +100k hoặc theo cấu hình admin)
  const slotsCount = Math.max(1, Math.floor(input.slotsCount || 1));
  const extraSlotsCount = Math.max(0, slotsCount - 1);
  const extraSlotUnitPrice = typeof input.extraSlotPrice === 'number' && input.extraSlotPrice >= 0
    ? input.extraSlotPrice
    : getExtraSlotPrice();
  const extraSlotTotal = extraSlotsCount * extraSlotUnitPrice;

  const subtotal = packagePrice + addonTotal + extraSlotTotal;

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
    extraSlotTotal,
    extraSlotsCount,
    extraSlotUnitPrice,
    subtotal,
    discountTotal,
    totalAmount,
    depositAmount,
    totalDurationMinutes,
  };
}

export interface PromotionValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates promotion eligibility against order subtotal, service, and schedule constraints.
 * Authoritatively matches create_booking PostgreSQL migration verification.
 */
export function validatePromotion(
  promo: Promotion,
  subtotal: number,
  selectedServiceId?: string,
  now: Date = new Date()
): PromotionValidationResult {
  if (!promo.isActive) {
    return { valid: false, error: 'Mã ưu đãi không còn hoạt động.' };
  }

  if (promo.startDate) {
    const start = new Date(promo.startDate).getTime();
    if (!isNaN(start) && now.getTime() < start) {
      return { valid: false, error: 'Mã ưu đãi chưa đến thời gian áp dụng.' };
    }
  }

  if (promo.endDate) {
    const endStr = promo.endDate.length === 10 ? `${promo.endDate}T23:59:59.999Z` : promo.endDate;
    const end = new Date(endStr).getTime();
    if (!isNaN(end) && now.getTime() > end) {
      return { valid: false, error: 'Mã ưu đãi đã hết hạn sử dụng.' };
    }
  }

  if (typeof promo.usageLimit === 'number') {
    if (promo.usageLimit < 0) {
      return {
        valid: false,
        error: 'Mã ưu đãi có giới hạn sử dụng không hợp lệ.',
      };
    }

    const count = typeof promo.usageCount === 'number' ? promo.usageCount : 0;
    if (count >= promo.usageLimit) {
      return {
        valid: false,
        error: 'Mã ưu đãi đã hết lượt sử dụng.',
      };
    }
  }

  if (promo.applicableServiceId && selectedServiceId && promo.applicableServiceId !== selectedServiceId) {
    return { valid: false, error: 'Mã ưu đãi không áp dụng cho dịch vụ đã chọn.' };
  }

  const minOrder = promo.minOrder || 0;
  if (minOrder > 0 && subtotal < minOrder) {
    return { valid: false, error: `Mã ưu đãi yêu cầu đơn hàng tối thiểu ${minOrder.toLocaleString('vi-VN')}đ.` };
  }

  return { valid: true };
}

