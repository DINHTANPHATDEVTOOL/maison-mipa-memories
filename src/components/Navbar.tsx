import React, { useState, useEffect, useRef } from 'react';
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
  Crown,
  Check,
  CheckCheck,
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

// Official Maison MIPA Studio Emblem (Enhanced with Luxury Medallion Border & Contrast)
export const MipaStudioEmblem: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      padding: '2px',
      background: 'linear-gradient(135deg, rgba(198, 164, 95, 0.7) 0%, rgba(96, 70, 52, 0.4) 100%)',
      boxShadow: '0 2px 10px rgba(96, 70, 52, 0.16), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      border: '1.5px solid rgba(198, 164, 95, 0.55)',
      backgroundColor: '#FFFDF9',
    }}
  >
    <img
      src="/logo-transparent-256.png"
      alt="Maison MIPA Memories Logo"
      width={size - 6}
      height={size - 6}
      style={{
        width: size - 6,
        height: size - 6,
        objectFit: 'contain',
        display: 'block',
        filter: 'drop-shadow(0 1px 2px rgba(96, 70, 52, 0.2))',
      }}
    />
  </div>
);

// Bespoke Luxury User Monogram Avatar Badge
export const UserAvatarBadge: React.FC<{
  user: User;
  size?: number;
  isRootOwner?: boolean;
}> = ({ user, size = 30, isRootOwner = false }) => {
  const initial = user.fullName?.charAt(0)?.toUpperCase() || 'M';
  const hasCustomAvatar =
    user.avatar &&
    !user.avatar.includes('favicon.svg') &&
    !user.avatar.includes('hero.png') &&
    !user.avatar.includes('studio.png');

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
          <div
            style={{
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
            }}
          >
            <Crown size={8} color="#EFE6C9" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#8C6E53',
        border: isRootOwner ? '2px solid #C6A45F' : '1.5px solid #EDE7DC',
        color: '#FFFDF6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.42,
        flexShrink: 0,
      }}
    >
      {initial}
      {isRootOwner && (
        <div
          style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 13,
            height: 13,
            borderRadius: '50%',
            backgroundColor: '#C6A45F',
            border: '1px solid #FFFDF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Crown size={8} color="#15110E" />
        </div>
      )}
    </div>
  );
};

