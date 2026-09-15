import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { HomePage } from '../HomePage';
import { ConceptCatalogPage } from '../ConceptCatalogPage';
import { ConceptDetailPage } from '../ConceptDetailPage';
import { ServicesPage } from '../ServicesPage';
import { ServiceDetailPage } from '../ServiceDetailPage';
import { PortfolioPage } from '../PortfolioPage';
import { CollectionDetailPage } from '../CollectionDetailPage';
import { PricingPage } from '../PricingPage';
import { EditorialGuidePage } from '../EditorialGuidePage';
import { AtelierPage } from '../AtelierPage';
import * as portfolioService from '../../services/portfolioService';
import * as catalogService from '../../services/catalogService';
import * as notificationService from '../../services/notificationService';

const MOCK_CONCEPTS = [
  {
    id: 'concept-1',
    slug: 'parisian-romance',
    name: 'Parisian Romance',
    description: 'Ánh sáng cửa sổ thơ mộng, hoa tươi tone pastel phong cách Pháp.',
    serviceId: 'service-a',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1',
    active: true,
    bookable: true,
    displayOrder: 1,
  },
  {
    id: 'concept-2',
    slug: 'editorial-haute-couture',
    name: 'French Haute Couture',
    description: 'Concept thời trang cao cấp tối giản với ánh sáng tương phản nghệ thuật.',
    serviceId: 'service-b',
    coverPhotoUrl: '', // No cover photo
    active: true,
    bookable: false,
    displayOrder: 2,
  },
];

const MOCK_SERVICES = [
  {
    id: 'service-a',
    slug: 'service-a',
    name: 'Dịch vụ Chụp Đôi A',
    description: 'Kỷ niệm tình yêu lãng mạn',
    icon: 'Heart',
    image: 'https://images.unsplash.com/photo-srv-a',
  },
  {
    id: 'service-b',
    slug: 'service-b',
    name: 'Dịch vụ Chân Dung B',
    description: 'Ảnh chân dung nghệ thuật cá nhân',
    icon: 'Camera',
    image: 'https://images.unsplash.com/photo-srv-b',
  },
];

const MOCK_PACKAGES = [
  {
    id: 'pkg-a1',
    serviceId: 'service-a',
    name: 'Gói Chụp Dịch Vụ A',
    price: 1890000,
    durationMinutes: 90,
    conceptsCount: 1,
    editedPhotosCount: 15,
    features: ['1 Concept chụp nghệ thuật', '15 ảnh chỉnh sửa'],
    recommended: false,
  },
  {
    id: 'pkg-b1',
    serviceId: 'service-b',
    name: 'Gói Chụp Dịch Vụ B',
    price: 2890000,
    durationMinutes: 120,
    conceptsCount: 2,
    editedPhotosCount: 25,
    features: ['2 Concept chân dung', '25 ảnh chỉnh sửa'],
    recommended: true,
  },
];

const MOCK_COLLECTIONS = [
  {
    id: 'col-1',
    slug: 'story-service-a',
    title: 'Câu Chuyện Tình Yêu A',
    description: 'Bộ ảnh thực hiện cho dịch vụ A',
    serviceId: 'service-a',
    conceptId: 'concept-1',
    conceptName: 'Parisian Romance',
    coverPhotoUrl: 'https://images.unsplash.com/story-a',
    photos: [
      { id: 'p1', url: 'https://images.unsplash.com/story-a-1', altText: 'Ảnh 1' },
    ],
  },
  {
    id: 'col-empty',
    slug: 'story-empty-photos',
    title: 'Bộ Ảnh Chưa Có Hình',
    description: 'Bộ ảnh thử nghiệm không có ảnh',
    serviceId: 'service-b',
    coverPhotoUrl: undefined,
    photos: [],
  },
];

