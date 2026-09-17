// ==============================================================================
// Maison MIPA Memories - Booking Draft Validation & Deep-Link Test Suite
// Audits authoritative fail-closed validation, login continuity, and presentation modes.
// ==============================================================================
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';
import { App } from '../../App';
import type { Booking } from '../../types';
import { resetInMemoryBookings } from '../../services/bookingService';

const VALID_SERVICE_ID = 'c0000000-0000-0000-0000-000000000001'; // Couple
const VALID_PACKAGE_ID = 'd0000000-0000-0000-0000-000000000001'; // MIPA BASIC (belongs to Couple)
const VALID_CONCEPT_ID = 'c1000000-0000-0000-0000-000000000001'; // Parisian Romance (belongs to Couple)
const VALID_STUDIO_ID = 'f0000000-0000-0000-0000-000000000001';  // Maison Room 01
const VALID_ADDON_ID = 'e0000000-0000-0000-0000-000000000001';   // Makeup

const WEDDING_SERVICE_ID = 'c0000000-0000-0000-0000-000000000002'; // Wedding
const WEDDING_PACKAGE_ID = 'd0000000-0000-0000-0000-000000000011'; // Wedding Basic
const WEDDING_CONCEPT_ID = 'c1000000-0000-0000-0000-000000000003'; // French Haute Couture (belongs to Wedding)

describe('Booking Auth Resume & Continuity in App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    window.history.pushState({}, '', '/');
  });

  it('navigates CUSTOMER to /booking?resume=1 instead of /account when pending booking exists', async () => {
    const draftData = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draftData));

    render(<App />);

    // Open auth modal
    const loginBtn = screen.getByRole('button', { name: /Đăng nhập/i });
    fireEvent.click(loginBtn);

    // Enter customer credentials
    const identifierInput = screen.getByPlaceholderText(/Nhập email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    fireEvent.change(identifierInput, { target: { value: 'minhanh.nguyen@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securePass123' } });

    const submitBtn = screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });
    fireEvent.click(submitBtn);

    // Should navigate to /booking?resume=1, NOT /account
    await waitFor(() => {
      expect(window.location.pathname).toBe('/booking');
      expect(window.location.search).toContain('resume=1');
    });
  });

  it('navigates normal CUSTOMER login to /account when no pending booking exists', async () => {
    sessionStorage.removeItem('mipa_pending_booking');

    render(<App />);

    const loginBtn = screen.getByRole('button', { name: /Đăng nhập/i });
    fireEvent.click(loginBtn);

    const identifierInput = screen.getByPlaceholderText(/Nhập email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    fireEvent.change(identifierInput, { target: { value: 'minhanh.nguyen@gmail.com' } });
    fireEvent.change(passwordInput, { target: { value: 'securePass123' } });

    const submitBtn = screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/account');
    });
  });

  it('preserves staff role redirect even if sessionStorage has pending booking', async () => {
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify({ serviceId: VALID_SERVICE_ID }));

    render(<App />);

    const loginBtn = screen.getByRole('button', { name: /Đăng nhập/i });
    fireEvent.click(loginBtn);

    const identifierInput = screen.getByPlaceholderText(/Nhập email/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);
    fireEvent.change(identifierInput, { target: { value: 'minh.photographer@maisonmipa.vn' } });
    fireEvent.change(passwordInput, { target: { value: 'securePass123' } });

    const submitBtn = screen.getByRole('button', { name: /ĐĂNG NHẬP VÀO HỆ THỐNG/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/staff');
    });
  });
});

