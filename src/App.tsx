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
import { getBookings, updateBookingStatus, assignBookingStaff, subscribeBookings } from './services/bookingService';
import { getStudioRooms, getEmployees } from './services/catalogService';
import { isSupabaseConfigured, isDemoModeEnabled } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/auth/AuthModal';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SITE_CONFIG } from './config/site';
import { Phone, MessageSquare, Calendar } from 'lucide-react';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ConceptCatalogPage } from './pages/ConceptCatalogPage';
import { ConceptDetailPage } from './pages/ConceptDetailPage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { PricingPage } from './pages/PricingPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { CollectionDetailPage } from './pages/CollectionDetailPage';
import { EditorialGuidePage } from './pages/EditorialGuidePage';
import { BookingPage } from './pages/BookingPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Lazy-loaded routes to optimize initial public bundle size (Three.js isolated from Homepage)
const AtelierPage = lazy(() => import('./pages/AtelierPage'));
const AccountPage = lazy(() => import('./pages/AccountPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ManagementPage = lazy(() => import('./pages/ManagementPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

// Cinematic Motion & Art Direction
import { CustomCursor } from './motion/CustomCursor';
import { PageTransition } from './motion/PageTransition';
import { FilmGrainOverlay } from './components/public/FilmGrainOverlay';

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

    // Subscribe to realtime database updates for bookings
    const unsubscribe = subscribeBookings((updatedBookings) => {
      if (active) {
        setBookings(updatedBookings);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [currentUser?.id, currentRole]);

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

  const isPublicPage = [
    '/',
    '/concept',
    '/dich-vu',
    '/bang-gia',
    '/portfolio',
    '/cam-nang',
    '/atelier',
  ].includes(location.pathname) ||
    location.pathname.startsWith('/concept/') ||
    location.pathname.startsWith('/dich-vu/') ||
    location.pathname.startsWith('/portfolio/');

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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <PageTransition>
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
            <Route path="/concept" element={<ConceptCatalogPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/concept/:slug" element={<ConceptDetailPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/dich-vu" element={<ServicesPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/dich-vu/:slug" element={<ServiceDetailPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/bang-gia" element={<PricingPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/portfolio" element={<PortfolioPage onOpenBooking={handleOpenBooking} />} />
            <Route path="/portfolio/:slug" element={
              <CollectionDetailPage onOpenBooking={(conceptSlug) => navigate(conceptSlug ? `/booking?concept=${conceptSlug}` : '/booking')} />
            } />
            <Route path="/cam-nang" element={<EditorialGuidePage onOpenBooking={handleOpenBooking} />} />
            <Route path="/atelier" element={<AtelierPage onOpenBooking={handleOpenBooking} />} />
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
        </PageTransition>
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

      {/* Floating Sticky Mobile Booking Bar (3 clear actions: Gọi, Tư vấn, Đặt lịch) */}
      {isPublicPage && (
        <div
          className="mipa-mobile-show"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(250, 248, 243, 0.98)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(140, 110, 83, 0.22)',
            padding: '0.45rem 0.75rem calc(0.45rem + env(safe-area-inset-bottom, 0px))',
            zIndex: 9000,
            boxShadow: '0 -4px 20px rgba(41, 35, 31, 0.08)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* Action 1: Gọi */}
          <a
            href={`tel:${SITE_CONFIG.contact.phoneE164 || '0966616546'}`}
            aria-label="Gọi hotline Maison MIPA"
            style={{
              minWidth: '54px',
              minHeight: '44px',
              height: '44px',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              color: '#29231F',
              textDecoration: 'none',
              fontSize: '0.7rem',
              fontWeight: 600,
              gap: '2px',
              flexShrink: 0,
            }}
          >
            <Phone size={14} />
            <span>Gọi</span>
          </a>

          {/* Action 2: Tư vấn */}
          <a
            href={
              Boolean(SITE_CONFIG.social?.zalo && /^https?:\/\//i.test(SITE_CONFIG.social.zalo))
                ? SITE_CONFIG.social.zalo
                : `tel:${SITE_CONFIG.contact.phoneE164 || '0966616546'}`
            }
            target={Boolean(SITE_CONFIG.social?.zalo && /^https?:\/\//i.test(SITE_CONFIG.social.zalo)) ? '_blank' : undefined}
            rel="noopener noreferrer"
            aria-label="Tư vấn Maison MIPA"
            style={{
              minWidth: '58px',
              minHeight: '44px',
              height: '44px',
              borderRadius: '4px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FFFDF9',
              border: '1px solid rgba(140, 110, 83, 0.25)',
              color: '#29231F',
              textDecoration: 'none',
              fontSize: '0.7rem',
              fontWeight: 600,
              gap: '2px',
              flexShrink: 0,
            }}
          >
            <MessageSquare size={14} />
            <span>Tư vấn</span>
          </a>

          {/* Action 3: Đặt lịch */}
          <button
            onClick={handleOpenBooking}
            className="public-btn-primary"
            style={{
              flex: 1,
              minHeight: '44px',
              height: '44px',
              padding: '0 0.85rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
            }}
          >
            <Calendar size={15} />
            <span>Đặt lịch</span>
          </button>
        </div>
      )}

      {/* Photography Exhibition Micro-Interactions & Film Grain */}
      <CustomCursor />
      <FilmGrainOverlay />

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
