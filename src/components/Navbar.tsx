import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import type { User, UserRole, NotificationItem } from '../types';
import { CURRENT_USER_PROFILES, INITIAL_NOTIFICATIONS } from '../mockData';
import { getUserNotifications } from '../services/notificationService';
import {
  Camera,
  Bell,
  Calendar,
  User as UserIcon,
  Shield,
  Briefcase,
  ChevronDown,
  X,
  LogOut,
  UserPlus,
  LogIn,
  Menu,
  LayoutDashboard,
  Home,
  Layers,
  Tag,
  Image as ImageIcon,
  Sparkles,
  Crown,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  CheckCircle,
} from 'lucide-react';

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

// Bespoke Luxury Studio Monogram Emblem
export const MipaStudioEmblem: React.FC<{ size?: number }> = ({ size = 38 }) => (
  <img
    src="/logo.png"
    alt="Maison MIPA Memories Logo"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '9px',
      objectFit: 'cover',
      display: 'block',
      flexShrink: 0,
      border: '1px solid #EFE6C9',
      boxShadow: '0 2px 6px rgba(96, 70, 52, 0.1)',
    }}
  />
);

// Bespoke Luxury User Monogram Avatar Badge
export const UserAvatarBadge: React.FC<{
  user: User;
  size?: number;
  isRootOwner?: boolean;
}> = ({ user, size = 30, isRootOwner = false }) => {
  const initial = user.fullName?.charAt(0)?.toUpperCase() || 'M';
  const hasCustomAvatar = user.avatar && !user.avatar.includes('favicon.svg') && !user.avatar.includes('hero.png') && !user.avatar.includes('studio.png');

  if (hasCustomAvatar) {
    return (
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <img
          src={user.avatar}
          alt={user.fullName}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            objectFit: 'cover',
            border: isRootOwner ? '2px solid #C6A45F' : '1.5px solid #8C6E53',
          }}
        />
        {isRootOwner && (
          <div style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 13,
            height: 13,
            borderRadius: '50%',
            backgroundColor: '#8C6E53',
            border: '1px solid #FFFDF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Crown size={8} color="#EFE6C9" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: isRootOwner
            ? 'linear-gradient(135deg, #8C6E53 0%, #4A3525 100%)'
            : 'linear-gradient(135deg, #7A5C43 0%, #604634 100%)',
          color: '#FFFDF6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.44,
          fontFamily: 'var(--mipa-font-heading)',
          fontWeight: 700,
          border: isRootOwner ? '2px solid #C6A45F' : '1.5px solid rgba(198, 164, 95, 0.5)',
          boxShadow: isRootOwner ? '0 2px 6px rgba(198, 164, 95, 0.3)' : '0 2px 5px rgba(96, 70, 52, 0.15)',
        }}
      >
        {initial}
      </div>
      {isRootOwner && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 13,
          height: 13,
          borderRadius: '50%',
          backgroundColor: '#8C6E53',
          border: '1px solid #FFFDF6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Crown size={8} color="#EFE6C9" />
        </div>
      )}
    </div>
  );
};

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

  // Dynamic interactive notifications with localStorage persistence
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const cached = localStorage.getItem('mipa_user_notifications_v1');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const location = useLocation();
  const navigate = useNavigate();

  const displayUser = currentUser || CURRENT_USER_PROFILES.GUEST;

  // Sync server notifications
  useEffect(() => {
    let active = true;
    if (displayUser && displayUser.id && displayUser.role !== 'GUEST') {
      getUserNotifications(displayUser.id).then(serverNotifs => {
        if (!active) return;
        if (serverNotifs && serverNotifs.length > 0) {
          setNotifications(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const newOnes = serverNotifs.filter(n => !existingIds.has(n.id));
            if (newOnes.length === 0) return prev;
            const updated = [...newOnes, ...prev];
            try {
              localStorage.setItem('mipa_user_notifications_v1', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [displayUser?.id, displayUser?.role]);

  const saveNotifications = (newNotifs: NotificationItem[]) => {
    setNotifications(newNotifs);
    try {
      localStorage.setItem('mipa_user_notifications_v1', JSON.stringify(newNotifs));
    } catch {}
  };

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  };

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  const handleMarkAllAsRead = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleClearAllNotifications = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    saveNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const roleLabels: Record<UserRole, { label: string; icon: any; color: string }> = {
    GUEST: { label: 'Khách Tham Quan', icon: UserIcon, color: '#6E5F55' },
    CUSTOMER: { label: 'Khách Hàng', icon: UserIcon, color: '#8C6E53' },
    STAFF: { label: 'Staff', icon: Camera, color: '#C6A45F' },
    MANAGER: { label: 'Quản Lý', icon: Briefcase, color: '#2C221E' },
    ADMIN: {
      label: displayUser.isRootOwner ? 'Root Owner' : 'Admin',
      icon: displayUser.isRootOwner ? Crown : Shield,
      color: '#8C6E53',
    },
  };

  // Structured real URL paths per role
  const getNavLinksForRole = (role: UserRole) => {
    if (displayUser.isRootOwner || role === 'ADMIN') {
      return [
        {
          id: 'admin_portal',
          to: '/admin',
          label: displayUser.isRootOwner ? 'Quản Trị Studio' : 'Quản Trị Admin',
          icon: displayUser.isRootOwner ? Crown : Shield,
        },
        {
          id: 'manager_dashboard',
          to: '/management',
          label: 'Quản Lý Studio OS',
          icon: LayoutDashboard,
        },
        { id: 'home', to: '/', label: 'Trang chủ', icon: Home },
        { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
        { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
        { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: ImageIcon },
      ];
    }

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
          { id: 'customer_portal', to: '/account', label: 'Lịch của tôi', icon: Sparkles },
          { id: 'home', to: '/', label: 'Trang chủ', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
          { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: ImageIcon },
        ];
      case 'STAFF':
        return [
          { id: 'staff_portal', to: '/staff', label: 'Ca chụp & Lịch', icon: Calendar },
          { id: 'home', to: '/', label: 'Trang chủ Studio', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
        ];
      case 'MANAGER':
        return [
          {
            id: 'manager_dashboard',
            to: '/management',
            label: 'Quản Lý Studio OS',
            icon: LayoutDashboard,
          },
          { id: 'home', to: '/', label: 'Trang chủ', icon: Home },
          { id: 'services', to: '/dich-vu', label: 'Dịch vụ', icon: Layers },
          { id: 'packages', to: '/bang-gia', label: 'Bảng giá', icon: Tag },
          { id: 'portfolio', to: '/portfolio', label: 'Portfolio', icon: ImageIcon },
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
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.65rem', flexShrink: 0 }}
        >
          <MipaStudioEmblem size={42} />
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
        <nav className="mipa-mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isRouteActive(link.to);

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
                    ? 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)'
                    : 'transparent',
                  color: isActive ? '#FFFDF6' : '#4A3525',
                  border: '1px solid transparent',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  textDecoration: 'none',
                  boxShadow: isActive ? '0 3px 10px rgba(96, 70, 52, 0.2)' : 'none',
                }}
              >
                {Icon && <Icon size={15} strokeWidth={1.8} style={{ color: isActive ? '#EFE6C9' : '#8C6E53' }} />}
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

          {/* Interactive Notifications button & dismissible dropdown */}
          {currentRole !== 'GUEST' && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                title="Thông báo hệ thống"
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
                  transition: 'all 0.2s ease',
                }}
              >
                <Bell size={16} color="#604634" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    borderRadius: '8px',
                    backgroundColor: '#8C6E53',
                    color: '#FFFDF6',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '44px',
                  width: '340px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  boxShadow: '0 12px 35px rgba(96, 70, 52, 0.18)',
                  border: '1px solid var(--mipa-beige)',
                  padding: '1rem',
                  zIndex: 2000,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#604634', margin: 0 }}>Thông báo hệ thống</h4>
                      {unreadCount > 0 && (
                        <span style={{ fontSize: '0.68rem', backgroundColor: '#F8F3E6', color: '#8C6E53', padding: '0.1rem 0.4rem', borderRadius: '6px', fontWeight: 700 }}>
                          {unreadCount} mới
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          title="Đánh dấu tất cả đã đọc"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            color: '#8C6E53',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            padding: '0.2rem 0.4rem',
                            borderRadius: '4px',
                          }}
                        >
                          <CheckCheck size={13} /> Đã đọc
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifs(false)}
                        title="Đóng bảng thông báo"
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#8C6E53', padding: '0.2rem' }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.8rem 1rem', color: '#8C6E53' }}>
                      <CheckCircle size={26} color="#C6A45F" style={{ margin: '0 auto 0.4rem', display: 'block' }} />
                      <div style={{ fontWeight: 600, color: '#604634', fontSize: '0.85rem' }}>Không có thông báo mới</div>
                      <div style={{ fontSize: '0.75rem', color: '#A39385', marginTop: '0.2rem' }}>Tất cả thông báo đã được xử lý xong</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '270px', overflowY: 'auto' }}>
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            style={{
                              padding: '0.65rem 0.75rem',
                              borderRadius: '10px',
                              backgroundColor: n.read ? '#FFFFFF' : '#FFFDF6',
                              border: '1px solid',
                              borderColor: n.read ? '#F3EDE2' : '#E6D7B9',
                              borderLeft: n.read ? '3px solid #E6D7B9' : '3px solid #8C6E53',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              position: 'relative',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <div style={{ fontWeight: 600, color: n.read ? '#6E5F55' : '#604634', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                {!n.read && <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#C6A45F', flexShrink: 0 }} />}
                                {n.title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                {!n.read && (
                                  <button
                                    onClick={(e) => handleMarkAsRead(n.id, e)}
                                    title="Đánh dấu đã đọc"
                                    style={{
                                      border: 'none',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      color: '#8C6E53',
                                      padding: '2px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                    }}
                                  >
                                    <Check size={12} />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDismissNotification(n.id, e)}
                                  title="Đóng / Xóa thông báo này"
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: 'pointer',
                                    color: '#A39385',
                                    padding: '2px',
                                    borderRadius: '4px',
                                    display: 'flex',
                                  }}
                                >
                                  <X size={13} />
                                </button>
                              </div>
                            </div>
                            <div style={{ color: '#6E5F55', marginTop: '0.2rem', fontSize: '0.78rem', lineHeight: 1.4 }}>
                              {n.message}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.7rem', color: '#A39385', marginTop: '0.35rem' }}>
                              <Clock size={11} />
                              {n.timestamp}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ borderTop: '1px solid #F3EDE2', marginTop: '0.6rem', paddingTop: '0.4rem', textAlign: 'center' }}>
                        <button
                          onClick={handleClearAllNotifications}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#8C6E53',
                            fontSize: '0.74rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: '0.2rem 0.5rem',
                          }}
                        >
                          Xóa tất cả thông báo
                        </button>
                      </div>
                    </>
                  )}
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
                  <UserAvatarBadge user={displayUser} size={28} isRootOwner={displayUser.isRootOwner} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#604634', lineHeight: 1.1 }}>
                      {displayUser.fullName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8C6E53', fontWeight: 600 }}>
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
                    <div style={{ padding: '0.65rem', backgroundColor: '#FFFDF6', borderRadius: '12px', marginBottom: '0.5rem', border: '1px solid var(--mipa-beige)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <UserAvatarBadge user={displayUser} size={40} isRootOwner={displayUser.isRootOwner} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#604634', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayUser.fullName}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8C6E53' }}>
                          {roleLabels[currentRole].label}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#6E5F55', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {displayUser.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '0.3rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Tài khoản & Phân quyền:
                    </div>

                    <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#FFFDF6', borderRadius: '10px', fontSize: '0.82rem', color: '#604634', marginBottom: '0.4rem', border: '1px solid var(--mipa-beige)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span>Quyền truy cập:</span>
                      <strong style={{ color: '#8C6E53' }}>{roleLabels[currentRole].label}</strong>
                    </div>

                    <Link
                      to="/account?tab=profile"
                      onClick={() => setShowRoleDropdown(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.55rem 0.85rem',
                        backgroundColor: '#F8F3E6',
                        borderRadius: '10px',
                        color: '#604634',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        marginBottom: '0.4rem',
                        border: '1px solid #E6D7B9',
                      }}
                    >
                      <UserIcon size={14} style={{ color: '#8C6E53' }} />
                      <span>Thông Tin Cá Nhân</span>
                    </Link>

                    {currentRole === 'CUSTOMER' && (
                      <Link
                        to="/account"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: '#F8F3E6',
                          borderRadius: '10px',
                          color: '#604634',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: '0.4rem',
                          border: '1px solid #E6D7B9',
                        }}
                      >
                        <Sparkles size={14} style={{ color: '#8C6E53' }} />
                        <span>Quản lý đơn & Album</span>
                      </Link>
                    )}

                    {(currentRole === 'MANAGER' || currentRole === 'ADMIN' || displayUser.isRootOwner) && (
                      <Link
                        to="/management"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 0.85rem',
                          backgroundColor: '#F8F3E6',
                          borderRadius: '10px',
                          color: '#604634',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: '0.4rem',
                          border: '1px solid #E6D7B9',
                        }}
                      >
                        <LayoutDashboard size={14} style={{ color: '#8C6E53' }} />
                        <span>Đến Studio Manager OS</span>
                      </Link>
                    )}

                    {(currentRole === 'ADMIN' || displayUser.isRootOwner) && (
                      <Link
                        to="/admin"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.55rem 0.85rem',
                          background: 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)',
                          borderRadius: '10px',
                          color: '#FFFDF6',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          marginBottom: '0.4rem',
                          boxShadow: '0 2px 6px rgba(96, 70, 52, 0.2)',
                        }}
                      >
                        <Crown size={14} color="#EFE6C9" />
                        <span>{displayUser.isRootOwner ? 'Bảng Quản Trị Root Owner' : 'Bảng Quản Trị (Admin)'}</span>
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
              <>
                <Link
                  to="/account?tab=profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '12px',
                    backgroundColor: '#F8F3E6',
                    color: '#604634',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    border: '1px solid #E6D7B9',
                  }}
                >
                  <UserIcon size={16} /> Thông Tin Cá Nhân
                </Link>
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
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
