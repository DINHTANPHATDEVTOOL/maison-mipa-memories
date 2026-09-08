import React, { useState } from 'react';
import type { User, UserRole, Booking, BookingStatus } from './types';
import { INITIAL_USERS, INITIAL_BOOKINGS, INITIAL_EMPLOYEES, INITIAL_STUDIO_ROOMS } from './mockData';
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

export function App() {
  const [usersList, setUsersList] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole>('GUEST');
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authInitialTab, setAuthInitialTab] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authTargetMessage, setAuthTargetMessage] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Main system state
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [employees, setEmployees] = useState(INITIAL_EMPLOYEES);
  const [studios, setStudios] = useState(INITIAL_STUDIO_ROOMS);

  const handleRoleChange = (newRole: UserRole) => {
    setCurrentRole(newRole);
    if (newRole === 'GUEST') {
      setCurrentUser(null);
      setActiveTab('home');
      return;
    }
    const matchingUser = usersList.find(u => u.role === newRole);
    if (matchingUser) {
      setCurrentUser(matchingUser);
    }
    if (newRole === 'CUSTOMER') setActiveTab('customer_portal');
    if (newRole === 'STAFF') setActiveTab('staff_portal');
    if (newRole === 'MANAGER') setActiveTab('manager_dashboard');
    if (newRole === 'ADMIN') setActiveTab('admin_portal');
  };

  const handleOpenAuthModal = (tab: 'LOGIN' | 'REGISTER' = 'LOGIN', msg?: string) => {
    setAuthInitialTab(tab);
    setAuthTargetMessage(msg || '');
    setIsAuthModalOpen(true);
  };

  // Route Security Interceptor for URL / Tab Navigation Guarding (401 & 403)
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

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.role === 'GUEST') setActiveTab('home');
    if (user.role === 'CUSTOMER') setActiveTab('customer_portal');
    if (user.role === 'STAFF') setActiveTab('staff_portal');
    if (user.role === 'MANAGER') setActiveTab('manager_dashboard');
    if (user.role === 'ADMIN') setActiveTab('admin_portal');
  };

  const handleRegisterSuccess = (newUser: User) => {
    setUsersList(prev => [newUser, ...prev]);
    handleLoginSuccess(newUser);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentRole('GUEST');
    setActiveTab('home');
    setSearchQuery('');
    setIsAuthModalOpen(false);
  };

  const handleBookingSuccess = (newBooking: Booking) => {
    setBookings([newBooking, ...bookings]);
  };

  const handleUpdateStatus = (bookingId: string, newStatus: BookingStatus, note?: string) => {
    setBookings(bookings.map(b => b.id === bookingId ? { ...b, bookingStatus: newStatus } : b));
  };

  const handleAssignStaff = (bookingId: string, employeeId: string, role: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    setBookings(bookings.map(b => {
      if (b.id === bookingId) {
        const updatedAsgs = b.assignments.filter(a => a.assignmentRole !== role);
        updatedAsgs.push({
          id: `asg_${Date.now()}`,
          bookingId: b.bookingCode,
          employeeId: emp.id,
          employeeName: emp.name,
          assignmentRole: role as any,
          startTime: b.startTime,
          endTime: b.endTime,
        });
        return { ...b, assignments: updatedAsgs };
      }
      return b;
    }));
  };

  // Search Results Filter
  const filteredSearchResults = searchQuery.trim() !== ''
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
        onRoleChange={handleRoleChange}
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
            <Calendar size={15} color="#EFE6C9" /> Studio Calendar
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
            <Users size={15} color="#EFE6C9" /> Customer CRM & Insights
          </button>
          {currentRole === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('admin_portal')}
              style={{
                border: 'none',
                background: activeTab === 'admin_portal' ? '#8C6E53' : 'transparent',
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
              <ShieldCheck size={15} color="#EFE6C9" /> Admin Control & Vouchers
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        
        {/* Global Search Results Popup Overlay if searching */}
        {searchQuery.trim() !== '' && (
          <div style={{ maxWidth: '1200px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
            <div className="mipa-card-gold" style={{ padding: '1.5rem', borderRadius: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: '#604634', margin: 0 }}>
                  🔍 Kết quả tìm kiếm cho: "{searchQuery}" ({filteredSearchResults.length} đơn)
                </h3>
                <button onClick={() => setSearchQuery('')} className="btn-mipa-secondary" style={{ fontSize: '0.8rem' }}>
                  Xóa Tìm Kiếm
                </button>
              </div>

              {filteredSearchResults.length === 0 ? (
                <p style={{ color: '#6E5F55', fontSize: '0.9rem' }}>Không tìm thấy mã đơn hoặc khách hàng phù hợp.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {filteredSearchResults.map((b) => (
                    <div key={b.id} style={{ padding: '0.9rem', borderRadius: '12px', backgroundColor: '#FFFFFF', border: '1px solid var(--mipa-beige)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{b.bookingCode}</strong> — {b.packageName} ({b.serviceName})
                        <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>Khách: {b.customerName} ({b.customerPhone}) • Ngày: {b.bookingDate} lúc {b.startTime}</div>
                      </div>
                      <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                        ● {b.bookingStatus}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Public Website View */}
        {activeTab === 'home' && searchQuery.trim() === '' && (
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

        {activeTab === 'services' && (
          <ServicesSection onSelectService={handleOpenBooking} />
        )}

        {activeTab === 'packages' && (
          <PackagesSection onOpenBooking={handleOpenBooking} />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioSection />
        )}

        {/* Customer Portal */}
        {activeTab === 'customer_portal' && (
          <CustomerPortal
            bookings={bookings}
            onOpenBooking={handleOpenBooking}
          />
        )}

        {/* Staff Portal */}
        {activeTab === 'staff_portal' && (
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
            usersList={usersList}
            onUpdateUsersList={setUsersList}
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
      />

      {/* Real Auth Modal (Login & Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        usersList={usersList}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
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
export default App;


