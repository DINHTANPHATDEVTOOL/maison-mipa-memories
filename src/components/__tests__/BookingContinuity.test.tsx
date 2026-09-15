import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';

describe('Booking Continuity and Fail-Closed Validation', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  it('preserves concept when initialConceptSlug is provided in URL', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialConceptSlug="parisian-romance"
      />
    );

    // Wait for concept resolution
    await waitFor(() => {
      // Top compact summary should display the concept
      const conceptSummary = screen.queryByText(/Parisian Romance/i);
      expect(conceptSummary).toBeInTheDocument();
    });
  });

  it('preselects valid matching service and package with authoritative price', async () => {
    const serviceId = 'c0000000-0000-0000-0000-000000000001'; // Couple
    const packageId = 'd0000000-0000-0000-0000-000000000001'; // MIPA BASIC

    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={serviceId}
        initialPackageId={packageId}
      />
    );

    await waitFor(() => {
      // Summary displays authoritative matching data
      expect(screen.getAllByText(/Couple Photography/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/MIPA BASIC/i)).toBeInTheDocument();
      expect(screen.getByText(/1.290.000\s*đ/i)).toBeInTheDocument();
    });
  });

  it('fails closed when package does not belong to service and prevents silent substitution', async () => {
    const weddingServiceId = 'c0000000-0000-0000-0000-000000000002'; // Wedding
    const couplePackageId = 'd0000000-0000-0000-0000-000000000001'; // Couple Basic (Mismatch!)

    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={weddingServiceId}
        initialPackageId={couplePackageId}
      />
    );

    // Should fail closed, display mismatch error, and not silently substitute
    await waitFor(() => {
      const errorMsg = screen.getAllByText(/Gói chụp không thuộc dịch vụ đã chọn/i);
      expect(errorMsg.length).toBeGreaterThan(0);
    });

    // Should be at Step 2 requesting user reselection
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Trying to advance without picking a valid package is blocked
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText(/Vui lòng chọn một gói chụp hợp lệ cho dịch vụ này để tiếp tục/i)).toBeInTheDocument();
  });
});
