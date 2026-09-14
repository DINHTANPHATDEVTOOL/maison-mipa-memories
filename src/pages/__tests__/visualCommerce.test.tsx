import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { HomePage } from '../HomePage';
import { ConceptCatalogPage } from '../ConceptCatalogPage';
import { ConceptDetailPage } from '../ConceptDetailPage';
import { PricingPage } from '../PricingPage';
import { EditorialGuidePage } from '../EditorialGuidePage';
import { BookingPage } from '../BookingPage';
import * as portfolioService from '../../services/portfolioService';
import * as catalogService from '../../services/catalogService';

const MOCK_CONCEPTS = [
  {
    id: 'concept-1',
    slug: 'parisian-romance',
    name: 'Parisian Romance',
    description: 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel phong cách Pháp.',
    serviceId: 'service-couple',
    coverPhotoUrl: '/hero.png',
    active: true,
    bookable: true,
    displayOrder: 1,
  },
  {
    id: 'concept-2',
    slug: 'editorial-haute-couture',
    name: 'French Haute Couture',
    description: 'Concept thời trang cao cấp tối giản với ánh sáng tương phản nghệ thuật.',
    serviceId: 'service-portrait',
    coverPhotoUrl: '/studio.png',
    active: true,
    bookable: false,
    displayOrder: 2,
  },
];

const MOCK_SERVICES = [
  {
    id: 'service-couple',
    slug: 'couple',
    name: 'Couple Photography',
    description: 'Kỷ niệm tình yêu & thanh xuân',
    icon: 'Heart',
    image: '/hero.png',
  },
  {
    id: 'service-portrait',
    slug: 'portrait',
    name: 'Portrait & Editorial',
    description: 'Ảnh chân dung nghệ thuật cá nhân',
    icon: 'Camera',
    image: '/studio.png',
  },
];

const MOCK_PACKAGES = [
  {
    id: 'pkg-essential',
    serviceId: 'service-couple',
    name: 'Essential Romance',
    price: 1890000,
    durationMinutes: 90,
    conceptsCount: 1,
    editedPhotosCount: 15,
    features: ['1 Concept chụp nghệ thuật', '15 ảnh chỉnh sửa cao cấp', 'Toàn bộ file gốc'],
    recommended: false,
  },
  {
    id: 'pkg-signature',
    serviceId: 'service-couple',
    name: 'Signature Memories',
    price: 2890000,
    durationMinutes: 120,
    conceptsCount: 2,
    editedPhotosCount: 25,
    features: ['2 Concept chụp nghệ thuật', '25 ảnh chỉnh sửa cao cấp', 'Trang điểm & làm tóc'],
    recommended: true,
  },
];