describe('Authoritative Draft Restoration & Fail-Closed Validation', () => {
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
    resetInMemoryBookings();
  });

  it('restores valid service, package, concept, addons, studio, date, time and clears sessionStorage', async () => {
    const validDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      addonIds: [VALID_ADDON_ID],
      date: '2026-11-20',
      timeSlot: '15:30',
      customerName: 'Hoàng Lan',
      customerPhone: '0988 777 666',
      customerEmail: 'hoanglan@example.com',
      occasion: 'Kỷ niệm',
      customerNote: 'Nến và hoa',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(validDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Waits for catalog and restores to Step 5
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Verify summary and form display authoritative data
    expect(screen.getAllByText(/Couple Photography/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/MIPA BASIC/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Parisian Romance/i).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Hoàng Lan')).toBeInTheDocument();
    expect(screen.getByDisplayValue('0988 777 666')).toBeInTheDocument();
    expect(screen.getByDisplayValue('hoanglan@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Nến và hoa')).toBeInTheDocument();

    // Draft is retained on Step 5 before booking creation
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();

    // Advance to Step 6 (creates booking)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));
    await waitFor(() => {
      expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
    });

    // Session draft consumed only after successful booking creation
    expect(sessionStorage.getItem('mipa_pending_booking')).toBeNull();
  });

  it('rejects draft when package belongs to another service and returns to Step 2 without jumping to Step 5', async () => {
    // Couple service with Wedding package (mismatch!)
    const invalidDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: WEDDING_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(invalidDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Should stop at Step 2 with explicit mismatch error
    await waitFor(() => {
      expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Gói chụp trước đó không còn phù hợp với dịch vụ đã chọn/i).length).toBeGreaterThan(0);
    });

    // Never jumped to Step 5
    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
  });

  it('allows draft when concept belongs to another service (cross-service permitted by contract)', async () => {
    // Couple service with Wedding concept (cross-service permitted by authoritative contract)
    const validDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [WEDDING_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(validDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Successfully restores to Step 5
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Draft is retained on Step 5
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();
  });

  it('rejects draft when studio does not exist and returns to Step 3', async () => {
    const invalidDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: 'unknown-studio-uuid',
      date: '2026-11-20',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(invalidDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Phòng studio trước đó không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
  });

  it('safely ignores unknown addon and does not block valid draft booking', async () => {
    const draftWithUnknownAddon = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      addonIds: ['non-existent-addon-id', VALID_ADDON_ID],
      date: '2026-11-20',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draftWithUnknownAddon));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Successfully navigates to Step 5
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Unknown addon was safely ignored, valid addon was restored, draft retained on Step 5
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();
  });

  it('rejects draft when restored date is in the past and returns to Step 3 without consuming draft', async () => {
    const pastDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2020-01-01',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(pastDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ngày chụp trước đó không còn hợp lệ/i).length).toBeGreaterThan(0);
    });

    // Draft is NOT consumed from sessionStorage
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();
    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
  });

  it('rejects draft when restored slot is BOOKED and returns to Step 3 without consuming draft', async () => {
    const bookedBooking = {
      id: 'b-booked-1',
      bookingCode: 'MIPA-BK1',
      studioId: VALID_STUDIO_ID,
      bookingDate: '2026-11-20',
      startTime: '10:00',
      endTime: '12:00',
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'DEPOSIT_PAID',
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      customerName: 'Existing Customer',
      customerEmail: 'exist@mipa.vn',
      customerPhone: '0900000000',
      createdAt: '2026-09-01T00:00:00Z',
    } as unknown as Booking;

    const bookedDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '10:00', // Matches bookedBooking
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(bookedDraft));

    renderWithAuth(<BookingWizard {...defaultProps} existingBookings={[bookedBooking]} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Khung giờ trước đó không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    // Draft is NOT consumed from sessionStorage
    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();
    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
  });

  it('rejects draft when restored slot does not exist in operating hours', async () => {
    const invalidSlotDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '23:30', // outside operating hours
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(invalidSlotDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Khung giờ trước đó không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    expect(sessionStorage.getItem('mipa_pending_booking')).not.toBeNull();
    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
  });

  it('revalidates voucherCode on restore and does not trust invalid code', async () => {
    const invalidVoucherDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
      voucherCode: 'FAKE_DISCOUNT_99',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(invalidVoucherDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Input has the code restored
    expect(screen.getByDisplayValue('FAKE_DISCOUNT_99')).toBeInTheDocument();
    // But discount is NOT applied (0% discount)
    expect(screen.queryByText(/-20%/i)).not.toBeInTheDocument();
  });

  it('revalidates valid voucherCode (MIPA20) on restore and applies discount', async () => {
    const validVoucherDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
      voucherCode: 'MIPA20',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(validVoucherDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue('MIPA20')).toBeInTheDocument();
    // Discount is applied
    expect(screen.getAllByText(/Ưu đãi/i).length).toBeGreaterThan(0);
  });
});

