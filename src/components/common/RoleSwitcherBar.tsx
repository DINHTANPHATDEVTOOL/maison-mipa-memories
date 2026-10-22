// ==============================================================================
// Maison MIPA Memories - Multi-Role Interactive Testing Switcher
// Allows immediate switching between all 7 roles to inspect workflows & database:
// - CUSTOMER: Booking, My Account, Photo Proofing
// - RECEPTIONIST: Front Desk, Today's Check-in
// - PHOTOGRAPHER: Assigned Shoots, Shift Registration, Raw Delivery
// - MAKEUP: Makeup Tasks, Shift Registration
// - EDITOR: Retouching Tasks, Shift Registration, Drive Delivery
// - MANAGER: Shift Scheduling, Booking Approval, Crew & Resource Assignment
// - ADMIN: Full Studio System Administration
// ==============================================================================

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Camera,
  UserCheck,
  Sparkles,
  Palette,
  Shield,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

interface RoleOption {
  key: string;
  label: string;
  roleName: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  targetPath: string;
  color: string;
  desc: string;
}

const ROLES: RoleOption[] = [
  {
    key: 'CUSTOMER',
    label: 'Khách Hàng',
    roleName: 'Nguyễn Minh Anh',
    icon: Users,
    targetPath: '/account',
    color: '#3B82F6',
    desc: 'Đặt lịch, xem đơn, chọn ảnh proofing',
  },
  {
    key: 'STAFF_RECEPTIONIST',
    label: 'Lễ Tân',
    roleName: 'Nguyễn Thu Hà',
    icon: UserCheck,
    targetPath: '/staff',
    color: '#10B981',
    desc: 'Đón khách, check-in tại studio, đăng ký ca',
  },
  {
    key: 'STAFF_PHOTOGRAPHER',
    label: 'Nhiếp Ảnh',
    roleName: 'Hoàng Minh',
    icon: Camera,
    targetPath: '/staff',
    color: '#8B5CF6',
    desc: 'Xem ca chụp, check-in, đăng ký ca làm',
  },
  {
    key: 'STAFF_MAKEUP',
    label: 'Make-up',
    roleName: 'Phạm Thanh Hương',
    icon: Sparkles,
    targetPath: '/staff',
    color: '#EC4899',
    desc: 'Nhiệm vụ makeup, đăng ký ca làm',
  },
  {
    key: 'STAFF_EDITOR',
    label: 'Hậu Kỳ',
    roleName: 'Nguyễn Văn Nam',
    icon: Palette,
    targetPath: '/staff',
    color: '#F59E0B',
    desc: 'Nhận ảnh chọn, retouch, bàn giao Drive',
  },
  {
    key: 'MANAGER',
    label: 'Quản Lý Studio',
    roleName: 'Lê Tấn Phát',
    icon: Briefcase,
    targetPath: '/management',
    color: '#C6A45F',
    desc: 'Sắp ca làm, duyệt cọc, phân công kíp chụp',
  },
  {
    key: 'ADMIN',
    label: 'Quản Trị Viên',
    roleName: 'Maison MIPA Admin',
    icon: Shield,
    targetPath: '/management',
    color: '#9D174D',
    desc: 'Toàn quyền cấu hình & quản trị hệ thống',
  },
];

