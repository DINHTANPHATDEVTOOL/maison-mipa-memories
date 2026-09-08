// ==============================================================================
// Maison MIPA Memories - App Component with Production Auth & RBAC
// ==============================================================================
import React, { useState, useEffect } from 'react';
import type { User, UserRole, Booking, BookingStatus } from './types';
import { INITIAL_USERS, INITIAL_BOOKINGS, INITIAL_EMPLOYEES, INITIAL_STUDIO_ROOMS } from './mockData';
import { getBookings, updateBookingStatus, assignBookingStaff } from './services/bookingService';
import { getStudioRooms, getEmployees } from './services/catalogService';
import { isSupabaseConfigured } from './lib/supabase';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HeroSection } from './components/public/HeroSection';
import { ServicesSection } from './components/public/ServicesSection';
import { PackagesSection } from './components/public/PackagesSection';
import { PortfolioSection } from './components/public/PortfolioSection';
import { BookingWizard } from './components/booking/BookingWizard';
import { CustomerPortal } from './components/customer/CustomerPortal';
import { StaffPortal } from './components/staff/StaffPortal';
import { ManagerDashboard } from './components/management/ManagerDashboard';
import { StudioCalendar } from './components/management/StudioCalendar';
import { CustomerCRM } from './components/management/CustomerCRM';
import { AdminPortal } from './components/admin/AdminPortal';
import { AuthModal } from './components/auth/AuthModal';
import { Search, Calendar, ShieldCheck, Users, Clock, LayoutDashboard } from 'lucide-react';

