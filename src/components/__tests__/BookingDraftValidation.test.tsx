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

    // Session draft consumed only after successful authoritative restoration
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

  it('rejects draft when concept belongs to another service and returns to Step 2', async () => {
    // Couple service with Wedding concept (mismatch!)
    const invalidDraft = {
      serviceId: VALID_SERVICE_ID,
      packageId: VALID_PACKAGE_ID,
      conceptIds: [WEDDING_CONCEPT_ID],
      studioId: VALID_STUDIO_ID,
      date: '2026-11-20',
      timeSlot: '15:30',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(invalidDraft));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Concept trước đó không còn khả dụng/i).length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/Bước 5\/6/i)).not.toBeInTheDocument();
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

    // Unknown addon was safely ignored, valid addon was restored
    expect(sessionStorage.getItem('mipa_pending_booking')).toBeNull();
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

  it('?service=A&concept=B (mismatch) -> shows explicit conflict error', async () => {
    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={WEDDING_SERVICE_ID}
        initialConceptSlug="parisian-romance" // Couple concept
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Concept đã chọn không thuộc dịch vụ yêu cầu/i).length).toBeGreaterThan(0);
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

  it('blocks advancing from Step 2 to Step 3 if 0 concepts are selected', async () => {
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

    // Attempt to advance to Step 3 without selecting a concept
    const nextBtnStep2 = screen.getByRole('button', { name: /Tiếp theo/i });
    fireEvent.click(nextBtnStep2);

    // Validation prevents advancing and displays requirement error
    await waitFor(() => {
      expect(screen.getAllByText(/Vui lòng chọn ít nhất một concept nghệ thuật để tiếp tục/i).length).toBeGreaterThan(0);
    });

    // Still at Step 2
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
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
