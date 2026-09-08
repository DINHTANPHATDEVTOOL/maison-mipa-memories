// ==============================================================================
// Maison MIPA Memories - AuthContext & RBAC Tests
// ==============================================================================
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../lib/supabase';
import type { DatabaseRole } from '../../types/database';

// Mock Supabase Client methods
vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(() => true),
    supabase: {
      auth: {
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

describe('AuthContext - RBAC & Production Auth Foundation', () => {
  let mockAuthStateChangeCallback: (event: string, session: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock onAuthStateChange setup
    (supabase.auth.onAuthStateChange as any).mockImplementation((callback: any) => {
      mockAuthStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    // Default mock getSession returns null (unauthenticated)
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('1. Initial unauthenticated user defaults to GUEST role', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBe('GUEST');
    expect(result.current.session).toBeNull();
  });

  it('2. Successfully logs in and maps CUSTOMER role from profiles table', async () => {
    const mockUser = { id: 'cust_123', email: 'customer@maisonmipa.vn' };
    const mockSession = { user: mockUser, access_token: 'fake-jwt-token' };

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    // Mock profiles table query
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'cust_123',
              email: 'customer@maisonmipa.vn',
              full_name: 'Nguyễn Văn Customer',
              phone: '0901234567',
              role: 'CUSTOMER' as DatabaseRole,
              staff_role: null,
              status: 'ACTIVE',
              avatar_url: null,
              created_at: '2026-09-08T00:00:00Z',
              updated_at: '2026-09-08T00:00:00Z',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login('customer@maisonmipa.vn', 'securePassword123');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.fullName).toBe('Nguyễn Văn Customer');
    expect(result.current.role).toBe('CUSTOMER');
    expect(result.current.session).toBe(mockSession);
  });

  it('3. Successfully maps STAFF role and staffRole from database profile', async () => {
    const mockUser = { id: 'staff_123', email: 'photographer@maisonmipa.vn' };
    const mockSession = { user: mockUser, access_token: 'fake-jwt-staff' };

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'staff_123',
              email: 'photographer@maisonmipa.vn',
              full_name: 'Trần Văn Staff',
              phone: '0909998888',
              role: 'STAFF' as DatabaseRole,
              staff_role: 'PHOTOGRAPHER',
              status: 'ACTIVE',
              avatar_url: null,
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('photographer@maisonmipa.vn', 'secretPass123');
    });

    expect(result.current.role).toBe('STAFF');
    expect(result.current.user?.staffRole).toBe('PHOTOGRAPHER');
  });

  it('4. Successfully maps MANAGER role from database profile', async () => {
    const mockUser = { id: 'mgr_123', email: 'manager@maisonmipa.vn' };
    const mockSession = { user: mockUser, access_token: 'fake-jwt-mgr' };

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'mgr_123',
              email: 'manager@maisonmipa.vn',
              full_name: 'Lê Quản Lý',
              phone: '0908887777',
              role: 'MANAGER' as DatabaseRole,
              status: 'ACTIVE',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('manager@maisonmipa.vn', 'mgrPass123');
    });

    expect(result.current.role).toBe('MANAGER');
  });

  it('5. Successfully maps ADMIN role from database profile', async () => {
    const mockUser = { id: 'admin_123', email: 'admin@maisonmipa.vn' };
    const mockSession = { user: mockUser, access_token: 'fake-jwt-admin' };

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUser, session: mockSession },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'admin_123',
              email: 'admin@maisonmipa.vn',
              full_name: 'Quản Trị Viên MIPA',
              phone: '0901112222',
              role: 'ADMIN' as DatabaseRole,
              status: 'ACTIVE',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('admin@maisonmipa.vn', 'adminPass123');
    });

    expect(result.current.role).toBe('ADMIN');
  });

  it('6. Logout clears session and restores GUEST role', async () => {
    const mockUser = { id: 'cust_123', email: 'customer@maisonmipa.vn' };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'cust_123',
              email: 'customer@maisonmipa.vn',
              role: 'CUSTOMER' as DatabaseRole,
              status: 'ACTIVE',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.role).toBe('CUSTOMER'));

    (supabase.auth.signOut as any).mockResolvedValue({ error: null });

    await act(async () => {
      await result.current.logout();
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.role).toBe('GUEST');
    expect(result.current.session).toBeNull();
  });

  it('7. Restores session automatically upon mount and fetches profile', async () => {
    const existingSessionUser = { id: 'restore_user_1', email: 'restored@maisonmipa.vn' };
    const existingSession = { user: existingSessionUser, access_token: 'persisted-jwt' };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: existingSession },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'restore_user_1',
              email: 'restored@maisonmipa.vn',
              full_name: 'Người Dùng Tái Lập',
              role: 'CUSTOMER' as DatabaseRole,
              status: 'ACTIVE',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).not.toBeNull();
    });

    expect(result.current.user?.email).toBe('restored@maisonmipa.vn');
    expect(result.current.role).toBe('CUSTOMER');
    expect(result.current.session).toBe(existingSession);
  });

  it('8. Handles session expiration gracefully via onAuthStateChange SIGNED_OUT', async () => {
    const activeUser = { id: 'expire_user', email: 'expire@maisonmipa.vn' };
    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: { user: activeUser } },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'expire_user',
              email: 'expire@maisonmipa.vn',
              role: 'CUSTOMER' as DatabaseRole,
              status: 'ACTIVE',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.role).toBe('CUSTOMER'));

    // Trigger auth state change event for session timeout/logout
    act(() => {
      mockAuthStateChangeCallback('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.role).toBe('GUEST');
    expect(result.current.session).toBeNull();
  });

  it('9. User cannot elevate role from frontend registration (role is always CUSTOMER from backend trigger)', async () => {
    (supabase.auth.signUp as any).mockResolvedValue({
      data: {
        user: { id: 'new_user_1', email: 'malicious@test.com' },
        session: { user: { id: 'new_user_1', email: 'malicious@test.com' } },
      },
      error: null,
    });

    // Even if client tried to claim ADMIN, backend profiles row returns CUSTOMER
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'new_user_1',
              email: 'malicious@test.com',
              full_name: 'Attacker Trying Admin',
              role: 'CUSTOMER' as DatabaseRole, // Database trigger forced CUSTOMER
              status: 'ACTIVE',
            },
            error: null,
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.register({
        email: 'malicious@test.com',
        password: 'securePassword123',
        fullName: 'Attacker Trying Admin',
      });
    });

    // Role MUST strictly be CUSTOMER, never elevated
    expect(result.current.role).toBe('CUSTOMER');
    expect(result.current.role).not.toBe('ADMIN');

    // Verify that signUp was called without role in options.data
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'malicious@test.com',
      password: 'securePassword123',
      options: {
        data: {
          full_name: 'Attacker Trying Admin',
          phone: '',
        },
      },
    });
  });
});
