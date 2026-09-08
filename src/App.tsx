// ==============================================================================
// Maison MIPA Memories - App Component with Real Routing & SEO Consistency
// ==============================================================================
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { User, UserRole, Booking, BookingStatus } from './types';
import { INITIAL_USERS, INITIAL_BOOKINGS, INITIAL_EMPLOYEES, INITIAL_STUDIO_ROOMS } from './mockData';
import { getBookings, updateBookingStatus, assignBookingStaff } from './services/bookingService';
import { getStudioRooms, getEmployees } from './services/catalogService';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { BookingWizard } from './components/booking/BookingWizard';
import { AuthModal } from './components/auth/AuthModal';
import { Search } from 'lucide-react';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { PricingPage } from './pages/PricingPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { BookingPage } from './pages/BookingPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Lazy-loaded Private Pages to optimize initial public bundle size
const AccountPage = lazy(() => import('./pages/AccountPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

function AppContent() {
  const { user: currentUser, role: currentRole, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [adminUsersList, setAdminUsersList] = useState<User[]>(INITIAL_USERS);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authInitialTab, setAuthInitialTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authTargetMessage, setAuthTargetMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Main system state with backend persistence
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [studios, setStudios] = useState(INITIAL_STUDIO_ROOMS);

  // Handle legacy hash navigation redirects (#services -> /dich-vu, etc.)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#services') {
      navigate('/dich-vu', { replace: true });
    } else if (hash === '#packages') {
      navigate('/bang-gia', { replace: true });
    } else if (hash === '#portfolio') {
      navigate('/portfolio', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let active = true;
    async function initData() {
      try {
        const [bks, stds, emps] = await Promise.all([
          getBookings(),
          getStudioRooms(),
          getEmployees(),
        ]);
        if (active) {
          if (bks.length > 0) setBookings(bks);
          if (stds.length > 0) setStudios(stds);
          if (emps.length > 0) setEmployees(emps);
        }
      } catch (e) {
        console.warn('Initial data fetch error:', e);
      }
    }
    initData();
    return () => { active = false; };
  }, []);

  const handleOpenAuthModal = (tab: 'LOGIN' | 'REGISTER' = 'LOGIN', msg?: string) => {
    setAuthInitialTab(tab);
    setAuthTargetMessage(msg || '');
    setIsAuthModalOpen(true);
  };

  const handleAuthSuccess = (user: User) => {
    setIsAuthModalOpen(false);
    if (user.role === 'CUSTOMER') navigate('/account');
    else if (user.role === 'STAFF') navigate('/staff');
    else if (user.role === 'MANAGER') navigate('/management');
    else if (user.role === 'ADMIN') navigate('/admin');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setSearchQuery('');
    setIsAuthModalOpen(false);
  };

  const handleBookingSuccess = (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev.filter(b => b.id !== newBooking.id)]);
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus, note?: string) => {
    try {
      const updated = await updateBookingStatus(bookingId, newStatus, note);
      setBookings(prev => prev.map(b => (b.id === bookingId || b.bookingCode === bookingId ? updated : b)));
    } catch (err: any) {
      alert(`Không thể cập nhật trạng thái: ${err.message}`);
    }
  };

  const handleAssignStaff = async (bookingId: string, employeeId: string) => {
    try {
      const asg = await assignBookingStaff(bookingId, employeeId);
      setBookings(prev => prev.map(b => {
        if (b.id === bookingId || b.bookingCode === bookingId) {
          return {
            ...b,
            assignments: [...b.assignments.filter(a => a.assignmentRole !== asg.assignmentRole), asg],
            updatedAt: new Date().toISOString(),
          };
        }
        return b;
      }));
    } catch (err: any) {
      alert(`Không thể phân công nhân viên: ${err.message}`);
    }
  };

  const handleOpenBooking = () => {
    if (!currentUser || currentRole === 'GUEST') {
      handleOpenAuthModal('LOGIN', '🔒 Quý khách vui lòng Đăng Nhập (hoặc Đăng Ký tài khoản mới) để tiến hành Đặt Lịch Chụp Ảnh tại Maison MIPA');
      return;
    }
    setIsBookingOpen(true);
  };

  // Search filter
  const searchResults = searchQuery.trim().length > 1
    ? bookings.filter(b =>
        b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerPhone.includes(searchQuery)
      )
    : [];

  const isPublicPage = ['/', '/dich-vu', '/bang-gia', '/portfolio'].includes(location.pathname) || location.pathname.startsWith('/dich-vu/');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--mipa-background)' }}>
      {/* Top Sticky Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        onOpenBooking={handleOpenBooking}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Main Presentation Body */}
      <main style={{ flex: 1 }}>

        {/* Global Search Results Dropdown Overlay */}
        {searchQuery.trim().length > 1 && (
          <div className="mipa-container" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="mipa-card" style={{ padding: '1.5rem', border: '2px solid #8C6E53' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'var(--mipa-font-heading)', color: '#604634', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Search size={20} color="#8C6E53" />
                  Kết Quả Tra Cứu ({searchResults.length})
                </h3>
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ background: 'none', border: 'none', color: '#8C6E53', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ✕ Đóng tìm kiếm
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#8C6E53' }}>
                  Không tìm thấy đơn đặt lịch nào khớp với từ khóa: <strong>"{searchQuery}"</strong>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {searchResults.map(b => (
                    <div
                      key={b.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        backgroundColor: '#FFFDF6',
                        border: '1px solid var(--mipa-beige)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontWeight: 700, color: '#604634' }}>{b.bookingCode}</span>
                          <span className="mipa-badge" style={{ backgroundColor: '#EFE6C9', color: '#604634' }}>{b.packageName}</span>
                          <span style={{ fontSize: '0.8rem', color: '#8C6E53' }}>({b.bookingDate} • {b.startTime} - {b.endTime})</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#8C6E53', marginTop: '0.2rem' }}>
                          Khách: <strong>{b.customerName}</strong> • SĐT: {b.customerPhone} • Studio: {b.studioName}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#604634' }}>{b.totalAmount.toLocaleString('vi-VN')} đ</div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: b.paymentStatus === 'FULLY_PAID' ? '#16A34A' : '#D97706' }}>
                          {b.paymentStatus === 'FULLY_PAID' ? 'Đã Thanh Toán Đủ' : 'Đã Đặt Cọc'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real URL Router Routes */}
        <Suspense fallback={
          <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8C6E53' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '3px solid #EFE6C9',
                borderTopColor: '#8C6E53',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 1rem',
              }} />
              <span>Đang tải nội dung...</span>
            </div>
          </div>
        }>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage onOpenBooking={handleOpenBooking} />} />
            <Route path="/dich-vu" element={<ServicesPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/dich-vu/:slug" element={<ServiceDetailPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/bang-gia" element={<PricingPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/portfolio" element={<PortfolioPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/booking" element={
              <BookingPage
                onBookingSuccess={handleBookingSuccess}
                existingBookings={bookings}
                onOpenAuthModal={handleOpenAuthModal}
              />
            } />

            {/* Protected Private Routes with RBAC Guards */}
            <Route
              path="/account"
              element={
                <AccountPage
                  bookings={bookings}
                  onOpenBooking={handleOpenBooking}
                  onRequireAuth={() => handleOpenAuthModal('LOGIN', '🔒 Quý khách vui lòng Đăng Nhập để xem lịch cá nhân')}
                />
              }
            />
            <Route
              path="/staff"
              element={
                <StaffPage
                  bookings={bookings}
                  onUpdateStatus={handleUpdateStatus}
                  onRequireAuth={() => handleOpenAuthModal('LOGIN', '🔒 Khu vực dành cho nhân viên. Vui lòng đăng nhập.')}
                />
              }
            />
            <Route
              path="/management"
              element={
                <ManagementPage
                  bookings={bookings}
                  employees={employees}
                  studios={studios}
                  onOpenBooking={handleOpenBooking}
                  onUpdateStatus={handleUpdateStatus}
                  onAssignStaff={handleAssignStaff}
                  onRequireAuth={() => handleOpenAuthModal('LOGIN', '🔒 Khu vực dành cho Quản Lý Studio.')}
                />
              }
            />
            <Route
              path="/admin"
              element={
                <AdminPage
                  usersList={adminUsersList}
                  onUpdateUsersList={setAdminUsersList}
                  onRequireAuth={() => handleOpenAuthModal('LOGIN', '🔒 Khu vực Quản Trị Viên (Admin).')}
                />
              }
            />

            {/* 404 Catch-All Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

      </main>

      {/* Footer */}
      <Footer />

      {/* Interactive 6-Step Booking Wizard Modal */}
      <BookingWizard
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onBookingSuccess={handleBookingSuccess}
        existingBookings={bookings}
      />

      {/* Real Auth Modal (Login & Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onLoginSuccess={handleAuthSuccess}
        targetFeatureMessage={authTargetMessage}
        initialTab={authInitialTab}
      />

      {/* Floating Sticky Mobile Booking Bar (Visible on public pages on mobile screens) */}
      {isPublicPage && (
        <div
          className="mipa-mobile-show"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(255, 253, 246, 0.96)',
            backdropFilter: 'blur(12px)',
            borderTop: '2px solid var(--mipa-brown)',
            padding: '0.65rem 1rem',
            zIndex: 9000,
            boxShadow: '0 -4px 25px rgba(96, 70, 52, 0.2)',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#8C6E53' }}>MAISON MIPA MEMORIES</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#604634' }}>Từ 1.290.000đ • Trọn gói</div>
          </div>
          <button
            onClick={handleOpenBooking}
            className="btn-mipa-gold"
            style={{ padding: '0.55rem 1.2rem', fontSize: '0.85rem', boxShadow: '0 4px 15px rgba(198, 164, 95, 0.4)' }}
          >
            📷 ĐẶT LỊCH NGAY
          </button>
        </div>
      )}

    </div>
  );
}

export function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

export default App;
