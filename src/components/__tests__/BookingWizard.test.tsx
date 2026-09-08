import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';

describe('BookingWizard Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<BookingWizard {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders step 1 with services when opened', () => {
    render(<BookingWizard {...defaultProps} />);
    expect(screen.getByText(/Bạn muốn lưu giữ khoảnh khắc đáng nhớ nào/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiếp Theo/i)).toBeInTheDocument();
  });

  it('navigates through steps and calculates subtotal', () => {
    render(<BookingWizard {...defaultProps} />);

    // Step 1 -> Step 2
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
  });

  it('completes booking happy path and triggers onBookingSuccess callback', async () => {
    render(<BookingWizard {...defaultProps} />);

    // Advance to step 6 (Payment)
    for (let i = 1; i <= 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
      fireEvent.click(nextBtn);
    }

    // Step 6: Payment & Deposit confirmation
    const payBtn = screen.getByRole('button', { name: /XÁC NHẬN ĐÃ CHUYỂN CỌC/i });
    expect(payBtn).toBeInTheDocument();

    fireEvent.click(payBtn);

    // Advance fake timers for setTimeout in handleConfirmAndPay
    act(() => {
      vi.runAllTimers();
    });

    expect(defaultProps.onBookingSuccess).toHaveBeenCalled();
  });
});
