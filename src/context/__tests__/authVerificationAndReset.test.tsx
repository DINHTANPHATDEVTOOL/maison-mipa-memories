import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../AuthContext';
import { AuthModal } from '../../components/auth/AuthModal';
import { ResetPasswordPage } from '../../pages/ResetPasswordPage';
import { BrowserRouter } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

// Mock Supabase
vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(() => true),
    isDemoModeEnabled: vi.fn(() => false),
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        resetPasswordForEmail: vi.fn(),
        updateUser: vi.fn(),
        resend: vi.fn(),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    },
  };
});

describe('Issue #17: Auth Verification, Cooldown & Password Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.auth.getSession as any).mockResolvedValue({ data: { session: null }, error: null });
  });

  const renderAuthModal = (initialTab: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    return render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} initialTab={initialTab} />
      </AuthProvider>
    );
  };

  it('1. customer signup displays email verification screen with cooldown notice', async () => {
    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: { id: 'new_cust_1', email: 'testcustomer@example.com' }, session: null },
      error: null,
    });

    renderAuthModal('REGISTER');

    // Wait for auth initialization to finish loading
    const submitBtn = await screen.findByRole('button', { name: /ĐĂNG KÝ TÀI KHOẢN NGAY/i });
    expect(submitBtn).not.toBeDisabled();

    // Fill registration form
    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), {
      target: { value: 'Trần Minh Tâm' },
    });
    fireEvent.change(screen.getByPlaceholderText(/user@example.com/i), {
      target: { value: 'testcustomer@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu của bạn/i), {
      target: { value: 'SecurePass@2026' },
    });

    // Submit registration
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    // Verification notice screen appears
    await waitFor(() => {
      expect(screen.getByText(/Xác Thực Tài Khoản Email/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/testcustomer@example.com/i)).toBeInTheDocument();

    // Resend button should initially be in cooldown (60s)
    const resendBtn = screen.getByRole('button', { name: /Gửi lại sau/i });
    expect(resendBtn).toBeDisabled();
    expect(resendBtn).toHaveTextContent(/Gửi lại sau \(60s\)/i);
  });

  it('2. resend verification cooldown counts down to 0 and re-enables resend button', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });

    (supabase.auth.signUp as any).mockResolvedValue({
      data: { user: { id: 'new_cust_2', email: 'cooldown@example.com' }, session: null },
      error: null,
    });
    (supabase.auth.resend as any).mockResolvedValue({ error: null });

    renderAuthModal('REGISTER');

    // Wait for button to be available
    const submitBtn = await screen.findByRole('button', { name: /ĐĂNG KÝ TÀI KHOẢN NGAY/i });

    fireEvent.change(screen.getByPlaceholderText(/Nguyễn Văn A/i), {
      target: { value: 'Lê Văn An' },
    });
    fireEvent.change(screen.getByPlaceholderText(/user@example.com/i), {
      target: { value: 'cooldown@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Mật khẩu của bạn/i), {
      target: { value: 'SecurePass@2026' },
    });

    await act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Xác Thực Tài Khoản Email/i)).toBeInTheDocument();
    });

    // Advance 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    expect(screen.getByRole('button', { name: /Gửi lại sau \(30s\)/i })).toBeDisabled();

    // Advance remaining 30 seconds
    act(() => {
      vi.advanceTimersByTime(30000);
    });

    // Button should now be active
    const activeResendBtn = screen.getByRole('button', { name: /Gửi Lại Email Xác Thực/i });
    expect(activeResendBtn).not.toBeDisabled();

    // Click resend
    await act(async () => {
      fireEvent.click(activeResendBtn);
    });

    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'cooldown@example.com',
    });

    // Resets cooldown back to 60s
    expect(screen.getByRole('button', { name: /Gửi lại sau \(60s\)/i })).toBeDisabled();

    vi.useRealTimers();
  });

  it('3. forgot password flow submits reset request and provides feedback', async () => {
    (supabase.auth.resetPasswordForEmail as any).mockResolvedValue({ error: null });

    renderAuthModal('LOGIN');

    // Wait for login form
    await screen.findByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });

    // Click "Quên mật khẩu?"
    const forgotLink = screen.getByRole('button', { name: /Quên mật khẩu\?/i });
    fireEvent.click(forgotLink);

    expect(screen.getByText(/Khôi Phục Mật Khẩu/i)).toBeInTheDocument();

    // Fill email
    fireEvent.change(screen.getByPlaceholderText(/user@example.com/i), {
      target: { value: 'reset@example.com' },
    });

    // Submit
    const resetBtn = screen.getByRole('button', { name: /Gửi Liên Kết Đặt Lại Mật Khẩu/i });
    await act(async () => {
      fireEvent.click(resetBtn);
    });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'reset@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/reset-password'),
      })
    );

    expect(screen.getByText(/Đã Gửi Email Khôi Phục!/i)).toBeInTheDocument();
  });

  it('4. ResetPasswordPage allows updating password and handles validation', async () => {
    (supabase.auth.updateUser as any).mockResolvedValue({ error: null });

    render(
      <BrowserRouter>
        <AuthProvider>
          <ResetPasswordPage />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText(/Thiết Lập Mật Khẩu Mới/i)).toBeInTheDocument();

    const newPassInput = screen.getByPlaceholderText(/Ít nhất 6 ký tự\.\.\./i);
    const confirmPassInput = screen.getByPlaceholderText(/Nhập lại mật khẩu mới\.\.\./i);
    const submitBtn = screen.getByRole('button', { name: /Xác Nhận Đổi Mật Khẩu/i });

    // Mismatched passwords
    fireEvent.change(newPassInput, { target: { value: 'Password@1' } });
    fireEvent.change(confirmPassInput, { target: { value: 'Mismatch@2' } });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(screen.getByText(/Mật khẩu xác nhận không khớp/i)).toBeInTheDocument();

    // Matching valid password
    fireEvent.change(confirmPassInput, { target: { value: 'Password@1' } });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Password@1' });
    expect(screen.getByText(/Đổi mật khẩu thành công!/i)).toBeInTheDocument();
  });
});
