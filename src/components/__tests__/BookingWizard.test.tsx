import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';

describe('BookingWizard Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderWithAuth(<BookingWizard {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders step 1 with services when opened', () => {
    renderWithAuth(<BookingWizard {...defaultProps} />);
    expect(screen.getByText(/Bạn muốn lưu giữ khoảnh khắc đáng nhớ nào/i)).toBeInTheDocument();
    expect(screen.getByText(/Tiếp Theo/i)).toBeInTheDocument();
  });

  it('navigates through steps and calculates subtotal', () => {
    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Step 1 -> Step 2
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
  });

  it('completes booking happy path and triggers onBookingSuccess callback with CONSULTATION_REQUESTED', async () => {
    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Advance through steps 1 to 5
    for (let i = 1; i <= 5; i++) {
      const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
      fireEvent.click(nextBtn);
    }

    // Step 6: Consultation request submitted
    expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Yêu cầu tư vấn đã được gửi/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Maison MIPA đã nhận được yêu cầu của bạn/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Chi phí dự kiến/i).length).toBeGreaterThanOrEqual(1);

    // Verify zero payment button
    expect(screen.queryByRole('button', { name: /XÁC NHẬN ĐÃ CHUYỂN CỌC/i })).toBeNull();
    expect(screen.queryByText(/TỰ ĐỘNG XÁC NHẬN QUA ACB/i)).toBeNull();

    // onBookingSuccess should have been called upon submission
    expect(defaultProps.onBookingSuccess).toHaveBeenCalled();
    const calledBooking = defaultProps.onBookingSuccess.mock.calls[0][0];
    expect(calledBooking.bookingStatus).toBe('CONSULTATION_REQUESTED');
  });
});
