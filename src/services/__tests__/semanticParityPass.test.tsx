// ==============================================================================
// Maison MIPA Memories - Semantic Parity Pass Tests
// Covers: Optional Selections + Promotion State Parity + Immediate Auth Privilege Clear
// ==============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { createBookingInMemory, BookingValidationError, resetInMemoryBookings } from '../bookingService';
import { validatePromotion } from '../pricingService';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_STUDIO_ROOMS, INITIAL_ADDONS } from '../../mockData';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    isSupabaseConfigured: () => true,
    isDemoModeEnabled: () => false,
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    },
  };
});

describe('PR #24 Semantic Parity Pass: Immediate Auth Privilege Clear', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetInMemoryBookings();
  });

  it('1. clearAuthoritativeAuthState synchronously clears user, session, and isRootOwner BEFORE signOut completes', async () => {
    let resolveSignOut: () => void = () => {};
    const signOutPromise = new Promise<{ error: null }>((resolve) => {
      resolveSignOut = () => resolve({ error: null });
    });

    vi.mocked(supabase.auth.signOut).mockReturnValue(signOutPromise as any);

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthProvider>{children}</AuthProvider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Simulate current authenticated admin user with root owner privileges
    act(() => {
      // @ts-ignore
      result.current.loginAsDemoRole?.('ADMIN');
    });

    // Invoke logout which calls clearAuthoritativeAuthState with async signOut
    let logoutPromise: Promise<void>;
    act(() => {
      logoutPromise = result.current.logout();
    });

    // IMMEDIATELY on the same tick, before signOutPromise resolves:
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isRootOwner).toBe(false);

    // Now resolve the async signOut network call
    await act(async () => {
      resolveSignOut();
      await logoutPromise;
    });

    // Invariant holds after completion
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isRootOwner).toBe(false);
  });
});

describe('PR #24 Semantic Parity Pass: Optional Selections', () => {
  beforeEach(() => {
    resetInMemoryBookings();
  });

  const coupleService = INITIAL_SERVICES[0]; // Couple
  const basicPackage = INITIAL_PACKAGES[0];  // 1,290,000đ, duration 90m
  const studioRoom = INITIAL_STUDIO_ROOMS[0];

  const baseBookingRequest = {
    serviceId: coupleService.id,
    packageId: basicPackage.id,
    studioId: studioRoom.id,
    date: '2026-11-20',
    timeSlot: '10:00',
    customerName: 'Trần Văn An',
    customerPhone: '0901 234 567',
    customerEmail: 'an.tran@example.com',
  };

  it('2. Successfully creates booking with ZERO concepts (optional concepts)', () => {
    const booking = createBookingInMemory({
      ...baseBookingRequest,
      conceptIds: [],
    });

    expect(booking).toBeDefined();
    expect(booking.conceptIds).toEqual([]);
    expect(booking.conceptId).toBeUndefined();
    expect(booking.conceptName).toBeUndefined();
    expect(booking.subtotal).toBe(basicPackage.price);
  });

  it('3. Successfully creates booking with ZERO addons (optional addons)', () => {
    const booking = createBookingInMemory({
      ...baseBookingRequest,
      addonIds: [],
    });

    expect(booking).toBeDefined();
    expect(booking.addons).toEqual([]);
    expect(booking.subtotal).toBe(basicPackage.price);
  });

  it('4. Successfully creates booking with BOTH zero concepts and zero addons', () => {
    const booking = createBookingInMemory({
      ...baseBookingRequest,
      conceptIds: [],
      addonIds: [],
    });

    expect(booking).toBeDefined();
    expect(booking.conceptIds).toEqual([]);
    expect(booking.addons).toEqual([]);
    expect(booking.subtotal).toBe(basicPackage.price);
    expect(booking.totalAmount).toBe(basicPackage.price);
  });
});

