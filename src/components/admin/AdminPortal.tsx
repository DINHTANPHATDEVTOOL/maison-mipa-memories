import React, { useState } from 'react';
import type { User, UserRole, StaffRole, Promotion, AuditLog } from '../../types';
import { INITIAL_USERS, INITIAL_PROMOTIONS, INITIAL_AUDIT_LOGS } from '../../mockData';
import {
  Shield,
  UserPlus,
  Users,
  UserCheck,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  X,
  Key,
  Tag,
  FileText,
  Settings,
  Mail,
  Phone,
  UserIcon,
} from 'lucide-react';

interface AdminPortalProps {
  usersList?: User[];
  onUpdateUsersList?: React.Dispatch<React.SetStateAction<User[]>>;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  usersList,
  onUpdateUsersList,
}) => {
  const [adminTab, setAdminTab] = useState<'accounts' | 'promotions' | 'permissions' | 'audit' | 'settings'>('accounts');
  
  // Local or Synced User Management State
  const [internalUsers, setInternalUsers] = useState<User[]>(usersList && usersList.length > 0 ? usersList : INITIAL_USERS);
  const users = usersList && usersList.length > 0 ? usersList : internalUsers;

  const updateUsers = (newUsers: User[]) => {
    setInternalUsers(newUsers);
    if (onUpdateUsersList) {
      onUpdateUsersList(newUsers);
    }
  };

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log_${Date.now()}`,
      userId: 'user_admin',
      userName: 'Admin Root',
      userRole: 'ADMIN',
      action,
      details,
      timestamp: new Date().toLocaleString('vi-VN'),
    };
    setAuditLogs([newLog, ...auditLogs]);
  };

  // Promotions State
  const [promotions, setPromotions] = useState<Promotion[]>(INITIAL_PROMOTIONS);
  const [newCode, setNewCode] = useState<string>('');
  const [newDiscount, setNewDiscount] = useState<number>(15);

  // User Filter & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Modals & Notices
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string>('');

  // Form State for Adding / Editing User
  const [formFullName, setFormFullName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('CUSTOMER');
  const [formStaffRole, setFormStaffRole] = useState<StaffRole>('PHOTOGRAPHER');
  const [formError, setFormError] = useState<string>('');

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(''), 4000);
  };

  // Handlers for Account Management (Create, Edit, Delete, Change Role, Toggle Status)
  const handleOpenAddModal = () => {
    setFormFullName('');
    setFormPhone('');
    setFormEmail('');
    setFormRole('CUSTOMER');
    setFormStaffRole('PHOTOGRAPHER');
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formFullName.trim()) {
      setFormError('Vui lòng nhập Họ và Tên.');
      return;
    }
    if (!formPhone.trim() && !formEmail.trim()) {
      setFormError('Vui lòng nhập Số điện thoại hoặc Email.');
      return;
    }

    const newUser: User = {
      id: `user_${Date.now()}`,
      fullName: formFullName.trim(),
      email: formEmail.trim() || `user_${Date.now()}@maisonmipa.vn`,
      phone: formPhone.trim() || '0900 000 000',
      role: formRole,
      staffRole: formRole === 'STAFF' ? formStaffRole : undefined,
      status: 'ACTIVE',
      avatar: formRole === 'STAFF'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'
        : formRole === 'MANAGER'
        ? 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    };

    const updated = [newUser, ...users];
    updateUsers(updated);
    addAuditLog('TẠO TÀI KHOẢN MỚI', `Tạo tài khoản ${newUser.fullName} (${newUser.email}) - Quyền: ${newUser.role}`);
    showNotice(`✅ Đã tạo thành công tài khoản mới: ${newUser.fullName} (${newUser.role})`);
    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormFullName(u.fullName);
    setFormPhone(u.phone);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormStaffRole(u.staffRole || 'PHOTOGRAPHER');
    setFormError('');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!formFullName.trim()) {
      setFormError('Vui lòng nhập Họ và Tên.');
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          fullName: formFullName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          role: formRole,
          staffRole: formRole === 'STAFF' ? formStaffRole : u.staffRole,
        };
      }
      return u;
    });

    updateUsers(updatedUsers);
    addAuditLog('CẬP NHẬT TÀI KHOẢN', `Admin cập nhật thông tin tài khoản ${editingUser.fullName} (ID: ${editingUser.id})`);
    showNotice(`✅ Đã cập nhật thông tin tài khoản ${formFullName.trim()} thành công!`);
    setEditingUser(null);
  };

  const handleChangeRole = (userId: string, newRole: UserRole) => {
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        return {
          ...u,
          role: newRole,
          staffRole: newRole === 'STAFF' ? (u.staffRole || 'PHOTOGRAPHER') : undefined,
        };
      }
      return u;
    });
    updateUsers(updatedUsers);

    const targetUser = users.find(u => u.id === userId);
    addAuditLog('PHÂN QUYỀN TÀI KHOẢN', `Đổi quyền của ${targetUser?.fullName || userId} sang ${newRole}`);
    showNotice(`🔐 Đã thay đổi phân quyền của ${targetUser?.fullName || 'tài khoản'} sang ${newRole}`);
  };

  const handleToggleStatus = (userId: string) => {
    const updatedUsers = users.map((u) => {
      if (u.id === userId) {
        const nextStatus: 'ACTIVE' | 'SUSPENDED' = u.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        return { ...u, status: nextStatus };
      }
      return u;
    });
    updateUsers(updatedUsers);

    const targetUser = users.find(u => u.id === userId);
    const isSuspended = targetUser?.status !== 'SUSPENDED';
    addAuditLog(isSuspended ? 'KHÓA TÀI KHOẢN' : 'MỞ KHÓA TÀI KHOẢN', `${isSuspended ? 'Khóa' : 'Mở khóa'} tài khoản ${targetUser?.fullName}`);
    showNotice(`⚡ Đã ${isSuspended ? 'tạm khóa 🔒' : 'kích hoạt mở khóa 🔓'} tài khoản ${targetUser?.fullName}`);
  };

  const handleDeleteUser = (userId: string, name: string) => {
    if (!window.confirm(`⚠️ Bạn có chắc chắn muốn xóa tài khoản [${name}] khỏi hệ thống? Thao tác này không thể hoàn tác.`)) {
      return;
    }
    const updatedUsers = users.filter((u) => u.id !== userId);
    updateUsers(updatedUsers);
    addAuditLog('XÓA TÀI KHOẢN', `Admin đã xóa vĩnh viễn tài khoản ${name} (ID: ${userId})`);
    showNotice(`🗑️ Đã xóa tài khoản ${name} khỏi hệ thống.`);
  };

  // Promotion Handlers
  const handleAddPromotion = () => {
    if (!newCode.trim()) return;
    const newPromo: Promotion = {
      id: `promo_${Date.now()}`,
      code: newCode.toUpperCase(),
      discountPercent: newDiscount,
      minOrder: 1500000,
      startDate: '2026-08-11',
      endDate: '2026-09-11',
      usageCount: 0,
      usageLimit: 100,
      isActive: true,
    };
    setPromotions([...promotions, newPromo]);
    setNewCode('');
    addAuditLog('TẠO VOUCHER', `Tạo voucher ${newPromo.code} - Giảm ${newPromo.discountPercent}%`);
    showNotice(`🎟️ Đã tạo voucher khuyến mãi: ${newPromo.code}`);
  };

  const togglePromoStatus = (id: string) => {
    setPromotions(promotions.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>
      
      {/* Admin Top Header */}
      <div className="mipa-card-gold" style={{ padding: '1.8rem', borderRadius: '20px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA SYSTEM ADMINISTRATION
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: 0 }}>Toàn Quyền Quản Trị Hệ Thống (Admin Control Panel)</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', backgroundColor: '#9D174D', color: '#FFFDF6', padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700 }}>
          <Shield size={16} /> ADMIN ROOT PRIVILEGES
        </div>
      </div>

      {/* Realtime Notification Banner */}
      {noticeMessage && (
        <div style={{
          backgroundColor: '#ECFDF5',
          border: '1.5px solid #059669',
          color: '#065F46',
          padding: '0.85rem 1.2rem',
          borderRadius: '16px',
          marginBottom: '1.2rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 4px 15px rgba(5, 150, 105, 0.15)',
        }}>
          <CheckCircle size={20} color="#059669" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Admin Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--mipa-beige)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'accounts', label: `👥 Quản Lý & Phân Quyền Tài Khoản (${users.length})` },
          { id: 'promotions', label: '🎟️ Quản Lý Voucher & Mã Khuyến Mãi' },
          { id: 'permissions', label: '🔐 Bảng Ma Trận Phân Quyền' },
          { id: 'audit', label: `📜 Nhật Ký Thao Tác (${auditLogs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAdminTab(tab.id as any)}
            style={{
              background: adminTab === tab.id ? '#604634' : 'transparent',
              color: adminTab === tab.id ? '#FFFDF6' : '#604634',
              border: 'none',
              padding: '0.6rem 1.2rem',
              borderRadius: '20px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ACCOUNTS & ROLES MANAGEMENT */}
      {adminTab === 'accounts' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Action Toolbar & Search */}
          <div className="mipa-card" style={{ padding: '1.2rem 1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            
            {/* Search Input */}
            <div style={{ position: 'relative', width: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
              <input
                type="text"
                className="mipa-input"
                style={{ paddingLeft: '40px', height: '42px', fontSize: '0.88rem' }}
                placeholder="Tìm theo tên, SĐT hoặc Email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Role Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', backgroundColor: '#F8F3E6', padding: '0.25rem', borderRadius: '14px' }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'CUSTOMER', label: 'Khách Hàng' },
                { id: 'STAFF', label: 'Staff / Photo' },
                { id: 'MANAGER', label: 'Manager' },
                { id: 'ADMIN', label: 'Admin' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  onClick={() => setRoleFilter(rf.id as any)}
                  style={{
                    border: 'none',
                    padding: '0.4rem 0.8rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backgroundColor: roleFilter === rf.id ? '#8C6E53' : 'transparent',
                    color: roleFilter === rf.id ? '#FFFDF6' : '#604634',
                  }}
                >
                  {rf.label}
                </button>
              ))}
            </div>

            {/* Add User Button */}
            <button
              onClick={handleOpenAddModal}
              className="btn-mipa-gold"
              style={{ height: '42px', padding: '0 1.2rem', fontSize: '0.88rem' }}
            >
              <UserPlus size={16} /> THÊM TÀI KHOẢN MỚI
            </button>

          </div>

          {/* Accounts Table */}
          <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px', overflowX: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#604634', margin: 0 }}>
                Danh Sách Tài Khoản Hệ Thống ({filteredUsers.length} tài khoản)
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                💡 Admin có thể chọn nhanh dropdown <strong>Role</strong> để thay đổi phân quyền tức thì.
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--mipa-beige)', textAlign: 'left', backgroundColor: '#FFFDF6' }}>
                  <th style={{ padding: '0.8rem 1rem', color: '#8C6E53' }}>TÀI KHOẢN</th>
                  <th style={{ padding: '0.8rem 1rem', color: '#8C6E53' }}>LIÊN HỆ (SĐT / EMAIL)</th>
                  <th style={{ padding: '0.8rem 1rem', color: '#8C6E53' }}>PHÂN QUYỀN (ROLE)</th>
                  <th style={{ padding: '0.8rem 1rem', color: '#8C6E53', textAlign: 'center' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '0.8rem 1rem', color: '#8C6E53', textAlign: 'right' }}>THAO TÁC</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#6E5F55' }}>
                      Không tìm thấy tài khoản phù hợp với từ khóa hoặc bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuspended = u.status === 'SUSPENDED';

                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid #EFE6C9', backgroundColor: isSuspended ? '#FFF5F5' : 'transparent' }}>
                        
                        {/* User Profile */}
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                            <img
                              src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80'}
                              alt={u.fullName}
                              style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #C6A45F' }}
                            />
                            <div>
                              <strong style={{ color: '#604634', fontSize: '0.95rem', display: 'block' }}>{u.fullName}</strong>
                              <span style={{ fontSize: '0.75rem', color: '#8C6E53' }}>ID: {u.id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Contacts */}
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontSize: '0.82rem', color: '#604634' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Phone size={13} color="#8C6E53" /> {u.phone}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#6E5F55' }}>
                              <Mail size={13} color="#8C6E53" /> {u.email}
                            </span>
                          </div>
                        </td>

                        {/* Direct Role Permission Dropdown Selector */}
                        <td style={{ padding: '0.8rem 1rem' }}>
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}
                            style={{
                              padding: '0.4rem 0.6rem',
                              borderRadius: '10px',
                              border: '1.5px solid var(--mipa-beige)',
                              backgroundColor:
                                u.role === 'ADMIN'
                                  ? '#FDF2F8'
                                  : u.role === 'MANAGER'
                                  ? '#FEF3C7'
                                  : u.role === 'STAFF'
                                  ? '#E0F2FE'
                                  : '#FFFFFF',
                              color:
                                u.role === 'ADMIN'
                                  ? '#9D174D'
                                  : u.role === 'MANAGER'
                                  ? '#92400E'
                                  : u.role === 'STAFF'
                                  ? '#0369A1'
                                  : '#604634',
                              fontWeight: 700,
                              fontSize: '0.82rem',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="CUSTOMER">👤 CUSTOMER (Khách hàng)</option>
                            <option value="STAFF">📷 STAFF (Photographer / Ekip)</option>
                            <option value="MANAGER">💼 MANAGER (Quản lý Studio)</option>
                            <option value="ADMIN">🔐 ADMIN (Quản trị Root)</option>
                          </select>
                          {u.staffRole && (
                            <div style={{ fontSize: '0.72rem', color: '#8C6E53', marginTop: '0.2rem', fontWeight: 600 }}>
                              Chuyên môn: {u.staffRole}
                            </div>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'center' }}>
                          <span
                            onClick={() => handleToggleStatus(u.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.3rem 0.7rem',
                              borderRadius: '12px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              backgroundColor: isSuspended ? '#FEE2E2' : '#ECFDF5',
                              color: isSuspended ? '#991B1B' : '#047857',
                            }}
                            title="Bấm để thay đổi trạng thái hoạt động / khóa"
                          >
                            {isSuspended ? (
                              <> <Lock size={13} /> Tạm Khóa </>
                            ) : (
                              <> <CheckCircle size={13} /> Active </>
                            )}
                          </span>
                        </td>

                        {/* Action Buttons */}
                        <td style={{ padding: '0.8rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              title="Sửa thông tin tài khoản"
                              style={{
                                border: 'none',
                                backgroundColor: '#F8F3E6',
                                color: '#604634',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit size={15} />
                            </button>

                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              title={isSuspended ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              style={{
                                border: 'none',
                                backgroundColor: isSuspended ? '#FEF3C7' : '#FEE2E2',
                                color: isSuspended ? '#B45309' : '#991B1B',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              {isSuspended ? <Unlock size={15} /> : <Lock size={15} />}
                            </button>

                            <button
                              onClick={() => handleDeleteUser(u.id, u.fullName)}
                              title="Xóa tài khoản vĩnh viễn"
                              style={{
                                border: 'none',
                                backgroundColor: '#FDF2F8',
                                color: '#9D174D',
                                padding: '0.4rem 0.6rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* TAB 2: PROMOTIONS & VOUCHERS */}
      {adminTab === 'promotions' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
          
          {/* Create Promo Form */}
          <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#604634', marginBottom: '1rem' }}>Tạo Voucher Mới</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="mipa-label">Mã Voucher (Code)</label>
                <input
                  type="text"
                  placeholder="VD: MIPA30"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="mipa-input"
                  style={{ textTransform: 'uppercase', fontWeight: 700 }}
                />
              </div>

              <div>
                <label className="mipa-label">Phần trăm Giảm Giá (%)</label>
                <input
                  type="number"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(Number(e.target.value))}
                  className="mipa-input"
                />
              </div>

              <button onClick={handleAddPromotion} className="btn-mipa-gold" style={{ width: '100%', marginTop: '0.5rem' }}>
                <Plus size={16} /> Tạo Mã Khuyến Mãi
              </button>
            </div>
          </div>

          {/* Promo List */}
          <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#604634', marginBottom: '1rem' }}>Mã Khuyến Mãi Đang Hoạt Động</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {promotions.map((p) => (
                <div key={p.id} style={{ padding: '1rem', borderRadius: '12px', border: '1px solid var(--mipa-beige)', backgroundColor: '#FFFDF6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <strong style={{ fontSize: '1.1rem', color: '#604634' }}>{p.code}</strong>
                      <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '10px' }}>
                        Giảm {p.discountPercent}%
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                      Đã dùng: <strong>{p.usageCount}/{p.usageLimit} lượt</strong> • Đơn tối thiểu: {p.minOrder.toLocaleString('vi-VN')}đ
                    </div>
                  </div>

                  <button
                    onClick={() => togglePromoStatus(p.id)}
                    style={{
                      border: 'none',
                      backgroundColor: p.isActive ? '#ECFDF5' : '#FEE2E2',
                      color: p.isActive ? '#047857' : '#991B1B',
                      padding: '0.4rem 0.8rem',
                      borderRadius: '16px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {p.isActive ? '● Đang Kích Hoạt' : '○ Đã Tắt'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: PERMISSIONS MATRIX */}
      {adminTab === 'permissions' && (
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '1rem' }}>Bảng Phân Quyền Chi Tiết (Role & Permission Matrix)</h3>
          
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--mipa-beige)', textAlign: 'left', backgroundColor: '#FFFDF6' }}>
                <th style={{ padding: '0.8rem', color: '#8C6E53' }}>CHỨC NĂNG HỆ THỐNG</th>
                <th style={{ padding: '0.8rem', textAlign: 'center' }}>CUSTOMER</th>
                <th style={{ padding: '0.8rem', textAlign: 'center' }}>STAFF (Photog/Ekip)</th>
                <th style={{ padding: '0.8rem', textAlign: 'center' }}>MANAGER</th>
                <th style={{ padding: '0.8rem', textAlign: 'center' }}>ADMIN</th>
              </tr>
            </thead>
            <tbody>
              {[
                { feature: 'Đặt lịch Chụp (Booking)', cust: true, staff: 'Xem', mgr: true, admin: true },
                { feature: 'Xem Lịch Studio (Calendar)', cust: 'Cá nhân', staff: true, mgr: true, admin: true },
                { feature: 'Tạo / Sửa / Xóa / Phân quyền Tài Khoản', cust: false, staff: false, mgr: false, admin: true },
                { feature: 'Phân công Nhân sự (Assign Staff)', cust: false, staff: false, mgr: true, admin: true },
                { feature: 'Xem Doanh Thu Studio & CRM', cust: false, staff: false, mgr: true, admin: true },
                { feature: 'Xóa Đơn Đặt Lịch / Refund', cust: false, staff: false, mgr: false, admin: true },
                { feature: 'Cấu hình System & Audit Log', cust: false, staff: false, mgr: false, admin: true },
              ].map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #EFE6C9' }}>
                  <td style={{ padding: '0.8rem', fontWeight: 600, color: '#604634' }}>{row.feature}</td>
                  <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.cust === true ? '✓' : row.cust === false ? '✕' : row.cust}</td>
                  <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.staff === true ? '✓' : row.staff === false ? '✕' : row.staff}</td>
                  <td style={{ padding: '0.8rem', textAlign: 'center' }}>{row.mgr === true ? '✓' : row.mgr === false ? '✕' : row.mgr}</td>
                  <td style={{ padding: '0.8rem', textAlign: 'center', color: '#047857', fontWeight: 700 }}>✓ TOÀN QUYỀN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {adminTab === 'audit' && (
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <h3 style={{ fontSize: '1.3rem', color: '#604634', marginBottom: '1rem' }}>Nhật Ký Thao Tác Hệ Thống (Audit Logs)</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {auditLogs.map((log) => (
              <div key={log.id} style={{ padding: '0.8rem 1rem', borderRadius: '10px', backgroundColor: '#FFFDF6', borderLeft: '3px solid #604634', fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#604634' }}>
                  <span>{log.timestamp} • {log.userName} ({log.userRole})</span>
                  <span style={{ color: '#8C6E53' }}>{log.action}</span>
                </div>
                <div style={{ color: '#6E5F55', marginTop: '0.2rem' }}>{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CREATE USER MODAL */}
      {isAddModalOpen && (
        <div className="mipa-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="mipa-modal-card" style={{ maxWidth: '520px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#604634', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={20} color="#8C6E53" /> Tạo Tài Khoản Mới
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} color="#604634" />
              </button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="mipa-label">Họ và Tên (*):</label>
                  <input
                    type="text"
                    className="mipa-input"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Nam"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label className="mipa-label">Số Điện Thoại:</label>
                    <input
                      type="text"
                      className="mipa-input"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0901 234 567"
                    />
                  </div>

                  <div>
                    <label className="mipa-label">Email Liên Hệ:</label>
                    <input
                      type="email"
                      className="mipa-input"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="nam.nguyen@gmail.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Phân Quyền Tài Khoản (Role):</label>
                  <select
                    className="mipa-input"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                  >
                    <option value="CUSTOMER">👤 CUSTOMER (Khách Hàng - Đặt lịch & Xem Album)</option>
                    <option value="STAFF">📷 STAFF (Nhân viên / Ekip Studio)</option>
                    <option value="MANAGER">💼 MANAGER (Studio Manager - CRM & Lịch phòng)</option>
                    <option value="ADMIN">🔐 ADMIN (Root Quản Trị Hệ Thống)</option>
                  </select>
                </div>

                {formRole === 'STAFF' && (
                  <div>
                    <label className="mipa-label">Chuyên Môn Staff (Staff Role):</label>
                    <select
                      className="mipa-input"
                      value={formStaffRole}
                      onChange={(e) => setFormStaffRole(e.target.value as StaffRole)}
                    >
                      <option value="PHOTOGRAPHER">📷 Photographer (Nhiếp ảnh gia)</option>
                      <option value="MAKEUP">💄 Makeup Artist (Trang điểm)</option>
                      <option value="EDITOR">🎬 Editor (Hậu kỳ photo/video)</option>
                      <option value="RECEPTIONIST">🛎️ Receptionist (Lễ tân)</option>
                    </select>
                  </div>
                )}

                <div style={{ backgroundColor: '#F8F3E6', padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.78rem', color: '#8C6E53' }}>
                  🔒 Mật khẩu và thông tin đăng nhập sẽ được gửi qua email kích hoạt an toàn của hệ thống.
                </div>

                {formError && (
                  <div style={{ color: '#9D174D', fontSize: '0.82rem', backgroundColor: '#FDF2F8', padding: '0.6rem 0.9rem', borderRadius: '10px' }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn-mipa-secondary" style={{ flex: 1 }}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-mipa-gold" style={{ flex: 2, height: '44px' }}>
                    TẠO TÀI KHOẢN NGAY
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="mipa-modal-overlay" style={{ zIndex: 10000 }}>
          <div className="mipa-modal-card" style={{ maxWidth: '520px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '1.3rem', color: '#604634', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit size={20} color="#8C6E53" /> Chỉnh Sửa & Phân Quyền Tài Khoản
              </h3>
              <button onClick={() => setEditingUser(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} color="#604634" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="mipa-label">Họ và Tên (*):</label>
                  <input
                    type="text"
                    className="mipa-input"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                  <div>
                    <label className="mipa-label">Số Điện Thoại:</label>
                    <input
                      type="text"
                      className="mipa-input"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="mipa-label">Email Liên Hệ:</label>
                    <input
                      type="email"
                      className="mipa-input"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="mipa-label">Phân Quyền (Role):</label>
                  <select
                    className="mipa-input"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                  >
                    <option value="CUSTOMER">👤 CUSTOMER (Khách Hàng)</option>
                    <option value="STAFF">📷 STAFF (Nhân viên / Ekip)</option>
                    <option value="MANAGER">💼 MANAGER (Studio Manager)</option>
                    <option value="ADMIN">🔐 ADMIN (Root System Admin)</option>
                  </select>
                </div>

                {formRole === 'STAFF' && (
                  <div>
                    <label className="mipa-label">Chuyên Môn Staff:</label>
                    <select
                      className="mipa-input"
                      value={formStaffRole}
                      onChange={(e) => setFormStaffRole(e.target.value as StaffRole)}
                    >
                      <option value="PHOTOGRAPHER">📷 Photographer (Nhiếp ảnh gia)</option>
                      <option value="MAKEUP">💄 Makeup Artist (Trang điểm)</option>
                      <option value="EDITOR">🎬 Editor (Hậu kỳ)</option>
                      <option value="RECEPTIONIST">🛎️ Receptionist (Lễ tân)</option>
                    </select>
                  </div>
                )}

                <div style={{ backgroundColor: '#F8F3E6', padding: '0.6rem 0.8rem', borderRadius: '10px', fontSize: '0.78rem', color: '#8C6E53' }}>
                  🔒 Đặt lại mật khẩu được gửi qua email an toàn theo tiêu chuẩn bảo mật hệ thống.
                </div>

                {formError && (
                  <div style={{ color: '#9D174D', fontSize: '0.82rem', backgroundColor: '#FDF2F8', padding: '0.6rem 0.9rem', borderRadius: '10px' }}>
                    ⚠️ {formError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={() => setEditingUser(null)} className="btn-mipa-secondary" style={{ flex: 1 }}>
                    Hủy
                  </button>
                  <button type="submit" className="btn-mipa-gold" style={{ flex: 2, height: '44px' }}>
                    LƯU THAY ĐỔI
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