// Canonical Public Navigation Architecture
export const PUBLIC_NAV_ITEMS = [
  { id: 'concept', to: '/concept', label: 'Concept' },
  { id: 'services', to: '/dich-vu', label: 'Dịch vụ' },
  { id: 'portfolio', to: '/portfolio', label: 'Portfolio' },
  { id: 'packages', to: '/bang-gia', label: 'Bảng giá' },
];

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onOpenBooking,
  onOpenAuthModal,
  onLogout,
  setActiveTab: legacySetActiveTab,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isScrolled, setIsScrolled] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notification state - strictly isolated by user ID: mipa_notifications_v2:<USER_ID>
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    if (!currentUser?.id) return [];
    try {
      const saved = localStorage.getItem(`mipa_notifications_v2:${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    let mounted = true;
    if (!currentUser?.id) {
      setNotifications([]);
      return;
    }

    // User A login: load only A cache
    try {
      const saved = localStorage.getItem(`mipa_notifications_v2:${currentUser.id}`);
      if (mounted) {
        setNotifications(saved ? JSON.parse(saved) : []);
      }
    } catch {
      if (mounted) setNotifications([]);
    }

    async function loadNotifications() {
      if (!currentUser?.id) return;
      try {
        const remoteNotifs = await getUserNotifications(currentUser.id);
        if (mounted) {
          // If server returns [], set notifications to []. Do NOT keep previous state.
          const fresh = remoteNotifs || [];
          setNotifications(fresh);
          try {
            localStorage.setItem(`mipa_notifications_v2:${currentUser.id}`, JSON.stringify(fresh));
          } catch (e) {
            console.warn('Cannot persist notifications', e);
          }
        }
      } catch {
        // ignore
      }
    }
    loadNotifications();
    return () => {
      mounted = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Click-outside handler: closes notification panel and account dropdown
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayUser = currentUser || CURRENT_USER_PROFILES[currentRole];

  const saveNotifications = (items: NotificationItem[]) => {
    setNotifications(items);
    if (currentUser?.id) {
      try {
        localStorage.setItem(`mipa_notifications_v2:${currentUser.id}`, JSON.stringify(items));
      } catch (e) {
        console.warn('Cannot persist notifications', e);
      }
    }
  };

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const handleMarkAllAsRead = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const handleClearAllNotifications = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    saveNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleLabels: Record<UserRole, { label: string; icon: any; color: string }> = {
    GUEST: { label: 'Khách Tham Quan', icon: UserIcon, color: '#6E5F55' },
    CUSTOMER: { label: 'Khách Hàng', icon: UserIcon, color: '#8C6E53' },
    STAFF: { label: 'Staff Studio', icon: Camera, color: '#C6A45F' },
    MANAGER: { label: 'Quản Lý Studio', icon: Briefcase, color: '#2C221E' },
    ADMIN: {
      label: displayUser.isRootOwner ? 'Root Owner' : 'Quản Trị Admin',
      icon: displayUser.isRootOwner ? Crown : Shield,
      color: '#8C6E53',
    },
  };

  const isRouteActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  const handleLinkClick = (to: string, id: string) => {
    if (legacySetActiveTab) legacySetActiveTab(id);
    navigate(to);
    setIsMobileMenuOpen(false);
  };

  // Viewport-safe mobile navigation: lock body scroll and escape key handling
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsMobileMenuOpen(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isMobileMenuOpen]);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        backgroundColor: isScrolled ? '#FAF8F3' : 'rgba(250, 248, 243, 0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: isScrolled ? '1px solid rgba(140, 110, 83, 0.22)' : '1px solid rgba(140, 110, 83, 0.12)',
        boxShadow: isScrolled ? '0 4px 16px rgba(41, 35, 31, 0.05)' : 'none',
        transition: 'background-color 240ms ease, border-color 240ms ease, box-shadow 240ms ease',
      }}
    >
      <div
        className="mipa-container"
        style={{
          maxWidth: '1350px',
          margin: '0 auto',
          padding: isScrolled ? '0.65rem 1.5rem' : '0.95rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem',
          width: '100%',
          transition: 'padding 240ms ease',
        }}
      >
        {/* Brand Logo Link */}
        <Link
          to="/"
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}
        >
          <MipaStudioEmblem size={44} />
          <div>
            <div
              style={{
                fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                fontSize: '1.35rem',
                fontWeight: 600,
                letterSpacing: '0.06em',
                color: '#29231F',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
              }}
            >
              MAISON MIPA
            </div>
            <div
              style={{
                fontSize: '0.62rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#543D2B',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              Nhà Là Nơi Lưu Giữ Ký Ức
            </div>
          </div>
        </Link>

        {/* Public Desktop Navigation Links (Uncluttered, Sohee-inspired visual commerce) */}
        <nav className="mipa-mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {PUBLIC_NAV_ITEMS.map((link) => {
            const isActive = isRouteActive(link.to);
            return (
              <NavLink
                key={link.id}
                to={link.to}
                style={{
                  background: 'transparent',
                  color: isActive ? '#29231F' : '#604634',
                  border: 'none',
                  borderBottom: isActive ? '1.5px solid #29231F' : '1.5px solid transparent',
                  padding: '0.4rem 0.1rem',
                  fontSize: '0.92rem',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease, border-color 0.2s ease',
                  letterSpacing: '0.02em',
                }}
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right Action Cluster: Đặt lịch CTA + Notifications + User Menu */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {/* Primary CTA: [Đặt lịch] */}
          <button
            onClick={() => {
              navigate('/booking');
              onOpenBooking();
            }}
            className="public-btn-primary"
            style={{
              padding: '0.55rem 1.35rem',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            Đặt lịch
          </button>

          {/* Notifications button (when logged in) */}
          {currentRole !== 'GUEST' && (
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(!showNotifs); setShowRoleDropdown(false); }}
                title="Thông báo hệ thống"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  border: '1px solid rgba(140, 110, 83, 0.25)',
                  backgroundColor: '#FFFDF9',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Bell size={16} color="#604634" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      minWidth: '15px',
                      height: '15px',
                      padding: '0 3px',
                      borderRadius: '8px',
                      backgroundColor: '#8C6E53',
                      color: '#FFFDF6',
                      fontSize: '0.62rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '44px',
                    width: '320px',
                    backgroundColor: '#FFFDF9',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(41, 35, 31, 0.15)',
                    border: '1px solid rgba(140, 110, 83, 0.25)',
                    padding: '1rem',
                    zIndex: 2000,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#29231F', margin: 0 }}>
                        Thông báo
                      </h4>
                      {unreadCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.68rem',
                            backgroundColor: '#FAF8F3',
                            color: '#8C6E53',
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            fontWeight: 600,
                          }}
                        >
                          {unreadCount} mới
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            color: '#8C6E53',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <CheckCheck size={12} /> Đã đọc
                        </button>
                      )}
                      <button
                        onClick={() => setShowNotifs(false)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#8C6E53' }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0.5rem', color: '#8C6E53' }}>
                      <CheckCircle size={22} color="#8C6E53" style={{ margin: '0 auto 0.4rem', display: 'block' }} />
                      <div style={{ fontSize: '0.82rem' }}>Không có thông báo mới</div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          style={{
                            padding: '0.6rem',
                            borderRadius: '4px',
                            backgroundColor: n.read ? '#FAF8F3' : '#FFFDF9',
                            border: '1px solid rgba(140, 110, 83, 0.2)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: '#29231F', marginBottom: '0.2rem' }}>{n.title}</div>
                          <div style={{ color: '#604634', fontSize: '0.76rem', lineHeight: 1.4 }}>{n.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Menu / Role encapsulation */}
          <div className="mipa-desktop-only">
            {currentRole === 'GUEST' ? (
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => onOpenAuthModal('LOGIN')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.95rem',
                    backgroundColor: 'transparent',
                    color: '#29231F',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '0.85rem',
                  }}
                >
                  <LogIn size={14} /> Đăng nhập
                </button>
              </div>
            ) : (
              <div ref={accountRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => { setShowRoleDropdown(!showRoleDropdown); setShowNotifs(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.35rem 0.75rem',
                    backgroundColor: '#FFFDF9',
                    border: '1px solid rgba(140, 110, 83, 0.3)',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <UserAvatarBadge user={displayUser} size={26} isRootOwner={displayUser.isRootOwner} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#29231F', lineHeight: 1.1 }}>
                      {displayUser.fullName}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#8C6E53' }}>
                      {roleLabels[currentRole].label}
                    </div>
                  </div>
                  <ChevronDown size={14} color="#8C6E53" />
                </button>

                {showRoleDropdown && (
                  <div
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: '44px',
                      width: '260px',
                      backgroundColor: '#FFFDF9',
                      borderRadius: '6px',
                      boxShadow: '0 10px 30px rgba(41, 35, 31, 0.15)',
                      border: '1px solid rgba(140, 110, 83, 0.25)',
                      padding: '0.6rem',
                      zIndex: 2000,
                    }}
                  >
                    {/* User Profile info */}
                    <div
                      style={{
                        padding: '0.6rem',
                        backgroundColor: '#FAF8F3',
                        borderRadius: '4px',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#29231F', fontSize: '0.85rem' }}>
                        {displayUser.fullName}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#8C6E53' }}>
                        {displayUser.email}
                      </div>
                    </div>

                    {/* Role Specific Portals (Encapsulated) */}
                    <Link
                      to="/account?tab=profile"
                      onClick={() => setShowRoleDropdown(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        color: '#29231F',
                        textDecoration: 'none',
                        fontSize: '0.82rem',
                        borderRadius: '4px',
                        marginBottom: '0.25rem',
                      }}
                    >
                      <UserIcon size={14} color="#8C6E53" /> Thông tin cá nhân
                    </Link>

                    {currentRole === 'CUSTOMER' && (
                      <Link
                        to="/account"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          color: '#29231F',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <Calendar size={14} color="#8C6E53" /> Lịch của tôi & Album
                      </Link>
                    )}

                    {(currentRole === 'STAFF' || currentRole === 'MANAGER' || currentRole === 'ADMIN') && (
                      <Link
                        to="/staff"
                        onClick={() => setShowRoleDropdown(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          color: '#29231F',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <Camera size={14} color="#8C6E53" /> Cổng nhân viên
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
                          padding: '0.5rem 0.75rem',
                          color: '#29231F',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <LayoutDashboard size={14} color="#8C6E53" /> Hệ thống quản lý Studio
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
                          padding: '0.5rem 0.75rem',
                          color: '#29231F',
                          textDecoration: 'none',
                          fontSize: '0.82rem',
                          borderRadius: '4px',
                          marginBottom: '0.25rem',
                        }}
                      >
                        <Crown size={14} color="#8C6E53" /> Cổng quản trị Studio
                      </Link>
                    )}

                    <div style={{ borderTop: '1px solid rgba(140, 110, 83, 0.2)', marginTop: '0.4rem', paddingTop: '0.4rem' }}>
                      <button
                        onClick={() => {
                          setNotifications([]);
                          onLogout();
                          setShowRoleDropdown(false);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          border: 'none',
                          background: 'transparent',
                          color: '#C53030',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <LogOut size={14} /> Đăng xuất
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle Button (min 44x44 target) */}
          <button
            className="mipa-mobile-show"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Đóng menu điều hướng" : "Mở menu điều hướng"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mipa-mobile-navigation-menu"
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: '1px solid rgba(140, 110, 83, 0.3)',
              borderRadius: '4px',
              color: '#29231F',
              cursor: 'pointer',
            }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Sheet (Order: Concept, Dịch vụ, Portfolio, Bảng giá, Cẩm nang, Đặt lịch) */}
      {isMobileMenuOpen && (
        <div
          id="mipa-mobile-navigation-menu"
          style={{
            backgroundColor: '#FAF8F3',
            borderBottom: '1px solid rgba(140, 110, 83, 0.25)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 12px 30px rgba(41, 35, 31, 0.08)',
            maxHeight: 'calc(100dvh - 68px)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {PUBLIC_NAV_ITEMS.map((item) => {
              const isActive = isRouteActive(item.to);
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  onClick={() => handleLinkClick(item.to, item.id)}
                  style={{
                    color: isActive ? '#29231F' : '#604634',
                    textDecoration: 'none',
                    fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                    fontSize: '1.45rem',
                    fontWeight: isActive ? 600 : 400,
                    padding: '0.75rem 0',
                    borderBottom: '1px solid rgba(140, 110, 83, 0.12)',
                    minHeight: '44px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {item.label}
                </NavLink>
              );
            })}
          </div>

          <button
            onClick={() => {
              navigate('/booking');
              onOpenBooking();
              setIsMobileMenuOpen(false);
            }}
            className="public-btn-primary"
            style={{
              width: '100%',
              minHeight: '44px',
              fontSize: '0.95rem',
              fontWeight: 600,
              marginTop: '0.5rem',
            }}
          >
            Đặt lịch chụp
          </button>

          {/* Mobile Account Actions with Role Portals Restored */}
          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid rgba(140, 110, 83, 0.2)' }}>
            {currentRole === 'GUEST' ? (
              <button
                onClick={() => {
                  onOpenAuthModal('LOGIN');
                  setIsMobileMenuOpen(false);
                }}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(140, 110, 83, 0.3)',
                  borderRadius: '4px',
                  color: '#29231F',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                }}
              >
                <LogIn size={16} /> Đăng nhập / Đăng ký
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <Link
                  to="/account?tab=profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: '#29231F',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    minHeight: '44px',
                    fontWeight: 600,
                  }}
                >
                  <UserIcon size={16} color="#8C6E53" /> Thông tin: {displayUser.fullName}
                </Link>

                {currentRole === 'CUSTOMER' && (
                  <Link
                    to="/account"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#29231F',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      minHeight: '44px',
                    }}
                  >
                    <Calendar size={16} color="#8C6E53" /> Lịch của tôi & Album
                  </Link>
                )}

                {(currentRole === 'STAFF' || currentRole === 'MANAGER' || currentRole === 'ADMIN') && (
                  <Link
                    to="/staff"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#29231F',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      minHeight: '44px',
                    }}
                  >
                    <Camera size={16} color="#8C6E53" /> Cổng nhân viên
                  </Link>
                )}

                {(currentRole === 'MANAGER' || currentRole === 'ADMIN' || displayUser.isRootOwner) && (
                  <Link
                    to="/management"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#29231F',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      minHeight: '44px',
                    }}
                  >
                    <LayoutDashboard size={16} color="#8C6E53" /> Hệ thống quản lý Studio
                  </Link>
                )}

                {(currentRole === 'ADMIN' || displayUser.isRootOwner) && (
                  <Link
                    to="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: '#29231F',
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      minHeight: '44px',
                    }}
                  >
                    <Crown size={16} color="#8C6E53" /> Cổng quản trị Studio
                  </Link>
                )}

                <button
                  onClick={() => {
                    setNotifications([]);
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: '#C53030',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    textAlign: 'left',
                    minHeight: '44px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.25rem',
                  }}
                >
                  <LogOut size={16} /> Đăng xuất ({roleLabels[currentRole].label})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
