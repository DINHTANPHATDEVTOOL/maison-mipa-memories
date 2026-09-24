import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { BookingWizard, DEFAULT_SHOOT_LOCATION } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';
import { INITIAL_SERVICES, INITIAL_PACKAGES } from '../../mockData';

describe('BookingWizard: Consecutive Slots & Shoot Location', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  it('allows customer to edit shoot location and resets to default tiệm ảnh location', async () => {
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

    // Advance Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    // Advance Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();

    // Check default shoot location
    const locationInput = screen.getByLabelText(/Không gian \/ Địa điểm chụp/i) as HTMLTextAreaElement;
    expect(locationInput.value).toBe(DEFAULT_SHOOT_LOCATION);

    // Edit location to custom outdoor spot
    fireEvent.change(locationInput, { target: { value: 'Công viên Tao Đàn, Quận 1 (Chụp ngoại cảnh hoàng hôn)' } });
    expect(locationInput.value).toBe('Công viên Tao Đàn, Quận 1 (Chụp ngoại cảnh hoàng hôn)');

    // Reset button appears and works
    const resetBtn = screen.getByRole('button', { name: /Đặt lại địa chỉ tiệm/i });
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);
    expect(locationInput.value).toBe(DEFAULT_SHOOT_LOCATION);
  });

  it('supports selecting multiple consecutive time slots and reflects in selection banner', async () => {
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

    // Step 1 -> Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    const slotButtons = screen.getAllByRole('button').filter(b => /\d{2}:\d{2}/.test(b.textContent || ''));
    expect(slotButtons.length).toBeGreaterThanOrEqual(2);

    // Click first slot
    fireEvent.click(slotButtons[0]);
    expect(screen.getByText(/Đã chọn ca:/i)).toBeInTheDocument();

    // Click second consecutive slot
    fireEvent.click(slotButtons[1]);
    expect(screen.getByText(/Đang chọn/i)).toBeInTheDocument();
    expect(screen.getByText(/2 ca liên tiếp/i)).toBeInTheDocument();

    // Badge "Ca 1" and "Ca 2" appear
    expect(screen.getByText('Ca 1')).toBeInTheDocument();
    expect(screen.getByText('Ca 2')).toBeInTheDocument();

    // Check extra slot fee text in banner: "+100.000đ phụ thu 1 ca thêm"
    expect(screen.getByText(/\+100\.000đ phụ thu 1 ca thêm/i)).toBeInTheDocument();
  });
});