describe('Strict Deep-Link Query Parameter Validations', () => {
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
  });

  it('?service=does-not-exist -> shows explicit error and does not substitute first service', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId="non-existent-service-slug"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Dịch vụ được chọn không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/Bước 1\/6/i)).toBeInTheDocument();
  });

  it('?package=does-not-exist -> shows explicit error on Step 2 without silent substitution', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={VALID_SERVICE_ID}
        initialPackageId="non-existent-package-id"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Gói chụp không tồn tại hoặc đã ngừng cung cấp/i).length).toBeGreaterThan(0);
    });
  });

  it('?concept=does-not-exist -> shows explicit error without picking arbitrary concept', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialConceptSlug="non-existent-concept-slug"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Concept được chọn không tồn tại hoặc đã ngừng cung cấp/i).length).toBeGreaterThan(0);
    });
  });

  it('?service=A&package=B (mismatch) -> shows explicit mismatch and does not switch service', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={WEDDING_SERVICE_ID}
        initialPackageId={VALID_PACKAGE_ID} // Couple package
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Gói chụp không thuộc dịch vụ đã chọn/i).length).toBeGreaterThan(0);
    });
  });

  it('?service=A&concept=B (cross-service) -> keeps service A and concept B selected', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={WEDDING_SERVICE_ID}
        initialConceptSlug="parisian-romance" // Couple concept
      />
    );

    await waitFor(() => {
      // Must not show conflict error, must keep both selected
      expect(screen.queryByText(/Concept đã chọn không thuộc dịch vụ yêu cầu/i)).toBeNull();
      expect(screen.getAllByText(/Pre-Wedding & Studio Wedding/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Parisian Romance/i).length).toBeGreaterThan(0);
    });
  });

  it('valid concept with service relation and no service param derives service from concept', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialConceptSlug="french-haute-couture" // Wedding concept
      />
    );

    await waitFor(() => {
      // Service should be derived as Pre-Wedding & Studio Wedding
      expect(screen.getAllByText(/Pre-Wedding & Studio Wedding/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/French Haute Couture/i).length).toBeGreaterThan(0);
    });
  });

  it('?service=invalid&package=valid keeps Step 1 error and does not advance to Step 2', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId="non-existent-service-slug"
        initialPackageId={VALID_PACKAGE_ID}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Dịch vụ được chọn không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    // Must remain strictly at Step 1, package check must not override to Step 2
    expect(screen.getByText(/Bước 1\/6/i)).toBeInTheDocument();
    expect(screen.queryByText(/Bước 2\/6/i)).toBeNull();
  });
});

describe('Concept Requirement Policy & Presentation Mode', () => {
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
  });

  it('allows advancing from Step 2 to Step 3 when 0 concepts are selected (optional concepts)', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={VALID_SERVICE_ID}
        initialPackageId={VALID_PACKAGE_ID}
        initialConceptSlug="non-existent-concept" // causes 0 selected concepts
      />
    );

    // Initial load starts on Step 1
    await waitFor(() => {
      expect(screen.getByText(/Bước 1\/6/i)).toBeInTheDocument();
    });

    // Advance to Step 2
    const nextBtnStep1 = screen.getByRole('button', { name: /Tiếp theo/i });
    fireEvent.click(nextBtnStep1);

    await waitFor(() => {
      expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
    });

    // Advance to Step 3 without selecting a concept (optional)
    const nextBtnStep2 = screen.getByRole('button', { name: /Tiếp theo/i });
    fireEvent.click(nextBtnStep2);

    // Advances to Step 3
    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
    });
  });

  it('renders in standalone PAGE presentation mode without modal overlay', () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        presentation="PAGE"
      />
    );

    // .booking-wizard-page-wrapper should be present
    expect(document.querySelector('.booking-wizard-page-wrapper')).toBeInTheDocument();
    // .modal-overlay should NOT be present
    expect(document.querySelector('.modal-overlay')).toBeNull();
  });
});