describe('PR #24 Semantic Parity Pass: Promotion State Parity', () => {
  const coupleService = INITIAL_SERVICES[0]; // Couple
  const weddingService = INITIAL_SERVICES[1]; // Wedding
  const basicPackage = INITIAL_PACKAGES[0];  // 1,290,000đ
  const premiumPackage = INITIAL_PACKAGES[2]; // 3,490,000đ
  const studioRoom = INITIAL_STUDIO_ROOMS[0];
  const makeupAddon = INITIAL_ADDONS[0]; // 400,000đ

  it('5. Successfully applies MIPA20 voucher when subtotal satisfies minOrder (>= 1,500,000đ)', () => {
    // 1,290,000 + 400,000 = 1,690,000đ (>= 1,500,000đ)
    const booking = createBookingInMemory({
      serviceId: coupleService.id,
      packageId: basicPackage.id,
      studioId: studioRoom.id,
      date: '2026-11-20',
      timeSlot: '14:00',
      addonIds: [makeupAddon.id],
      voucherCode: 'MIPA20',
    });

    expect(booking.subtotal).toBe(1690000);
    expect(booking.discount).toBe(338000); // 20% of 1,690,000đ
    expect(booking.totalAmount).toBe(1352000);
  });

  it('6. Rejects voucher MIPA20 when subtotal does not meet minOrder (< 1,500,000đ)', () => {
    // Basic package alone is 1,290,000đ (< 1,500,000đ)
    expect(() => {
      createBookingInMemory({
        serviceId: coupleService.id,
        packageId: basicPackage.id,
        studioId: studioRoom.id,
        date: '2026-11-20',
        timeSlot: '16:00',
        addonIds: [],
        voucherCode: 'MIPA20',
      });
    }).toThrow(BookingValidationError);
  });

  it('7. Rejects voucher MIPA20 when applied to an incompatible service (Wedding instead of Couple)', () => {
    // MIPA20 applicableServiceId is Couple, but order is Wedding
    expect(() => {
      createBookingInMemory({
        serviceId: weddingService.id,
        packageId: premiumPackage.id,
        studioId: studioRoom.id,
        date: '2026-11-20',
        timeSlot: '16:00',
        addonIds: [],
        voucherCode: 'MIPA20',
      });
    }).toThrow(/không áp dụng cho dịch vụ đã chọn/i);
  });

  it('8. Rejects invalid or non-existent voucher code', () => {
    expect(() => {
      createBookingInMemory({
        serviceId: coupleService.id,
        packageId: basicPackage.id,
        studioId: studioRoom.id,
        date: '2026-11-20',
        timeSlot: '16:00',
        addonIds: [],
        voucherCode: 'UNKNOWN_VOUCHER_XYZ',
      });
    }).toThrow(/không tồn tại hoặc không hợp lệ/i);
  });

  it('9. Rejects promotion with usageLimit=0 and usageCount=0 (exhausted parity)', () => {
    const promo = {
      id: 'p-zero',
      code: 'ZERO_LIMIT',
      discountPercent: 10,
      minOrder: 0,
      startDate: '',
      endDate: '',
      usageLimit: 0,
      usageCount: 0,
      isActive: true,
    };
    const result = validatePromotion(promo, 2000000);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/hết lượt sử dụng/i);
  });

  it('10. Accepts promotion with usageLimit=1 and usageCount=0 (unused valid)', () => {
    const promo = {
      id: 'p-one',
      code: 'ONE_LIMIT',
      discountPercent: 10,
      minOrder: 0,
      startDate: '',
      endDate: '',
      usageLimit: 1,
      usageCount: 0,
      isActive: true,
    };
    const result = validatePromotion(promo, 2000000);
    expect(result.valid).toBe(true);
  });

  it('11. Rejects promotion with usageLimit=1 and usageCount=1 (exhausted valid)', () => {
    const promo = {
      id: 'p-one-used',
      code: 'ONE_USED',
      discountPercent: 10,
      minOrder: 0,
      startDate: '',
      endDate: '',
      usageLimit: 1,
      usageCount: 1,
      isActive: true,
    };
    const result = validatePromotion(promo, 2000000);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/hết lượt sử dụng/i);
  });

  it('12. Rejects promotion with negative usageLimit=-1 (invalid configuration)', () => {
    const promo = {
      id: 'p-neg',
      code: 'NEG_LIMIT',
      discountPercent: 10,
      minOrder: 0,
      startDate: '',
      endDate: '',
      usageLimit: -1,
      usageCount: 0,
      isActive: true,
    };
    const result = validatePromotion(promo, 2000000);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/không hợp lệ/i);
  });
});