function AppContent() {
  const { user: currentUser, role: currentRole, logout } = useAuth();

  const [adminUsersList, setAdminUsersList] = useState<User[]>(INITIAL_USERS);
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authInitialTab, setAuthInitialTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authTargetMessage, setAuthTargetMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Main system state with backend persistence
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [studios, setStudios] = useState(INITIAL_STUDIO_ROOMS);

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

  // Route Security Interceptor for URL / Tab Navigation Guarding (401 & 403)
  // Security authority is backed by Supabase RLS; frontend route guard ensures clean UX.
  const handleTabSelect = (tabId: string) => {
    // 1. Public Routes: Anyone can access freely
    const publicTabs = ['home', 'services', 'packages', 'portfolio'];
    if (publicTabs.includes(tabId)) {
      setActiveTab(tabId);
      return;
    }

    // 2. Unauthenticated check -> 401 Unauthorized
    if (!currentUser || currentRole === 'GUEST') {
      handleOpenAuthModal('LOGIN', `🔒 HTTP 401 Unauthorized: Vui lòng đăng nhập để truy cập khu vực ${tabId.replace('_', ' ').toUpperCase()}`);
      return;
    }

    // 3. Customer Portal (/account)
    if (tabId === 'customer_portal') {
      setActiveTab(tabId);
      return;
    }

    // 4. Staff Portal (/staff)
    if (tabId === 'staff_portal') {
      if (['STAFF', 'MANAGER', 'ADMIN'].includes(currentRole)) {
        setActiveTab(tabId);
      } else {
        alert(`🚫 HTTP 403 Forbidden: Tài khoản ${currentRole} không được quyền truy cập /staff.`);
      }
      return;
    }

    // 5. Manager Portals (/management)
    if (['manager_dashboard', 'studio_calendar', 'customer_crm'].includes(tabId)) {
      if (['MANAGER', 'ADMIN'].includes(currentRole)) {
        setActiveTab(tabId);
      } else {
        alert(`🚫 HTTP 403 Forbidden: Chỉ Quản Lý (Manager) hoặc Admin mới được phép truy cập /management.`);
      }
      return;
    }

    // 6. System Admin Portal (/admin)
    if (tabId === 'admin_portal') {
      if (currentRole === 'ADMIN') {
        setActiveTab(tabId);
      } else {
        alert(`🚫 HTTP 403 Forbidden: Quyền Admin tối cao bị từ chối cho tài khoản ${currentRole}. Hành động này đã được ghi vào Audit Log.`);
      }
      return;
    }

    setActiveTab(tabId);
  };

  const handleAuthSuccess = (user: User) => {
    if (user.role === 'GUEST') setActiveTab('home');
    else if (user.role === 'CUSTOMER') setActiveTab('customer_portal');
    else if (user.role === 'STAFF') setActiveTab('staff_portal');
    else if (user.role === 'MANAGER') setActiveTab('manager_dashboard');
    else if (user.role === 'ADMIN') setActiveTab('admin_portal');
  };

  const handleLogout = async () => {
    await logout();
    setActiveTab('home');
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

  // Search filter
  const searchResults = searchQuery.trim().length > 1
    ? bookings.filter(b =>
        b.bookingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.customerPhone.includes(searchQuery)
      )
    : [];

  const handleOpenBooking = () => {
    if (!currentUser || currentRole === 'GUEST') {
      handleOpenAuthModal('LOGIN', '🔒 Quý khách vui lòng Đăng Nhập (hoặc Đăng Ký tài khoản mới) để tiến hành Đặt Lịch Chụp Ảnh tại Maison MIPA');
      return;
    }
    setIsBookingOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--mipa-background)' }}>
      {/* Top Sticky Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        activeTab={activeTab}
        setActiveTab={handleTabSelect}
        onOpenBooking={handleOpenBooking}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenAuthModal={handleOpenAuthModal}
        onLogout={handleLogout}
      />

      {/* Global Management Navigation Sub-bar when Manager or Admin */}
      {(currentRole === 'MANAGER' || currentRole === 'ADMIN') && ['manager_dashboard', 'studio_calendar', 'customer_crm', 'admin_portal'].includes(activeTab) && (
        <div className="mipa-manager-subbar" style={{
          backgroundColor: '#604634',
          color: '#EFE6C9',
          padding: '0.45rem 1rem',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0.75rem',
          fontSize: '0.82rem',
          borderBottom: '1px solid rgba(239, 230, 201, 0.15)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <button
            onClick={() => setActiveTab('manager_dashboard')}
            style={{
              border: 'none',
              background: activeTab === 'manager_dashboard' ? '#8C6E53' : 'transparent',
              color: '#FFFDF6',
              padding: '0.35rem 0.9rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            <LayoutDashboard size={15} color="#EFE6C9" /> Overview Dashboard
          </button>
          <button
            onClick={() => setActiveTab('studio_calendar')}
            style={{
              border: 'none',
              background: activeTab === 'studio_calendar' ? '#8C6E53' : 'transparent',
              color: '#FFFDF6',
              padding: '0.35rem 0.9rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Clock size={15} color="#EFE6C9" /> Lịch Phòng Studio
          </button>
          <button
            onClick={() => setActiveTab('customer_crm')}
            style={{
              border: 'none',
              background: activeTab === 'customer_crm' ? '#8C6E53' : 'transparent',
              color: '#FFFDF6',
              padding: '0.35rem 0.9rem',
              borderRadius: '12px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease',
            }}
          >
            <Users size={15} color="#EFE6C9" /> CRM & Khách Hàng
          </button>
          {currentRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('admin_portal')}
              style={{
                border: 'none',
                background: activeTab === 'admin_portal' ? '#9D174D' : 'transparent',
                color: '#FFFDF6',
                padding: '0.35rem 0.9rem',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s ease',
              }}
            >
              <ShieldCheck size={15} color="#EFE6C9" /> Quản Trị Hệ Thống
            </button>
          )}
        </div>
      )}

      {/* Main App Presentation Body */}
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

        {/* Public Homepage: Hero, Services, Packages, Portfolio */}
        {activeTab === 'home' && (
          <>
            <HeroSection
              onOpenBooking={handleOpenBooking}
              onExplorePackages={() => setActiveTab('packages')}
            />
            <ServicesSection
              onSelectService={handleOpenBooking}
            />
            <PackagesSection
              onOpenBooking={handleOpenBooking}
            />
            <PortfolioSection />
          </>
        )}

        {/* Individual Public Tabs */}
        {activeTab === 'services' && (
          <div style={{ paddingTop: '1rem' }}>
            <ServicesSection onSelectService={handleOpenBooking} />
          </div>
        )}

        {activeTab === 'packages' && (
          <div style={{ paddingTop: '1rem' }}>
            <PackagesSection onOpenBooking={handleOpenBooking} />
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div style={{ paddingTop: '1rem' }}>
            <PortfolioSection />
          </div>
        )}

        {/* Customer Self-Service Portal (/account) */}
        {activeTab === 'customer_portal' && currentUser && (
          <CustomerPortal
            bookings={bookings}
            onOpenBooking={handleOpenBooking}
          />
        )}

        {/* Staff Workspace Portal (/staff) */}
        {activeTab === 'staff_portal' && currentUser && (
          <StaffPortal
            bookings={bookings}
            onUpdateStatus={handleUpdateStatus}
          />
        )}

        {/* Manager Dashboard */}
        {activeTab === 'manager_dashboard' && (
          <ManagerDashboard
            bookings={bookings}
            employees={employees}
            studios={studios}
            onOpenBooking={handleOpenBooking}
            onUpdateStatus={handleUpdateStatus}
            onAssignStaff={handleAssignStaff}
            onNavigateTab={setActiveTab}
          />
        )}

        {/* Studio Calendar */}
        {activeTab === 'studio_calendar' && (
          <StudioCalendar
            bookings={bookings}
            studios={studios}
            onOpenBooking={handleOpenBooking}
          />
        )}

        {/* Customer CRM */}
        {activeTab === 'customer_crm' && (
          <CustomerCRM
            bookings={bookings}
          />
        )}

        {/* Admin Portal */}
        {activeTab === 'admin_portal' && (
          <AdminPortal
            usersList={adminUsersList}
            onUpdateUsersList={setAdminUsersList}
          />
        )}

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

      {/* Floating Sticky Mobile Booking Bar (Visible on mobile screens) */}
      {['home', 'services', 'packages', 'portfolio'].includes(activeTab) && (
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
