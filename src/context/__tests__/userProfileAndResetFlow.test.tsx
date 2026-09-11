import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { CustomerPortal } from '../../components/customer/CustomerPortal';
import { MemoryRouter } from 'react-router-dom';
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
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: {
                id: 'test-user-123',
                email: 'customer@mipa.vn',
                email_confirmed_at: '2026-01-01T00:00:00Z',
                user_metadata: { full_name: 'Nguyễn Văn A', phone: '0901234567' },
              },
            },
          },
          error: null,
        }),
        signInWithPassword: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
        updateUser: vi.fn().mockResolvedValue({ data: { user: {} }, error: null }),
        resend: vi.fn(),
      },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'test-user-123',
                    email: 'customer@mipa.vn',
                    full_name: 'Nguyễn Văn A',
                    phone: '0901234567',
                    role: 'CUSTOMER',
                    status: 'ACTIVE',
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
});

describe('User Profile Editing & Password Reset Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const TestProfileConsumer = () => {
    const { user, updateProfile, resetPassword } = useAuth();
    const [msg, setMsg] = React.useState('');

    return (
      <div>
        <div data-testid="user-name">{user?.fullName}</div>
        <div data-testid="user-phone">{user?.phone}</div>
        <div data-testid="user-email">{user?.email}</div>
        <div data-testid="feedback">{msg}</div>
        <button
          onClick={async () => {
            const res = await updateProfile({ fullName: 'Trần Thị B', phone: '0987654321' });
            if (res.success) setMsg('Cập nhật thành công');
            else setMsg(`Lỗi: ${res.error}`);
          }}
        >
          Cập nhật tên
        </button>
        <button
          onClick={async () => {
            if (user?.email) {
              const res = await resetPassword(user.email);
              if (res.success) setMsg('Đã gửi email đổi mật khẩu');
            }
          }}
        >
          Gửi email đổi mật khẩu
        </button>
      </div>
    );
  };

  it('1. updates user profile in database and updates local user state', async () => {
    render(
      <AuthProvider>
        <TestProfileConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Nguyễn Văn A');
    });

    const updateBtn = screen.getByText('Cập nhật tên');
    fireEvent.click(updateBtn);

    await waitFor(() => {
      expect(screen.getByTestId('feedback').textContent).toBe('Cập nhật thành công');
      expect(screen.getByTestId('user-name').textContent).toBe('Trần Thị B');
      expect(screen.getByTestId('user-phone').textContent).toBe('0987654321');
    });

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({
      data: {
        full_name: 'Trần Thị B',
        phone: '0987654321',
      },
    });
  });

  it('2. sends password reset verification link to verified email', async () => {
    render(
      <AuthProvider>
        <TestProfileConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('customer@mipa.vn');
    });

    const resetBtn = screen.getByText('Gửi email đổi mật khẩu');
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByTestId('feedback').textContent).toBe('Đã gửi email đổi mật khẩu');
    });

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'customer@mipa.vn',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/reset-password'),
      })
    );
  });

  it('3. renders CustomerPortal Profile tab with editable name and password reset button', async () => {
    render(
      <MemoryRouter initialEntries={['/account?tab=profile']}>
        <AuthProvider>
          <CustomerPortal bookings={[]} onOpenBooking={vi.fn()} />
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Thông Tin Cá Nhân/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Bảo Mật & Mật Khẩu/i })).toBeInTheDocument();
      expect(screen.getByDisplayValue('Nguyễn Văn A')).toBeInTheDocument();
      expect(screen.getByText(/Gửi Email Xác Nhận Đổi Mật Khẩu/i)).toBeInTheDocument();
    });
  });
});
