// ==============================================================================
// Maison MIPA Memories - Refactored Production Auth Modal
// Secure Authentication UI: Delegates all authentication to useAuth() hook
// No hardcoded passwords, OTP bypasses, or client-side role elevation.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { User, UserRole } from '../../types';
import { Mail, Lock, User as UserIcon, Phone, UserPlus, LogIn, X, AlertCircle, ShieldAlert, Sparkles, Loader2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFeatureMessage?: string;
  initialTab?: 'LOGIN' | 'REGISTER';
  onSuccess?: (user: User) => void;
  // Backward compatibility props
  usersList?: User[];
  onLoginSuccess?: (user: User) => void;
  onRegisterSuccess?: (newUser: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetFeatureMessage,
  initialTab = 'LOGIN',
  onSuccess,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  const { login, register, isLoading, authError, clearError, isDemoMode, loginAsDemoRole } = useAuth();

  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>(initialTab);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Register Form State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  // Reset form when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setAuthTab(initialTab);
      setLoginEmail('');
      setLoginPassword('');
      setRegFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setValidationError('');
      clearError();
    }
  }, [isOpen, initialTab, clearError]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const email = loginEmail.trim();
    if (!email) {
      setValidationError('Vui lòng nhập địa chỉ Email hoặc Số điện thoại.');
      return;
    }

    if (!loginPassword) {
      setValidationError('Vui lòng nhập mật khẩu.');
      return;
    }

    const res = await login(email, loginPassword);
    if (res.success) {
      if (res.user) {
        onSuccess?.(res.user);
        onLoginSuccess?.(res.user);
      }
      onClose();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const fullName = regFullName.trim();
    const email = regEmail.trim();
    const password = regPassword.trim();
    const phone = regPhone.trim();

    if (!fullName) {
      setValidationError('Vui lòng nhập Họ và tên.');
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Vui lòng nhập địa chỉ Email hợp lệ (ví dụ: user@example.com).');
      return;
    }

    if (!password || password.length < 6) {
      setValidationError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    const res = await register({
      email,
      password,
      fullName,
      phone,
    });

    if (res.success) {
      if (res.user) {
        onSuccess?.(res.user);
        onRegisterSuccess?.(res.user);
      }
      onClose();
    }
  };

  const handleDemoLogin = (demoRole: UserRole) => {
    if (loginAsDemoRole) {
      loginAsDemoRole(demoRole);
      onClose();
    }
  };

  const activeError = validationError || authError;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        backgroundColor: 'rgba(44, 34, 30, 0.82)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mipa-card-gold"
        style={{
          width: '100%',
          maxWidth: '520px',
          borderRadius: '24px',
          backgroundColor: '#FFFDF6',
          boxShadow: '0 25px 60px rgba(96, 70, 52, 0.35)',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
          position: 'relative',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: '#604634',
            color: '#FFFDF6',
            padding: '1.4rem 1.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '2px solid #C6A45F',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 230, 201, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EFE6C9',
                fontFamily: 'var(--mipa-font-heading)',
                fontSize: '1.2rem',
              }}
            >
              M
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--mipa-font-heading)',
                  fontSize: '1.15rem',
                  letterSpacing: '0.04em',
                  fontWeight: 700,
                }}
              >
                MAISON MIPA MEMORIES AUTH
              </div>
              <div style={{ fontSize: '0.75rem', color: '#EFE6C9', opacity: 0.9 }}>
                Hệ thống Định danh & Phân quyền Bảo mật Cao cấp
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            style={{
              background: 'none',
              border: 'none',
              color: '#EFE6C9',
              cursor: 'pointer',
              padding: '0.4rem',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Security Notification Banner if target feature required auth */}
        {targetFeatureMessage && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              color: '#92400E',
              padding: '0.75rem 1.5rem',
              fontSize: '0.82rem',
              borderBottom: '1px solid #FCD34D',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontWeight: 500,
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <span>{targetFeatureMessage}</span>
          </div>
        )}

        {/* Tabs Switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--mipa-beige)',
            backgroundColor: '#FDFBF7',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAuthTab('LOGIN');
              setValidationError('');
              clearError();
            }}
            style={{
              flex: 1,
              padding: '0.9rem',
              border: 'none',
              borderBottom: authTab === 'LOGIN' ? '3px solid #8C6E53' : '3px solid transparent',
              backgroundColor: authTab === 'LOGIN' ? '#FFFDF6' : 'transparent',
              color: authTab === 'LOGIN' ? '#604634' : '#8C6E53',
              fontWeight: authTab === 'LOGIN' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <LogIn size={16} /> ĐĂNG NHẬP
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('REGISTER');
              setValidationError('');
              clearError();
            }}
            style={{
              flex: 1,
              padding: '0.9rem',
              border: 'none',
              borderBottom: authTab === 'REGISTER' ? '3px solid #8C6E53' : '3px solid transparent',
              backgroundColor: authTab === 'REGISTER' ? '#FFFDF6' : 'transparent',
              color: authTab === 'REGISTER' ? '#604634' : '#8C6E53',
              fontWeight: authTab === 'REGISTER' ? 700 : 500,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <UserPlus size={16} /> ĐĂNG KÝ NHANH
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.6rem 2rem' }}>
          {authTab === 'LOGIN' ? (
            <form onSubmit={handleLoginSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.2rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--mipa-font-heading)',
                      color: '#604634',
                      fontSize: '1.3rem',
                      margin: 0,
                    }}
                  >
                    Welcome Back ♡ Đăng Nhập
                  </h3>
                  <p style={{ color: '#8C6E53', fontSize: '0.82rem', margin: '0.3rem 0 0 0' }}>
                    Đăng nhập để xem lịch chụp, duyệt album ảnh & quản lý tài khoản
                  </p>
                </div>

                <div>
                  <label className="mipa-label">Email hoặc Số điện thoại (*):</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8C6E53',
                      }}
                    />
                    <input
                      type="text"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Nhập email (ví dụ: customer@gmail.com)"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Mật khẩu (*):</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8C6E53',
                      }}
                    />
                    <input
                      type="password"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {activeError && (
                  <div
                    style={{
                      color: '#9D174D',
                      fontSize: '0.82rem',
                      backgroundColor: '#FDF2F8',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{activeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-mipa-gold"
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '0.95rem',
                    marginTop: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: isLoading ? 0.75 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Đang xác thực...
                    </>
                  ) : (
                    <>
                      <LogIn size={18} /> ĐĂNG NHẬP VÀO HỆ THỐNG
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.86rem', color: '#604634', marginTop: '0.3rem' }}>
                  Chưa có tài khoản?{' '}
                  <strong
                    onClick={() => {
                      setAuthTab('REGISTER');
                      setValidationError('');
                      clearError();
                    }}
                    style={{ color: '#8C6E53', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Đăng ký tài khoản mới
                  </strong>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '0.2rem' }}>
                  <h3
                    style={{
                      fontFamily: 'var(--mipa-font-heading)',
                      color: '#604634',
                      fontSize: '1.3rem',
                      margin: 0,
                    }}
                  >
                    Tạo Tài Khoản Khách Hàng
                  </h3>
                  <p style={{ color: '#8C6E53', fontSize: '0.82rem', margin: '0.3rem 0 0 0' }}>
                    Tài khoản mới được tạo tự động với vai trò Khách Hàng (CUSTOMER)
                  </p>
                </div>

                <div>
                  <label className="mipa-label">Họ và tên (*):</label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8C6E53',
                      }}
                    />
                    <input
                      type="text"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Địa chỉ Email (*):</label>
                  <div style={{ position: 'relative' }}>
                    <Mail
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8C6E53',
                      }}
                    />
                    <input
                      type="email"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="user@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Số điện thoại:</label>
                  <div style={{ position: 'relative' }}>
                    <Phone
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8C6E53',
                      }}
                    />
                    <input
                      type="tel"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="0901234567"
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Tạo Mật khẩu (* tối thiểu 6 ký tự):</label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={16}
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#8C6E53',
                      }}
                    />
                    <input
                      type="password"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mật khẩu của bạn"
                      required
                    />
                  </div>
                </div>

                {activeError && (
                  <div
                    style={{
                      color: '#9D174D',
                      fontSize: '0.82rem',
                      backgroundColor: '#FDF2F8',
                      padding: '0.65rem 0.9rem',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{activeError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-mipa-gold"
                  style={{
                    width: '100%',
                    height: '46px',
                    fontSize: '0.95rem',
                    marginTop: '0.4rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    opacity: isLoading ? 0.75 : 1,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Đang tạo tài khoản...
                    </>
                  ) : (
                    <>
                      <UserPlus size={18} /> ĐĂNG KÝ TÀI KHOẢN NGAY
                    </>
                  )}
                </button>

                <div style={{ textAlign: 'center', fontSize: '0.86rem', color: '#604634', marginTop: '0.3rem' }}>
                  Đã có tài khoản?{' '}
                  <strong
                    onClick={() => {
                      setAuthTab('LOGIN');
                      setValidationError('');
                      clearError();
                    }}
                    style={{ color: '#8C6E53', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Đăng nhập ngay
                  </strong>
                </div>
              </div>
            </form>
          )}

          {/* Demo Mode Only Helper (Strictly hidden and disabled in production) */}
          {isDemoMode && (
            <div
              style={{
                marginTop: '1.4rem',
                padding: '0.85rem',
                backgroundColor: '#FFFBEB',
                border: '1px dashed #D97706',
                borderRadius: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#B45309',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  marginBottom: '0.5rem',
                }}
              >
                <Sparkles size={14} /> DEMO TESTING MODE (VITE_ENABLE_DEMO_MODE=true)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleDemoLogin(r)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.72rem',
                      borderRadius: '8px',
                      border: '1px solid #D97706',
                      backgroundColor: '#FFFFFF',
                      color: '#92400E',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            backgroundColor: '#F8F3E6',
            padding: '0.85rem 2rem',
            borderTop: '1px solid var(--mipa-beige)',
            fontSize: '0.78rem',
            color: '#6E5F55',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>🔒 Xác thực phân quyền RBAC & Row Level Security (RLS)</span>
          <span style={{ fontWeight: 600, color: '#8C6E53' }}>Maison MIPA Memories</span>
        </div>
      </div>
    </div>
  );
};
