import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BookingWizard } from '../booking/BookingWizard';
import { AuthProvider } from '../../context/AuthContext';
import * as supabaseLib from '../../lib/supabase';
import * as catalogService from '../../services/catalogService';
import * as portfolioService from '../../services/portfolioService';
import * as paymentSettingsService from '../../services/paymentSettingsService';
import type { ServiceCategory, PackageItem, StudioRoom, Concept, Addon } from '../../types';

vi.mock('../../lib/supabase', async (importOriginal) => {
  const actual = await importOriginal<typeof supabaseLib>();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(),
    isDemoModeEnabled: vi.fn(),
  };
});

vi.mock('../../services/catalogService', () => ({
  getServices: vi.fn(),
  getPackages: vi.fn(),
  getAddons: vi.fn(),
  getStudioRooms: vi.fn(),
}));

vi.mock('../../services/portfolioService', async (importOriginal) => {
  const actual = await importOriginal<typeof portfolioService>();
  return {
    ...actual,
    getPublicConcepts: vi.fn(),
  };
});

vi.mock('../../services/paymentSettingsService', async (importOriginal) => {
  const actual = await importOriginal<typeof paymentSettingsService>();
  return {
    ...actual,
    getActivePaymentSettings: vi.fn().mockResolvedValue(null),
  };
});

