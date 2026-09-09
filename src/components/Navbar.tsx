import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { User, UserRole } from '../types';
import { CURRENT_USER_PROFILES, INITIAL_NOTIFICATIONS } from '../mockData';
import { Camera, Bell, Calendar, User as UserIcon, Shield, Briefcase, ChevronDown, X, LogOut, UserPlus, LogIn, Menu, LayoutDashboard, Home, Layers, Tag, Image as ImageIcon, Sparkles } from 'lucide-react';

export interface NavbarProps {
  currentUser: User | null;
  currentRole: UserRole;
  onRoleChange?: (role: UserRole) => void;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
  onOpenBooking: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  onOpenAuthModal: (tab?: 'LOGIN' | 'REGISTER', msg?: string) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  activeTab: _legacyActiveTab,
  setActiveTab: legacySetActiveTab,
  onOpenBooking,
  searchQuery: _searchQuery,
  setSearchQuery: _setSearchQuery,
  onOpenAuthModal,
  onLogout,
}) => {
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const displayUser = currentUser || CURRENT_USER_PROFILES.GUEST;

  const roleLabels: Record<UserRole, { label: string; icon: any; color: string }> = {
    GUEST: { label: 'Khách Tham Quan (Chưa đăng nhập)', icon: UserIcon, color: '#6E5F55' },
    CUSTOMER: { label: 'Khách hàng VIP', icon: UserIcon, color: '#8C6E53' },
    STAFF: { label: 'Nhân viên / Photographer', icon: Camera, color: '#C6A45F' },
    MANAGER: { label: 'Quản lý Studio', icon: Briefcase, color: '#2C221E' },
    ADMIN: { label: 'Quản trị viên (Admin)', icon: Shield, color: '#9D174D' },
  };

  // Structured real URL paths per role
  const getNavLinksForRole = (role: UserRole) => {
    switch (role) {
      case 'GUEST':
        return [
          { id: 'home', to: '/', label: 'Trang chủ', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
          { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: ImageIcon },
        ];
      case 'CUSTOMER':
        return [
          { id: 'customer_portal', to: '/account', label: 'Lịch của tôi', icon: Sparkles, isHighlight: true },
          { id: 'home', to: '/', label: 'Trang chủ', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
          { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: ImageIcon },
        ];
      case 'STAFF':
        return [
          { id: 'staff_portal', to: '/staff', label: 'Ca chụp & Lịch', icon: Calendar, isHighlight: true },
          { id: 'home', to: '/', label: 'Trang chủ Studio', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
        ];
      case 'MANAGER':
      case 'ADMIN':
        return [
          { id: 'home', to: '/', label: 'Trang chủ', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
          { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: ImageIcon },
          {
            id: 'manager_dashboard',
            to: '/management',
            label: 'Quản Lý Studio OS',
            icon: LayoutDashboard,
            isHighlight: true,
          },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinksForRole(currentRole);

  const isRouteActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const handleLinkClick = (to: string, id: string) => {
    if (legacySetActiveTab) legacySetActiveTab(id);
    navigate(to);
    setIsMobileMenuOpen(false);
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(255, 253, 246, 0.94)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(140, 110, 83, 0.15)',
      boxShadow: '0 4px 20px rgba(96, 70, 52, 0.04)',
    }}>
      <div className="mipa-container" style={{
        maxWidth: '1350px',
        margin: '0 auto',
        padding: '0.6rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        width: '100%',
      }}>
        {/* Brand Logo Link */}
        <Link
          to="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}
        >
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)',
            color: '#EFE6C9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontFamily: 'var(--mipa-font-heading)',
            boxShadow: '0 3px 10px rgba(96, 70, 52, 0.2)',
            flexShrink: 0,
          }}>
            M
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--mipa-font-heading)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: '#604634',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
            }}>
              MAISON MIPA
            </div>
            <div style={{
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#8C6E53',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}>
              Memories Studio
            </div>
          </div>
        </Link>



        {/* Dynamic Navigation Links (Desktop) */}
        <nav className="mipa-mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isRouteActive(link.to);
            const isHighlight = link.isHighlight;

            return (
              <NavLink
                key={link.id}
                to={link.to}
                role="button"
                onClick={() => {
                  if (legacySetActiveTab) legacySetActiveTab(link.id);
                }}
                style={{
                  background: isActive
                    ? (isHighlight ? 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)' : '#8C6E53')
                    : (isHighlight ? 'rgba(198, 164, 95, 0.2)' : 'transparent'),
                  color: isActive ? '#FFFDF6' : (isHighlight ? '#604634' : '#2C221E'),
                  border: isHighlight ? '1px solid #C6A45F' : 'none',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: isActive || isHighlight ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  boxShadow: isActive && isHighlight ? '0 4px 12px rgba(96, 70, 52, 0.2)' : 'none',
                }}
              >
                {Icon && <Icon size={15} style={{ color: isActive ? '#EFE6C9' : (isHighlight ? '#8C6E53' : '#6E5F55') }} />}
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Mobile Hamburger Toggle Button */}
        <button
          className="mipa-mobile-show"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            border: 'none',
            background: 'rgba(140, 110, 83, 0.1)',
            padding: '0.5rem',
            borderRadius: '10px',
            color: '#604634',
            cursor: 'pointer',
          }}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        {/* Actions & Role Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onOpenBooking}
            className="btn-mipa-gold"
            style={{ height: '36px', fontSize: '0.82rem', padding: '0 1rem' }}
          >
            <Camera size={14} />
            ĐẶT LỊCH
          </button>

          {/* Notifications button */}
          {currentRole !== 'GUEST' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid var(--mipa-beige)',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Bell size={16} color="#604634" />
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#9D174D',
                  color: '#FFF',
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  2
                </span>
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '44px',
                  width: '320px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  border: '1px solid var(--mipa-beige)',
                  padding: '1rem',
                  zIndex: 2000,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Thông báo hệ thống</h4>
                    <button onClick={() => setShowNotifs(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '250px', overflowY: 'auto' }}>
                    {INITIAL_NOTIFICATIONS.map((n) => (
                      <div key={n.id} style={{ padding: '0.6rem', borderRadius: '8px', backgroundColor: n.read ? '#F9F8F5' : '#FFFDF6', borderLeft: '3px solid #C6A45F', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 600, color: '#604634' }}>{n.title}</div>
                        <div style={{ color: '#6E5F55', marginTop: '0.15rem' }}>{n.message}</div>
                        <div style={{ fontSize: '0.7rem', color: '#A39385', marginTop: '0.2rem' }}>{n.timestamp}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Auth Buttons / Profile Dropdown (Desktop Only) */}
          <div className="mipa-desktop-only">
            {currentRole === 'GUEST' ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => onOpenAuthModal('LOGIN')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.85rem',
                    backgroundColor: '#604634',
                    color: '#FFFDF6',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    boxShadow: '0 2px 8px rgba(96, 70, 52, 0.2)',
                  }}
                >
                  <LogIn size={14} />
                  Đăng Nhập
                </button>
                <button
                  onClick={() => onOpenAuthModal('REGISTER')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.4rem 0.85rem',
                    backgroundColor: '#8C6E53',
                    color: '#FFFDF6',
                    border: 'none',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                  }}
                >
                  <UserPlus size={14} />
                  Đăng Ký
                </button>
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#FFFDF6',
                    border: '1px solid #C6A45F',
                    borderRadius: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(198, 164, 95, 0.15)',
                  }}
                >
                  <img
                    src={displayUser.avatar || '/favicon.svg'}
                    alt={displayUser.fullName}
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#604634', lineHeight: 1.1 }}>
                      {displayUser.fullName}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#8C6E53' }}>
                      {roleLabels[currentRole].label}
                    </div>
                  </div>
                  <ChevronDown size={14} color="#8C6E53" />
                </button>

                {showRoleDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '46px',
                    width: '270px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '16px',
                    boxShadow: '0 12px 35px rgba(96, 70, 52, 0.18)',
                    border: '1px solid var(--mipa-beige)',
                    padding: '0.6rem',
                    zIndex: 2000,
                  }}>
                    {/* Account Header */}
                    <div style={{ padding: '0.6rem', backgroundColor: '#FFFDF6', borderRadius: '12px', marginBottom: '0.5rem', border: '1px solid var(--mipa-beige)' }}>
                      <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.9rem' }}>{displayUser.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8C6E53' }}>✉️ {displayUser.email}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8C6E53' }}>📞 {displayUser.phone}</div>
                    </div>

                    <div style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tài khoản & Phân quyền:
                    </div>

                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FFFDF6', borderRadius: '10px', fontSize: '0.82rem', color: '#604634', marginBottom: '0.4rem', border: '1px solid var(--mipa-beige)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Quyền truy cập:</span>
                      <strong style={{ color: '#8C6E53' }}>{roleLabels[currentRole].label}</strong>
                    </div>

                    {currentRole === 'CUSTOMER' && (
                      <Link
                        to="/account"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'block',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#F8F3E6',
                          borderRadius: '10px',
                          color: '#604634',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: '0.4rem',
                        }}
                      >
                        → Đến trang Quản lý đơn & Album
                      </Link>
                    )}

                    {(currentRole === 'MANAGER' || currentRole === 'ADMIN') && (
                      <Link
                        to="/management"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'block',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#F8F3E6',
                          borderRadius: '10px',
                          color: '#604634',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: '0.4rem',
                        }}
                      >
                        → Đến Studio Manager OS
                      </Link>
                    )}

                    {currentRole === 'ADMIN' && (
                      <Link
                        to="/admin"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'block',
                          padding: '0.5rem 0.75rem',
                          backgroundColor: '#9D174D',
                          borderRadius: '10px',
                          color: '#FFF',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: '0.4rem',
                        }}
                      >
                        → Bảng Quản Trị Tối Cao (Admin)
                      </Link>
                    )}

                    <div style={{ borderTop: '1px solid var(--mipa-beige)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                      <button
                        onClick={() => {
                          onLogout();
                          setShowRoleDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem',
                          border: 'none',
                          borderRadius: '10px',
                          backgroundColor: '#FFF5F5',
                          color: '#C53030',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <LogOut size={15} /> ĐĂNG XUẤT TÀI KHOẢN
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-down Navigation Drawer */}
      {isMobileMenuOpen && (
        <div style={{
          backgroundColor: '#FFFDF6',
          borderBottom: '2px solid #8C6E53',
          padding: '1.2rem 1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 10px 25px rgba(96, 70, 52, 0.15)',
          animation: 'slideUp 0.25s ease-out',
        }}>


          {/* Mobile Nav Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = isRouteActive(link.to);
              return (
                <NavLink
                  key={link.id}
                  to={link.to}
                  role="button"
                  onClick={() => handleLinkClick(link.to, link.id)}
                  style={{
                    background: isActive ? '#8C6E53' : 'rgba(239, 230, 201, 0.3)',
                    color: isActive ? '#FFFDF6' : '#2C221E',
                    border: 'none',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.9rem',
                    fontWeight: isActive ? 700 : 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    textDecoration: 'none',
                  }}
                >
                  {Icon && <Icon size={18} style={{ color: isActive ? '#EFE6C9' : '#8C6E53' }} />}
                  {link.label}
                </NavLink>
              );
            })}
          </div>

          {/* Mobile Auth & Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', paddingTop: '0.6rem', borderTop: '1px solid var(--mipa-beige)' }}>
            <button
              onClick={() => {
                navigate('/booking');
                onOpenBooking();
                setIsMobileMenuOpen(false);
              }}
              className="btn-mipa-gold"
              style={{ width: '100%', height: '42px' }}
            >
              <Calendar size={16} /> ĐẶT LỊCH NGAY
            </button>

            {currentRole === 'GUEST' ? (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button
                  onClick={() => {
                    onOpenAuthModal('LOGIN');
                    setIsMobileMenuOpen(false);
                  }}
                  className="btn-mipa-primary"
                  style={{ flex: 1, padding: '0.6rem' }}
                >
                  <LogIn size={15} /> Đăng Nhập
                </button>
                <button
                  onClick={() => {
                    onOpenAuthModal('REGISTER');
                    setIsMobileMenuOpen(false);
                  }}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.6rem' }}
                >
                  <UserPlus size={15} /> Đăng Ký
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  onLogout();
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: '#FFF5F5',
                  color: '#C53030',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <LogOut size={16} /> Đăng Xuất ({displayUser.fullName})
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
