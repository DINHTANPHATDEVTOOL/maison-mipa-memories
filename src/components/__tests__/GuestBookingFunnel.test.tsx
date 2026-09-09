import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';

describe('Guest Booking Funnel & Selection Preservation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
    onRequireAuth: vi.fn(),
  };

  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('allows guest to navigate steps without being blocked by authentication', async () => {
    render(
      <AuthProvider>
        <BookingWizard {...defaultProps} />
      </AuthProvider>
    );

    // Step 1: Service
    expect(screen.getByText(/Bạn muốn lưu giữ khoảnh khắc đáng nhớ nào/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Step 2: Package & Concept
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
    expect(screen.getByText(/Chọn Concept Nghệ Thuật/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Step 3: Date & Studio Slot
    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Step 4: Addons
    expect(screen.getByText(/Bước 4\/6/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Step 5: Customer info with Guest banner
    expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang đặt lịch với tư cách Khách/i)).toBeInTheDocument();
  });

  it('saves selection to sessionStorage when guest clicks login/register from Step 5', async () => {
    const onRequireAuthMock = vi.fn();
    render(
      <AuthProvider>
        <BookingWizard {...defaultProps} onRequireAuth={onRequireAuthMock} />
      </AuthProvider>
    );

    // Navigate to step 5
    for (let i = 1; i <= 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    }

    // Click "Đăng Nhập" in guest banner
    const loginBtn = screen.getByRole('button', { name: /Đăng Nhập/i });
    fireEvent.click(loginBtn);

    // Verify sessionStorage has saved the pending booking
    const saved = sessionStorage.getItem('mipa_pending_booking');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.serviceId).toBeDefined();
    expect(parsed.packageId).toBeDefined();
    expect(parsed.conceptIds).toBeDefined();
    expect(parsed.date).toBeDefined();
    expect(onRequireAuthMock).toHaveBeenCalledWith('LOGIN', expect.any(String));
  });

  it('restores preserved draft from sessionStorage when component mounts', async () => {
    const draftData = {
      serviceId: 'srv-couple',
      packageId: 'pkg-couple-lumiere',
      conceptIds: ['concept-parisian-romance'],
      studioId: 'std-haussmann',
      date: '2026-11-20',
      timeSlot: '15:30',
      customerName: 'Hoàng Lan',
      customerPhone: '0988 777 666',
      customerEmail: 'hoanglan@example.com',
      occasion: 'Kỷ niệm',
      customerNote: 'Hoa hồng trắng và đèn nến',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draftData));

    render(
      <AuthProvider>
        <BookingWizard {...defaultProps} />
      </AuthProvider>
    );

    // Should automatically restore and navigate to Step 5
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Verify draft was consumed from sessionStorage
    expect(sessionStorage.getItem('mipa_pending_booking')).toBeNull();
  });
});