describe('Production Booking Wizard Fail-Closed Policy', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onBookingSuccess: vi.fn(),
  };

  const renderWithAuth = (ui: React.ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  const mockServiceA: ServiceCategory = {
    id: 'srv-a-uuid',
    name: 'Dịch Vụ A (Cưới)',
    slug: 'cuoi',
    description: 'Mô tả dịch vụ A',
    image: '/service-a.jpg',
    icon: 'Camera',
  };

  const mockServiceB: ServiceCategory = {
    id: 'srv-b-uuid',
    name: 'Dịch Vụ B (Gia Đình)',
    slug: 'gia-dinh',
    description: 'Mô tả dịch vụ B',
    image: '/service-b.jpg',
    icon: 'Camera',
  };

  const mockPackageA: PackageItem = {
    id: 'pkg-a-uuid',
    serviceId: 'srv-a-uuid',
    name: 'Gói Cưới Cao Cấp',
    price: 5000000,
    durationMinutes: 90,
    editedPhotosCount: 20,
    features: ['Chụp ngoại cảnh', 'Váy cưới cao cấp'],
    conceptsCount: 2,
    recommended: true,
  };

  const mockPackageB: PackageItem = {
    id: 'pkg-b-uuid',
    serviceId: 'srv-b-uuid',
    name: 'Gói Gia Đình Sum Vầy',
    price: 3500000,
    durationMinutes: 60,
    editedPhotosCount: 15,
    features: ['Chụp tại studio', 'Trang điểm nhẹ'],
    conceptsCount: 1,
  };

  const mockConceptB: Concept = {
    id: 'concept-b-uuid',
    slug: 'concept-gia-dinh',
    name: 'Concept Gia Đình Sum Vầy',
    description: 'Ấm cúng, tự nhiên',
    serviceId: 'srv-b-uuid',
    coverPhotoUrl: '/concept-b.jpg',
    displayOrder: 1,
    active: true,
    bookable: true,
  };

  const mockStudio: StudioRoom = {
    id: 'studio-1-uuid',
    name: 'Phòng Ánh Sáng Tự Nhiên',
    code: 'ROOM_NATURAL',
    capacity: 6,
    status: 'ACTIVE',
    image: '/studio.jpg',
    description: 'Phòng chụp studio ánh sáng tự nhiên',
  };

  const mockAddon: Addon = {
    id: 'addon-1-uuid',
    name: 'Makeup chuyên nghiệp',
    price: 500000,
    description: 'Dịch vụ trang điểm chuyên nghiệp',
    category: 'makeup',
    durationMinutes: 45,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default production mode: Supabase is configured, demo mode is disabled
    vi.mocked(supabaseLib.isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(supabaseLib.isDemoModeEnabled).mockReturnValue(false);
  });

  it('1. Supabase configured + getServices throws -> no INITIAL_SERVICES rendered, shows error and retry', async () => {
    vi.mocked(catalogService.getServices).mockRejectedValue(new Error('DB Network Failure'));
    vi.mocked(catalogService.getPackages).mockResolvedValue([mockPackageA]);
    vi.mocked(catalogService.getAddons).mockResolvedValue([mockAddon]);
    vi.mocked(catalogService.getStudioRooms).mockResolvedValue([mockStudio]);
    vi.mocked(portfolioService.getPublicConcepts).mockResolvedValue([]);

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Must show fail-closed error message
    await waitFor(() => {
      expect(screen.getByText('Không thể tải dữ liệu đặt lịch. Vui lòng thử lại.')).toBeInTheDocument();
    });

    // Production MUST NOT fall back to mock INITIAL_SERVICES (e.g. "Couple Photography", "Wedding Photography")
    expect(screen.queryByText(/Couple Photography/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wedding Photography/i)).not.toBeInTheDocument();

    // Verify retry button exists
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
  });

  it('2. getPackages throws -> no INITIAL_PACKAGES rendered', async () => {
    vi.mocked(catalogService.getServices).mockResolvedValue([mockServiceA]);
    vi.mocked(catalogService.getPackages).mockRejectedValue(new Error('Package Table Unavailable'));
    vi.mocked(catalogService.getAddons).mockResolvedValue([mockAddon]);
    vi.mocked(catalogService.getStudioRooms).mockResolvedValue([mockStudio]);
    vi.mocked(portfolioService.getPublicConcepts).mockResolvedValue([]);

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Should fail closed with error
    await waitFor(() => {
      expect(screen.getByText('Không thể tải dữ liệu đặt lịch. Vui lòng thử lại.')).toBeInTheDocument();
    });

    // Production MUST NOT fall back to mock INITIAL_PACKAGES (e.g. "MIPA BASIC", "MIPA SIGNATURE")
    expect(screen.queryByText(/MIPA BASIC/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/MIPA SIGNATURE/i)).not.toBeInTheDocument();
  });

  it('3. getPublicConcepts throws -> no DEMO_CONCEPTS rendered', async () => {
    vi.mocked(catalogService.getServices).mockResolvedValue([mockServiceA]);
    vi.mocked(catalogService.getPackages).mockResolvedValue([mockPackageA]);
    vi.mocked(catalogService.getAddons).mockResolvedValue([mockAddon]);
    vi.mocked(catalogService.getStudioRooms).mockResolvedValue([mockStudio]);
    vi.mocked(portfolioService.getPublicConcepts).mockRejectedValue(new Error('Concept CMS Error'));

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Should fail closed with error
    await waitFor(() => {
      expect(screen.getByText('Không thể tải dữ liệu đặt lịch. Vui lòng thử lại.')).toBeInTheDocument();
    });

    // Production MUST NOT fall back to DEMO_CONCEPTS (e.g. "Parisian Romance", "Saigon Golden Hour")
    expect(screen.queryByText(/Parisian Romance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Saigon Golden Hour/i)).not.toBeInTheDocument();
  });

  it('4. service A has zero concepts -> concept from service B is never displayed or selected', async () => {
    // Service A has NO concepts; only Service B has mockConceptB
    vi.mocked(catalogService.getServices).mockResolvedValue([mockServiceA, mockServiceB]);
    vi.mocked(catalogService.getPackages).mockResolvedValue([mockPackageA, mockPackageB]);
    vi.mocked(catalogService.getAddons).mockResolvedValue([mockAddon]);
    vi.mocked(catalogService.getStudioRooms).mockResolvedValue([mockStudio]);
    vi.mocked(portfolioService.getPublicConcepts).mockResolvedValue([mockConceptB]); // Concept belongs to Service B only!

    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={mockServiceA.id}
      />
    );

    // Advance from Step 1 to Step 2
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Dịch Vụ A (Cưới)' })).toBeInTheDocument();
    });
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);

    // On Step 2, Service A concepts must be empty; Concept B must NOT be shown
    await waitFor(() => {
      expect(screen.getByText('Hiện chưa có concept khả dụng cho dịch vụ này.')).toBeInTheDocument();
    });
    expect(screen.queryByText('Concept Gia Đình Sum Vầy')).not.toBeInTheDocument();
  });

  it('5. service A + package B mismatch -> fail closed with mismatch error banner and blocked advance', async () => {
    vi.mocked(catalogService.getServices).mockResolvedValue([mockServiceA, mockServiceB]);
    vi.mocked(catalogService.getPackages).mockResolvedValue([mockPackageA, mockPackageB]);
    vi.mocked(catalogService.getAddons).mockResolvedValue([mockAddon]);
    vi.mocked(catalogService.getStudioRooms).mockResolvedValue([mockStudio]);
    vi.mocked(portfolioService.getPublicConcepts).mockResolvedValue([]);

    renderWithAuth(
      <BookingWizard
        {...defaultProps}
        initialServiceId={mockServiceA.id}
        initialPackageId={mockPackageB.id} // Belongs to Service B!
      />
    );

    // Must fail closed with explicit package mismatch error
    await waitFor(() => {
      expect(screen.getAllByText('Gói chụp không thuộc dịch vụ đã chọn. Vui lòng chọn lại gói chụp phù hợp.').length).toBeGreaterThan(0);
    });

    // Direct user to Step 2 for reselection
    expect(screen.getByText(/Bước 2\/6/i)).toBeInTheDocument();

    // Advancing without picking a valid package must be blocked
    const nextBtn = screen.getByRole('button', { name: /Tiếp Theo/i });
    fireEvent.click(nextBtn);
    expect(screen.getByText('Vui lòng chọn một gói chụp hợp lệ cho dịch vụ này để tiếp tục.')).toBeInTheDocument();
  });

  it('6. empty authoritative catalog -> truthful empty state, never mock', async () => {
    vi.mocked(catalogService.getServices).mockResolvedValue([]);
    vi.mocked(catalogService.getPackages).mockResolvedValue([]);
    vi.mocked(catalogService.getAddons).mockResolvedValue([]);
    vi.mocked(catalogService.getStudioRooms).mockResolvedValue([]);
    vi.mocked(portfolioService.getPublicConcepts).mockResolvedValue([]);

    renderWithAuth(<BookingWizard {...defaultProps} />);

    // Truthful empty state must be displayed
    await waitFor(() => {
      expect(screen.getByText('Hiện chưa có dịch vụ nào khả dụng trên hệ thống.')).toBeInTheDocument();
    });

    // Never mock values
    expect(screen.queryByText(/Couple Photography/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wedding Photography/i)).not.toBeInTheDocument();
  });
});
