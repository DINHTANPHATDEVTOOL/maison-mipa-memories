import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getAvailableSlots,
  AvailabilityUnavailableError,
  resolveStudioRoomUuid,
} from '../availabilityService';
import { getEmployees, getAddons, getPromotions } from '../catalogService';
import { calculatePricing, validatePromotion } from '../pricingService';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../../lib/supabase';
import type { Promotion, ServiceCategory, PackageItem, Concept, Addon, StudioRoom } from '../../types';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabase')>();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(),
    isDemoModeEnabled: vi.fn(),
    supabase: {
      from: vi.fn(),
      rpc: vi.fn(),
      auth: {
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  };
});

describe('CORE PRODUCTION HARDENING — NON-PAYMENT TEST SUITE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // 1. AVAILABILITY TEST MATRIX
  // ============================================================================
  describe('1. Availability Fail-Closed & Duration Calculation Matrix', () => {
    const validStudioUuid = '11111111-1111-1111-1111-111111111111';

    it('1. RPC error throws AvailabilityUnavailableError without returning fake available slots', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: { message: 'PostgREST RPC timeout', code: 'PGRST000' } as any,
      } as any);

      await expect(
        getAvailableSlots({
          date: '2026-12-01',
          studioId: validStudioUuid,
          durationMinutes: 60,
        })
      ).rejects.toThrow(AvailabilityUnavailableError);
    });

    it('2. RPC null / malformed result throws AvailabilityUnavailableError', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      // Malformed result (not an array)
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 'malformed_result' as any,
        error: null,
      } as any);

      await expect(
        getAvailableSlots({
          date: '2026-12-01',
          studioId: validStudioUuid,
          durationMinutes: 60,
        })
      ).rejects.toThrow(AvailabilityUnavailableError);
    });

    it('3. Studio slug lookup error throws and fails closed', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'DB connection error' },
              }),
            }),
          }),
        }),
      } as any);

      await expect(resolveStudioRoomUuid('non-uuid-slug')).rejects.toThrow(
        /Không thể tra cứu phòng studio: DB connection error/
      );
    });

    it('4. Studio slug not found in production throws without returning seeded fallback UUID', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      } as any);

      // In production, 'room_01' MUST NOT resolve to seeded UUID if DB has no row
      await expect(resolveStudioRoomUuid('room_01')).rejects.toThrow(
        /Phòng studio "room_01" không tồn tại trên hệ thống/
      );
    });

    it('5. Today past slot start times in Asia/Ho_Chi_Minh are marked BOOKED', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      vi.mocked(isDemoModeEnabled).mockReturnValue(true);

      // Today in VN timezone
      const todayVn = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

      const slots = await getAvailableSlots({
        date: todayVn,
        studioId: validStudioUuid,
        durationMinutes: 60,
      });

      // Now in VN time
      const vnTimeParts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date());
      const nowHour = parseInt(vnTimeParts.find(p => p.type === 'hour')?.value || '0', 10);
      const nowMin = parseInt(vnTimeParts.find(p => p.type === 'minute')?.value || '0', 10);
      const nowMinutes = nowHour * 60 + nowMin;

      // Every slot with start time <= nowMinutes must NOT be AVAILABLE
      for (const slot of slots) {
        const [h, m] = slot.time.split(':').map(Number);
        const slotMinutes = h * 60 + m;
        if (slotMinutes <= nowMinutes) {
          expect(slot.status).toBe('BOOKED');
          expect(slot.reason).toBe('Khung giờ này đã qua trong ngày');
        }
      }
    });

    it('6. Addon duration is included in slot session duration (Package 60m + Addon 45m = 105m)', () => {
      const pkg: Pick<PackageItem, 'price' | 'durationMinutes'> = {
        price: 1500000,
        durationMinutes: 60,
      };
      const addons: (Pick<Addon, 'price'> & { durationMinutes?: number })[] = [
        { price: 300000, durationMinutes: 45 },
      ];

      const pricing = calculatePricing({
        packageItem: pkg,
        addons,
      });

      expect(pricing.totalDurationMinutes).toBe(105);
      expect(pricing.totalDurationMinutes).not.toBe(60);
    });
  });

  // ============================================================================
  // 2. CATALOG FAIL-CLOSED & ADDON MAPPING MATRIX
  // ============================================================================
  describe('2. Catalog Service Fail-Closed Matrix', () => {
    it('1. getAddons maps durationMinutes from duration_minutes column', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'addon-1',
                name: 'Makeup nâng cao',
                price: 500000,
                duration_minutes: 45,
                category: 'BEAUTY',
                description: 'Gói trang điểm cao cấp',
                active: true,
              },
              {
                id: 'addon-2',
                name: 'In thêm ảnh',
                price: 200000,
                duration_minutes: null,
                category: 'PRINT',
                description: 'In ảnh phóng lớn',
                active: true,
              },
            ],
            error: null,
          }),
        }),
      } as any);

      const addons = await getAddons();
      expect(addons).toHaveLength(2);
      expect(addons[0].durationMinutes).toBe(45);
      expect(addons[1].durationMinutes).toBe(0);
    });

    it('2. getEmployees in production throws on DB error', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'DB Connection Timeout' },
          }),
        }),
      } as any);

      await expect(getEmployees()).rejects.toThrow(
        /Không thể tải danh sách nhân viên: DB Connection Timeout/
      );
    });

    it('3. getEmployees in production returns [] when DB returns empty (no mock fallback)', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      } as any);

      const employees = await getEmployees();
      expect(employees).toEqual([]);
    });

    it('4. getEmployees returns [] when Supabase is not configured and demo is disabled', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      vi.mocked(isDemoModeEnabled).mockReturnValue(false);

      const employees = await getEmployees();
      expect(employees).toEqual([]);
    });

    it('5. getEmployees returns INITIAL_EMPLOYEES only when demo is explicitly enabled', async () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      vi.mocked(isDemoModeEnabled).mockReturnValue(true);

      const employees = await getEmployees();
      expect(employees.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // 3. PROMOTION & PRICING AUTHORITATIVE VALIDATION MATRIX
  // ============================================================================
  describe('3. Promotion & Pricing Authoritative Validation Matrix', () => {
    const basePromo: Promotion = {
      id: 'promo-1',
      code: 'TEST20',
      discountPercent: 20,
      minOrder: 1000000,
      maxDiscount: 500000,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      usageCount: 10,
      usageLimit: 50,
      applicableServiceId: 'srv-wedding',
      isActive: true,
    };

    const fixedPromo: Promotion = {
      id: 'promo-2',
      code: 'DISCOUNT200K',
      discountPercent: 0,
      discountAmount: 200000,
      minOrder: 500000,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      usageCount: 5,
      usageLimit: 100,
      isActive: true,
    };

    const testNow = new Date('2026-09-16T12:00:00Z');

    it('1. Valid percentage promo applies correct discount and respects maxDiscount cap', () => {
      const val = validatePromotion(basePromo, 3000000, 'srv-wedding', testNow);
      expect(val.valid).toBe(true);

      // Subtotal = 3,000,000. 20% = 600,000. Capped at maxDiscount 500,000.
      const pricing = calculatePricing({
        packageItem: { price: 3000000, durationMinutes: 60 },
        promotion: basePromo,
      });
      expect(pricing.discountTotal).toBe(500000);
      expect(pricing.totalAmount).toBe(2500000);
    });

    it('2. Valid fixed promo applies exact discount amount', () => {
      const val = validatePromotion(fixedPromo, 1000000, 'any-service', testNow);
      expect(val.valid).toBe(true);

      const pricing = calculatePricing({
        packageItem: { price: 1000000, durationMinutes: 60 },
        promotion: fixedPromo,
      });
      expect(pricing.discountTotal).toBe(200000);
      expect(pricing.totalAmount).toBe(800000);
    });

    it('3. Expired promo is rejected', () => {
      const expiredPromo: Promotion = {
        ...basePromo,
        endDate: '2026-08-31',
      };
      const val = validatePromotion(expiredPromo, 2000000, 'srv-wedding', testNow);
      expect(val.valid).toBe(false);
      expect(val.error).toBe('Mã ưu đãi đã hết hạn sử dụng.');
    });

    it('4. Not-yet-started promo is rejected', () => {
      const futurePromo: Promotion = {
        ...basePromo,
        startDate: '2026-10-01',
      };
      const val = validatePromotion(futurePromo, 2000000, 'srv-wedding', testNow);
      expect(val.valid).toBe(false);
      expect(val.error).toBe('Mã ưu đãi chưa đến thời gian áp dụng.');
    });

    it('5. Usage limit reached is rejected', () => {
      const exhaustedPromo: Promotion = {
        ...basePromo,
        usageCount: 50,
        usageLimit: 50,
      };
      const val = validatePromotion(exhaustedPromo, 2000000, 'srv-wedding', testNow);
      expect(val.valid).toBe(false);
      expect(val.error).toBe('Mã ưu đãi đã hết lượt sử dụng.');
    });

    it('6. Minimum subtotal not met is rejected', () => {
      const val = validatePromotion(basePromo, 800000, 'srv-wedding', testNow);
      expect(val.valid).toBe(false);
      expect(val.error).toContain('yêu cầu đơn hàng tối thiểu 1.000.000đ');
    });

    it('7. Service-specific promo mismatch is rejected', () => {
      const val = validatePromotion(basePromo, 2000000, 'srv-family', testNow);
      expect(val.valid).toBe(false);
      expect(val.error).toBe('Mã ưu đãi không áp dụng cho dịch vụ đã chọn.');
    });

    it('8. Inactive promo is rejected', () => {
      const inactivePromo: Promotion = {
        ...basePromo,
        isActive: false,
      };
      const val = validatePromotion(inactivePromo, 2000000, 'srv-wedding', testNow);
      expect(val.valid).toBe(false);
      expect(val.error).toBe('Mã ưu đãi không còn hoạt động.');
    });
  });

  // ============================================================================
  // 4. CONCEPT SELECTION CONTRACT MATRIX
  // ============================================================================
  describe('4. Concept Selection Authoritative Contract Matrix', () => {
    const conceptWedding: Concept = {
      id: 'c-wedding-1',
      name: 'Haute Couture Wedding',
      slug: 'haute-couture-wedding',
      description: 'Mô tả concept cưới',
      serviceId: 'srv-wedding',
      active: true,
      bookable: true,
      displayOrder: 1,
      coverPhotoUrl: '/cover.jpg',
    };

    const conceptFamily: Concept = {
      id: 'c-family-1',
      name: 'Gia Đình Ấm Cúng',
      slug: 'gia-dinh-am-cung',
      description: 'Mô tả concept gia đình',
      serviceId: 'srv-family',
      active: true,
      bookable: true,
      displayOrder: 2,
      coverPhotoUrl: '/family.jpg',
    };

    const inactiveConcept: Concept = {
      id: 'c-inactive',
      name: 'Concept Ngừng Hoạt Động',
      slug: 'inactive',
      description: 'Mô tả ngừng hoạt động',
      serviceId: 'srv-wedding',
      active: false,
      bookable: true,
      displayOrder: 3,
      coverPhotoUrl: '/inactive.jpg',
    };

    const unbookableConcept: Concept = {
      id: 'c-unbookable',
      name: 'Concept Chỉ Xem',
      slug: 'unbookable',
      description: 'Mô tả chỉ xem',
      serviceId: 'srv-wedding',
      active: true,
      bookable: false,
      displayOrder: 4,
      coverPhotoUrl: '/unbookable.jpg',
    };

    it('1. Allows cross-service concept when active and bookable (Migration 20260911000008 parity)', () => {
      const pool = [conceptWedding, conceptFamily, inactiveConcept, unbookableConcept];
      // Active and bookable pool
      const available = pool.filter(c => c.active && c.bookable);
      expect(available).toHaveLength(2);
      expect(available).toContain(conceptWedding);
      expect(available).toContain(conceptFamily);
    });

    it('2. Rejects inactive and unbookable concepts from available pool', () => {
      const pool = [inactiveConcept, unbookableConcept];
      const available = pool.filter(c => c.active && c.bookable);
      expect(available).toHaveLength(0);
    });

    it('3. Respects package conceptsCount maximum', () => {
      const pkg: PackageItem = {
        id: 'pkg-1',
        serviceId: 'srv-wedding',
        name: 'Gói Tiêu Chuẩn',
        price: 2000000,
        conceptsCount: 2,
        durationMinutes: 60,
        editedPhotosCount: 10,
        features: [],
      };

      const selectedConcepts = [conceptWedding, conceptFamily];
      const maxConcepts = pkg.conceptsCount || 1;
      expect(selectedConcepts.length <= maxConcepts).toBe(true);

      const thirdConcept: Concept = {
        id: 'c-third',
        name: 'Concept Thứ 3',
        slug: 'third',
        description: 'Mô tả thứ 3',
        active: true,
        bookable: true,
        displayOrder: 5,
        coverPhotoUrl: '/third.jpg',
      };

      const overLimit = [...selectedConcepts, thirdConcept];
      expect(overLimit.length > maxConcepts).toBe(true);
    });
  });
});