describe('Pre-Submit Slot Race Protection & Guest Draft Contract', () => {
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
    resetInMemoryBookings();
  });

  it('handleGuestAuthRedirect saves complete customer form fields and version 1 without computed totals', async () => {
    const onRequireAuthMock = vi.fn();
    renderWithAuth(<BookingWizard {...defaultProps} onRequireAuth={onRequireAuthMock} />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));
    // Step 2 -> Step 3
    await waitFor(() => screen.getByText(/Bước 2\/6/i));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));
    // Step 3 -> Step 4
    await waitFor(() => screen.getByText(/Bước 3\/6/i));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));
    // Step 4 -> Step 5
    await waitFor(() => screen.getByText(/Bước 4\/6/i));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));

    await waitFor(() => screen.getByText(/Bước 5\/6/i));

    // Fill customer fields
    const nameInput = screen.getByPlaceholderText(/Họ và tên/i);
    const phoneInput = screen.getByPlaceholderText(/Số điện thoại/i);
    const emailInput = screen.getByPlaceholderText(/^Email$/i);

    fireEvent.change(nameInput, { target: { value: 'Trần Thị Thảo' } });
    fireEvent.change(phoneInput, { target: { value: '0912 345 678' } });
    fireEvent.change(emailInput, { target: { value: 'thao.tran@example.com' } });

    // Click "Đăng Nhập" in guest banner
    const loginBtn = screen.getByRole('button', { name: /Đăng Nhập/i });
    fireEvent.click(loginBtn);

    const saved = sessionStorage.getItem('mipa_pending_booking');
    expect(saved).not.toBeNull();
    const draft = JSON.parse(saved!);

    expect(draft.version).toBe(1);
    expect(draft.customerName).toBe('Trần Thị Thảo');
    expect(draft.customerPhone).toBe('0912 345 678');
    expect(draft.customerEmail).toBe('thao.tran@example.com');
    expect(draft.serviceId).toBeDefined();
    expect(draft.packageId).toBeDefined();
    expect(draft.studioId).toBeDefined();
    expect(draft.date).toBeDefined();
    expect(draft.timeSlot).toBeDefined();

    // Ensure NO computed totals or pricing leaked into draft
    expect(draft.totalAmount).toBeUndefined();
    expect(draft.depositAmount).toBeUndefined();
    expect(draft.price).toBeUndefined();
    expect(draft.packageName).toBeUndefined();
    expect(draft.serviceName).toBeUndefined();
  });

  it('blocks createBooking and returns to Step 3 if authoritative availability detects slot is BOOKED right before payment', async () => {
    // Restored valid draft to Step 5
    const validDraft = {
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
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(validDraft));

    // Initially no conflicting bookings
    const existingBookings: Booking[] = [];
    const { rerender } = renderWithAuth(
      <BookingWizard {...defaultProps} existingBookings={existingBookings} />
    );

    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    const conflictingBooking = {
      id: 'conflict-1',
      bookingCode: 'MIPA-CONF',
      studioId: VALID_STUDIO_ID,
      bookingDate: '2026-11-20',
      startTime: '15:30',
      endTime: '17:30',
      bookingStatus: 'CONFIRMED',
      paymentStatus: 'DEPOSIT_PAID',
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      customerName: 'Concurrent User',
      customerEmail: 'concurrent@mipa.vn',
      customerPhone: '0900000001',
      createdAt: '2026-09-01T00:00:00Z',
    } as unknown as Booking;

    rerender(
      <AuthProvider>
        <BookingWizard {...defaultProps} existingBookings={[conflictingBooking]} />
      </AuthProvider>
    );

    // User attempts to proceed to payment from Step 5
    const proceedBtn = screen.getByRole('button', { name: /Tiếp theo/i });
    fireEvent.click(proceedBtn);

    // Pre-submit slot re-fetch should detect conflict, return to Step 3, and display error
    await waitFor(() => {
      expect(screen.getByText(/Bước 3\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Khung giờ đã thay đổi hoặc không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    // Did NOT advance to Step 6
    expect(screen.queryByText(/Bước 6\/6/i)).toBeNull();
  });

  it('calls onFinish in PAGE mode when clicking confirmation button', async () => {
    const onFinishMock = vi.fn();
    const onCloseMock = vi.fn();

    // Step 5 draft to immediately reach payment
    const validDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-25',
      timeSlot: '15:30',
      customerName: 'Hoàng Lan',
      customerPhone: '0988 777 666',
      customerEmail: 'hoanglan@example.com',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(validDraft));

    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        presentation="PAGE"
        onClose={onCloseMock}
        onFinish={onFinishMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Step 5 -> Step 6 (Consultation request confirmation screen)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Yêu cầu tư vấn đã được gửi/i).length).toBeGreaterThanOrEqual(1);
    });

    // Button in PAGE mode must say "Về trang chủ"
    const homeBtn = screen.getByRole('button', { name: /Về trang chủ/i });
    expect(homeBtn).toBeInTheDocument();
    fireEvent.click(homeBtn);

    expect(onFinishMock).toHaveBeenCalledTimes(1);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('calls onClose in MODAL mode when clicking confirmation button', async () => {
    const onCloseMock = vi.fn();

    const validDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [VALID_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-26',
      timeSlot: '15:30',
      customerName: 'Hoàng Lan',
      customerPhone: '0988 777 666',
      customerEmail: 'hoanglan@example.com',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(validDraft));

    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        presentation="MODAL"
        onClose={onCloseMock}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Step 5 -> Step 6 (Consultation request confirmation screen)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Yêu cầu tư vấn đã được gửi/i).length).toBeGreaterThanOrEqual(1);
    });

    // Button in MODAL mode says "Hoàn tất"
    const finishBtn = screen.getByRole('button', { name: /Hoàn tất/i });
    expect(finishBtn).toBeInTheDocument();
    fireEvent.click(finishBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });
});
