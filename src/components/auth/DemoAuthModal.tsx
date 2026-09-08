import React, { useState } from 'react';
import type { UserRole } from '../../types';
import { DEMO_ACCOUNTS } from '../../mockData';
import { Shield, Key, Mail, Lock, UserCheck, ArrowRight, X, Sparkles, User, Briefcase, Camera, CheckCircle2 } from 'lucide-react';

interface DemoAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (role: UserRole) => void;
  targetFeatureMessage?: string;
}

export const DemoAuthModal: React.FC<DemoAuthModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  targetFeatureMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'QUICK' | 'FORM'>('QUICK');
  const [selectedEmail, setSelectedEmail] = useState<string>('minhanh.nguyen@gmail.com');
  const [password, setPassword] = useState<string>('mipa123');
  const [loginError, setLoginError] = useState<string>('');

  if (!isOpen) return null;

  const roleIconMap: Record<UserRole, any> = {
    GUEST: User,
    CUSTOMER: User,
    STAFF: Camera,
    MANAGER: Briefcase,
    ADMIN: Shield,
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const foundAcc = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === selectedEmail.toLowerCase().trim()
    );

    if (!foundAcc) {
      setLoginError('Email không tồn tại trong tài khoản mẫu demo.');
      return;
    }

    if (password !== 'mipa123' && foundAcc.role !== 'GUEST') {
      setLoginError('Mật khẩu không đúng! Mật khẩu thử nghiệm là: mipa123');
      return;
    }

    onLogin(foundAcc.role);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 3000,
      backgroundColor: 'rgba(44, 34, 30, 0.75)',
      backdropFilter: 'blur(8px)',
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
          boxShadow: '0 20px 50px rgba(96, 70, 52, 0.3)',
          overflow: 'hidden',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header Bar */}
        <div style={{
          backgroundColor: '#604634',
          color: '#FFFDF6',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #C6A45F',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 230, 201, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EFE6C9',
            }}>
              <Key size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#EFE6C9', fontWeight: 600 }}>
                MAISON MIPA AUTHENTICATION
              </div>
              <h3 style={{ fontSize: '1.35rem', color: '#FFFDF6', margin: 0, fontFamily: 'var(--mipa-font-heading)' }}>
                Đăng Nhập & Chuyển Phân Quyền Demo
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

        {/* Main Content Area */}
        <div style={{ padding: '1.8rem 2rem' }}>
          
          {/* Sub-Tabs Switcher */}
          <div style={{
            display: 'flex',
            backgroundColor: '#F8F3E6',
            padding: '0.3rem',
            borderRadius: '16px',
            marginBottom: '1.5rem',
            border: '1px solid var(--mipa-beige)',
          }}>
            <button
              onClick={() => setActiveTab('QUICK')}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'QUICK' ? '#8C6E53' : 'transparent',
                color: activeTab === 'QUICK' ? '#FFFDF6' : '#604634',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              ⚡ 1-Click Đăng Nhập Nhanh (Khuyên dùng)
            </button>
            <button
              onClick={() => setActiveTab('FORM')}
              style={{
                flex: 1,
                padding: '0.6rem 1rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: activeTab === 'FORM' ? '#8C6E53' : 'transparent',
                color: activeTab === 'FORM' ? '#FFFDF6' : '#604634',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🔑 Đăng Nhập Email & Mật Khẩu
            </button>
          </div>

          {/* TAB 1: QUICK 1-CLICK ROLE LOGIN */}
          {activeTab === 'QUICK' && (
            <div>
              <p style={{ fontSize: '0.88rem', color: '#6E5F55', marginBottom: '1.2rem' }}>
                Vui lòng chọn 1 tài khoản bên dưới để trải nghiệm ngay giao diện & quyền hạn tương ứng:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.85rem', maxHeight: '360px', overflowY: 'auto' }}>
                {DEMO_ACCOUNTS.map((acc) => {
                  const Icon = roleIconMap[acc.role];
                  return (
                    <div
                      key={acc.role}
                      onClick={() => {
                        onLogin(acc.role);
                        onClose();
                      }}
                      style={{
                        padding: '1rem 1.2rem',
                        borderRadius: '16px',
                        border: `1.5px solid ${acc.color}30`,
                        backgroundColor: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = acc.color)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${acc.color}30`)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '12px',
                          backgroundColor: `${acc.color}15`,
                          color: acc.color,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          <Icon size={22} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#604634' }}>
                              {acc.name}
                            </span>
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              backgroundColor: `${acc.color}15`,
                              color: acc.color,
                              padding: '0.15rem 0.6rem',
                              borderRadius: '12px',
                            }}>
                              {acc.badge}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginTop: '0.1rem' }}>
                            ✉️ {acc.email} {acc.password !== 'N/A' && `• 🔑 Pass: ${acc.password}`}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#6E5F55', marginTop: '0.15rem' }}>
                            {acc.description}
                          </div>
                        </div>
                      </div>

                      <button
                        style={{
                          border: 'none',
                          backgroundColor: acc.color,
                          color: '#FFFDF6',
                          padding: '0.45rem 0.9rem',
                          borderRadius: '12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Đăng nhập <ArrowRight size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FORM EMAIL & PASSWORD */}
          {activeTab === 'FORM' && (
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                
                <div>
                  <label className="mipa-label">Chọn Tài Khoản Demo có sẵn:</label>
                  <select
                    className="mipa-select"
                    value={selectedEmail}
                    onChange={(e) => setSelectedEmail(e.target.value)}
                  >
                    {DEMO_ACCOUNTS.filter(a => a.role !== 'GUEST').map(a => (
                      <option key={a.email} value={a.email}>
                        [{a.badge}] {a.name} — {a.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mipa-label">Email Đăng Nhập:</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
                    <input
                      type="email"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={selectedEmail}
                      onChange={(e) => setSelectedEmail(e.target.value)}
                      placeholder="nhapemail@maisonmipa.vn"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Mật Khẩu Thử Nghiệm (Default: mipa123):</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
                    <input
                      type="password"
                      className="mipa-input"
                      style={{ paddingLeft: '40px' }}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="mipa123"
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div style={{ color: '#9D174D', fontSize: '0.82rem', backgroundColor: '#FDF2F8', padding: '0.6rem 0.9rem', borderRadius: '10px' }}>
                    ⚠️ {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-mipa-gold"
                  style={{ width: '100%', height: '46px', marginTop: '0.5rem', fontSize: '0.95rem' }}
                >
                  <UserCheck size={18} /> ĐĂNG NHẬP VÀO HỆ THỐNG
                </button>

              </div>
            </form>
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
          <span>🔒 Tất cả tài khoản demo đã được tích hợp đầy đủ dữ liệu thực tế.</span>
          <span style={{ fontWeight: 600, color: '#8C6E53' }}>Maison MIPA Memories System</span>
        </div>

      </div>
    </div>
  );
};
