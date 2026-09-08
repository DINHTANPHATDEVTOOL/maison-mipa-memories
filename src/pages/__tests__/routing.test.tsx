import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { HomePage } from '../HomePage';
import { ServicesPage } from '../ServicesPage';
import { ServiceDetailPage } from '../ServiceDetailPage';
import { PricingPage } from '../PricingPage';
import { PortfolioPage } from '../PortfolioPage';
import { BookingPage } from '../BookingPage';
import { NotFoundPage } from '../NotFoundPage';
import { AdminPage } from '../AdminPage';
import { Navbar } from '../../components/Navbar';
import { INITIAL_USERS } from '../../mockData';

// Helper component to render with Router and Helmet
function renderRoute(initialEntry: string, customAuth?: { user: any; role: any }) {
  const dummyOnOpenBooking = vi.fn();
  const dummyOnOpenAuth = vi.fn();

  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          <Navbar
            currentUser={customAuth?.user || null}
            currentRole={customAuth?.role || 'GUEST'}
            onOpenBooking={dummyOnOpenBooking}
            searchQuery=""
            setSearchQuery={vi.fn()}
            onOpenAuthModal={dummyOnOpenAuth}
            onLogout={vi.fn()}
          />
          <Routes>
            <Route path="/" element={<HomePage onOpenBooking={dummyOnOpenBooking} />} />
            <Route path="/dich-vu" element={<ServicesPage onOpenBooking={dummyOnOpenBooking} />} />
            <Route path="/dich-vu/:slug" element={<ServiceDetailPage onOpenBooking={dummyOnOpenBooking} />} />
            <Route path="/bang-gia" element={<PricingPage onOpenBooking={dummyOnOpenBooking} />} />
            <Route path="/portfolio" element={<PortfolioPage onOpenBooking={dummyOnOpenBooking} />} />
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
            <Route
              path="/admin"
              element={
                <AdminPage
                  usersList={INITIAL_USERS}
                  onUpdateUsersList={vi.fn()}
                  onRequireAuth={dummyOnOpenAuth}
                />
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

describe('Full Application Routing & SEO Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders homepage at /', async () => {
    renderRoute('/');
    expect(screen.getByText(/Capture the moment/i)).toBeInTheDocument();
    expect(screen.getByText(/Keep the memory/i)).toBeInTheDocument();
  });

  it('renders services catalog at /dich-vu', async () => {
    renderRoute('/dich-vu');
    expect(screen.getByRole('heading', { name: /Dịch Vụ Chụp Ảnh Nghệ Thuật/i })).toBeInTheDocument();
    expect(screen.getByText(/DANH MỤC GÓI CHỤP STUDIO/i)).toBeInTheDocument();
  });

  it('renders couple service detail at /dich-vu/couple', async () => {
    renderRoute('/dich-vu/couple');
    expect(screen.getByRole('heading', { name: /Chụp Ảnh Couple & Kỷ Niệm Tình Yêu/i })).toBeInTheDocument();
    expect(screen.getByText(/Bảng Giá Gói Chụp Cho Couple Photography/i)).toBeInTheDocument();
  });

  it('renders portrait service detail at /dich-vu/portrait', async () => {
    renderRoute('/dich-vu/portrait');
    expect(screen.getByRole('heading', { name: /Chụp Ảnh Chân Dung Nghệ Thuật/i })).toBeInTheDocument();
  });

  it('renders family service detail at /dich-vu/family', async () => {
    renderRoute('/dich-vu/family');
    expect(screen.getByRole('heading', { name: /Chụp Ảnh Gia Đình & Em Bé Ấm Áp/i })).toBeInTheDocument();
  });

  it('renders graduation service detail at /dich-vu/graduation', async () => {
    renderRoute('/dich-vu/graduation');
    expect(screen.getByRole('heading', { name: /Chụp Ảnh Kỷ Yếu & Tốt Nghiệp Thanh Xuân/i })).toBeInTheDocument();
  });

  it('renders pricing page at /bang-gia', async () => {
    renderRoute('/bang-gia');
    expect(screen.getByRole('heading', { name: /Bảng Giá Dịch Vụ Chụp Ảnh Studio/i })).toBeInTheDocument();
    expect(screen.getByText(/Cam kết không phát sinh chi phí ẩn/i)).toBeInTheDocument();
  });

  it('renders portfolio page at /portfolio', async () => {
    renderRoute('/portfolio');
    expect(screen.getByRole('heading', { name: /Bộ Sưu Tập Kỷ Niệm Thơ Mộng/i })).toBeInTheDocument();
    expect(screen.getByText(/GALERIE DE MAISON MIPA/i)).toBeInTheDocument();
  });

  it('renders dedicated booking page at /booking', async () => {
    renderRoute('/booking');
    expect(screen.getByRole('heading', { name: /Đặt Lịch Chụp Ảnh Trực Tuyến/i })).toBeInTheDocument();
    expect(screen.getByText(/QUY TRÌNH 6 BƯỚC ĐẶT LỊCH CHUẨN/i)).toBeInTheDocument();
  });

  it('renders 404 NotFoundPage for unknown URLs', async () => {
    renderRoute('/non-existent-page-xyz');
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Trang Không Tồn Tại/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Về Trang Chủ/i })).toBeInTheDocument();
  });

  it('blocks guest from private /admin and does not render admin portal', async () => {
    renderRoute('/admin');
    // Guest gets Access Denied
    expect(screen.getByText(/403 FORBIDDEN/i)).toBeInTheDocument();
    expect(screen.getByText(/Quyền Truy Cập Bị Từ Chối/i)).toBeInTheDocument();
    expect(screen.queryByText(/Quản Trị Hệ Thống Tối Cao/i)).not.toBeInTheDocument();
  });

  it('marks active navigation link based on current URL path', async () => {
    renderRoute('/portfolio');
    const portfolioBtn = screen.getByRole('button', { name: 'Portfolio' });
    expect(portfolioBtn).toHaveAttribute('aria-current', 'page');
  });
});
