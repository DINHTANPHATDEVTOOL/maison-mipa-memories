// ==============================================================================
// Maison MIPA Memories - Atelier Authentication Modal
// French Editorial Photography Aesthetic & Production Secure RBAC
// Features:
// - Dual-panel Editorial Showcase (Parisian Studio Story + Customer Portal)
// - Login with Email & Password + Password Visibility Toggle (Eye / EyeOff)
// - Customer Registration with Email Verification Flow
// - Verification Email Resend with 60-second Cooldown Timer
// - Forgot Password Flow (Branded Password Reset Request)
// - 100% Zero payment dependencies, zero AI-cliché jargon
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FocusTrap } from '../ui/FocusTrap';
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
  Eye,
  EyeOff,
  Calendar,
  ShieldCheck,
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
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string>('');

  // Register Form State
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);

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
      setShowLoginPassword(false);
      setRegFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setShowRegPassword(false);
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
      className="mipa-auth-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <FocusTrap
        active={isOpen}
        onEscape={onClose}
        aria-labelledby="auth-modal-title"
        style={{ width: '100%', maxWidth: '960px' }}
      >
        <div className="mipa-auth-container">
          {/* ============================================================ */}
          {/* LEFT PANEL: FRENCH EDITORIAL ATELIER PRESTIGE SHOWCASE       */}
          {/* ============================================================ */}
          <div className="mipa-auth-showcase">
            <div className="mipa-auth-showcase-content">
              {/* Top Atelier Branding */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '50%',
                      border: '1.5px solid rgba(198, 164, 95, 0.45)',
                      backgroundColor: 'rgba(26, 20, 16, 0.75)',
                      backdropFilter: 'blur(8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    }}
                  >
                    <img
                      src="/logo-transparent-256.png"
                      alt="Maison MIPA Memories Logo"
                      style={{
                        width: '38px',
                        height: '38px',
                        objectFit: 'contain',
                      }}
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                        fontSize: '1.15rem',
                        letterSpacing: '0.08em',
                        fontWeight: 600,
                        color: '#FBF6EE',
                        lineHeight: 1.1,
                      }}
                    >
                      MAISON MIPA
                    </div>
                    <div
                      style={{
                        fontSize: '0.68rem',
                        letterSpacing: '0.14em',
                        color: '#C6A45F',
                        textTransform: 'uppercase',
                        fontWeight: 500,
                      }}
                    >
                      L'Atelier Studio Parisien
                    </div>
                  </div>
                </div>

                <div className="mipa-auth-showcase-badge">
                  <Sparkles size={13} /> Nhà Là Nơi Lưu Giữ Ký Ức
                </div>

                <div className="mipa-auth-showcase-quote">
                  &ldquo;Mỗi bức ảnh là một mảnh ghép của tổ ấm, nơi tình yêu, nụ cười và những khoảnh khắc quý giá nhất được gìn giữ vĩnh cửu.&rdquo;
                </div>
              </div>

              {/* Atelier Member Privileges List */}
              <div className="mipa-auth-privileges-list">
                <div className="mipa-auth-privilege-item">
                  <div className="mipa-auth-privilege-icon">
                    <Sparkles size={14} />
                  </div>
                  <div className="mipa-auth-privilege-text">
                    <span className="mipa-auth-privilege-title">Kho Lưu Trữ Kỷ Niệm</span>
                    Tải trọn bộ ảnh gốc độ phân giải cao & lưu trữ bảo mật trọn đời.
                  </div>
                </div>

                <div className="mipa-auth-privilege-item">
                  <div className="mipa-auth-privilege-icon">
                    <Calendar size={14} />
                  </div>
                  <div className="mipa-auth-privilege-text">
                    <span className="mipa-auth-privilege-title">Đồng Hành Sáng Tạo</span>
                    Thảo luận concept độc bản và quản lý lịch chụp trực tiếp cùng Ekip.
                  </div>
                </div>

                <div className="mipa-auth-privilege-item">
                  <div className="mipa-auth-privilege-icon">
                    <ShieldCheck size={14} />
                  </div>
                  <div className="mipa-auth-privilege-text">
                    <span className="mipa-auth-privilege-title">Đặc Quyền Hội Viên</span>
                    Tích lũy điểm thăng hạng và ưu đãi riêng vào các dịp kỷ niệm quý giá.
                  </div>
                </div>
              </div>

              {/* Bottom Atelier Seal */}
              <div
                style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid rgba(198, 164, 95, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.72rem',
                  color: '#A39385',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={12} color="#C6A45F" />
                  <span>Bảo mật dữ liệu tuyệt đối</span>
                </div>
                <span style={{ letterSpacing: '0.08em', color: '#C6A45F' }}>✦ EST. 2024 ✦</span>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT PANEL: EDITORIAL FORM & INTERACTIONS                   */}
          {/* ============================================================ */}
          <div className="mipa-auth-form-panel">
            {/* Top Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '1.25rem',
              }}
            >
              <div>
                <div
                  id="auth-modal-title"
                  style={{
                    fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                    fontSize: '1.35rem',
                    letterSpacing: '0.04em',
                    fontWeight: 600,
                    color: '#2C221E',
                    lineHeight: 1.15,
                  }}
                >
                  MAISON MIPA MEMORIES
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#604634',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    marginTop: '2px',
                  }}
                >
                  Nhà Là Nơi Lưu Giữ Ký Ức
                </div>
              </div>

              <button
                onClick={onClose}
                aria-label="Đóng hộp thoại"
                style={{
                  background: 'none',
                  border: '1px solid rgba(140, 110, 83, 0.2)',
                  color: '#604634',
                  cursor: 'pointer',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#FFFFFF',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#C6A45F';
                  e.currentTarget.style.color = '#2C221E';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(140, 110, 83, 0.2)';
                  e.currentTarget.style.color = '#604634';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Feature Notification Banner */}
            {targetFeatureMessage && (
              <div
                style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '0.75rem 1rem',
                  fontSize: '0.82rem',
                  borderRadius: '10px',
                  border: '1px solid #FCD34D',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontWeight: 500,
                  marginBottom: '1.25rem',
                }}
              >
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span>{targetFeatureMessage}</span>
              </div>
            )}

            {/* Tabs Switcher (Visible on Login / Register) */}
            {(authTab === 'LOGIN' || authTab === 'REGISTER') && (
              <div className="mipa-auth-tabs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('LOGIN');
                    setValidationError('');
                    clearError();
                  }}
                  className={`mipa-auth-tab-btn ${authTab === 'LOGIN' ? 'active' : ''}`}
                >
                  <LogIn size={15} /> ĐĂNG NHẬP
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('REGISTER');
                    setValidationError('');
                    clearError();
                  }}
                  className={`mipa-auth-tab-btn ${authTab === 'REGISTER' ? 'active' : ''}`}
                >
                  <UserPlus size={15} /> ĐĂNG KÝ <span className="sr-only">NHANH</span>
                </button>
              </div>
            )}

            {/* Content Body */}
            <div>
              {/* -------------------------------------------------------- */}
              {/* TAB 1: LOGIN                                             */}
              {/* -------------------------------------------------------- */}
              {authTab === 'LOGIN' && (
                <form onSubmit={handleLoginSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                    <div style={{ marginBottom: '0.2rem' }}>
                      <h3
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          color: '#2C221E',
                          fontSize: '1.55rem',
                          fontWeight: 600,
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        Chào Mừng Trở Lại
                      </h3>
                      <p style={{ color: '#735B48', fontSize: '0.84rem', margin: '0.35rem 0 0 0' }}>
                        Đăng nhập để theo dõi lịch chụp và album ảnh kỷ niệm của bạn
                      </p>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="mipa-auth-label">Email hoặc Số điện thoại (*):</label>
                      <div className="mipa-auth-input-wrapper">
                        <Mail size={16} className="mipa-auth-input-icon" />
                        <input
                          type="text"
                          className="mipa-auth-input"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="Nhập email (ví dụ: customer@gmail.com)"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    {/* Password Input with Eye reveal */}
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.4rem',
                        }}
                      >
                        <label className="mipa-auth-label" style={{ margin: 0 }}>
                          Mật khẩu (*):
                        </label>
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
                            color: '#604634',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          Quên mật khẩu?
                        </button>
                      </div>
                      <div className="mipa-auth-input-wrapper">
                        <Lock size={16} className="mipa-auth-input-icon" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          className="mipa-auth-input"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          required
                        />
                        <button
                          type="button"
                          className="mipa-auth-password-toggle"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                          aria-label={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {activeError && (
                      <div
                        style={{
                          color: '#991B1B',
                          fontSize: '0.82rem',
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          padding: '0.65rem 0.9rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{activeError}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={isLoading} className="mipa-auth-submit-btn">
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Đang đăng nhập...
                        </>
                      ) : (
                        <>
                          <LogIn size={17} /> ĐĂNG NHẬP <span className="sr-only">VÀO HỆ THỐNG</span>
                        </>
                      )}
                    </button>

                    {/* Switch Link */}
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: '0.86rem',
                        color: '#604634',
                        marginTop: '0.25rem',
                      }}
                    >
                      Chưa có tài khoản?{' '}
                      <strong
                        onClick={() => {
                          setAuthTab('REGISTER');
                          setValidationError('');
                          clearError();
                        }}
                        style={{ color: '#604634', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Đăng ký tài khoản mới
                      </strong>
                    </div>
                  </div>
                </form>
              )}

              {/* -------------------------------------------------------- */}
              {/* TAB 2: REGISTER                                          */}
              {/* -------------------------------------------------------- */}
              {authTab === 'REGISTER' && (
                <form onSubmit={handleRegisterSubmit}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
                    <div style={{ marginBottom: '0.15rem' }}>
                      <h3
                        style={{
                          fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                          color: '#2C221E',
                          fontSize: '1.55rem',
                          fontWeight: 600,
                          margin: 0,
                          lineHeight: 1.2,
                        }}
                      >
                        Tạo Tài Khoản Mới
                      </h3>
                      <p style={{ color: '#735B48', fontSize: '0.84rem', margin: '0.35rem 0 0 0' }}>
                        Đăng ký để đặt lịch chụp và lưu giữ những khoảnh khắc đáng nhớ
                      </p>
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="mipa-auth-label">Họ và tên (*):</label>
                      <div className="mipa-auth-input-wrapper">
                        <UserIcon size={16} className="mipa-auth-input-icon" />
                        <input
                          type="text"
                          className="mipa-auth-input"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="Nguyễn Văn A"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mipa-auth-label">Địa chỉ Email (*):</label>
                      <div className="mipa-auth-input-wrapper">
                        <Mail size={16} className="mipa-auth-input-icon" />
                        <input
                          type="email"
                          className="mipa-auth-input"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="user@example.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mipa-auth-label">Số điện thoại:</label>
                      <div className="mipa-auth-input-wrapper">
                        <Phone size={16} className="mipa-auth-input-icon" />
                        <input
                          type="tel"
                          className="mipa-auth-input"
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="0901234567"
                        />
                      </div>
                    </div>

                    {/* Password with Eye reveal */}
                    <div>
                      <label className="mipa-auth-label">
                        Tạo Mật khẩu (* tối thiểu 6 ký tự):
                      </label>
                      <div className="mipa-auth-input-wrapper">
                        <Lock size={16} className="mipa-auth-input-icon" />
                        <input
                          type={showRegPassword ? 'text' : 'password'}
                          className="mipa-auth-input"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Mật khẩu của bạn"
                          required
                        />
                        <button
                          type="button"
                          className="mipa-auth-password-toggle"
                          onClick={() => setShowRegPassword((prev) => !prev)}
                          aria-label={showRegPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                        >
                          {showRegPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {activeError && (
                      <div
                        style={{
                          color: '#991B1B',
                          fontSize: '0.82rem',
                          backgroundColor: '#FEF2F2',
                          border: '1px solid #FECACA',
                          padding: '0.65rem 0.9rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                        }}
                      >
                        <AlertCircle size={16} style={{ flexShrink: 0 }} />
                        <span>{activeError}</span>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button type="submit" disabled={isLoading} className="mipa-auth-submit-btn">
                      {isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Đang tạo tài khoản...
                        </>
                      ) : (
                        <>
                          <UserPlus size={17} /> TẠO TÀI KHOẢN{' '}
                          <span className="sr-only">ĐĂNG KÝ TÀI KHOẢN NGAY</span>
                        </>
                      )}
                    </button>

                    {/* Switch Link */}
                    <div
                      style={{
                        textAlign: 'center',
                        fontSize: '0.86rem',
                        color: '#604634',
                        marginTop: '0.25rem',
                      }}
                    >
                      Đã có tài khoản?{' '}
                      <strong
                        onClick={() => {
                          setAuthTab('LOGIN');
                          setValidationError('');
                          clearError();
                        }}
                        style={{ color: '#604634', cursor: 'pointer', textDecoration: 'underline', fontWeight: 600 }}
                      >
                        Đăng nhập ngay
                      </strong>
                    </div>
                  </div>
                </form>
              )}

              {/* -------------------------------------------------------- */}
              {/* TAB 3: FORGOT PASSWORD                                   */}
              {/* -------------------------------------------------------- */}
              {authTab === 'FORGOT_PASSWORD' && (
                <div>
                  <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFDF6',
                        border: '1.5px solid #C6A45F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                        boxShadow: '0 4px 14px rgba(198, 164, 95, 0.2)',
                      }}
                    >
                      <KeyRound size={22} color="#604634" />
                    </div>
                    <h3
                      style={{
                        fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                        color: '#2C221E',
                        fontSize: '1.45rem',
                        fontWeight: 600,
                        margin: 0,
                      }}
                    >
                      Khôi Phục Mật Khẩu
                    </h3>
                    <p style={{ color: '#604634', fontSize: '0.84rem', margin: '0.35rem 0 0 0' }}>
                      Nhập email đăng ký để nhận liên kết đặt lại mật khẩu an toàn
                    </p>
                  </div>

                  {forgotSuccess ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '1.75rem',
                        backgroundColor: '#F0FDF4',
                        borderRadius: '12px',
                        border: '1px solid #BBF7D0',
                      }}
                    >
                      <CheckCircle
                        size={36}
                        color="#16A34A"
                        style={{ margin: '0 auto 0.6rem' }}
                      />
                      <div
                        style={{
                          fontWeight: 700,
                          color: '#166534',
                          marginBottom: '0.4rem',
                          fontSize: '1.05rem',
                        }}
                      >
                        Đã Gửi Email Khôi Phục!
                      </div>
                      <p
                        style={{
                          fontSize: '0.86rem',
                          color: '#166534',
                          lineHeight: 1.55,
                          margin: 0,
                        }}
                      >
                        Chúng tôi đã gửi hướng dẫn tới <strong>{forgotEmail}</strong>. Vui lòng kiểm
                        tra hộp thư (kể cả mục Spam) để tạo mật khẩu mới.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab('LOGIN');
                          setForgotSuccess(false);
                        }}
                        className="mipa-auth-submit-btn"
                        style={{ marginTop: '1.25rem', height: '42px', fontSize: '0.85rem' }}
                      >
                        Quay Lại Đăng Nhập
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotPasswordSubmit}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                        <div>
                          <label className="mipa-auth-label">Địa chỉ Email (*):</label>
                          <div className="mipa-auth-input-wrapper">
                            <Mail size={16} className="mipa-auth-input-icon" />
                            <input
                              type="email"
                              className="mipa-auth-input"
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
                              color: '#991B1B',
                              fontSize: '0.82rem',
                              backgroundColor: '#FEF2F2',
                              border: '1px solid #FECACA',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '8px',
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
                          className="mipa-auth-submit-btn"
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
                            color: '#604634',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.35rem',
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

              {/* -------------------------------------------------------- */}
              {/* TAB 4: VERIFY NOTICE                                     */}
              {/* -------------------------------------------------------- */}
              {authTab === 'VERIFY_NOTICE' && (
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
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
                      boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15)',
                    }}
                  >
                    <Mail size={26} />
                  </div>

                  <h3
                    style={{
                      fontFamily: 'var(--editorial-font-heading, "Cormorant Garamond", serif)',
                      color: '#2C221E',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                      margin: '0 0 0.5rem',
                    }}
                  >
                    Xác Thực Tài Khoản Email
                  </h3>

                  <p
                    style={{
                      color: '#6E5F55',
                      fontSize: '0.88rem',
                      lineHeight: 1.6,
                      marginBottom: '1.25rem',
                    }}
                  >
                    Maison MIPA Memories đã gửi liên kết xác thực tới hòm thư:
                    <br />
                    <strong style={{ color: '#2C221E' }}>{verifyEmail}</strong>
                  </p>

                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid rgba(198, 164, 95, 0.25)',
                      borderRadius: '12px',
                      padding: '1.1rem',
                      fontSize: '0.84rem',
                      color: '#6E5F55',
                      textAlign: 'left',
                      lineHeight: 1.55,
                      marginBottom: '1.5rem',
                    }}
                  >
                    <strong style={{ color: '#2C221E' }}>Quy trình kích hoạt:</strong>
                    <ol style={{ margin: '0.4rem 0 0', paddingLeft: '1.25rem' }}>
                      <li>Kiểm tra hộp thư đến hoặc mục Thư rác / Quảng cáo (Spam).</li>
                      <li>Bấm vào liên kết <em>Xác thực tài khoản</em> trong email.</li>
                      <li>Tài khoản của bạn sẽ được kích hoạt tức thì.</li>
                    </ol>
                  </div>

                  {resendFeedback && (
                    <div
                      style={{
                        marginBottom: '1.1rem',
                        padding: '0.65rem 0.9rem',
                        borderRadius: '8px',
                        backgroundColor: resendFeedback.includes('thành công')
                          ? '#F0FDF4'
                          : '#FEF2F2',
                        color: resendFeedback.includes('thành công') ? '#166534' : '#991B1B',
                        fontSize: '0.82rem',
                        border: `1px solid ${
                          resendFeedback.includes('thành công') ? '#BBF7D0' : '#FECACA'
                        }`,
                      }}
                    >
                      {resendFeedback}
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || isResending}
                      onClick={handleResendVerification}
                      style={{
                        height: '44px',
                        backgroundColor: '#FFFFFF',
                        border: '1.5px solid rgba(140, 110, 83, 0.3)',
                        borderRadius: '10px',
                        color: '#604634',
                        fontWeight: 600,
                        fontSize: '0.88rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                        cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                        opacity: resendCooldown > 0 ? 0.6 : 1,
                        transition: 'all 0.2s ease',
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
                      className="mipa-auth-submit-btn"
                      style={{ height: '44px', fontSize: '0.88rem' }}
                    >
                      Quay Lại Đăng Nhập
                    </button>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* DEMO MODE TESTING HELPER (HIDDEN IN PRODUCTION)         */}
              {/* -------------------------------------------------------- */}
              {isDemoMode && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.75rem',
                    backgroundColor: '#FFFBEB',
                    border: '1px dashed #D97706',
                    borderRadius: '10px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#451A03',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      marginBottom: '0.4rem',
                    }}
                  >
                    <Sparkles size={13} /> DEMO TESTING MODE (VITE_ENABLE_DEMO_MODE=true)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {(['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => handleDemoLogin(r)}
                        style={{
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.7rem',
                          borderRadius: '6px',
                          border: '1px solid #78350F',
                          backgroundColor: '#FFFFFF',
                          color: '#451A03',
                          cursor: 'pointer',
                          fontWeight: 700,
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Footer */}
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid rgba(140, 110, 83, 0.12)',
                fontSize: '0.76rem',
                color: '#604634',
                fontWeight: 500,
                textAlign: 'center',
                letterSpacing: '0.02em',
              }}
            >
              Maison MIPA Memories &bull; Nhà Là Nơi Lưu Giữ Ký Ức
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
};