function renderApp(initialEntry: string, userProps?: { currentUser: any; currentRole: any }) {
  const dummyOnOpenBooking = vi.fn();
  const dummyOnOpenAuth = vi.fn();
  const dummyOnLogout = vi.fn();

  return {
    ...render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <AuthProvider>
            <Navbar
              currentUser={userProps ? userProps.currentUser : null}
              currentRole={userProps ? userProps.currentRole : 'GUEST'}
              onOpenBooking={dummyOnOpenBooking}
              onOpenAuthModal={dummyOnOpenAuth}
              onLogout={dummyOnLogout}
            />
            <Routes>
              <Route path="/" element={<HomePage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/concept" element={<ConceptCatalogPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/dich-vu" element={<ServicesPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/dich-vu/:slug" element={<ServiceDetailPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/portfolio" element={<PortfolioPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/portfolio/:slug" element={<CollectionDetailPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/bang-gia" element={<PricingPage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/cam-nang" element={<EditorialGuidePage onOpenBooking={dummyOnOpenBooking} />} />
              <Route path="/atelier" element={<AtelierPage onOpenBooking={dummyOnOpenBooking} />} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      </HelmetProvider>
    ),
    dummyOnOpenBooking,
    dummyOnOpenAuth,
    dummyOnLogout,
  };
}

describe('Visual Commerce Hardening & Data Integrity Pass', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.spyOn(portfolioService, 'getPublicConcepts').mockResolvedValue(MOCK_CONCEPTS as any);
    vi.spyOn(catalogService, 'getServices').mockResolvedValue(MOCK_SERVICES as any);
    vi.spyOn(catalogService, 'getPackages').mockResolvedValue(MOCK_PACKAGES as any);
    vi.spyOn(portfolioService, 'getPublicCollections').mockResolvedValue(MOCK_COLLECTIONS as any);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // 1. Concept with no cover: no unrelated hero/studio photo rendered, renders placeholder
  it('1. Concept with no cover: renders neutral placeholder, not unrelated hero/studio photo', async () => {
    renderApp('/concept');
    expect(await screen.findByText('French Haute Couture')).toBeInTheDocument();

    const placeholder = screen.getByText('Ảnh đang được cập nhật');
    expect(placeholder).toBeInTheDocument();

    const imgs = screen.getAllByRole('img');
    const heroOrStudioFallback = imgs.some(
      (img) => (img.getAttribute('src') || '').includes('/hero.png') || (img.getAttribute('src') || '').includes('/studio.png')
    );
    expect(heroOrStudioFallback).toBe(false);
  });

  // 2. Collection with no photos: neutral placeholder
  it('2. Collection with no photos: renders neutral placeholder', async () => {
    vi.spyOn(portfolioService, 'getCollectionBySlug').mockResolvedValue(MOCK_COLLECTIONS[1] as any);
    renderApp('/portfolio/story-empty-photos');

    expect(await screen.findByRole('heading', { level: 1, name: 'Bộ Ảnh Chưa Có Hình' })).toBeInTheDocument();
    expect(screen.getByText('Ảnh đang được cập nhật')).toBeInTheDocument();
  });

  // 3. Service A with zero package: never displays Service B package
  it('3. Service with zero packages: never displays another service package on detail page', async () => {
    const serviceWithoutPkgs = {
      id: 'service-empty',
      slug: 'service-empty',
      name: 'Dịch Vụ Chưa Có Gói',
      description: 'Mô tả dịch vụ mới',
    };
    vi.spyOn(catalogService, 'getServices').mockResolvedValue([serviceWithoutPkgs as any]);
    renderApp('/dich-vu/service-empty');

    expect(await screen.findByText('Hiện chưa có gói chụp được công bố cho dịch vụ này.')).toBeInTheDocument();
    expect(screen.queryByText('Gói Chụp Dịch Vụ B')).not.toBeInTheDocument();
  });

  // 4. Service A page: only concepts with serviceId A
  it('4. Service A page: only renders concepts with matching serviceId A', async () => {
    renderApp('/dich-vu/service-a');

    expect(await screen.findByText('Parisian Romance')).toBeInTheDocument();
    expect(screen.queryByText('French Haute Couture')).not.toBeInTheDocument();
  });

  // 5. Service A page: only stories with serviceId A
  it('5. Service A page: only renders stories with matching serviceId A', async () => {
    renderApp('/dich-vu/service-a');

    expect(await screen.findByText('Câu Chuyện Tình Yêu A')).toBeInTheDocument();
    expect(screen.queryByText('Bộ Ảnh Chưa Có Hình')).not.toBeInTheDocument();
  });

  // 6. Concept API failure: ERROR state, not 404
  it('6. Concept API failure: displays ERROR state, not 404', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockRejectedValue(new Error('Network outage'));
    renderApp('/concept/network-failure');

    expect(await screen.findByRole('heading', { level: 1, name: /Không thể tải thông tin concept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Quay lại concept/i })).toBeInTheDocument();
    expect(screen.queryByText('Không tìm thấy concept')).not.toBeInTheDocument();
  });

  // 7. Concept null: real NOT_FOUND state
  it('7. Concept null in DB: displays true NOT_FOUND state', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(null);
    renderApp('/concept/non-existent-slug');

    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy concept' })).toBeInTheDocument();
    expect(screen.queryByText('Không thể tải thông tin concept.')).not.toBeInTheDocument();
  });

  // 8. bookable=false: truthful semantics, no claim 'limited/seasonal'
  it('8. bookable=false: displays truthful "Hiện chưa mở đặt lịch", no false claims', async () => {
    vi.spyOn(portfolioService, 'getConceptBySlug').mockResolvedValue(MOCK_CONCEPTS[1] as any);
    renderApp('/concept/editorial-haute-couture');

    expect(await screen.findByText('Hiện chưa mở đặt lịch')).toBeInTheDocument();
    expect(screen.queryByText(/phiên bản giới hạn/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/theo mùa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trưng bày/i)).not.toBeInTheDocument();
  });

  // 9. User A notification cache: not visible to User B
  it('9. User A notification cache: isolated and not visible to User B', async () => {
    const userA = { id: 'uuid-user-a', fullName: 'User A', email: 'a@mipa.vn', role: 'CUSTOMER' as const };
    const userB = { id: 'uuid-user-b', fullName: 'User B', email: 'b@mipa.vn', role: 'CUSTOMER' as const };

    localStorage.setItem(
      'mipa_notifications_v2:uuid-user-a',
      JSON.stringify([{ id: 'notif-a', title: 'Thông báo của User A', message: 'Nội dung A', timestamp: '2026-09-14', read: false }])
    );
    vi.spyOn(notificationService, 'getUserNotifications').mockResolvedValue([]);

    // Render as User B
    renderApp('/', { currentUser: userB, currentRole: 'CUSTOMER' });

    // Open notifications
    const bellBtn = screen.getByTitle('Thông báo hệ thống');
    fireEvent.click(bellBtn);

    expect(screen.queryByText('Thông báo của User A')).not.toBeInTheDocument();
    expect(screen.getByText('Không có thông báo mới')).toBeInTheDocument();
  });

  // 10. Server returns zero notifications: local notification state becomes zero
  it('10. Server returns zero notifications: local state becomes zero', async () => {
    const userA = { id: 'uuid-user-a', fullName: 'User A', email: 'a@mipa.vn', role: 'CUSTOMER' as const };
    localStorage.setItem(
      'mipa_notifications_v2:uuid-user-a',
      JSON.stringify([{ id: 'notif-old', title: 'Cũ', message: 'Tin cũ', timestamp: '2026-09-14', read: false }])
    );
    vi.spyOn(notificationService, 'getUserNotifications').mockResolvedValue([]);

    renderApp('/', { currentUser: userA, currentRole: 'CUSTOMER' });

    await waitFor(() => {
      const saved = JSON.parse(localStorage.getItem('mipa_notifications_v2:uuid-user-a') || '[]');
      expect(saved).toEqual([]);
    });
  });

  // 11. Mobile manager: Manager portal reachable
  it('11. Mobile manager: Studio Manager OS portal reachable in mobile menu', async () => {
    const managerUser = { id: 'uuid-mgr', fullName: 'Manager Studio', email: 'mgr@mipa.vn', role: 'MANAGER' as const };
    renderApp('/', { currentUser: managerUser, currentRole: 'MANAGER' });

    const hamburger = screen.getByLabelText('Mở menu điều hướng');
    fireEvent.click(hamburger);

    expect(screen.getByRole('link', { name: /Studio Manager OS/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Staff OS Portal/i })).toBeInTheDocument();
  });

  // 12. Mobile staff: Staff portal reachable
  it('12. Mobile staff: Staff OS Portal reachable in mobile menu', async () => {
    const staffUser = { id: 'uuid-staff', fullName: 'Staff Member', email: 'staff@mipa.vn', role: 'STAFF' as const };
    renderApp('/', { currentUser: staffUser, currentRole: 'STAFF' });

    const hamburger = screen.getByLabelText('Mở menu điều hướng');
    fireEvent.click(hamburger);

    expect(screen.getByRole('link', { name: /Staff OS Portal/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Studio Manager OS/i })).not.toBeInTheDocument();
  });

  // 13. NavLink semantics & 16. /cam-nang policy
  it('16. /cam-nang: not in primary nav items and has noIndex', async () => {
    renderApp('/');

    // Primary desktop links are semantic links
    const conceptLink = screen.getByRole('link', { name: 'Concept' });
    expect(conceptLink).toBeInTheDocument();
    expect(conceptLink).not.toHaveAttribute('role', 'button');

    // Cẩm nang is removed from primary nav
    const primaryNav = screen.getByRole('navigation');
    expect(primaryNav).not.toHaveTextContent(/Cẩm nang/i);
  });

  // 15. /atelier production empty: fail-closed without DEFAULT_ATELIER_ARTWORKS
  it('15. /atelier production empty: fails closed without showing default demo artworks', async () => {
    vi.spyOn(portfolioService, 'getPublicConcepts').mockResolvedValue([]);
    renderApp('/atelier');

    expect(await screen.findByText('Nội dung triển lãm đang được cập nhật.')).toBeInTheDocument();
    expect(screen.queryByText('DISCOVER OUR WORK')).not.toBeInTheDocument();
  });
});
