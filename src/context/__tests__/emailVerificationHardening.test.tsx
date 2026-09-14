// ==============================================================================
// Maison MIPA Memories - P0 Email Verification Hardening Tests
// Verification that unconfirmed users are denied across all auth entrypoints
// and that verification is authoritative from Supabase Auth.
// ==============================================================================
import React from 'react';
import { renderHook, act, waitFor, render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AuthProvider, useAuth } from '../AuthContext';
import { AuthModal } from '../../components/auth/AuthModal';
import { supabase } from '../../lib/supabase';
import type { DatabaseRole } from '../../types/database';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(() => true),
    isDemoModeEnabled: vi.fn(() => false),
    supabase: {
      auth: {
        getSession: vi.fn(),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn(),
        resend: vi.fn(),
        resetPasswordForEmail: vi.fn(),
      },
      from: vi.fn(),
    },
  };
});

describe('P0 Hotfix: Email Verification Hardening & Fail-Closed Policy', () => {
  let mockAuthStateChangeCallback: (event: string, session: any) => void;

  beforeEach(() => {
    vi.clearAllMocks();

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

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: null },
      error: null,
    });

    (supabase.auth.signOut as any).mockResolvedValue({ error: null });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  it('1. signup with session returned unexpectedly -> signed out, session cleared, and denied with config error', async () => {
    // Simulate Supabase returning a session immediately upon signUp despite email unconfirmed
    const mockUnconfirmedUser = {
      id: 'unconfirmed_user_1',
      email: 'unconfirmed@maisonmipa.vn',
      email_confirmed_at: null,
    };
    const mockUnexpectedSession = {
      user: mockUnconfirmedUser,
      access_token: 'unexpected-jwt-token',
    };

    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: mockUnconfirmedUser, session: mockUnexpectedSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let regResult: any;
    await act(async () => {
      regResult = await result.current.register({
        fullName: 'Nguyễn Văn A',
        email: 'unconfirmed@maisonmipa.vn',
        password: 'Password123!',
        phone: '0901234567',
      });
    });

    // Must fail closed
    expect(regResult.success).toBe(false);
    expect(regResult.error).toContain('xác thực email bắt buộc');
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toContain('xác thực email');
  });

  it('2. unconfirmed login -> denied, signed out, session and user cleared', async () => {
    const mockUnconfirmedUser = {
      id: 'unconfirmed_user_2',
      email: 'pending@maisonmipa.vn',
      email_confirmed_at: null,
    };
    const mockSession = {
      user: mockUnconfirmedUser,
      access_token: 'fake-session-token',
    };

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockUnconfirmedUser, session: mockSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login('pending@maisonmipa.vn', 'Password123!');
    });

    // Authoritative check must reject unconfirmed user
    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toContain('chưa được xác thực email');
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toContain('chưa được xác thực email');
  });

  it('3. persisted unconfirmed session -> denied and signed out on initialization', async () => {
    const mockUnconfirmedUser = {
      id: 'persisted_unconfirmed_3',
      email: 'persisted@maisonmipa.vn',
      email_confirmed_at: null,
    };
    const mockPersistedSession = {
      user: mockUnconfirmedUser,
      access_token: 'persisted-jwt-token',
    };

    (supabase.auth.getSession as any).mockResolvedValue({
      data: { session: mockPersistedSession },
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // initializeAuth must deny unconfirmed session
    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toContain('chưa được xác thực email');
  });

  it('4. auth-state event with unconfirmed session -> denied and signed out', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const mockUnconfirmedUser = {
      id: 'stream_unconfirmed_4',
      email: 'stream@maisonmipa.vn',
      email_confirmed_at: null,
    };
    const mockSession = {
      user: mockUnconfirmedUser,
      access_token: 'stream-token',
    };

    // Trigger onAuthStateChange SIGNED_IN event with unconfirmed session
    await act(async () => {
      mockAuthStateChangeCallback('SIGNED_IN', mockSession);
    });

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.authError).toContain('chưa được xác thực email');
  });

  it('5. confirmed user -> allowed to login and session is properly set', async () => {
    const mockConfirmedUser = {
      id: 'confirmed_user_5',
      email: 'confirmed@maisonmipa.vn',
      email_confirmed_at: '2026-09-11T10:00:00Z',
    };
    const mockSession = {
      user: mockConfirmedUser,
      access_token: 'valid-confirmed-jwt',
    };

    (supabase.auth.signInWithPassword as any).mockResolvedValue({
      data: { user: mockConfirmedUser, session: mockSession },
      error: null,
    });

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'confirmed_user_5',
              email: 'confirmed@maisonmipa.vn',
              full_name: 'Khách Hàng Đã Xác Thực',
              phone: '0901234567',
              role: 'CUSTOMER' as DatabaseRole,
              staff_role: null,
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

    let loginResult: any;
    await act(async () => {
      loginResult = await result.current.login('confirmed@maisonmipa.vn', 'ValidPassword123');
    });

    expect(loginResult.success).toBe(true);
    expect(result.current.user).not.toBeNull();
    expect(result.current.user?.email).toBe('confirmed@maisonmipa.vn');
    expect(result.current.user?.fullName).toBe('Khách Hàng Đã Xác Thực');
    expect(result.current.session).toBe(mockSession);
    expect(result.current.authError).toBeNull();
  });

  it('6. SUSPENDED/DISABLED accounts are NEVER reactivated by verification trigger in migration 7', () => {
    const migration7Path = path.resolve(__dirname, '../../../supabase/migrations/20260911000001_email_verification_hardening.sql');
    const migration7Sql = fs.readFileSync(migration7Path, 'utf-8');

    // Verification trigger function must strictly target only PENDING_VERIFICATION
    expect(migration7Sql).toContain('CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()');
    expect(migration7Sql).toMatch(
      /UPDATE public\.profiles\s+SET\s+status\s*=\s*'ACTIVE'[\s\S]*?WHERE\s+id\s*=\s*NEW\.id\s+AND\s+status\s*=\s*'PENDING_VERIFICATION';/i
    );

    // handle_new_user trigger function must preserve SUSPENDED or DISABLED on upsert conflict
    expect(migration7Sql).toMatch(
      /WHEN\s+public\.profiles\.status\s+IN\s*\('SUSPENDED',\s*'DISABLED'\)\s+THEN\s+public\.profiles\.status/i
    );

    // Initial status assignment sets PENDING_VERIFICATION if email_confirmed_at IS NULL
    expect(migration7Sql).toContain("v_initial_status := 'PENDING_VERIFICATION';");
  });

  it('7. "Quay Lại Đăng Nhập" does not authenticate user and replaces misleading button', async () => {
    (supabase.auth.signUp as any).mockResolvedValue({
      data: {
        user: { id: 'pending_signup_id', email: 'pending_signup@example.com', email_confirmed_at: null },
        session: null,
      },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} initialTab="REGISTER" />
      </AuthProvider>
    );

    // Fill form and submit
    const nameInput = screen.getByPlaceholderText(/Nguyễn Văn A/i);
    const emailInput = screen.getByPlaceholderText(/user@example.com/i);
    const passInput = screen.getByPlaceholderText(/Mật khẩu của bạn/i);
    const submitBtn = await screen.findByRole('button', { name: /ĐĂNG KÝ TÀI KHOẢN NGAY/i });

    fireEvent.change(nameInput, { target: { value: 'Test User' } });
    fireEvent.change(emailInput, { target: { value: 'pending_signup@example.com' } });
    fireEvent.change(passInput, { target: { value: 'SecretPassword123' } });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Verification notice screen should appear
    await waitFor(() => {
      expect(screen.getByText(/Xác Thực Tài Khoản Email/i)).toBeInTheDocument();
    });

    // The misleading text must NOT exist
    expect(screen.queryByText(/Đã Xác Thực • Đăng Nhập Ngay/i)).toBeNull();

    // The correct button must exist
    const backToLoginBtn = screen.getByRole('button', { name: /Quay Lại Đăng Nhập/i });
    expect(backToLoginBtn).toBeInTheDocument();

    // Click "Quay Lại Đăng Nhập"
    await act(async () => {
      fireEvent.click(backToLoginBtn);
    });

    // Must switch back to login form WITHOUT authenticating
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i })).toBeInTheDocument();
    });

    // Verification must not call signInWithPassword or establish a session
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });
});
