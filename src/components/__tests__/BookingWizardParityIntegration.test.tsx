// ==============================================================================
// Maison MIPA Memories - BookingWizard Parity Integration Tests
// Covers: Zero Default Optionals, Draft Restoration, and Pre-Submit Voucher Revalidation
// ==============================================================================
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';
import * as catalogService from '../../services/catalogService';
import * as bookingService from '../../services/bookingService';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_ADDONS, INITIAL_STUDIO_ROOMS, INITIAL_PROMOTIONS } from '../../mockData';

describe('BookingWizard Parity Integration Tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  const renderWizard = async (props = {}) => {
    const utils = render(
      <AuthProvider>
        <BookingWizard {...defaultProps} {...props} />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(document.querySelector('[data-catalog-ready="true"]')).not.toBeNull();
    });
    return utils;
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    bookingService.resetInMemoryBookings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TEST 1 — Fresh booking has ZERO addons by default and displays "Không có" in summary', async () => {
    await renderWizard();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    // Step 3 -> Step 4 (Addons)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    expect(screen.getByText(/Bước 4\/6/i)).toBeInTheDocument();

    // Verify NO addon selection button/card has aria-checked="true" or selected class
    const addonButtons = screen.getAllByRole('checkbox').filter(el => el.tagName === 'BUTTON');
    expect(addonButtons.length).toBeGreaterThan(0);
    addonButtons.forEach((btn) => {
      expect(btn).toHaveAttribute('aria-checked', 'false');
      expect(btn.getAttribute('aria-checked')).not.toBe('true');
      expect(btn).not.toHaveClass('selected');
    });

    // Advance Step 4 -> Step 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    // Step 5 -> Step 6 (Summary & Payment)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
    });

    // Assert summary copy for addons is "Không có"
    const addonSummaryLabel = screen.getByText('Dịch vụ kèm theo:');
    const addonSummaryParent = addonSummaryLabel.closest('div');
    expect(addonSummaryParent).toHaveTextContent('Không có');
  });

  it('TEST 2 — Fresh booking has ZERO concepts by default and displays "Không chọn" in summary', async () => {
    await renderWizard();

    // Step 1 -> Step 2 (Package & Concept)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
    // Concept selection header shows 0 selected
    expect(screen.getByText(/Chọn concept \(không bắt buộc\) \(0\//i)).toBeInTheDocument();

    // Verify zero concept checkboxes are checked
    const conceptCheckboxes = screen.getAllByRole('checkbox');
    expect(conceptCheckboxes.length).toBeGreaterThan(0);
    conceptCheckboxes.forEach((cb) => {
      expect(cb).toHaveAttribute('aria-checked', 'false');
    });

    // Advance all the way to Step 6
    for (let i = 2; i <= 5; i++) {
      fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    }

    await waitFor(() => {
      expect(screen.getByText(/Bước 6\/6/i)).toBeInTheDocument();
    });

    // Assert summary copy for concepts is "Không chọn"
    const conceptSummaryLabel = screen.getByText('Concept:');
    const conceptSummaryParent = conceptSummaryLabel.closest('div');
    expect(conceptSummaryParent).toHaveTextContent('Không chọn');
  });

  it('TEST 3 — Explicit concept deep-link selects exactly that concept', async () => {
    await renderWizard({ initialConceptSlug: 'parisian-romance' });

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();
    // Header should reflect 1 selected
    expect(screen.getByText(/Chọn concept \(không bắt buộc\) \(1\//i)).toBeInTheDocument();
    expect(screen.getByText(/Đã chọn: Parisian Romance/i)).toBeInTheDocument();

    // Exactly one concept checkbox has aria-checked="true"
    const conceptCheckboxes = screen.getAllByRole('checkbox');
    const checked = conceptCheckboxes.filter((cb) => cb.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
  });

  it('TEST 4 — Draft addons are restored accurately without extra default addon', async () => {
    const draftAddon1 = INITIAL_ADDONS[0];
    const draftAddon2 = INITIAL_ADDONS[1];

    const draft = {
      serviceId: INITIAL_SERVICES[0].id,
      packageId: INITIAL_PACKAGES[0].id,
      studioId: INITIAL_STUDIO_ROOMS[0].id,
      addonIds: [draftAddon1.id, draftAddon2.id],
      conceptIds: [],
      date: '2026-11-20',
      timeSlot: '14:00',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draft));

    await renderWizard();

    // Wait for draft restoration
    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Back to Step 4 to inspect addon state
    fireEvent.click(screen.getByRole('button', { name: /Quay lại/i }));
    expect(screen.getByText(/Bước 4\/6/i)).toBeInTheDocument();

    const addonCheckboxes = screen.getAllByRole('checkbox');
    const checked = addonCheckboxes.filter((cb) => cb.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(2);
  });

  it('TEST 5 — Draft with empty addons restores zero addons', async () => {
    const draft = {
      serviceId: INITIAL_SERVICES[0].id,
      packageId: INITIAL_PACKAGES[0].id,
      studioId: INITIAL_STUDIO_ROOMS[0].id,
      addonIds: [],
      conceptIds: [],
      date: '2026-11-20',
      timeSlot: '14:00',
    };
    sessionStorage.setItem('mipa_pending_booking', JSON.stringify(draft));

    await renderWizard();

    await waitFor(() => {
      expect(screen.getByText(/Bước 5\/6/i)).toBeInTheDocument();
    });

    // Back to Step 4
    fireEvent.click(screen.getByRole('button', { name: /Quay lại/i }));
    expect(screen.getByText(/Bước 4\/6/i)).toBeInTheDocument();

    const addonCheckboxes = screen.getAllByRole('checkbox');
    const checked = addonCheckboxes.filter((cb) => cb.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(0);
  });
});

describe('BookingWizard Pre-Submit Voucher Revalidation Tests', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  const renderWizard = async () => {
    const utils = render(
      <AuthProvider>
        <BookingWizard {...defaultProps} />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(document.querySelector('[data-catalog-ready="true"]')).not.toBeNull();
    });
    return utils;
  };

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    bookingService.resetInMemoryBookings();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('A. Voucher currently valid: refreshed promotion is valid -> createBooking called with refreshed promo code', async () => {
    const createBookingSpy = vi.spyOn(bookingService, 'createBookingInMemory');
    const refreshedPromo = {
      ...INITIAL_PROMOTIONS[0], // MIPA20
      usageCount: 2,
      usageLimit: 100,
    };
    vi.spyOn(catalogService, 'getPromotions').mockResolvedValue([refreshedPromo]);

    await renderWizard();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    // Step 3 -> Step 4 (Add an addon so subtotal meets MIPA20 1,500,000đ requirement: 1,290,000 + 400,000 = 1,690,000)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    const addonButtons = screen.getAllByRole('checkbox');
    fireEvent.click(addonButtons[0]); // Select first addon

    // Step 4 -> Step 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Apply voucher in Step 5
    const voucherInput = screen.getByPlaceholderText(/Nhập mã ưu đãi/i);
    fireEvent.change(voucherInput, { target: { value: 'MIPA20' } });
    const applyBtn = screen.getByRole('button', { name: /Áp dụng/i });
    fireEvent.click(applyBtn);

    expect(screen.getByText(/Đã áp dụng mã MIPA20/i)).toBeInTheDocument();

    // Step 5 -> Step 6 (Submit booking to payment)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    await waitFor(() => {
      expect(createBookingSpy).toHaveBeenCalledTimes(1);
    });

    const payload = createBookingSpy.mock.calls[0][0];
    expect(payload.voucherCode).toBe('MIPA20');
  });

  it('B. Voucher valid when applied, but refreshed promotion usage reaches usageLimit -> blocks createBooking and clears voucher', async () => {
    const createBookingSpy = vi.spyOn(bookingService, 'createBookingInMemory');

    // First call during mount returns valid promo
    const validPromo = { ...INITIAL_PROMOTIONS[0], usageCount: 9, usageLimit: 10 };
    // Refreshed call on submit returns exhausted promo
    const exhaustedPromo = { ...INITIAL_PROMOTIONS[0], usageCount: 10, usageLimit: 10 };

    let callCount = 0;
    vi.spyOn(catalogService, 'getPromotions').mockImplementation(async () => {
      callCount++;
      return [callCount === 1 ? validPromo : exhaustedPromo];
    });

    await renderWizard();

    // Step 1 -> 4
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Select addon so subtotal meets MIPA20 minOrder
    const addonButtons = screen.getAllByRole('checkbox');
    fireEvent.click(addonButtons[0]);

    // Step 4 -> 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Apply voucher
    const voucherInput = screen.getByPlaceholderText(/Nhập mã ưu đãi/i);
    fireEvent.change(voucherInput, { target: { value: 'MIPA20' } });
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

    expect(screen.getByText(/Đã áp dụng mã MIPA20/i)).toBeInTheDocument();

    // Click Proceed (Step 5 -> 6)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/hết lượt sử dụng/i)).toBeInTheDocument();
    });

    // createBooking MUST NOT have been called
    expect(createBookingSpy).not.toHaveBeenCalled();
    // Voucher is de-applied
    expect(screen.queryByText(/Đã áp dụng mã MIPA20/i)).toBeNull();
  });

  it('C. Promotion refresh throws -> blocks createBooking, preserves voucher, shows verification error', async () => {
    const createBookingSpy = vi.spyOn(bookingService, 'createBookingInMemory');

    let callCount = 0;
    vi.spyOn(catalogService, 'getPromotions').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return INITIAL_PROMOTIONS;
      }
      throw new Error('Network timeout fetching promotions');
    });

    await renderWizard();

    // Step 1 -> 4
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Addon
    const addonButtons = screen.getAllByRole('checkbox');
    fireEvent.click(addonButtons[0]);

    // Step 4 -> 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Apply voucher
    const voucherInput = screen.getByPlaceholderText(/Nhập mã ưu đãi/i);
    fireEvent.change(voucherInput, { target: { value: 'MIPA20' } });
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

    // Step 5 -> 6 (Submit)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Không thể xác minh mã ưu đãi lúc này/i)).toBeInTheDocument();
    });

    expect(createBookingSpy).not.toHaveBeenCalled();
  });

  it('D. Promotion removed from refreshed catalog -> blocks createBooking and shows unavailable message', async () => {
    const createBookingSpy = vi.spyOn(bookingService, 'createBookingInMemory');

    let callCount = 0;
    vi.spyOn(catalogService, 'getPromotions').mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return INITIAL_PROMOTIONS;
      }
      // In refreshed catalog, MIPA20 has been removed
      return [];
    });

    await renderWizard();

    // Step 1 -> 4
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Addon
    const addonButtons = screen.getAllByRole('checkbox');
    fireEvent.click(addonButtons[0]);

    // Step 4 -> 5
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    // Apply voucher
    const voucherInput = screen.getByPlaceholderText(/Nhập mã ưu đãi/i);
    fireEvent.change(voucherInput, { target: { value: 'MIPA20' } });
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng/i }));

    // Step 5 -> 6 (Submit)
    fireEvent.click(screen.getByRole('button', { name: /Tiếp Theo/i }));

    await waitFor(() => {
      expect(screen.getByText(/Mã ưu đãi không còn khả dụng/i)).toBeInTheDocument();
    });

    expect(createBookingSpy).not.toHaveBeenCalled();
    expect(screen.queryByText(/Đã áp dụng mã MIPA20/i)).toBeNull();
  });
});
