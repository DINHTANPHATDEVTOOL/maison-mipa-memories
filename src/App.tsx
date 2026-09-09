// ==============================================================================
// Maison MIPA Memories - App Component with Canonical Funnel & Fail-Closed Data
// Hardened for Issues #7 & #17:
// - Removes duplicate BookingWizard modal (canonical /booking funnel)
// - Removes public PII search dropdown
// - Fail-closed initial state (empty [] in production, no mock fallback)
// - Route /auth/reset-password for password recovery
// ==============================================================================
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import type { User, Booking, BookingStatus } from './types';
import { INITIAL_USERS, INITIAL_BOOKINGS, INITIAL_EMPLOYEES, INITIAL_STUDIO_ROOMS } from './mockData';
import { getBookings, updateBookingStatus, assignBookingStaff } from './services/bookingService';
import { getStudioRooms, getEmployees } from './services/catalogService';
import { isSupabaseConfigured, isDemoModeEnabled } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { ResetPasswordPage } from './pages/ResetPasswordPage';

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

  const useMockFallback = !isSupabaseConfigured() && isDemoModeEnabled();

  const [adminUsersList, setAdminUsersList] = useState<User[]>(useMockFallback ? INITIAL_USERS : []);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authInitialTab, setAuthInitialTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authTargetMessage, setAuthTargetMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Main system state with backend persistence (empty [] by default in production)
  const [bookings, setBookings] = useState<Booking[]>(useMockFallback ? INITIAL_BOOKINGS : []);
  const [employees, setEmployees] = useState(useMockFallback ? INITIAL_EMPLOYEES : []);
  const [studios, setStudios] = useState(useMockFallback ? INITIAL_STUDIO_ROOMS : []);

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
          setBookings(bks);
          setStudios(stds);
          setEmployees(emps);
        }
      } catch (e) {
        console.warn('Initial data fetch warning:', e);
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
    setIsAuthModalOpen(false);
  };

  const handleBookingSuccess = useCallback((newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev.filter(b => b.id !== newBooking.id)]);
  }, []);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus, note?: string) => {
    try {
      const updated = await updateBookingStatus(bookingId, newStatus, note);
      setBookings(prev => prev.map(b => (b.id === bookingId || b.bookingCode === bookingId ? updated : b)));
    } catch (err: any) {
      alert(`Không thể cập nhật trạng thái: ${err.message}`);
    }
  };

  const handleAssignStaff = async (bookingId: string, employeeId: string, role?: string) => {
    try {
      const asg = await assignBookingStaff(bookingId, employeeId, role);
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
    // Canonical booking funnel
    navigate('/booking');
  };

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
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

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

      {/* Real Auth Modal (Login & Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onLoginSuccess={handleAuthSuccess}
        targetFeatureMessage={authTargetMessage}
        initialTab={authInitialTab}
      />

      {/* Floating Sticky Mobile Booking Bar */}
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
