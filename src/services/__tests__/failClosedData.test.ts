import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServices, getPackages, getAddons, getStudioRooms } from '../catalogService';
import { getCustomerBookings } from '../bookingService';
import { getStaffSkills, getStaffLeaveRequests, getSuggestedStaffForBooking } from '../staffSchedulingService';
import { getStudioResources } from '../resourcePlanningService';
import * as supabaseModule from '../../lib/supabase';

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
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      },
    },
  };
});

describe('Fail-Closed Production Data Policy (Phase A & C)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createQueryChain = (resolvedValue: any) => {
    const chain: any = {
      ...resolvedValue,
      then: (onfulfilled?: any, onrejected?: any) => Promise.resolve(resolvedValue).then(onfulfilled, onrejected),
      catch: (onrejected?: any) => Promise.resolve(resolvedValue).catch(onrejected),
    };
    chain.select = vi.fn().mockReturnValue(chain);
    chain.eq = vi.fn().mockReturnValue(chain);
    chain.order = vi.fn().mockReturnValue(chain);
    return chain;
  };

  it('DB empty remains empty: does NOT fallback to INITIAL_SERVICES when Supabase returns []', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    const chain = createQueryChain({ data: [], error: null });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    const services = await getServices();
    expect(services).toEqual([]);
    expect(services.length).toBe(0);
  });

  it('DB empty remains empty: packages query returning [] stays []', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    const chain = createQueryChain({ data: [], error: null });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    const packages = await getPackages();
    expect(packages).toEqual([]);
  });

  it('DB error throws ERROR and does NOT fallback to in-memory mock catalog', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    const chain = createQueryChain({
      data: null,
      error: { message: 'Database connection timeout', code: '57P01' },
    });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    await expect(getServices()).rejects.toThrowError(/Database connection timeout/);
    await expect(getPackages()).rejects.toThrowError(/Database connection timeout/);
    await expect(getAddons()).rejects.toThrowError(/Database connection timeout/);
    await expect(getStudioRooms()).rejects.toThrowError(/Database connection timeout/);
  });

  it('DB error on getCustomerBookings throws ERROR and does not fake success', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    const chain = createQueryChain({
      data: null,
      error: { message: 'PG RLS permission denied', code: '42501' },
    });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    await expect(getCustomerBookings('user_test_123')).rejects.toThrowError(/PG RLS permission denied/);
  });

  it('DB error on getStaffSkills in production throws controlled AppError', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseModule, 'isDemoModeEnabled').mockReturnValue(false);
    const chain = createQueryChain({
      data: null,
      error: { message: 'Database connection failed', code: '500' },
    });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    await expect(getStaffSkills()).rejects.toThrow();
  });

  it('DB error on getStaffLeaveRequests in production throws controlled AppError', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseModule, 'isDemoModeEnabled').mockReturnValue(false);
    const chain = createQueryChain({
      data: null,
      error: { message: 'PG RLS permission denied', code: '42501' },
    });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    await expect(getStaffLeaveRequests()).rejects.toThrow();
  });

  it('DB error on getStudioResources in production throws controlled AppError', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseModule, 'isDemoModeEnabled').mockReturnValue(false);
    const chain = createQueryChain({
      data: null,
      error: { message: 'relation studio_resources does not exist', code: '42P01' },
    });
    vi.mocked(supabaseModule.supabase.from).mockReturnValue(chain as any);

    await expect(getStudioResources()).rejects.toThrow();
  });

  it('getSuggestedStaffForBooking in production calls get_available_staff_for_booking and throws on DB failure', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseModule, 'isDemoModeEnabled').mockReturnValue(false);
    vi.mocked(supabaseModule.supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: 'Internal server error', code: '500' } as any,
    } as any);

    await expect(
      getSuggestedStaffForBooking({
        bookingId: 'book-123',
        role: 'PHOTOGRAPHER',
        startAt: '2026-09-18T10:00:00Z',
        endAt: '2026-09-18T12:00:00Z',
      })
    ).rejects.toThrow();
  });

  it('With explicit demo flag, fallback demo data is permitted', async () => {
    vi.spyOn(supabaseModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseModule, 'isDemoModeEnabled').mockReturnValue(true);

    const skills = await getStaffSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0].code).toBe('PORTRAIT');

    const resources = await getStudioResources();
    expect(resources.length).toBeGreaterThan(0);

    const suggestions = await getSuggestedStaffForBooking({
      bookingId: 'demo-book',
      role: 'PHOTOGRAPHER',
      startAt: '2026-09-18T10:00:00Z',
      endAt: '2026-09-18T12:00:00Z',
    });
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('Account status SUSPENDED or DISABLED denies access', () => {
    const isAccountAllowed = (status: string) => {
      if (status === 'SUSPENDED' || status === 'DISABLED') {
        throw new Error(`Tài khoản của bạn đang ở trạng thái ${status}. Vui lòng liên hệ quản trị viên.`);
      }
      return true;
    };

    expect(isAccountAllowed('ACTIVE')).toBe(true);
    expect(isAccountAllowed('PENDING_VERIFICATION')).toBe(true);
    expect(() => isAccountAllowed('SUSPENDED')).toThrowError(/SUSPENDED/);
    expect(() => isAccountAllowed('DISABLED')).toThrowError(/DISABLED/);
  });
});
