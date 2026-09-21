import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getEmployees } from '../catalogService';
import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../../lib/supabase';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(),
  isDemoModeEnabled: vi.fn(),
}));

describe('Staff Role Deduplication and Dynamic Synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(isDemoModeEnabled).mockReturnValue(false);
  });

  it('1. Deduplicates employees when an account exists in both employees and profiles with same email or name', async () => {
    // Mock employees table returning an entry for Phat Dinh Tan as PHOTOGRAPHER
    const mockEmployeeRow = {
      id: 'emp-phat-01',
      name: 'Phat Dinh Tan',
      email: 'phat.dinh@maisonmipa.vn',
      phone: '0901234567',
      staff_role: 'PHOTOGRAPHER',
      avatar_url: '/uploads/phat.jpg',
      active: true,
      skills: ['Portrait'],
      rating: 5.0,
      total_sessions: 12,
      profiles: null,
    };

    // Mock profiles table returning the same account as MANAGER
    const mockProfileRow = {
      id: 'usr-uuid-c5a2',
      full_name: 'Phat Dinh Tan',
      email: 'phat.dinh@maisonmipa.vn',
      phone: '0901234567',
      role: 'MANAGER',
      staff_role: null,
      avatar_url: '/uploads/phat.jpg',
      status: 'ACTIVE',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockEmployeeRow],
              error: null,
            }),
          }),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [mockProfileRow],
              error: null,
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const employees = await getEmployees();

    // Must return EXACTLY 1 employee, NOT 2 duplicates
    expect(employees).toHaveLength(1);
    expect(employees[0].name).toBe('Phat Dinh Tan');
    expect(employees[0].email).toBe('phat.dinh@maisonmipa.vn');
    // Authoritative profile role is MANAGER
    expect(employees[0].role).toBe('MANAGER');
    expect(employees[0].avatar).toBe('/uploads/phat.jpg');
  });

  it('2. Reflects role change from MANAGER back to STAFF photographer without duplicates', async () => {
    const mockEmployeeRow = {
      id: 'usr-uuid-c5a2',
      name: 'Phat Dinh Tan',
      email: 'phat.dinh@maisonmipa.vn',
      staff_role: 'PHOTOGRAPHER',
      active: true,
      profiles: {
        id: 'usr-uuid-c5a2',
        full_name: 'Phat Dinh Tan',
        email: 'phat.dinh@maisonmipa.vn',
        role: 'STAFF',
        staff_role: 'PHOTOGRAPHER',
        status: 'ACTIVE',
      },
    };

    const mockProfileRow = {
      id: 'usr-uuid-c5a2',
      full_name: 'Phat Dinh Tan',
      email: 'phat.dinh@maisonmipa.vn',
      role: 'STAFF',
      staff_role: 'PHOTOGRAPHER',
      status: 'ACTIVE',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [mockEmployeeRow],
              error: null,
            }),
          }),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [mockProfileRow],
              error: null,
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const employees = await getEmployees();
    expect(employees).toHaveLength(1);
    expect(employees[0].role).toBe('PHOTOGRAPHER');
  });

  it('3. Excludes users with CUSTOMER role or non-active status from workforce list', async () => {
    const customerProfile = {
      id: 'usr-customer-1',
      full_name: 'Nguyen Van Khach',
      email: 'khach@gmail.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };

    const bannedProfile = {
      id: 'usr-staff-banned',
      full_name: 'Staff Banned',
      email: 'banned@maisonmipa.vn',
      role: 'STAFF',
      staff_role: 'PHOTOGRAPHER',
      status: 'BANNED',
    };

    const validStaffProfile = {
      id: 'usr-valid-staff',
      full_name: 'Staff Hop Le',
      email: 'hople@maisonmipa.vn',
      role: 'STAFF',
      staff_role: 'MAKEUP',
      status: 'ACTIVE',
    };

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'employees') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        } as any;
      }
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: [customerProfile, bannedProfile, validStaffProfile],
              error: null,
            }),
          }),
        } as any;
      }
      return {} as any;
    });

    const employees = await getEmployees();
    expect(employees).toHaveLength(1);
    expect(employees[0].name).toBe('Staff Hop Le');
    expect(employees[0].role).toBe('MAKEUP');
  });
});
