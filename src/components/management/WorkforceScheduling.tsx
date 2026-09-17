import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Sparkles,
  Search,
} from 'lucide-react';
import type {
  Employee,
  StaffLeaveRequest,
  StaffSkill,
} from '../../types';
import { INITIAL_EMPLOYEES } from '../../mockData';
import {
  getStaffSkills,
  getStaffLeaveRequests,
  requestStaffLeave,
  approveStaffLeave,
  rejectStaffLeave,
} from '../../services/staffSchedulingService';

interface WorkforceSchedulingProps {
  onOpenEmployeeDetails?: (employeeId: string) => void;
}

export const WorkforceScheduling: React.FC<WorkforceSchedulingProps> = () => {
  const [employees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [_skills, setSkills] = useState<StaffSkill[]>([]);
  const [leaves, setLeaves] = useState<StaffLeaveRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'ROSTER' | 'LEAVE'>('ROSTER');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Leave approval state
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingLeaveId, setProcessingLeaveId] = useState<string | null>(null);

  // New leave modal state
  const [showNewLeaveModal, setShowNewLeaveModal] = useState<boolean>(false);
  const [newLeaveEmployeeId, setNewLeaveEmployeeId] = useState<string>(INITIAL_EMPLOYEES[0]?.id || '');
  const [newLeaveType, setNewLeaveType] = useState<'ANNUAL' | 'SICK' | 'PERSONAL' | 'UNPAID' | 'OTHER'>('ANNUAL');
  const [newLeaveStart, setNewLeaveStart] = useState<string>('2026-09-22T08:00');
  const [newLeaveEnd, setNewLeaveEnd] = useState<string>('2026-09-22T18:00');
  const [newLeaveReason, setNewLeaveReason] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const [skillsData, leavesData] = await Promise.all([
        getStaffSkills(),
        getStaffLeaveRequests(),
      ]);
      setSkills(skillsData);
      setLeaves(leavesData);
    } catch (err: any) {
      console.error('Error loading workforce data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApproveLeave = async (leaveId: string) => {
    setProcessingLeaveId(leaveId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveStaffLeave(leaveId, 'Đã duyệt qua hệ thống quản lý');
      setActionSuccess('Đã duyệt đơn nghỉ phép thành công.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Không thể duyệt nghỉ phép.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleRejectLeave = async (leaveId: string) => {
    setProcessingLeaveId(leaveId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await rejectStaffLeave(leaveId, 'Không thể sắp xếp nhân sự thay thế');
      setActionSuccess('Đã từ chối đơn nghỉ phép.');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Thao tác thất bại.');
    } finally {
      setProcessingLeaveId(null);
    }
  };

  const handleCreateLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await requestStaffLeave({
        employeeId: newLeaveEmployeeId,
        leaveType: newLeaveType,
        startAt: `${newLeaveStart}:00+07:00`,
        endAt: `${newLeaveEnd}:00+07:00`,
        reason: newLeaveReason || 'Nghỉ phép cá nhân',
      });
      setShowNewLeaveModal(false);
      setActionSuccess('Đã gửi yêu cầu nghỉ phép.');
      setNewLeaveReason('');
      await loadData();
    } catch (err: any) {
      setActionError(err.message || 'Lỗi gửi yêu cầu nghỉ phép.');
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto', color: '#2C2420' }}>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: '1px solid rgba(96, 70, 52, 0.15)',
        paddingBottom: '1.25rem',
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#8C6E53', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
            <Sparkles size={14} color="#C6A45F" /> Quản Lý Đội Ngũ & Ca Làm Việc
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.75rem', margin: '0.3rem 0 0', fontWeight: 700, color: '#2C2420' }}>
            Workforce Scheduling — Lịch Trực & Phép Năm
          </h1>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#666' }}>
            Quản lý kỹ năng chuyên môn, lịch làm việc định kỳ tuần và kiểm soát xung đột nghỉ phép.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={() => setShowNewLeaveModal(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              backgroundColor: '#604634',
              border: 'none',
              color: '#FFFDF6',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          >
            <Plus size={15} /> Tạo đơn nghỉ phép
          </button>
          <button
            onClick={loadData}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              border: '1px solid #D1C7BD',
              backgroundColor: '#FFFDF6',
              color: '#604634',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {actionError && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          padding: '0.9rem 1.2rem',
          color: '#B91C1C',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertTriangle size={18} />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: '8px',
          padding: '0.9rem 1.2rem',
          color: '#15803D',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid #E5DFD7' }}>
        <button
          onClick={() => setActiveTab('ROSTER')}
          style={{
            padding: '0.65rem 1.2rem',
            border: 'none',
            borderBottom: activeTab === 'ROSTER' ? '2.5px solid #604634' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'ROSTER' ? '#604634' : '#888',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Users size={16} /> Danh sách Nhân sự ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab('LEAVE')}
          style={{
            padding: '0.65rem 1.2rem',
            border: 'none',
            borderBottom: activeTab === 'LEAVE' ? '2.5px solid #604634' : '2.5px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'LEAVE' ? '#604634' : '#888',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Calendar size={16} /> Quản lý Nghỉ phép ({leaves.length})
        </button>
      </div>

      {activeTab === 'ROSTER' ? (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
              <Search size={16} color="#888" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên hoặc email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 1rem 0.55rem 2.4rem',
                  borderRadius: '8px',
                  border: '1px solid #D1C7BD',
                  backgroundColor: '#FFFDF6',
                  fontSize: '0.88rem',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                border: '1px solid #D1C7BD',
                backgroundColor: '#FFFDF6',
                fontSize: '0.88rem',
                color: '#2C2420',
              }}
            >
              <option value="ALL">Tất cả vai trò</option>
              <option value="PHOTOGRAPHER">Photographer</option>
              <option value="MAKEUP">Makeup Artist</option>
              <option value="EDITOR">Editor / Hậu kỳ</option>
              <option value="RECEPTIONIST">Lễ tân</option>
              <option value="MANAGER">Manager</option>
            </select>
          </div>

          {/* Employees Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {filteredEmployees.map(emp => (
              <div
                key={emp.id}
                style={{
                  backgroundColor: '#FFFDF6',
                  borderRadius: '12px',
                  border: '1px solid #E5DFD7',
                  padding: '1.25rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                  <img
                    src={emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={emp.name}
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #C6A45F' }}
                  />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: '#2C2420' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#8C6E53', fontWeight: 600 }}>{emp.role}</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.82rem', color: '#666', marginBottom: '0.6rem' }}>
                  📞 {emp.phone} • ✉ {emp.email}
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', fontWeight: 600, marginBottom: '0.3rem' }}>
                    Kỹ năng chuyên môn
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {emp.skills?.map(skill => (
                      <span
                        key={skill}
                        style={{
                          fontSize: '0.72rem',
                          backgroundColor: '#F3EFEA',
                          color: '#604634',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '6px',
                          fontWeight: 500,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F0EAE1', paddingTop: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#777' }}>
                    Đã hoàn thành: <strong>{emp.totalSessions}</strong> ca chụp
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '10px',
                    backgroundColor: emp.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
                    color: emp.status === 'ACTIVE' ? '#15803D' : '#B91C1C',
                  }}>
                    {emp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Leaves Management Table */
        <div style={{
          backgroundColor: '#FFFDF6',
          borderRadius: '12px',
          border: '1px solid #E5DFD7',
          padding: '1.25rem',
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
        }}>
          <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.15rem', margin: '0 0 1rem', color: '#2C2420' }}>
            Danh Sách Yêu Cầu Nghỉ Phép
          </h3>

          {leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#888' }}>
              Chưa có đơn nghỉ phép nào được ghi nhận.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5DFD7', textAlign: 'left', color: '#8C6E53' }}>
                    <th style={{ padding: '0.75rem' }}>Nhân viên</th>
                    <th style={{ padding: '0.75rem' }}>Loại phép</th>
                    <th style={{ padding: '0.75rem' }}>Thời gian nghỉ</th>
                    <th style={{ padding: '0.75rem' }}>Lý do</th>
                    <th style={{ padding: '0.75rem' }}>Trạng thái</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {leaves.map(req => {
                    const isPending = req.status === 'REQUESTED';
                    const isProcessing = processingLeaveId === req.id;
                    return (
                      <tr key={req.id} style={{ borderBottom: '1px solid #F0EAE1' }}>
                        <td style={{ padding: '0.85rem 0.75rem', fontWeight: 600 }}>{req.employeeName}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{ fontSize: '0.78rem', backgroundColor: '#F3EFEA', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>
                            {req.leaveType}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#555' }}>
                          {req.startAt.slice(0, 10)} {req.startAt.slice(11, 16)} → {req.endAt.slice(0, 10)} {req.endAt.slice(11, 16)}
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', color: '#666' }}>{req.reason}</td>
                        <td style={{ padding: '0.85rem 0.75rem' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px',
                            backgroundColor: req.status === 'APPROVED' ? '#DCFCE7' : req.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                            color: req.status === 'APPROVED' ? '#15803D' : req.status === 'REJECTED' ? '#B91C1C' : '#B45309',
                          }}>
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.75rem', textAlign: 'right' }}>
                          {isPending ? (
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleApproveLeave(req.id)}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#15803D',
                                  border: 'none',
                                  color: '#FFF',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                {isProcessing ? 'Đang duyệt...' : 'Duyệt'}
                              </button>
                              <button
                                disabled={isProcessing}
                                onClick={() => handleRejectLeave(req.id)}
                                style={{
                                  padding: '0.35rem 0.7rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#DC2626',
                                  border: 'none',
                                  color: '#FFF',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Từ chối
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.78rem', color: '#999' }}>Đã hoàn tất</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Leave Modal */}
      {showNewLeaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#FFFDF6',
            borderRadius: '14px',
            maxWidth: '480px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: '1.25rem', margin: '0 0 1.25rem', color: '#2C2420' }}>
              Tạo Đơn Xin Nghỉ Phép
            </h3>

            <form onSubmit={handleCreateLeave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                  Nhân viên
                </label>
                <select
                  value={newLeaveEmployeeId}
                  onChange={e => setNewLeaveEmployeeId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', backgroundColor: '#FFF' }}
                >
                  {employees.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                  Loại nghỉ phép
                </label>
                <select
                  value={newLeaveType}
                  onChange={e => setNewLeaveType(e.target.value as any)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', backgroundColor: '#FFF' }}
                >
                  <option value="ANNUAL">Nghỉ phép năm (Annual Leave)</option>
                  <option value="SICK">Nghỉ ốm / Khám bệnh (Sick Leave)</option>
                  <option value="PERSONAL">Nghỉ việc riêng (Personal)</option>
                  <option value="UNPAID">Nghỉ không lương (Unpaid)</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                    Từ thời điểm
                  </label>
                  <input
                    type="datetime-local"
                    value={newLeaveStart}
                    onChange={e => setNewLeaveStart(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #D1C7BD' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                    Đến thời điểm
                  </label>
                  <input
                    type="datetime-local"
                    value={newLeaveEnd}
                    onChange={e => setNewLeaveEnd(e.target.value)}
                    required
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #D1C7BD' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.3rem', color: '#604634' }}>
                  Lý do xin nghỉ
                </label>
                <textarea
                  value={newLeaveReason}
                  onChange={e => setNewLeaveReason(e.target.value)}
                  placeholder="Ghi rõ lý do..."
                  rows={3}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #D1C7BD', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowNewLeaveModal(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #D1C7BD',
                    backgroundColor: 'transparent',
                    color: '#666',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.5rem 1.2rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#604634',
                    color: '#FFFDF6',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Gửi yêu cầu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
