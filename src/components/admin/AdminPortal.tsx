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
  adminSavePaymentSettings,
  getActivePaymentSettings,
  type BusinessBankConfig,
} from '../../services/paymentSettingsService';
import {
  Users,
  Lock,
  Unlock,
  Search,
  CreditCard,
  Mail,
  FileText,
  User as UserIcon,
  Crown,
  Shield,
  ShieldCheck,
  FolderUp,
  HardDrive,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

interface AdminPortalProps {
  usersList?: User[];
  onUpdateUsersList?: React.Dispatch<React.SetStateAction<User[]>>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  usersList: propUsers,
}) => {
  const { isRootOwner } = useAuth();
  const [adminTab, setAdminTab] = useState<'users' | 'bank' | 'email' | 'gdrive' | 'audit'>('users');

  // Google Drive state
  const [driveConnecting, setDriveConnecting] = useState(false);
  const [driveStatus, setDriveStatus] = useState<{ connected: boolean; accountEmail?: string; rootFolderId?: string } | null>(null);
  const [loadingDriveStatus, setLoadingDriveStatus] = useState(false);

  // Real Users state
  const [users, setUsers] = useState<User[]>(propUsers || []);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Bank & VietQR Settings Form state
  const [bankSettings, setBankSettings] = useState<BusinessBankConfig | null>(null);
  const [bankCode, setBankCode] = useState('VCB');
  const [bankBin, setBankBin] = useState('970436');
  const [bankName, setBankName] = useState('Vietcombank (Ngân hàng Ngoại Thương)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [branch, setBranch] = useState('Chi nhánh TP.HCM');
  const [qrTemplate, setQrTemplate] = useState('compact2');
  const [bankSaveMsg, setBankSaveMsg] = useState('');

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

        if (!pErr && profiles && active) {
          setUsers(profiles.map((p: any) => ({
            id: p.id,
            fullName: p.full_name || 'Người dùng MIPA',
            email: p.email,
            phone: p.phone || '',
            role: p.role,
            staffRole: p.staff_role,
            status: p.status,
          })));
        }

        // Load bank settings
        const currentBank = await getActivePaymentSettings();
        if (currentBank && active) {
          setBankSettings(currentBank);
          setBankCode(currentBank.bankCode);
          setBankBin(currentBank.bankBin);
          setBankName(currentBank.bankName);
          setAccountNumber(currentBank.accountNumber);
          setAccountName(currentBank.accountName);
          setBranch(currentBank.branch || '');
          setQrTemplate(currentBank.qrTemplate || 'compact2');
        }

        // Load audit logs
        const { data: logs, error: lErr } = await supabase
          .from('audit_logs')
          .select('*, profiles(full_name, role)')
          .order('created_at', { ascending: false })
          .limit(50);

        if (!lErr && logs && active) {
          setAuditLogs(logs.map((l: any) => ({
            id: l.id,
            timestamp: new Date(l.created_at).toLocaleString('vi-VN'),
            userId: l.actor_user_id || 'system',
            userName: l.profiles?.full_name || 'Hệ thống',
            userRole: l.profiles?.role || 'ADMIN',
            action: l.action,
            details: JSON.stringify(l.new_data || l.old_data || {}),
          })));
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
      }
    }

    loadAdminData();
    return () => { active = false; };
  }, []);

  const loadDriveStatus = async () => {
    if (!isSupabaseConfigured()) return;
    setLoadingDriveStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-oauth', {
        body: { action: 'GET_STATUS' }
      });
      if (!error && data) {
        setDriveStatus({
          connected: !!data.connected,
          accountEmail: data.account_email || 'maisonmipamemories@gmail.com',
          rootFolderId: data.root_folder_id,
        });
      }
    } catch (err) {
      console.warn('Failed to load drive status:', err);
    } finally {
      setLoadingDriveStatus(false);
    }
  };

  const handleConnectDrive = async () => {
    if (!isSupabaseConfigured()) {
      showNotice('Supabase chưa được cấu hình.', 'error');
      return;
    }
    setDriveConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-drive-oauth', {
        body: { action: 'GET_AUTH_URL' }
      });
      const targetUrl = data?.auth_url || data?.url;
      if (error || !targetUrl) {
        showNotice(data?.error || error?.message || 'Không thể lấy liên kết xác thực Google Drive.', 'error');
        return;
      }
      window.location.href = targetUrl;
    } catch (err: any) {
      showNotice(err.message || 'Lỗi khi khởi tạo kết nối Google Drive.', 'error');
    } finally {
      setDriveConnecting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive') === 'connected' || params.get('tab') === 'gdrive') {
      if (params.get('drive') === 'connected') {
        showNotice('✓ Đã kết nối tài khoản Google Drive của Studio thành công!', 'success');
      }
      if (isRootOwner) {
        setAdminTab('gdrive');
        loadDriveStatus();
      }
    }
  }, [isRootOwner]);

  useEffect(() => {
    if (adminTab === 'gdrive' && isRootOwner) {
      loadDriveStatus();
    }
  }, [adminTab, isRootOwner]);

  // Guard admin tabs: Settings tabs (bank, email, gdrive) are strictly Root Owner only
  useEffect(() => {
    if (!isRootOwner && ['bank', 'email', 'gdrive'].includes(adminTab)) {
      setAdminTab('users');
    }
  }, [isRootOwner, adminTab]);

  // Update user role and status via backend RPC (Root Owner Only)
  const handleUpdateUser = async (userId: string, newRole: UserRole, newStaffRole?: StaffRole, newStatus: UserStatus = 'ACTIVE') => {
    if (!isRootOwner) {
      showNotice('Truy cập bị từ chối: Chỉ Chủ Studio (Root Owner) mới có quyền phân bổ vai trò và thay đổi trạng thái tài khoản.', 'error');
      return;
    }

    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.rpc('admin_update_user_role_and_status', {
          p_user_id: userId,
          p_new_role: newRole,
          p_new_staff_role: newStaffRole || null,
          p_new_status: newStatus,
        });

        if (error) throw new Error(error.message);
      }

      setUsers(prev => prev.map(u => u.id === userId ? {
        ...u,
        role: newRole,
        staffRole: newStaffRole,
        status: newStatus,
      } : u));

      showNotice('✓ Đã cập nhật quyền hạn và trạng thái người dùng thành công.');
    } catch (err: any) {
      showNotice(err.message || 'Không thể cập nhật quyền người dùng.', 'error');
    }
  };

  // Save Bank / VietQR settings
  const handleSaveBankConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankSaveMsg('');

    if (accountNumber.trim() === '888866669999' && accountName.trim().toUpperCase() === 'MAISON MIPA MEMORIES') {
      showNotice('Không thể lưu cấu hình placeholder giả định. Vui lòng nhập số tài khoản thật của studio.', 'error');
      return;
    }

    try {
      const saved = await adminSavePaymentSettings({
        bankCode,
        bankBin,
        bankName,
        accountNumber,
        accountName,
        branch,
        qrTemplate,
      });

      setBankSettings(saved);
      showNotice('✓ Cấu hình tài khoản nhận cọc VietQR đã được cập nhật thành công!');
    } catch (err: any) {
      showNotice(err.message || 'Lỗi lưu thông tin ngân hàng.', 'error');
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

      {/* Synchronized Tabs Control: Settings (bank, email, gdrive) are ONLY rendered for Root Owner */}
      <div style={{ display: 'flex', gap: '0.8rem', borderBottom: '1px solid var(--mipa-beige)', paddingBottom: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'users', label: 'Tài Khoản & Phân Quyền', icon: Users },
          ...(isRootOwner ? [
            { id: 'bank', label: 'Tài Khoản VietQR', icon: CreditCard },
            { id: 'email', label: 'Cấu Hình Email', icon: Mail },
            { id: 'gdrive', label: 'Google Drive Delivery', icon: FolderUp },
          ] : []),
          { id: 'audit', label: 'Audit Logs', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            style={{
              background: adminTab === tab.id
                ? 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)'
                : '#FFFDF6',
              color: adminTab === tab.id ? '#FFFDF6' : '#604634',
              border: adminTab === tab.id ? '1px solid #604634' : '1px solid #EFE6C9',
              padding: '0.6rem 1.3rem',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: adminTab === tab.id ? '0 4px 12px rgba(96, 70, 52, 0.2)' : 'none',
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
                            onChange={e => handleUpdateUser(u.id, e.target.value as UserRole, u.staffRole, validStatus)}
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
                              cursor: 'pointer',
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
                          <button
                            onClick={() => handleUpdateUser(
                              u.id,
                              validRole,
                              u.staffRole,
                              validStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED'
                            )}
                            style={{
                              background: 'none',
                              border: '1px solid #EFE6C9',
                              borderRadius: '6px',
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              color: validStatus === 'SUSPENDED' ? '#16A34A' : '#DC2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            {validStatus === 'SUSPENDED' ? (
                              <>
                                <Unlock size={14} /> Mở Khóa
                              </>
                            ) : (
                              <>
                                <Lock size={14} /> Khóa TK
                              </>
                            )}
                          </button>
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

      {/* TAB 2: BANK & VIETQR (ROOT OWNER ONLY) */}
      {adminTab === 'bank' && isRootOwner && (
        <div className="mipa-card" style={{ maxWidth: '750px', padding: '2rem', borderRadius: '18px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} color="#8C6E53" /> Cấu Hình Tài Khoản Nhận Cọc VietQR
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#6E5F55', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Thông tin này sẽ được dùng để tạo mã VietQR động cho khách hàng thanh toán tiền cọc. Mọi thay đổi đều được ghi nhận vào Audit Log.
          </p>

          <form onSubmit={handleSaveBankConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                  Mã Ngân Hàng (Bank Code)
                </label>
                <input
                  type="text"
                  required
                  value={bankCode}
                  onChange={e => setBankCode(e.target.value.toUpperCase())}
                  placeholder="VD: VCB, MB, TCB..."
                  className="mipa-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                  Mã BIN Ngân Hàng (VietQR BIN)
                </label>
                <input
                  type="text"
                  required
                  value={bankBin}
                  onChange={e => setBankBin(e.target.value)}
                  placeholder="VD: 970436..."
                  className="mipa-input"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                Tên Ngân Hàng Đầy Đủ
              </label>
              <input
                type="text"
                required
                value={bankName}
                onChange={e => setBankName(e.target.value)}
                placeholder="VD: Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)"
                className="mipa-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                  Số Tài Khoản
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="Số tài khoản ngân hàng thật..."
                  className="mipa-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                  Tên Chủ Tài Khoản
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={e => setAccountName(e.target.value.toUpperCase())}
                  placeholder="VD: CONG TY TNHH MAISON MIPA"
                  className="mipa-input"
                  style={{ width: '100%', fontWeight: 700 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                Chi Nhánh (Tùy chọn)
              </label>
              <input
                type="text"
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="VD: Chi nhánh TP.HCM"
                className="mipa-input"
                style={{ width: '100%' }}
              />
            </div>

            <button
              type="submit"
              className="btn-mipa-gold"
              style={{ padding: '0.75rem 2rem', fontWeight: 700, alignSelf: 'flex-start' }}
            >
              Lưu & Kích Hoạt Cấu Hình VietQR
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: EMAIL CONFIGURATION HEALTH (ROOT OWNER ONLY) */}
      {adminTab === 'email' && isRootOwner && (
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

      {/* TAB 4: GOOGLE DRIVE DELIVERY (ROOT OWNER ONLY) */}
      {adminTab === 'gdrive' && isRootOwner && (
        <div className="mipa-card" style={{ padding: '2rem', borderRadius: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <FolderUp size={22} color="#8C6E53" /> Cấu Hình Google Drive Delivery
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#6E5F55', margin: 0 }}>
                Quản lý kết nối Google Drive tự động tạo thư mục và giao ảnh số cho khách hàng
              </p>
            </div>

            <button
              onClick={loadDriveStatus}
              disabled={loadingDriveStatus}
              className="btn-mipa-secondary"
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RefreshCw size={14} className={loadingDriveStatus ? 'animate-spin' : ''} />
              Làm mới trạng thái
            </button>
          </div>

          {/* Connection Status Card */}
          <div style={{
            backgroundColor: driveStatus?.connected ? '#F0FDF4' : '#FFFDF6',
            border: `1.5px solid ${driveStatus?.connected ? '#86EFAC' : '#E6D7B9'}`,
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1.2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: driveStatus?.connected ? '#DCFCE7' : '#FAF6EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: driveStatus?.connected ? '#166534' : '#8C6E53',
              }}>
                <HardDrive size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#604634' }}>
                    Tài khoản Studio Google Drive
                  </span>
                  <span style={{
                    padding: '0.2rem 0.65rem',
                    borderRadius: '20px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    backgroundColor: driveStatus?.connected ? '#DCFCE7' : '#FEE2E2',
                    color: driveStatus?.connected ? '#166534' : '#991B1B',
                  }}>
                    {driveStatus?.connected ? 'ĐÃ KẾT NỐI' : 'CHƯA KẾT NỐI'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                  Tài khoản vận hành: <strong>{driveStatus?.accountEmail || 'maisonmipamemories@gmail.com'}</strong>
                  {driveStatus?.rootFolderId && (
                    <span style={{ marginLeft: '1rem', color: '#8C6E53' }}>
                      Thư mục gốc: <code>Maison MIPA Memories - Customer Deliveries</code>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={handleConnectDrive}
                disabled={driveConnecting}
                className="btn-mipa-gold"
                style={{
                  padding: '0.75rem 1.6rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: driveConnecting ? 'wait' : 'pointer',
                }}
              >
                {driveConnecting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" /> Đang chuyển hướng Google...
                  </>
                ) : (
                  <>
                    <FolderUp size={16} /> {driveStatus?.connected ? 'Cấp Lại Quyền Google Drive' : 'Kết Nối Google Drive'}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Workflow Explanation Cards */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#604634', marginBottom: '0.8rem' }}>
            Quy trình tự động hóa giao ảnh khách hàng:
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div style={{ backgroundColor: '#FAF6EE', border: '1px solid #EFE6C9', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, color: '#8C6E53', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                1. Hoàn tất buổi chụp
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                Khi đơn chuyển sang <code>SHOOT_COMPLETED</code>, hệ thống tự động tạo folder Drive <code>&lt;MÃ_ĐƠN&gt; - Delivery</code>.
              </div>
            </div>

            <div style={{ backgroundColor: '#FAF6EE', border: '1px solid #EFE6C9', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, color: '#8C6E53', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                2. Staff tải ảnh lên
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                Photographer và Editor nhận link truy cập trực tiếp vào folder để tải ảnh gốc và ảnh đã hậu kỳ.
              </div>
            </div>

            <div style={{ backgroundColor: '#FAF6EE', border: '1px solid #EFE6C9', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, color: '#8C6E53', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                3. Quản lý duyệt & giao ảnh
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                Ở trạng thái <code>READY_FOR_REVIEW</code>, Manager bấm &quot;Giao ảnh cho khách&quot; để tự động cấp quyền và gửi email.
              </div>
            </div>

            <div style={{ backgroundColor: '#FAF6EE', border: '1px solid #EFE6C9', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontWeight: 700, color: '#8C6E53', marginBottom: '0.3rem', fontSize: '0.88rem' }}>
                4. Khách hàng nhận ảnh
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                Khách nhận email thông báo và nút &quot;Xem & Tải Ảnh&quot; xuất hiện trên trang tài khoản cá nhân.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESTRICTED SETTINGS NOTICE FOR NON-ROOT ADMINS */}
      {['bank', 'email', 'gdrive'].includes(adminTab) && !isRootOwner && (
        <div className="mipa-card" style={{ padding: '3rem 2rem', textAlign: 'center', borderRadius: '18px', maxWidth: '650px', margin: '2rem auto' }}>
          <ShieldAlert size={54} color="#D97706" style={{ margin: '0 auto 1.2rem' }} />
          <h3 style={{ color: '#604634', marginBottom: '0.6rem', fontSize: '1.4rem' }}>
            Đặc Quyền Cấu Hình Giới Hạn
          </h3>
          <p style={{ color: '#6E5F55', lineHeight: 1.6, fontSize: '0.92rem', marginBottom: '1.5rem' }}>
            Các tác vụ cấu hình hệ thống (Tài khoản nhận cọc VietQR, Máy chủ Email, Kết nối Google Drive) là đặc quyền bảo mật độc quyền của tài khoản <strong>Chủ Sở Hữu Gốc (Root Owner)</strong>.
          </p>
          <button
            onClick={() => setAdminTab('users')}
            className="btn-mipa-gold"
            style={{ fontSize: '0.88rem', padding: '0.65rem 1.4rem' }}
          >
            Quay Lại Danh Sách Tài Khoản
          </button>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
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
