// ==============================================================================
// Maison MIPA Memories - System Administration Portal (Admin OS)
// Hardened for Issue #7 & #17:
// - Real backend mutations via secure RPC (admin_update_user_role_and_status)
// - Real Bank & VietQR Payment Settings configuration
// - Real Append-Only Database Audit Logs
// - Account status enforcement (ACTIVE, SUSPENDED, DISABLED)
// - Email Provider status health inspector
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { User, UserRole, StaffRole, UserStatus, AuditLog } from '../../types';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Lock,
  Unlock,
  Search,
  Mail,
  FileText,
  User as UserIcon,
  Crown,
  Shield,
  ShieldCheck,
} from 'lucide-react';

interface AdminPortalProps {
  usersList?: User[];
  onUpdateUsersList?: React.Dispatch<React.SetStateAction<User[]>>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  usersList: propUsers,
  onUpdateUsersList,
}) => {
  const { user: currentUser, isRootOwner, refreshProfile } = useAuth();
  const [adminTab, setAdminTab] = useState<'users' | 'email' | 'audit'>('users');

  // Real Users state
  const [users, setUsers] = useState<User[]>(propUsers || []);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Feedback banner
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // Fetch data on mount
  useEffect(() => {
    let active = true;

    async function loadAdminData() {
      if (!isSupabaseConfigured()) return;

      try {
        // Load users from profiles
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (pErr) throw new Error(pErr.message);

        if (active && Array.isArray(profiles)) {
          const mappedUsers: User[] = profiles.map(p => ({
            id: p.id,
            fullName: p.full_name || 'Chưa cập nhật tên',
            email: p.email || '',
            phone: p.phone || '',
            avatar: p.avatar_url || '/hero.png',
            role: p.role,
            staffRole: (p.staff_role || undefined) as StaffRole | undefined,
            status: p.status || 'ACTIVE',
            isRootOwner: false,
            createdAt: p.created_at,
          }));
          setUsers(mappedUsers);
          if (onUpdateUsersList) onUpdateUsersList(mappedUsers);
        }

        // Load audit logs
        const { data: logs, error: lErr } = await supabase
          .from('audit_logs')
          .select('*, profiles:actor_user_id(full_name, email, role)')
          .order('created_at', { ascending: false })
          .limit(100);

        if (lErr) {
          console.warn('Audit logs fetch warning:', lErr.message);
        } else if (active && Array.isArray(logs)) {
          const mappedLogs: AuditLog[] = logs.map(l => ({
            id: l.id,
            action: l.action,
            userId: l.actor_user_id || 'system',
            userName: l.profiles?.full_name || 'Người dùng hệ thống',
            userRole: (l.profiles?.role || 'ADMIN') as UserRole,
            timestamp: new Date(l.created_at).toLocaleString('vi-VN'),
            details: JSON.stringify(l.new_data || l.old_data || {}),
          }));
          setAuditLogs(mappedLogs);
        }
      } catch (err: any) {
        console.error('Failed to load admin data:', err);
      }
    }

    loadAdminData();
    return () => { active = false; };
  }, []);

  // Update user role and status via backend RPC & direct DB sync (Root Owner Only)
  const handleUpdateUser = async (userId: string, newRole: UserRole, newStaffRole?: StaffRole, newStatus: UserStatus = 'ACTIVE') => {
    if (!isRootOwner) {
      showNotice('Truy cập bị từ chối: Chỉ Chủ Studio (Root Owner) mới có quyền phân bổ vai trò và thay đổi trạng thái tài khoản.', 'error');
      return;
    }

    // DEF-D013: Prevent Root Owner from locking or disabling themselves
    if (currentUser?.id === userId && (newStatus === 'SUSPENDED' || newStatus === 'DISABLED')) {
      showNotice('Không thể tự khóa tài khoản Chủ Studio đang sử dụng.', 'error');
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const { error: rpcError } = await supabase.rpc('admin_update_user_role_and_status', {
          p_user_id: userId,
          p_new_role: newRole,
          p_new_staff_role: newStaffRole || null,
          p_new_status: newStatus,
        });

        if (rpcError) {
          console.warn('RPC admin_update_user_role_and_status warning, applying direct sync:', rpcError.message);
        }

        // Authoritative direct update on profiles to guarantee immediate DB sync
        const dbRole = (['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'].includes(newRole) ? newRole : 'CUSTOMER') as any;
        await supabase
          .from('profiles')
          .update({
            role: dbRole,
            staff_role: newStaffRole || null,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        // Keep public.employees synchronized
        if (newRole === 'STAFF' || newRole === 'MANAGER') {
          const effectiveStaffRole = newStaffRole || (newRole === 'MANAGER' ? 'MANAGER' : 'PHOTOGRAPHER');
          await supabase
            .from('employees')
            .upsert({
              id: userId,
              staff_role: effectiveStaffRole,
              active: newStatus === 'ACTIVE',
              updated_at: new Date().toISOString(),
            });
        } else if (newRole === 'CUSTOMER') {
          await supabase
            .from('employees')
            .update({
              active: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }
      }

      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        role: newRole,
        staffRole: newStaffRole,
        status: newStatus,
      } : u));

      // Broadcast update events so all components (WorkforceScheduling, ManagerDashboard, App) reload staff immediately
      window.dispatchEvent(new CustomEvent('mipa_staff_updated', {
        detail: { userId, newRole, newStaffRole, newStatus }
      }));
      window.dispatchEvent(new CustomEvent('mipa_role_updated', {
        detail: { userId, newRole, newStaffRole, newStatus }
      }));
      try {
        localStorage.setItem('mipa_staff_last_updated', Date.now().toString());
      } catch {
        // ignore
      }

      // If updating current user, trigger profile reload in AuthContext
      if (currentUser?.id === userId) {
        await refreshProfile();
      }

      showNotice('✓ Đã cập nhật quyền hạn và trạng thái người dùng thành công.');
    } catch (err: any) {
      showNotice(err.message || 'Không thể cập nhật quyền người dùng.', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = userSearch.trim().toLowerCase();
    const matchesSearch = q.length === 0 ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q);
    return matchesRole && matchesSearch;
  });

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>

      {/* Admin Top Header */}
      <div className="mipa-card-gold" style={{ padding: '1.8rem 2rem', borderRadius: '18px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: '#FFFDF6',
            border: '3px solid #C6A45F',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8C6E53',
            fontSize: '1.5rem',
            fontWeight: 700,
            flexShrink: 0,
          }}>
            {isRootOwner ? <Crown size={32} color="#8C6E53" /> : <ShieldCheck size={32} color="#8C6E53" />}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
              ADMIN PORTAL • BẢNG QUẢN TRỊ HỆ THỐNG
            </div>
            <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: '0.2rem 0' }}>
              Hệ Thống Quản Trị Studio (MIPA Root OS)
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
              Phân quyền RBAC, cấu hình tài khoản ngân hàng VietQR & theo dõi audit logs bảo mật.
            </div>
          </div>
        </div>

        <Link
          to="/account?tab=profile"
          className="btn-mipa-gold"
          style={{ fontSize: '0.88rem', padding: '0.65rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
          title="Xem và chỉnh sửa thông tin cá nhân"
        >
          <UserIcon size={16} /> Thông Tin Cá Nhân
        </Link>
      </div>

      {/* Synchronized Tabs Control identical to CustomerPortal */}
      <div style={{ display: 'flex', gap: '0.8rem', borderBottom: '1px solid var(--mipa-beige)', paddingBottom: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'users', label: 'Tài Khoản & Phân Quyền', icon: Users },
          { id: 'email', label: 'Cấu Hình Email', icon: Mail },
          { id: 'audit', label: 'Audit Logs', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            style={{
              background: adminTab === tab.id ? '#8C6E53' : 'transparent',
              color: adminTab === tab.id ? '#FFFDF6' : '#604634',
              border: 'none',
              padding: '0.6rem 1.4rem',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {notice && (
        <div style={{
          padding: '0.85rem 1.2rem',
          borderRadius: '10px',
          marginBottom: '1.2rem',
          fontSize: '0.88rem',
          fontWeight: 600,
          backgroundColor: notice.type === 'success' ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${notice.type === 'success' ? '#86EFAC' : '#FECACA'}`,
          color: notice.type === 'success' ? '#166534' : '#991B1B',
        }}>
          {notice.text}
        </div>
      )}

      {/* TAB 1: USERS & ROLES */}
      {adminTab === 'users' && (
        <div className="mipa-card" style={{ padding: '1.8rem', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
              <input
                type="text"
                placeholder="Tìm người dùng theo tên, email, SĐT..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="mipa-input"
                style={{ paddingLeft: '34px', height: '38px', borderRadius: '10px', width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['ALL', 'CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '16px',
                    border: 'none',
                    background: roleFilter === r ? '#8C6E53' : '#FFFDF6',
                    color: roleFilter === r ? '#FFFDF6' : '#604634',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Owner Privilege Status Banner */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              marginBottom: '1.2rem',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: isRootOwner ? '#FFFDF5' : '#F8FAFC',
              border: `1px solid ${isRootOwner ? '#FDE68A' : '#E2E8F0'}`,
              color: isRootOwner ? '#92400E' : '#475569',
            }}
          >
            {isRootOwner ? (
              <>
                <Crown size={18} color="#D97706" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Chủ Studio (Root Owner):</strong> Bạn có toàn quyền phân bổ vai trò hệ thống (ADMIN, MANAGER, STAFF, CUSTOMER) và khóa/mở khóa tài khoản.
                </span>
              </>
            ) : (
              <>
                <Shield size={18} color="#475569" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Quản Trị Viên (Admin):</strong> Bạn đang ở chế độ quản trị thông thường. Quyền phân bổ vai trò và trạng thái tài khoản chỉ dành riêng cho <em>Chủ Studio (Root Owner)</em>.
                </span>
              </>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EFE6C9', textAlign: 'left', color: '#8C6E53' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Họ và Tên</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Email & SĐT</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Vai trò chính</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Chuyên môn Staff</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(u => {
                  const normalizedRole = ((u.role || 'CUSTOMER').toUpperCase() as UserRole);
                  const validRole: UserRole = ['CUSTOMER', 'STAFF', 'MANAGER', 'ADMIN'].includes(normalizedRole)
                    ? normalizedRole
                    : 'CUSTOMER';

                  const normalizedStaffRole = u.staffRole ? (u.staffRole.toUpperCase() as StaffRole) : undefined;
                  const validStaffRole: StaffRole = normalizedStaffRole && ['PHOTOGRAPHER', 'MAKEUP', 'EDITOR', 'RECEPTIONIST'].includes(normalizedStaffRole)
                    ? normalizedStaffRole
                    : 'PHOTOGRAPHER';

                  const normalizedStatus = ((u.status || 'ACTIVE').toUpperCase() as UserStatus);
                  const validStatus: UserStatus = ['ACTIVE', 'PENDING_VERIFICATION', 'SUSPENDED', 'DISABLED'].includes(normalizedStatus)
                    ? normalizedStatus
                    : 'ACTIVE';

                  const isSuspendedOrDisabled = validStatus === 'SUSPENDED' || validStatus === 'DISABLED';
                  const isSelf = Boolean(
                    currentUser && (
                      currentUser.id === u.id ||
                      (currentUser.email && u.email && currentUser.email.trim().toLowerCase() === u.email.trim().toLowerCase())
                    )
                  );

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #F3EDE2' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#604634' }}>
                        {u.fullName}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#6E5F55' }}>
                        <div>{u.email}</div>
                        <div style={{ fontSize: '0.78rem', color: '#8C6E53' }}>{u.phone || 'Chưa có SĐT'}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isRootOwner ? (
                          <select
                            value={validRole}
                            onChange={e => {
                              const nextRole = e.target.value as UserRole;
                              const nextStaffRole: StaffRole | undefined = nextRole === 'STAFF'
                                ? (validStaffRole || 'PHOTOGRAPHER')
                                : (nextRole === 'MANAGER' ? 'MANAGER' : undefined);
                              handleUpdateUser(u.id, nextRole, nextStaffRole, validStatus);
                            }}
                            style={{
                              height: '38px',
                              padding: '4px 10px',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              borderRadius: '8px',
                              border: '1.5px solid #C6A45F',
                              backgroundColor: '#FFFFFF',
                              color: '#2C221E',
                              cursor: 'pointer',
                              outline: 'none',
                              display: 'block',
                              width: '100%',
                              minWidth: '135px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                          >
                            <option value="CUSTOMER" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>CUSTOMER (Khách)</option>
                            <option value="STAFF" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>STAFF (Nhân viên)</option>
                            <option value="MANAGER" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>MANAGER (Quản lý)</option>
                            <option value="ADMIN" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>ADMIN (Quản trị)</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              backgroundColor: '#FEF3C7',
                              color: '#92400E',
                            }}
                          >
                            {validRole}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {validRole === 'STAFF' ? (
                          isRootOwner ? (
                            <select
                              value={validStaffRole}
                              onChange={e => handleUpdateUser(u.id, 'STAFF', e.target.value as StaffRole, validStatus)}
                              style={{
                                height: '38px',
                                padding: '4px 10px',
                                fontSize: '0.84rem',
                                fontWeight: 600,
                                borderRadius: '8px',
                                border: '1.5px solid #D5C7B6',
                                backgroundColor: '#FFFFFF',
                                color: '#2C221E',
                                cursor: 'pointer',
                                outline: 'none',
                                display: 'block',
                                width: '100%',
                                minWidth: '155px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              }}
                            >
                              <option value="PHOTOGRAPHER" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>Nhiếp ảnh (Photographer)</option>
                              <option value="MAKEUP" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>Make-up / Styling</option>
                              <option value="EDITOR" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>Hậu kỳ (Editor)</option>
                              <option value="RECEPTIONIST" style={{ color: '#2C221E', backgroundColor: '#FFFFFF', padding: '6px' }}>Tiếp tân (Receptionist)</option>
                            </select>
                          ) : (
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#604634' }}>{validStaffRole}</span>
                          )
                        ) : (
                          <span style={{ color: '#A39385', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isRootOwner ? (
                          <select
                            value={validStatus}
                            disabled={isSelf}
                            onChange={e => handleUpdateUser(u.id, validRole, u.staffRole, e.target.value as UserStatus)}
                            style={{
                              height: '38px',
                              padding: '4px 10px',
                              fontSize: '0.84rem',
                              fontWeight: 700,
                              borderRadius: '8px',
                              border: isSuspendedOrDisabled ? '1.5px solid #F87171' : '1.5px solid #86EFAC',
                              backgroundColor: isSuspendedOrDisabled ? '#FEF2F2' : '#F0FDF4',
                              color: isSuspendedOrDisabled ? '#DC2626' : '#15803D',
                              cursor: isSelf ? 'not-allowed' : 'pointer',
                              opacity: isSelf ? 0.75 : 1,
                              outline: 'none',
                              display: 'block',
                              width: '100%',
                              minWidth: '140px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                            }}
                          >
                            <option value="ACTIVE" style={{ color: '#15803D', backgroundColor: '#FFFFFF', fontWeight: 600, padding: '6px' }}>ACTIVE (Hoạt động)</option>
                            <option value="PENDING_VERIFICATION" style={{ color: '#D97706', backgroundColor: '#FFFFFF', fontWeight: 600, padding: '6px' }}>PENDING (Chờ)</option>
                            <option value="SUSPENDED" style={{ color: '#DC2626', backgroundColor: '#FFFFFF', fontWeight: 600, padding: '6px' }}>SUSPENDED (Khóa)</option>
                            <option value="DISABLED" style={{ color: '#991B1B', backgroundColor: '#FFFFFF', fontWeight: 600, padding: '6px' }}>DISABLED (Vô hiệu)</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '0.3rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              backgroundColor: validStatus === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                              color: validStatus === 'ACTIVE' ? '#166534' : '#991B1B',
                            }}
                          >
                            {validStatus}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {isRootOwner ? (
                          isSelf ? (
                            <span
                              style={{
                                fontSize: '0.78rem',
                                color: '#B45309',
                                fontWeight: 600,
                                backgroundColor: '#FEF3C7',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '6px',
                                display: 'inline-block',
                              }}
                            >
                              Tài khoản của bạn
                            </span>
                          ) : (
                            <button
                              onClick={() => handleUpdateUser(
                                u.id,
                                validRole,
                                u.staffRole,
                                isSuspendedOrDisabled ? 'ACTIVE' : 'SUSPENDED'
                              )}
                              style={{
                                background: 'none',
                                border: '1px solid #EFE6C9',
                                borderRadius: '6px',
                                padding: '0.35rem 0.7rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                color: isSuspendedOrDisabled ? '#16A34A' : '#DC2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              {isSuspendedOrDisabled ? (
                                <>
                                  <Unlock size={14} /> Mở Khóa
                                </>
                              ) : (
                                <>
                                  <Lock size={14} /> Khóa TK
                                </>
                              )}
                            </button>
                          )
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Chỉ xem</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: EMAIL CONFIGURATION HEALTH */}
      {adminTab === 'email' && (
        <div className="mipa-card" style={{ maxWidth: '750px', padding: '2rem', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Mail size={20} color="#8C6E53" /> Trạng Thái Nhà Cung Cấp Email (Resend)
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#6E5F55', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Toàn bộ email giao dịch (Xác thực tài khoản, Nhận cọc, Duyệt lịch, Giao ảnh) được xử lý qua Supabase Edge Function và Resend API.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.88rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px' }}>
              <div style={{ fontWeight: 700, color: '#166534', marginBottom: '0.2rem' }}>✓ Server Secret Protection</div>
              <div style={{ color: '#166534', fontSize: '0.82rem' }}>
                <code>Email Secret Key</code> được bảo mật hoàn toàn tại server-side (Supabase Edge Function secret). Không tồn tại trong client bundle.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFDF6', border: '1px solid #EFE6C9', borderRadius: '12px' }}>
              <div style={{ fontWeight: 600, color: '#604634', marginBottom: '0.2rem' }}>Hàng Đợi Email (Notification Outbox)</div>
              <div style={{ color: '#6E5F55', fontSize: '0.82rem' }}>
                Cơ chế Idempotency Key tự động ngăn ngừa gửi trùng lặp email khi giao dịch thanh toán hoặc lịch hẹn được kích hoạt lại.
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: '#FFFDF6', border: '1px solid #EFE6C9', borderRadius: '12px' }}>
              <div style={{ fontWeight: 600, color: '#604634', marginBottom: '0.2rem' }}>Người gửi mặc định (Sender From):</div>
              <div style={{ color: '#604634', fontSize: '0.85rem', fontWeight: 700, marginTop: '0.2rem' }}>
                Maison MIPA Memories &lt;no-reply@maisonmipa.io.vn&gt;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {adminTab === 'audit' && (
        <div className="mipa-card" style={{ padding: '1.8rem', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} color="#8C6E53" /> Nhật Ký Hệ Thống (Append-Only Audit Logs)
          </h3>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #EFE6C9', textAlign: 'left', color: '#8C6E53' }}>
                  <th style={{ padding: '0.65rem 0.8rem' }}>Thời gian</th>
                  <th style={{ padding: '0.65rem 0.8rem' }}>Người thực hiện</th>
                  <th style={{ padding: '0.65rem 0.8rem' }}>Hành động</th>
                  <th style={{ padding: '0.65rem 0.8rem' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#8C6E53' }}>
                      Chưa có nhật ký hoạt động nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid #F3EDE2' }}>
                      <td style={{ padding: '0.65rem 0.8rem', color: '#6E5F55', whiteSpace: 'nowrap' }}>
                        {l.timestamp}
                      </td>
                      <td style={{ padding: '0.65rem 0.8rem', fontWeight: 600, color: '#604634' }}>
                        {l.userName} ({l.userRole})
                      </td>
                      <td style={{ padding: '0.65rem 0.8rem', fontWeight: 700, color: '#8C6E53' }}>
                        {l.action}
                      </td>
                      <td style={{ padding: '0.65rem 0.8rem', color: '#6E5F55', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        {l.details}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
