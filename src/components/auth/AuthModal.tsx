// ==============================================================================
// Maison MIPA Memories - Refactored Production Auth Modal
// Secure Authentication UI: Delegates all authentication to useAuth() hook.
// Features:
// - Login with Email & Password
// - Customer Registration with Email Verification Flow
// - Verification Email Resend with 60-second Cooldown Timer
// - Forgot Password Flow (Branded Password Reset Request)
// - Zero hardcoded passwords, OTP bypasses, or client-side role elevation.
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { User, UserRole } from '../../types';
import {
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  UserPlus,
  LogIn,
  X,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  Loader2,
  CheckCircle,
  KeyRound,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

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

type AuthModalTab = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'VERIFY_NOTICE';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  targetFeatureMessage,
  initialTab = 'LOGIN',
  onSuccess,
  onLoginSuccess,
  onRegisterSuccess,
}) => {
  const {
    login,
    register,
    resetPassword,
    resendVerificationEmail,
    isLoading,
    authError,
    clearError,
    isDemoMode,
    loginAsDemoRole,
  } = useAuth();

  const [authTab, setAuthTab] = useState<AuthModalTab>(initialTab);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [validationError, setValidationError] = useState<string>('');

  // Register Form State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotSuccess, setForgotSuccess] = useState<boolean>(false);
  const [isForgotLoading, setIsForgotLoading] = useState<boolean>(false);

  // Email Verification State & Cooldown
  const [verifyEmail, setVerifyEmail] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendFeedback, setResendFeedback] = useState<string>('');
  const [isResending, setIsResending] = useState<boolean>(false);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

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
      setForgotEmail('');
      setForgotSuccess(false);
      setResendFeedback('');
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
      setVerifyEmail(email);
      setResendCooldown(60);

      if (isDemoMode) {
        if (res.user) {
          onSuccess?.(res.user);
          onRegisterSuccess?.(res.user);
        }
        onClose();
      } else {
        // In production with Supabase Auth, switch to Email Verification screen
        setAuthTab('VERIFY_NOTICE');
      }
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    const email = forgotEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }

    setIsForgotLoading(true);
    const res = await resetPassword(email);
    setIsForgotLoading(false);

    if (res.success) {
      setForgotSuccess(true);
    } else {
      setValidationError(res.error || 'Không thể gửi email đặt lại mật khẩu.');
    }
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || isResending || !verifyEmail) return;

    setIsResending(true);
    setResendFeedback('');
    const res = await resendVerificationEmail(verifyEmail);
    setIsResending(false);

    if (res.success) {
      setResendCooldown(60);
      setResendFeedback('Đã gửi lại email xác thực thành công! Vui lòng kiểm tra hộp thư.');
    } else {
      setResendFeedback(res.error || 'Gửi lại thất bại. Vui lòng thử lại sau.');
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
            <img
              src="/logo.png"
              alt="Maison MIPA Memories Logo"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                objectFit: 'cover',
                display: 'block',
                border: '1px solid rgba(239, 230, 201, 0.4)',
                flexShrink: 0,
              }}
            />
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

        {/* Tabs Switcher (Visible on Login / Register) */}
        {(authTab === 'LOGIN' || authTab === 'REGISTER') && (
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
        )}

        {/* Content Body */}
        <div style={{ padding: '1.6rem 2rem' }}>
          {authTab === 'LOGIN' && (
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <label className="mipa-label" style={{ margin: 0 }}>Mật khẩu (*):</label>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('FORGOT_PASSWORD');
                        setForgotEmail(loginEmail);
                        setValidationError('');
                        clearError();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#8C6E53',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                      }}
                    >
                      Quên mật khẩu?
                    </button>
                  </div>
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
          )}

          {authTab === 'REGISTER' && (
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
                    Tài khoản mới được kích hoạt qua email xác thực bảo mật
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

          {/* FORGOT PASSWORD SCREEN */}
          {authTab === 'FORGOT_PASSWORD' && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFDF6',
                    border: '2px solid #C6A45F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 0.8rem',
                  }}
                >
                  <KeyRound size={22} color="#8C6E53" />
                </div>
                <h3 style={{ fontFamily: 'var(--mipa-font-heading)', color: '#604634', fontSize: '1.3rem', margin: 0 }}>
                  Khôi Phục Mật Khẩu
                </h3>
                <p style={{ color: '#8C6E53', fontSize: '0.82rem', margin: '0.3rem 0 0 0' }}>
                  Nhập email đăng ký để nhận liên kết đặt lại mật khẩu an toàn
                </p>
              </div>

              {forgotSuccess ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #BBF7D0' }}>
                  <CheckCircle size={32} color="#16A34A" style={{ margin: '0 auto 0.5rem' }} />
                  <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.4rem' }}>
                    Đã Gửi Email Khôi Phục!
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#166534', lineHeight: 1.5, margin: 0 }}>
                    Chúng tôi đã gửi hướng dẫn tới <strong>{forgotEmail}</strong>. Vui lòng kiểm tra hộp thư (kể cả mục Spam) để tạo mật khẩu mới.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('LOGIN');
                      setForgotSuccess(false);
                    }}
                    className="btn-mipa-gold"
                    style={{ marginTop: '1.2rem', padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
                  >
                    Quay Lại Đăng Nhập
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="user@example.com"
                          autoFocus
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
                      disabled={isForgotLoading}
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
                      }}
                    >
                      {isForgotLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Đang gửi yêu cầu...
                        </>
                      ) : (
                        'Gửi Liên Kết Đặt Lại Mật Khẩu'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('LOGIN');
                        setValidationError('');
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#8C6E53',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.3rem',
                        marginTop: '0.2rem',
                      }}
                    >
                      <ArrowLeft size={16} /> Quay lại Đăng nhập
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* VERIFY NOTICE SCREEN */}
          {authTab === 'VERIFY_NOTICE' && (
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  border: '2px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <Mail size={28} />
              </div>

              <h3 style={{ fontFamily: 'var(--mipa-font-heading)', color: '#604634', fontSize: '1.4rem', margin: '0 0 0.5rem' }}>
                Xác Thực Tài Khoản Email
              </h3>

              <p style={{ color: '#6E5F55', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.2rem' }}>
                Maison MIPA Memories đã gửi liên kết xác thực tới hòm thư:
                <br />
                <strong style={{ color: '#604634' }}>{verifyEmail}</strong>
              </p>

              <div
                style={{
                  backgroundColor: '#FDFBF7',
                  border: '1px solid #EFE6C9',
                  borderRadius: '12px',
                  padding: '1rem',
                  fontSize: '0.84rem',
                  color: '#8C6E53',
                  textAlign: 'left',
                  lineHeight: 1.5,
                  marginBottom: '1.5rem',
                }}
              >
                <strong>Quy trình kích hoạt:</strong>
                <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.2rem' }}>
                  <li>Kiểm tra hộp thư đến hoặc mục Thư rác / Quảng cáo (Spam).</li>
                  <li>Bấm vào liên kết <em>Xác thực tài khoản</em> trong email.</li>
                  <li>Tài khoản của bạn sẽ được kích hoạt tức thì.</li>
                </ol>
              </div>

              {resendFeedback && (
                <div
                  style={{
                    marginBottom: '1rem',
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    backgroundColor: resendFeedback.includes('thành công') ? '#F0FDF4' : '#FEF2F2',
                    color: resendFeedback.includes('thành công') ? '#166534' : '#991B1B',
                    fontSize: '0.82rem',
                    border: `1px solid ${resendFeedback.includes('thành công') ? '#BBF7D0' : '#FECACA'}`,
                  }}
                >
                  {resendFeedback}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  type="button"
                  disabled={resendCooldown > 0 || isResending}
                  onClick={handleResendVerification}
                  className="btn-mipa-outline"
                  style={{
                    padding: '0.75rem',
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                    opacity: resendCooldown > 0 ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={15} className={isResending ? 'animate-spin' : ''} />
                  {resendCooldown > 0
                    ? `Gửi lại sau (${resendCooldown}s)`
                    : isResending
                    ? 'Đang gửi lại...'
                    : 'Gửi Lại Email Xác Thực'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('LOGIN');
                    setValidationError('');
                  }}
                  className="btn-mipa-gold"
                  style={{ padding: '0.75rem', fontSize: '0.88rem' }}
                >
                  Quay Lại Đăng Nhập
                </button>
              </div>
            </div>
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