function renderWithVisualCommerce(initialEntry: string) {
  const dummyOnOpenBooking = vi.fn();
  const dummyOnOpenAuth = vi.fn();

  return {
    ...render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AuthProvider>
            <Navbar
              currentUser={null}
              currentRole="GUEST"
              onOpenBooking={dummyOnOpenBooking}
              searchQuery=""
              setSearchQuery={vi.fn()}
              onOpenAuthModal={dummyOnOpenAuth}
              onLogout={vi.fn()}
            />
            <Routes>
              <Route path="/" element={<HomePage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/concept" element={<ConceptCatalogPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/bang-gia" element={<PricingPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/cam-nang" element={<EditorialGuidePage onOpenBooking={dummyOnOpenBooking} />} />
              <Route
                path="/booking"
                element={
                  <BookingPage
                    onBookingSuccess={vi.fn()}
                    existingBookings={[]}
                    onOpenAuthModal={dummyOnOpenAuth}
                  />
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </HelmetProvider>
    ),
    dummyOnOpenBooking,
    dummyOnOpenAuth,
  };
}

describe('Visual Commerce Architecture & Requirements Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(portfolioService, 'getPublicConcepts').mockResolvedValue(MOCK_CONCEPTS as any);
    vi.spyOn(catalogService, 'getServices').mockResolvedValue(MOCK_SERVICES as any);
    vi.spyOn(catalogService, 'getPackages').mockResolvedValue(MOCK_PACKAGES as any);
  });

  it('renders updated visual commerce navigation items in Navbar', () => {
    renderWithVisualCommerce('/');
    expect(screen.getByRole('button', { name: /Concept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dịch Vụ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bảng Giá/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cẩm Nang/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /ĐẶT LỊCH/i }).length).toBeGreaterThan(0);
  });

  it('renders photography-first Homepage hero without 3D WebGL camera above fold', async () => {
    const { dummyOnOpenBooking } = renderWithVisualCommerce('/');

    // Check accessible brand headline
    expect(screen.getByRole('heading', { level: 1, name: /Maison MIPA Memories/i })).toBeInTheDocument();
    expect(screen.getByText(/Những câu chuyện được giữ lại bằng ánh sáng/i)).toBeInTheDocument();

    // Check primary hero CTAs
    const exploreConceptsBtn = screen.getByRole('link', { name: /Khám phá concept/i });
    expect(exploreConceptsBtn).toBeInTheDocument();
    expect(exploreConceptsBtn).toHaveAttribute('href', '/concept');

    const bookingBtn = screen.getByRole('button', { name: /^Đặt lịch chụp$/i });
    expect(bookingBtn).toBeInTheDocument();
    fireEvent.click(bookingBtn);
    expect(dummyOnOpenBooking).toHaveBeenCalled();

    // Verify 3D canvas is NOT in critical hero above fold
    expect(screen.queryByTestId('three-atelier-canvas')).not.toBeInTheDocument();
  });

  it('renders Concept catalog page at /concept with data-driven concepts and filter bar', async () => {
    renderWithVisualCommerce('/concept');

    // Page title and subtitle
    expect(await screen.findByRole('heading', { level: 1, name: /Ý tưởng & không gian ánh sáng/i })).toBeInTheDocument();
    expect(screen.getByText(/DANH MỤC CONCEPT/i)).toBeInTheDocument();

    // Data-driven concept cards
    expect(await screen.findByText('Parisian Romance')).toBeInTheDocument();
    expect(screen.getByText('French Haute Couture')).toBeInTheDocument();

    // Bookable button vs details link
    expect(screen.getAllByRole('button', { name: /Đặt lịch/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /Xem concept/i }).length).toBeGreaterThan(0);
  });

  it('renders /concept/:slug with authoritative concept detail and booking action', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(MOCK_CONCEPTS[0] as any);
    vi.spyOn(portfolioService, 'getPublicCollections').mockResolvedValue([]);

    renderWithVisualCommerce('/concept/parisian-romance');

    // Heading and description
    expect(await screen.findByRole('heading', { level: 1, name: /Parisian Romance/i })).toBeInTheDocument();
    expect(screen.getByText(/Ánh sáng cửa sổ thơ mộng/i)).toBeInTheDocument();

    // Bookable action button
    const bookConceptBtn = await screen.findByRole('button', { name: /Đặt lịch concept này/i });
    expect(bookConceptBtn).toBeInTheDocument();
  });

  it('renders /concept/:slug for non-bookable concept with seasonal notice', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(MOCK_CONCEPTS[1] as any);
    vi.spyOn(portfolioService, 'getPublicCollections').mockResolvedValue([]);

    renderWithVisualCommerce('/concept/editorial-haute-couture');

    expect(await screen.findByRole('heading', { level: 1, name: /French Haute Couture/i })).toBeInTheDocument();
    expect(await screen.findByText(/Concept phiên bản giới hạn theo mùa/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Đặt lịch concept này/i })).not.toBeInTheDocument();
  });

  it('renders empty concept state gracefully without fake fallback images', async () => {
    vi.spyOn(portfolioService, 'getPublicConcepts').mockResolvedValue([]);

    renderWithVisualCommerce('/concept');

    expect(await screen.findByText(/Hiện chưa có concept nào trong danh mục này/i)).toBeInTheDocument();
  });

  it('renders /bang-gia grouped by service with direct booking package action', async () => {
    renderWithVisualCommerce('/bang-gia');

    expect(await screen.findByRole('heading', { level: 1, name: /Bảng Giá Dịch Vụ Chụp Ảnh/i })).toBeInTheDocument();
    expect(await screen.findByText('Essential Romance')).toBeInTheDocument();
    expect(screen.getByText('Signature Memories')).toBeInTheDocument();

    // Check pricing formatting (VND)
    expect(screen.getByText(/1\.890\.000/i)).toBeInTheDocument();
    expect(screen.getByText(/2\.890\.000/i)).toBeInTheDocument();

    // Booking action button
    const bookButtons = screen.getAllByRole('button', { name: /Đặt Gói Này/i });
    expect(bookButtons.length).toBeGreaterThan(0);
  });

  it('renders /cam-nang editorial guide shell transparently without fake articles', async () => {
    renderWithVisualCommerce('/cam-nang');

    expect(screen.getByRole('heading', { level: 1, name: /Kinh nghiệm & phong cách nhiếp ảnh/i })).toBeInTheDocument();
    expect(screen.getByText(/EDITORIAL MAGAZINE \/ CẨM NANG/i)).toBeInTheDocument();
    expect(screen.getByText(/Ấn bản cẩm nang mùa mới đang được hoàn thiện/i)).toBeInTheDocument();
  });
});