export const RoleSwitcherBar: React.FC = () => {
  const { user, role, loginAsDemoRole, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Strictly hide in pure production mode when demo mode is not active
  const isAllowed = isDemoMode || import.meta.env.DEV || import.meta.env.MODE === 'test';
  if (!isAllowed) {
    return null;
  }

  // Determine current active key
  let currentKey = 'GUEST';
  if (role === 'ADMIN') currentKey = 'ADMIN';
  else if (role === 'MANAGER') currentKey = 'MANAGER';
  else if (role === 'CUSTOMER') currentKey = 'CUSTOMER';
  else if (role === 'STAFF') {
    if (user?.staffRole === 'RECEPTIONIST') currentKey = 'STAFF_RECEPTIONIST';
    else if (user?.staffRole === 'MAKEUP') currentKey = 'STAFF_MAKEUP';
    else if (user?.staffRole === 'EDITOR') currentKey = 'STAFF_EDITOR';
    else currentKey = 'STAFF_PHOTOGRAPHER';
  }

  const activeRoleConfig = ROLES.find(r => r.key === currentKey);

  const handleSelectRole = (opt: RoleOption) => {
    if (loginAsDemoRole) {
      loginAsDemoRole(opt.key);
      setFeedback(`✓ Đã chuyển sang vai trò: ${opt.label}`);
      setTimeout(() => setFeedback(null), 3000);
      setIsExpanded(false);
      // If currently on home or auth or path mismatch, navigate smoothly to workspace
      if (location.pathname === '/' || location.pathname.startsWith('/auth') || !location.pathname.startsWith(opt.targetPath)) {
        navigate(opt.targetPath);
      }
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.2rem',
        right: '1.2rem',
        zIndex: 9998,
        fontFamily: "'Outfit', 'Cinzel Decorative', sans-serif",
      }}
    >
      {/* Toast Feedback */}
      {feedback && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '0.6rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#1E293B',
            color: '#F8FAFC',
            borderRadius: '10px',
            fontSize: '0.82rem',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <CheckCircle size={15} color="#10B981" />
          {feedback}
        </div>
      )}

      {/* Expanded Modal / Drawer */}
      {isExpanded && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            right: 0,
            marginBottom: '0.6rem',
            width: '340px',
            backgroundColor: 'rgba(255, 253, 246, 0.98)',
            backdropFilter: 'blur(16px)',
            border: '1.5px solid #EFE6C9',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(96, 70, 52, 0.2)',
            padding: '1.1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EFE6C9', paddingBottom: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8C6E53', fontWeight: 700 }}>
                KIỂM THỬ ĐA VAI TRÒ (RBAC TESTING)
              </div>
              <div style={{ fontSize: '0.9rem', color: '#604634', fontWeight: 700 }}>
                Chọn vai trò để trải nghiệm:
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#8C6E53',
                padding: '0.2rem',
              }}
              title="Thu nhỏ"
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '360px', overflowY: 'auto' }}>
            {ROLES.map((opt) => {
              const isCurrent = opt.key === currentKey;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  data-role-option={opt.key}
                  onClick={() => handleSelectRole(opt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '10px',
                    border: isCurrent ? `1.5px solid ${opt.color}` : '1px solid rgba(140, 110, 83, 0.15)',
                    backgroundColor: isCurrent ? 'rgba(198, 164, 95, 0.15)' : '#FFFDF6',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: `${opt.color}18`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={16} color={opt.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#604634', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {opt.label}
                        {isCurrent && (
                          <span style={{ fontSize: '0.65rem', backgroundColor: '#8C6E53', color: '#FFFDF6', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#8C6E53' }}>
                        {opt.roleName} • {opt.desc}
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={13} color="#8C6E53" style={{ opacity: isCurrent ? 1 : 0.4 }} />
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '0.7rem', color: '#8C6E53', borderTop: '1px solid #EFE6C9', paddingTop: '0.5rem', textAlign: 'center' }}>
            Dữ liệu kết nối Supabase &amp; đồng bộ tự động giữa các role.
          </div>
        </div>
      )}

      {/* Floating Pill Toggle */}
      <button
        type="button"
        data-testid="role-switcher-toggle"
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          padding: '0.55rem 1rem',
          backgroundColor: '#604634',
          color: '#FFFDF6',
          border: '1.5px solid #C6A45F',
          borderRadius: '30px',
          boxShadow: '0 6px 20px rgba(96, 70, 52, 0.35)',
          cursor: 'pointer',
          fontSize: '0.84rem',
          fontWeight: 700,
          transition: 'transform 0.15s ease',
        }}
        title="Bấm để chuyển đổi nhanh giữa các vai trò kiểm thử"
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          {activeRoleConfig ? <activeRoleConfig.icon size={15} color="#C6A45F" /> : <Users size={15} color="#C6A45F" />}
          <span>{activeRoleConfig?.label || 'Đổi Role'}: <strong style={{ color: '#EFE6C9' }}>{user?.fullName?.split(' ')[0] || 'Khách'}</strong></span>
        </span>
        {isExpanded ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>
    </div>
  );
};
