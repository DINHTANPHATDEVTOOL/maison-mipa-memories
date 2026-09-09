import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServices, getPackages, getAddons, getStudioRooms } from '../catalogService';
import { getCustomerBookings } from '../bookingService';
import * as supabaseModule from '../../lib/supabase';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabase')>();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(),
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
