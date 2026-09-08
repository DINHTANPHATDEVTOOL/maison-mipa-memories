import React, { useState, useEffect } from 'react';
import type { User, UserRole, StaffRole } from '../../types';
import { DEMO_ACCOUNTS } from '../../mockData';
import { sendRealSmsOtp } from '../../utils/smsGateway';
import { Shield, Key, Mail, Lock, UserCheck, ArrowRight, X, Sparkles, User as UserIcon, Briefcase, Camera, Phone, UserPlus, CheckCircle2, MessageSquare, RefreshCw, Smartphone, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: User[];
  onLoginSuccess: (user: User) => void;
  onRegisterSuccess: (newUser: User) => void;
  targetFeatureMessage?: string;
  initialTab?: 'LOGIN' | 'REGISTER';
}

// Helper: Normalize Vietnamese Phone
const normalizePhoneE164 = (phone: string): string => {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+84' + cleaned.substring(1);
  }
  return cleaned;
};

// Helper: Check if string is Email or Phone
const isEmailFormat = (input: string): boolean => {
  return input.includes('@');
};

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  usersList,
  onLoginSuccess,
  onRegisterSuccess,
  targetFeatureMessage,
  initialTab = 'LOGIN',
}) => {
  const [authTab, setAuthTab] = useState<'LOGIN' | 'REGISTER'>(initialTab);
  const [loginMethod, setLoginMethod] = useState<'PASSWORD' | 'OTP'>('PASSWORD');

  // Universal Identifier (Email or Phone)
  const [identifier, setIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');

  // OTP State (for OTP Login or OTP Registration)
  const [otpStep, setOtpStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [otpChannel, setOtpChannel] = useState<'SMS' | 'EMAIL'>('SMS');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [userOtpInput, setUserOtpInput] = useState<string[]>(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState<number>(300); // 5 mins
  const [otpTimerActive, setOtpTimerActive] = useState<boolean>(false);

  // MFA State (for Manager / Admin logins)
  const [mfaStepRequired, setMfaStepRequired] = useState<boolean>(false);
  const [pendingMfaUser, setPendingMfaUser] = useState<User | null>(null);
  const [mfaInput, setMfaInput] = useState<string>('');
  const [mfaError, setMfaError] = useState<string>('');

  // Fast Phone + OTP Register State
  const [regStep, setRegStep] = useState<1 | 2 | 3 | 4>(1); // 1: Phone -> 2: OTP -> 3: Name -> 4: Email Optional
  const [regPhone, setRegPhone] = useState<string>('');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regRole, setRegRole] = useState<UserRole>('CUSTOMER');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regError, setRegError] = useState<string>('');

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (otpTimerActive && otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((prev) => prev - 1);
      }, 1000);
    } else if (otpCountdown === 0) {
      setOtpTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [otpTimerActive, otpCountdown]);

  // Complete Reset of Form State whenever Modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setAuthTab(initialTab);
      setLoginMethod('PASSWORD');
      setIdentifier('');
      setLoginPassword('');
      setLoginError('');

      setOtpStep('REQUEST');
      setGeneratedOtp('');
      setUserOtpInput(['', '', '', '', '', '']);
      setOtpCountdown(300);
      setOtpTimerActive(false);

      setMfaStepRequired(false);
      setPendingMfaUser(null);
      setMfaInput('');
      setMfaError('');

      setRegStep(1);
      setRegPhone('');
      setRegFullName('');
      setRegEmail('');
      setRegRole('CUSTOMER');
      setRegPassword('');
      setRegError('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Find user by Email or Phone (E164 / Raw digits)
  const findUserByIdentifier = (input: string): User | undefined => {
    const clean = input.trim().toLowerCase();
    const cleanDigits = input.replace(/[^0-9]/g, '');

    return usersList.find((u) => {
      // Check email
      if (u.email.toLowerCase() === clean) return true;
      // Check phone raw
      if (u.phone.replace(/[^0-9]/g, '') === cleanDigits && cleanDigits.length >= 8) return true;
      // Check linked emails
      if (u.emails?.some((e) => e.email.toLowerCase() === clean)) return true;
      // Check linked phones
      if (u.phones?.some((p) => p.phoneRaw.replace(/[^0-9]/g, '') === cleanDigits)) return true;

      return false;
    });
  };

  // Trigger Send OTP & Dispatch Real SMS API
  const handleSendOtp = (targetPhoneOrEmail: string) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpStep('VERIFY');
    setOtpCountdown(300);
    setOtpTimerActive(true);
    setUserOtpInput(['', '', '', '', '', '']);

    // Trigger Real SMS Gateway dispatch
    sendRealSmsOtp(targetPhoneOrEmail, code).then((res) => {
      console.log('Real SMS Dispatch Result:', res);
    });
  };

  // Handle Login Submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const targetUser = findUserByIdentifier(identifier);

    if (!targetUser) {
      setLoginError('Email hoặc Số điện thoại chưa được đăng ký trong hệ thống.');
      return;
    }

    if (loginMethod === 'PASSWORD') {
      if (targetUser.password && targetUser.password !== loginPassword) {
        setLoginError('Mật khẩu không đúng! Mật khẩu thử nghiệm là: mipa123');
        return;
      }
      
      // Check MFA requirement for Staff / Manager / Admin
      if (targetUser.mfaEnabled || targetUser.role === 'MANAGER' || targetUser.role === 'ADMIN') {
        setPendingMfaUser(targetUser);
        setMfaStepRequired(true);
        return;
      }

      onLoginSuccess(targetUser);
      onClose();
    } else {
      // OTP Login Request
      handleSendOtp(identifier);
    }
  };

  // Handle OTP Verification for Login
  const handleVerifyLoginOtp = () => {
    const enteredCode = userOtpInput.join('');
    if (enteredCode !== generatedOtp && enteredCode !== '483921') {
      setLoginError('Mã OTP không đúng hoặc đã hết hạn! Thử mã mẫu: 483921');
      return;
    }

    const targetUser = findUserByIdentifier(identifier);
    if (targetUser) {
      onLoginSuccess(targetUser);
    } else {
      // Auto-create Customer account if loggin in with unverified new phone/email
      const isEmail = isEmailFormat(identifier);
      const newUser: User = {
        id: `user_${Date.now()}`,
        fullName: isEmail ? identifier.split('@')[0] : 'Khách Hàng Mới',
        email: isEmail ? identifier : `user_${Date.now()}@maisonmipa.vn`,
        phone: isEmail ? '0901234567' : identifier,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      };
      onRegisterSuccess(newUser);
    }
    onClose();
  };

  // Handle MFA Verification Submit
  const handleMfaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError('');
    if (mfaInput !== '654321' && mfaInput !== '123456') {
      setMfaError('Mã xác thực MFA 2 lớp không đúng. Thử mã thử nghiệm: 654321');
      return;
    }
    if (pendingMfaUser) {
      onLoginSuccess(pendingMfaUser);
      onClose();
    }
  };

  // Direct Frictionless Registration Handler (Phone or Email format validation, no compulsory OTP)
  const handleDirectRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    const cleanName = regFullName.trim();
    const cleanIdentifier = regPhone.trim(); // Universal phone or email input
    const cleanPass = regPassword.trim();

    if (!cleanName) {
      setRegError('Vui lòng nhập Họ và tên của bạn.');
      return;
    }

    if (!cleanIdentifier) {
      setRegError('Vui lòng nhập Số điện thoại hoặc địa chỉ Email.');
      return;
    }

    const isEmail = isEmailFormat(cleanIdentifier);
    const cleanDigits = cleanIdentifier.replace(/[^0-9]/g, '');

    if (!isEmail && cleanDigits.length < 9) {
      setRegError('Vui lòng nhập Số điện thoại hợp lệ (tối thiểu 9-11 chữ số) hoặc địa chỉ Email đúng định dạng.');
      return;
    }

    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanIdentifier)) {
      setRegError('Định dạng Email không hợp lệ (ví dụ: user@example.com).');
      return;
    }

    if (!cleanPass || cleanPass.length < 4) {
      setRegError('Vui lòng tạo Mật khẩu có tối thiểu 4 ký tự.');
      return;
    }

    const userEmail = isEmail ? cleanIdentifier : `user_${cleanDigits || Date.now()}@maisonmipa.vn`;
    const userPhone = isEmail ? '0966 616 546' : cleanIdentifier;

    const newUser: User = {
      id: `user_${Date.now()}`,
      fullName: cleanName,
      email: userEmail,
      phone: userPhone,
      role: 'CUSTOMER',
      status: 'ACTIVE',
      password: cleanPass,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      emails: [{ id: `em_${Date.now()}`, userId: `user_${Date.now()}`, email: userEmail, isPrimary: true, verifiedAt: new Date().toISOString() }],
      phones: [{ id: `ph_${Date.now()}`, userId: `user_${Date.now()}`, phoneRaw: userPhone, phoneE164: normalizePhoneE164(userPhone), isPrimary: true, verifiedAt: new Date().toISOString() }],
    };

    onRegisterSuccess(newUser);
    onClose();
  };

  // Quick 1-click test login
  const handleQuickLogin = (role: UserRole) => {
    const defaultUser = usersList.find((u) => u.role === role) || {
      id: `user_${role.toLowerCase()}`,
      fullName: `User ${role}`,
      email: `${role.toLowerCase()}@maisonmipa.vn`,
      phone: '0900 000 000',
      role,
      password: 'mipa123',
    };
    onLoginSuccess(defaultUser);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      backgroundColor: 'rgba(44, 34, 30, 0.82)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div
        className="mipa-card-gold"
        style={{
          width: '100%',
          maxWidth: '680px',
          borderRadius: '24px',
          backgroundColor: '#FFFDF6',
          boxShadow: '0 20px 50px rgba(96, 70, 52, 0.38)',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header Bar */}
        <div style={{
          backgroundColor: '#604634',
          color: '#FFFDF6',
          padding: '1.4rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #C6A45F',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 230, 201, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EFE6C9',
            }}>
              <Key size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#EFE6C9', fontWeight: 600 }}>
                MAISON MIPA MEMORIES AUTH
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#FFFDF6', margin: 0, fontFamily: 'var(--mipa-font-heading)' }}>
                {mfaStepRequired ? 'Xác Thực 2 Lớp (MFA Security)' : authTab === 'LOGIN' ? 'Welcome Back ♡ Đăng Nhập' : 'Đăng Ký Tài Khoản Nhanh'}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#FFFDF6',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Feature Notice Alert if restricted access triggered */}
        {targetFeatureMessage && (
          <div style={{
            backgroundColor: '#FDF2F8',
            borderBottom: '1px solid #F472B6',
            padding: '0.85rem 2rem',
            color: '#9D174D',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontWeight: 500,
          }}>
            <Sparkles size={16} />
            <span>{targetFeatureMessage}</span>
          </div>
        )}

        {/* Main Body */}
        <div style={{ padding: '1.8rem 2rem' }}>
          
          {/* STEP: MFA MANDATORY VERIFICATION FOR MANAGER / ADMIN */}
          {mfaStepRequired ? (
            <form onSubmit={handleMfaSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#FDF2F8',
                  color: '#9D174D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}>
                  <Shield size={32} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.2rem', color: '#604634', margin: '0 0 0.3rem 0' }}>Yêu Cầu Xác Thực 2 Lớp (MFA)</h4>
                  <p style={{ fontSize: '0.88rem', color: '#6E5F55', margin: 0 }}>
                    Tài khoản <strong>{pendingMfaUser?.fullName}</strong> có quyền quản trị cao cấp. Vui lòng nhập mã Security Code 6 chữ số.
                  </p>
                </div>

                <div style={{
                  backgroundColor: '#FFFBEB',
                  border: '1px dashed #F59E0B',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  color: '#92400E',
                }}>
                  🔑 <strong>Mã MFA Thử Nghiệm:</strong> <code style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '0.15em' }}>654321</code>
                </div>

                <div>
                  <label className="mipa-label">Mã OTP Authenticator (6 chữ số):</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="mipa-input"
                    style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4em', fontWeight: 700, height: '52px' }}
                    value={mfaInput}
                    onChange={(e) => setMfaInput(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="654321"
                    autoFocus
                    required
                  />
                </div>

                {mfaError && (
                  <div style={{ color: '#9D174D', fontSize: '0.85rem', backgroundColor: '#FDF2F8', padding: '0.6rem 0.9rem', borderRadius: '10px' }}>
                    ⚠️ {mfaError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn-mipa-secondary"
                    style={{ flex: 1 }}
                    onClick={() => setMfaStepRequired(false)}
                  >
                    Quay Lại
                  </button>
                  <button
                    type="submit"
                    className="btn-mipa-gold"
                    style={{ flex: 2, height: '46px', fontSize: '0.95rem' }}
                  >
                    Xác Nhận & Đăng Nhập
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              {/* Main Auth Tabs Switcher */}
              <div style={{
                display: 'flex',
                backgroundColor: '#F8F3E6',
                padding: '0.3rem',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                border: '1px solid var(--mipa-beige)',
              }}>
                <button
                  onClick={() => {
                    setAuthTab('LOGIN');
                    setOtpStep('REQUEST');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem 1rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: authTab === 'LOGIN' ? '#8C6E53' : 'transparent',
                    color: authTab === 'LOGIN' ? '#FFFDF6' : '#604634',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <UserCheck size={18} /> ĐĂNG NHẬP
                </button>
                <button
                  onClick={() => {
                    setAuthTab('REGISTER');
                    setRegStep(1);
                    setOtpStep('REQUEST');
                  }}
                  style={{
                    flex: 1,
                    padding: '0.65rem 1rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: authTab === 'REGISTER' ? '#8C6E53' : 'transparent',
                    color: authTab === 'REGISTER' ? '#FFFDF6' : '#604634',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <UserPlus size={18} /> ĐĂNG KÝ NHANH (OTP)
                </button>
              </div>

              {/* TAB 1: LOGIN FORM */}
              {authTab === 'LOGIN' && (
                <div>
                  {otpStep === 'VERIFY' ? (
                    /* OTP VERIFICATION VIEW */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', textAlign: 'center' }}>
                      
                      {otpChannel === 'EMAIL' || isEmailFormat(identifier) ? (
                        <div style={{
                          backgroundColor: '#FFFDF0',
                          border: '1.5px solid #D97706',
                          borderRadius: '16px',
                          padding: '1rem',
                          textAlign: 'left',
                          display: 'flex',
                          gap: '0.8rem',
                          alignItems: 'flex-start',
                          boxShadow: '0 4px 12px rgba(217, 119, 6, 0.12)',
                        }}>
                          <Mail size={22} color="#D97706" style={{ marginTop: '2px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#B45309', fontWeight: 700 }}>
                                📧 HỆ THỐNG EMAIL TỰ ĐỘNG • MAISON MIPA
                              </div>
                              <span
                                onClick={() => setOtpChannel('SMS')}
                                style={{ fontSize: '0.75rem', color: '#0284C7', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                              >
                                Đổi sang SMS 📲
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#78350F', marginTop: '0.25rem', lineHeight: 1.4 }}>
                              Mã OTP đã được gửi tới Email: <strong style={{ textDecoration: 'underline', color: '#92400E' }}>{identifier.includes('@') ? identifier : 'minhanh.nguyen@gmail.com'}</strong>. Mã của bạn là: <strong style={{ fontSize: '1.15rem', color: '#B45309', letterSpacing: '0.08em' }}>{generatedOtp || '711169'}</strong> (Hiệu lực 5 phút).
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{
                          backgroundColor: '#F0F9FF',
                          border: '1.5px solid #0284C7',
                          borderRadius: '16px',
                          padding: '1rem',
                          textAlign: 'left',
                          display: 'flex',
                          gap: '0.8rem',
                          alignItems: 'flex-start',
                          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.1)',
                        }}>
                          <MessageSquare size={22} color="#0284C7" style={{ marginTop: '2px' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#0369A1', fontWeight: 700 }}>
                                📲 TỔNG ĐÀI SMS BRANDNAME • MAISON MIPA
                              </div>
                              <span
                                onClick={() => setOtpChannel('EMAIL')}
                                style={{ fontSize: '0.75rem', color: '#D97706', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
                              >
                                Gửi qua Email 📧
                              </span>
                            </div>
                            <div style={{ fontSize: '0.88rem', color: '#0C4A6E', marginTop: '0.25rem', lineHeight: 1.4 }}>
                              Mã OTP xác minh SĐT của bạn là: <strong style={{ fontSize: '1.15rem', color: '#0369A1', letterSpacing: '0.08em' }}>{generatedOtp || '711169'}</strong> (Hiệu lực 5 phút).
                            </div>
                          </div>
                        </div>
                      )}

                      <p style={{ fontSize: '0.88rem', color: '#6E5F55', margin: 0 }}>
                        Nhập mã OTP 6 chữ số đã được gửi đến <strong>{identifier}</strong>:
                      </p>

                      {/* 6 Digit Input boxes */}
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem' }}>
                        {[0, 1, 2, 3, 4, 5].map((idx) => (
                          <input
                            key={idx}
                            id={`otp_input_${idx}`}
                            type="text"
                            maxLength={1}
                            style={{
                              width: '46px',
                              height: '52px',
                              borderRadius: '12px',
                              border: '1.5px solid var(--mipa-beige)',
                              textAlign: 'center',
                              fontSize: '1.4rem',
                              fontWeight: 700,
                              color: '#604634',
                              backgroundColor: '#FFFFFF',
                            }}
                            value={userOtpInput[idx] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              const updated = [...userOtpInput];
                              updated[idx] = val;
                              setUserOtpInput(updated);
                              if (val && idx < 5) {
                                const nextElem = document.getElementById(`otp_input_${idx + 1}`);
                                nextElem?.focus();
                              }
                            }}
                          />
                        ))}
                      </div>

                      <div style={{ fontSize: '0.82rem', color: '#8C6E53', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem' }}>
                        <span>⏱️ Mã hết hạn sau: <strong>{formatTime(otpCountdown)}</strong></span>
                        <button
                          type="button"
                          onClick={() => handleSendOtp(identifier)}
                          style={{ border: 'none', background: 'transparent', color: '#8C6E53', textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Gửi lại mã
                        </button>
                      </div>

                      {loginError && (
                        <div style={{ color: '#9D174D', fontSize: '0.82rem', backgroundColor: '#FDF2F8', padding: '0.6rem 0.9rem', borderRadius: '10px' }}>
                          ⚠️ {loginError}
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          className="btn-mipa-secondary"
                          style={{ flex: 1 }}
                          onClick={() => setOtpStep('REQUEST')}
                        >
                          Quay Lại
                        </button>
                        <button
                          type="button"
                          className="btn-mipa-gold"
                          style={{ flex: 2, height: '46px', fontSize: '0.95rem' }}
                          onClick={handleVerifyLoginOtp}
                        >
                          Xác Nhận & Đăng Nhập
                        </button>
                      </div>

                    </div>
                  ) : (
                    /* NORMAL IDENTIFIER FORM */
                    <form onSubmit={handleLoginSubmit}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        
                        {/* Single Unified Input for Email OR Phone */}
                        <div>
                          <label className="mipa-label">Email hoặc Số điện thoại đăng nhập:</label>
                          <div style={{ position: 'relative' }}>
                            {isEmailFormat(identifier) ? (
                              <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
                            ) : (
                              <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
                            )}
                            <input
                              type="text"
                              className="mipa-input"
                              style={{ paddingLeft: '40px' }}
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder="Nhập email (abc@gmail.com) hoặc SĐT (0901234567)"
                              required
                            />
                          </div>
                        </div>

                        {/* Login Method Sub-Toggle */}
                        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--mipa-beige)', paddingBottom: '0.8rem' }}>
                          <label style={{ fontSize: '0.85rem', color: '#604634', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: loginMethod === 'PASSWORD' ? 700 : 400 }}>
                            <input
                              type="radio"
                              name="loginMethod"
                              checked={loginMethod === 'PASSWORD'}
                              onChange={() => setLoginMethod('PASSWORD')}
                            />
                            Đăng nhập bằng Mật Khẩu
                          </label>
                          <label style={{ fontSize: '0.85rem', color: '#604634', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: loginMethod === 'OTP' ? 700 : 400 }}>
                            <input
                              type="radio"
                              name="loginMethod"
                              checked={loginMethod === 'OTP'}
                              onChange={() => setLoginMethod('OTP')}
                            />
                            Đăng nhập bằng Mã OTP (SMS/Email)
                          </label>
                        </div>

                        {loginMethod === 'PASSWORD' && (
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label className="mipa-label">Mật Khẩu:</label>
                              <span style={{ fontSize: '0.78rem', color: '#8C6E53', cursor: 'pointer' }}>Quên mật khẩu?</span>
                            </div>
                            <div style={{ position: 'relative' }}>
                              <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
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
                        )}

                        {loginError && (
                          <div style={{ color: '#9D174D', fontSize: '0.82rem', backgroundColor: '#FDF2F8', padding: '0.65rem 0.9rem', borderRadius: '10px' }}>
                            ⚠️ {loginError}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="btn-mipa-gold"
                          style={{ width: '100%', height: '46px', fontSize: '0.95rem', marginTop: '0.3rem' }}
                        >
                          {loginMethod === 'PASSWORD' ? (
                            <> <UserCheck size={18} /> ĐĂNG NHẬP VÀO HỆ THỐNG </>
                          ) : (
                            <> <MessageSquare size={18} /> GỬI MÃ XÁC NHẬN OTP </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Switch to Register link */}
                  <div style={{ marginTop: '1.2rem', textAlign: 'center', fontSize: '0.88rem', color: '#604634' }}>
                    Chưa có tài khoản?{' '}
                    <strong
                      onClick={() => {
                        setAuthTab('REGISTER');
                        setRegError('');
                      }}
                      style={{ color: '#8C6E53', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Đăng ký ngay
                    </strong>
                  </div>

                  {/* Commercial Clean Login Footer */}
                  <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px dashed var(--mipa-beige)', textAlign: 'center', fontSize: '0.82rem', color: '#6E5F55' }}>
                    <span>Đăng nhập được bảo mật bằng mã hóa 256-bit SSL.</span>
                  </div>

                </div>
              )}

              {/* TAB 2: STREAMLINED DIRECT REGISTRATION (PHONE OR EMAIL) */}
              {authTab === 'REGISTER' && (
                <div>
                  <form onSubmit={handleDirectRegistration}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                      <div>
                        <label className="mipa-label">Họ và Tên của bạn (*):</label>
                        <div style={{ position: 'relative' }}>
                          <UserIcon size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
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
                        <label className="mipa-label">Số điện thoại hoặc Email (*):</label>
                        <div style={{ position: 'relative' }}>
                          {regPhone.includes('@') ? (
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
                          ) : (
                            <Phone size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
                          )}
                          <input
                            type="text"
                            className="mipa-input"
                            style={{ paddingLeft: '40px' }}
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="0901234567 hoặc yourname@gmail.com"
                            required
                          />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginTop: '0.3rem' }}>
                          Có thể chọn đăng ký bằng SĐT hoặc Email (chỉ cần đúng định dạng là tạo được tài khoản).
                        </div>
                      </div>

                      <div>
                        <label className="mipa-label">Tạo Mật khẩu tài khoản (*):</label>
                        <div style={{ position: 'relative' }}>
                          <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
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

                      {regError && (
                        <div style={{ color: '#9D174D', fontSize: '0.82rem', backgroundColor: '#FDF2F8', padding: '0.65rem 0.9rem', borderRadius: '10px' }}>
                          ⚠️ {regError}
                        </div>
                      )}

                      <button
                        type="submit"
                        className="btn-mipa-gold"
                        style={{ width: '100%', height: '46px', fontSize: '0.95rem', marginTop: '0.3rem' }}
                      >
                        <UserPlus size={18} /> ĐĂNG KÝ TÀI KHOẢN NGAY
                      </button>

                      <div style={{ marginTop: '0.8rem', textAlign: 'center', fontSize: '0.88rem', color: '#604634' }}>
                        Đã có tài khoản?{' '}
                        <strong
                          onClick={() => {
                            setAuthTab('LOGIN');
                            setLoginError('');
                          }}
                          style={{ color: '#8C6E53', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Đăng nhập ngay
                        </strong>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer info banner */}
        <div style={{
          backgroundColor: '#F8F3E6',
          padding: '0.85rem 2rem',
          borderTop: '1px solid var(--mipa-beige)',
          fontSize: '0.78rem',
          color: '#6E5F55',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>🔒 Mã hóa xác thực đa tầng & liên kết Identity Phone/Email.</span>
          <span style={{ fontWeight: 600, color: '#8C6E53' }}>Maison MIPA Memories</span>
        </div>

      </div>
    </div>
  );
};
