// ==============================================================================
// Maison MIPA Memories - Booking Draft Consumption & Stale Draft Prevention Tests
// ==============================================================================
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';
import * as availabilityService from '../../services/availabilityService';
import * as bookingService from '../../services/bookingService';

const VALID_SERVICE_ID = 'c0000000-0000-0000-0000-000000000001'; // Couple
const VALID_PACKAGE_ID = 'd0000000-0000-0000-0000-000000000001'; // MIPA BASIC
const VALID_CONCEPT_ID = 'c1000000-0000-0000-0000-000000000001'; // Parisian Romance
const VALID_STUDIO_ID = 'f0000000-0000-0000-0000-000000000001';  // Maison Room 01

describe('Booking Draft Consumption Lifecycle', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    bookingService.resetInMemoryBookings();
  });

  it('1. Availability failure during draft restore retains draft, manual retry and booking creation consumes draft, and remount does not restore consumed draft', async () => {
    const draftPayload = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
      customerName: 'Hoàng Lan',
      customerPhone: '0988 777 666',
      customerEmail: 'hoanglan@example.com',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draftPayload));

    // Availability call during restore fails for the draft date on 1st attempt
    const originalGetAvailableSlotsSync = availabilityService.getAvailableSlotsSync;
    let failDraftRestore = true;
    vi.spyOn(availabilityService, 'getAvailableSlotsSync').mockImplementation((params) => {
      if (params.date === '2026-11-20' && failDraftRestore) {
        failDraftRestore = false;
        throw new availabilityService.AvailabilityUnavailableError('Temporary availability error');
      }
      return originalGetAvailableSlotsSync(params);
    });

    const { unmount } = renderWithAuth(<BookingWizard {...defaultProps} />);

    // Wizard drops to Step 3 due to temporary error
    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Không thể xác minh lịch trống lúc này/i).length).toBeGreaterThan(0);
    });

    // Draft MUST still remain in sessionStorage!
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();

    // User retries manually: selects slot 15:30
    await waitFor(() => {
      expect(screen.getByText('15:30')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('15:30'));

    // Advance to Step 4
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));
    await waitFor(() => {
      expect(screen.getByText(/Bước 4\/6/i)).toBeInTheDocument();
    });

    // Advance to Step 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Draft is STILL in sessionStorage before booking creation
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();

    // Step 5 -> Step 6 (creates booking record)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
    });

    // Expected: mipa_pending_booking no longer exists in sessionStorage
    expect(sessionStorage.getItem('mipa_pending_booking')).toBeNull();

    // Remount wizard: old draft is NOT restored!
    unmount();
    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      // Must start at Step 1, not restored Step 5
      expect(screen.getByText(/Bước 1\/6/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
  });

  it('2. Failed booking creation retains draft in sessionStorage', async () => {
    const draftPayload = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
      customerName: 'Hoàng Lan',
      customerPhone: '0988 777 666',
      customerEmail: 'hoanglan@example.com',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draftPayload));

    // Mock createBookingInMemory to throw an error
    const createBookingSpy = vi.spyOn(bookingService, 'createBookingInMemory');
    createBookingSpy.mockImplementationOnce(() => {
      throw new Error('Database transaction abort test');
    });

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Restores to Step 5
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Attempt to submit booking
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Database transaction abort test/i)).toBeInTheDocument();
    });

    // Failed booking creation MUST retain draft so user does not lose information
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();
  });
});
