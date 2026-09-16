// ==============================================================================
// Maison MIPA Memories - Production Mode Fail-Closed Test Suite
// Verified with VITE_ENABLE_DEMO_MODE=false
// ==============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees, getConcepts } from '../catalogService';
import { getAvailableSlots, AvailabilityUnavailableError } from '../availabilityService';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../../lib/supabase';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/supabase')>();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(),
    isDemoModeEnabled: vi.fn(() => false), // VITE_ENABLE_DEMO_MODE=false
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

describe('Production Mode Fail-Closed Suite (VITE_ENABLE_DEMO_MODE=false)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isDemoModeEnabled).mockReturnValue(false);
  });

  it('1. No mock employees: getEmployees returns [] or throws, never returns INITIAL_EMPLOYEES', async () => {
    // A. Unconfigured credentials in production mode
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const unconfiguredResult = await getEmployees();
    expect(unconfiguredResult).toEqual([]);

    // B. Configured credentials with DB error -> throws
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      }),
    } as any);

    await expect(getEmployees()).rejects.toThrow(
      /Không thể tải danh sách nhân viên: Database connection failed/
    );

    // C. Configured credentials with empty DB -> returns [], never falls back to mock
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    } as any);

    const emptyResult = await getEmployees();
    expect(emptyResult).toEqual([]);
  });

  it('2. No demo concepts fallback: getConcepts returns [] or throws, never returns DEMO_CONCEPTS', async () => {
    // A. Unconfigured credentials in production mode
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const unconfiguredResult = await getConcepts();
    expect(unconfiguredResult).toEqual([]);

    // B. Configured credentials with DB error -> throws
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Concepts table unreachable' },
          }),
        }),
      }),
    } as any);

    await expect(getConcepts()).rejects.toThrow(
      /Không thể tải danh sách concept: Concepts table unreachable/
    );

    // C. Configured credentials with empty DB -> returns []
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    } as any);

    const emptyResult = await getConcepts();
    expect(emptyResult).toEqual([]);
  });

  it('3. Availability backend error does not show fake AVAILABLE slots', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: '503 Service Unavailable', code: 'PGRST000' } as any,
    } as any);

    await expect(
      getAvailableSlots({
        date: '2026-10-15',
        studioId: '00000000-0000-0000-0000-000000000001',
        durationMinutes: 60,
      })
    ).rejects.toThrow(AvailabilityUnavailableError);
  });
});
