import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';
import { INITIAL_SERVICES, INITIAL_PACKAGES } from '../../mockData';

describe('Booking Wizard Regression Tests (DEF-001, DEF-002, DEF-003, TC-045)', () => {
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

  it('DEF-001: /booking does not auto-select 2.490.000đ package on initial load, subtotal starts at 0đ', async () => {
    const { container } = render(
      <AuthProvider>
        <BookingWizard {...defaultProps} presentation="PAGE" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-catalog-ready="true"]')).toBeInTheDocument();
    });

    // Initial subtotal must be 0đ
    expect(screen.getByText(/Tạm tính: 0đ/i)).toBeInTheDocument();

    // Advancing without selecting a service must be blocked
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Vui lòng chọn một dịch vụ để tiếp tục.')).toBeInTheDocument();
    expect(screen.getByText(/Bước 1\/6/i)).toBeInTheDocument();
  });

  it('TC-045: Step 2 filters concepts to match selected service', async () => {
    const { container } = render(
      <AuthProvider>
        <BookingWizard {...defaultProps} presentation="PAGE" />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-catalog-ready="true"]')).toBeInTheDocument();
    });

    // Select Couple service
    const coupleCard = screen.getByText(/Couple Photography|Ảnh couple/i);
    fireEvent.click(coupleCard);

    // Proceed to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Concept list should not display unrelated concepts like Wedding or Family
    expect(screen.queryByText('French Haute Couture')).toBeNull();
    expect(screen.queryByText('La Famille Douce')).toBeNull();
  });

  it('DEF-002: cannot advance from Step 3 without selecting a time slot', async () => {
    const { container } = render(
      <AuthProvider>
        <BookingWizard
          {...defaultProps}
          presentation="PAGE"
          initialServiceId={INITIAL_SERVICES[0].id}
          initialPackageId={INITIAL_PACKAGES[0].id}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-catalog-ready="true"]')).toBeInTheDocument();
    });

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();

    // Click Next at Step 3 without selecting slot
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);

    // Must be blocked at Step 3 with error
    expect(screen.getByText(/Vui lòng chọn một khung giờ chụp ảnh còn trống trước khi tiếp tục/i)).toBeInTheDocument();
    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
  });

  it('DEF-003: required fields are validated before auth modal or advance at Step 5', async () => {
    const onRequireAuthMock = vi.fn();
    const { container } = render(
      <AuthProvider>
        <BookingWizard
          {...defaultProps}
          presentation="PAGE"
          initialServiceId={INITIAL_SERVICES[0].id}
          initialPackageId={INITIAL_PACKAGES[0].id}
          onRequireAuth={onRequireAuthMock}
        />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(container.querySelector('[data-catalog-ready="true"]')).toBeInTheDocument();
    });

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();

    // Step 3: Pick a time slot
    const slotButtons = screen.getAllByRole('button').filter(b => /\d{2}:\d{2}/.test(b.textContent || ''));
    if (slotButtons.length > 0) {
      fireEvent.click(slotButtons[0]);
    }

    // Step 3 -> Step 4
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 4\/6/i)).toBeInTheDocument();

    // Step 4 -> Step 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();

    // Step 5: Leave fields blank and click Next
    const nameInput = screen.getByPlaceholderText('Họ và tên');
    const phoneInput = screen.getByPlaceholderText('Số điện thoại');
    const emailInput = screen.getByPlaceholderText('Email');

    fireEvent.change(nameInput, { target: { value: '' } });
    fireEvent.change(phoneInput, { target: { value: '' } });
    fireEvent.change(emailInput, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Must show validation errors and NOT trigger auth modal
    expect(onRequireAuthMock).not.toHaveBeenCalled();
    expect(screen.getByText('Vui lòng nhập họ và tên của bạn.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số điện thoại liên hệ.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập địa chỉ email của bạn.')).toBeInTheDocument();
  });
});
