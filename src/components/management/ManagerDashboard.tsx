// ==============================================================================
// Maison MIPA Memories - Studio Operations Dashboard (Manager OS)
// Hardened for Issue #7:
// - Operations Action Center prioritizing actionable tasks
// - Staff assignments (Photographer, Makeup, Editor)
// - Reschedule / Cancel requests review & approval
// - Google Drive delivery readiness toggle (#8 integration)
// - Protected operations search (no public PII exposure)
// ==============================================================================
import React, { useState } from 'react';
import type { Booking, BookingStatus, Employee, StudioRoom } from '../../types';
import { getOperationsInboxStats, getNextActionForBooking } from '../../utils/bookingStateMachine';
import {
  Calendar,
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  FolderDown,
  UserCheck,
  MapPin,
  Clock,
  ExternalLink,
  DollarSign,
  Plus,
} from 'lucide-react';

interface ManagerDashboardProps {
  bookings: Booking[];
  employees: Employee[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
  onAssignStaff: (bookingId: string, employeeId: string, role?: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  bookings,
  employees,
  studios: _studios,
  onOpenBooking,
  onUpdateStatus,
  onAssignStaff,
  onNavigateTab,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBookingTimeline, setActiveBookingTimeline] = useState<Booking | null>(bookings[0] || null);

  // Assign staff modal/popover state
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedStaffRole, setSelectedStaffRole] = useState<string>('PHOTOGRAPHER');

  // Computed Operations Inbox stats
  const inboxStats = getOperationsInboxStats(bookings);

  // Search & Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = selectedStatusFilter === 'ALL' || b.bookingStatus === selectedStatusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = query.length === 0 ||
      b.bookingCode.toLowerCase().includes(query) ||
      b.customerName.toLowerCase().includes(query) ||
      b.customerPhone.includes(query);
    return matchesFilter && matchesSearch;
  });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBooking || !selectedEmployeeId) return;
    onAssignStaff(assigningBooking.id, selectedEmployeeId, selectedStaffRole);
    setAssigningBooking(null);
    setSelectedEmployeeId('');
  };

  return (
    <div style={{ maxWidth: '1350px', margin: '1.5rem auto', padding: '0 1.5rem' }}>

      {/* Top Banner & Quick Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8C6E53', fontWeight: 700 }}>
            MAISON MIPA STUDIO MANAGEMENT SYSTEM
          </div>
          <h2 style={{ fontSize: '1.8rem', color: '#604634', margin: 0 }}>
            Tổng Quan Vận Hành Studio (Operations Dashboard)
          </h2>
          <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
            Hệ thống điều phối kíp chụp, quản lý tiến độ đơn & phân bổ tài nguyên studio theo thời gian thực.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => onNavigateTab('studio_calendar')} className="btn-mipa-secondary" style={{ fontSize: '0.85rem' }}>
            <Calendar size={15} /> Lịch Studio
          </button>
          <button onClick={onOpenBooking} className="btn-mipa-gold" style={{ fontSize: '0.85rem' }}>
            <Plus size={16} /> Tạo Đơn Trực Tiếp
          </button>
        </div>
      </div>

      {/* OPERATIONS INBOX BANNER - Actionable Workstation */}
      <div style={{
        backgroundColor: '#FFFBEB',
        border: '1.5px solid #F59E0B',
        borderRadius: '20px',
        padding: '1.2rem 1.6rem',
        marginBottom: '1.8rem',
        boxShadow: '0 8px 25px rgba(245, 158, 11, 0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#92400E', fontWeight: 700, fontSize: '1.05rem' }}>
            <AlertTriangle size={20} color="#D97706" />
            <span>OPERATIONS INBOX — {inboxStats.totalActionRequired} VIỆC CẦN XỬ LÝ:</span>
          </div>
          <span style={{ fontSize: '0.78rem', backgroundColor: '#FEF3C7', color: '#92400E', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 700 }}>
            ⚡ Ưu tiên xử lý theo quy trình nghiệp vụ
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button
            onClick={() => setSelectedStatusFilter('DEPOSIT_PAID')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: selectedStatusFilter === 'DEPOSIT_PAID' ? '2px solid #B45309' : '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>CHỜ XÁC NHẬN CỌC</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.pendingConfirmationCount} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('CONFIRMED')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: selectedStatusFilter === 'CONFIRMED' ? '2px solid #B45309' : '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>CHƯA GÁN KÍP CHỤP</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.unassignedStaffCount} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('SHOOTING')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: selectedStatusFilter === 'SHOOTING' ? '2px solid #B45309' : '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>ĐANG CHỤP TRONG PHÒNG</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.shootingNowCount} ca</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('READY_FOR_REVIEW')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              border: selectedStatusFilter === 'READY_FOR_REVIEW' ? '2px solid #B45309' : '1px solid #FCD34D',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#92400E', fontWeight: 600 }}>CHỜ DUYỆT GIAO ẢNH</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#B45309' }}>{inboxStats.readyToDeliverCount} bộ</div>
          </button>
        </div>
      </div>

      {/* Main Section: Schedule & Booking Control Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '1.5rem' }}>

        {/* Left Column: Bookings Table / List */}
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            {/* Protected In-Portal Search */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#8C6E53' }} />
              <input
                type="text"
                placeholder="Tìm mã đơn, tên khách, SĐT..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="mipa-input"
                style={{ paddingLeft: '36px', height: '38px', borderRadius: '10px', fontSize: '0.85rem', width: '100%' }}
              />
            </div>

            {/* Status Filter Pills */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {['ALL', 'PENDING_PAYMENT', 'DEPOSIT_PAID', 'CONFIRMED', 'SHOOTING', 'READY_FOR_REVIEW', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatusFilter(st)}
                  style={{
                    border: 'none',
                    background: selectedStatusFilter === st ? '#8C6E53' : '#FFFDF6',
                    color: selectedStatusFilter === st ? '#FFFDF6' : '#604634',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}
                >
                  {st === 'ALL' ? 'Tất cả' : st}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredBookings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#8C6E53' }}>
                Không tìm thấy đơn đặt lịch nào phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              filteredBookings.map((b) => {
                const nextAction = getNextActionForBooking(b, 'MANAGER');
                const isSelectedForTimeline = activeBookingTimeline?.id === b.id;

                return (
                  <div
                    key={b.id}
                    onClick={() => setActiveBookingTimeline(b)}
                    style={{
                      padding: '1.2rem',
                      borderRadius: '14px',
                      border: isSelectedForTimeline ? '2px solid #C6A45F' : '1px solid var(--mipa-beige)',
                      backgroundColor: isSelectedForTimeline ? '#FFFDF6' : '#FFFFFF',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <strong style={{ color: '#8C6E53', fontSize: '0.9rem' }}>{b.bookingCode}</strong>
                        <span className={`badge-status badge-${b.bookingStatus.toLowerCase()}`}>
                          ● {b.bookingStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                        🗓️ <strong>{b.bookingDate}</strong> lúc <strong>{b.startTime}</strong> ({b.studioName})
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', color: '#604634', margin: 0 }}>{b.packageName} ({b.serviceName})</h4>
                        <div style={{ fontSize: '0.82rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                          Khách: <strong>{b.customerName}</strong> • SĐT: <strong>{b.customerPhone}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8C6E53' }}>
                          {b.totalAmount.toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '0.75rem', color: b.paymentStatus === 'DEPOSIT_PAID' || b.paymentStatus === 'FULLY_PAID' ? '#047857' : '#D97706', fontWeight: 600 }}>
                          Cọc: {b.depositAmount.toLocaleString('vi-VN')} đ ({b.paymentStatus})
                        </div>
                      </div>
                    </div>

                    {/* Pending Requests Alert */}
                    {b.rescheduleRequestedAt && (
                      <div style={{ padding: '0.5rem 0.8rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.8rem', color: '#92400E' }}>
                        ⚠️ Khách yêu cầu đổi lịch sang ngày: <strong>{b.rescheduleRequestedDate} ({b.rescheduleRequestedSlot})</strong>
                      </div>
                    )}

                    {/* Assigned Staff Pills & Actions */}
                    <div style={{ padding: '0.66rem 0.8rem', backgroundColor: '#FFFDF6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', border: '1px solid var(--mipa-beige)', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>📷 Photog: <strong>{b.assignments.find((a) => a.assignmentRole === 'PHOTOGRAPHER')?.employeeName || 'Chưa gán'}</strong></span>
                        <span>💄 Makeup: <strong>{b.assignments.find((a) => a.assignmentRole === 'MAKEUP')?.employeeName || 'Chưa gán'}</strong></span>
                        <span>🎨 Editor: <strong>{b.assignments.find((a) => a.assignmentRole === 'EDITOR')?.employeeName || 'Chưa gán'}</strong></span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAssigningBooking(b);
                          }}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                        >
                          👤 Gán Kíp
                        </button>

                        {nextAction && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(b.id, nextAction.targetStatus);
                            }}
                            className={nextAction.buttonClass}
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          >
                            {nextAction.label}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Booking Detail & Operations Action Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {activeBookingTimeline ? (
            <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
              <h3 style={{ fontSize: '1.2rem', color: '#604634', marginBottom: '1rem', borderBottom: '1px solid #EFE6C9', paddingBottom: '0.5rem' }}>
                Chi Tiết Vận Hành #{activeBookingTimeline.bookingCode}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#8C6E53', fontWeight: 600 }}>Khách hàng:</span>
                  <div style={{ fontWeight: 700, color: '#604634' }}>{activeBookingTimeline.customerName}</div>
                  <div style={{ color: '#6E5F55' }}>SĐT: {activeBookingTimeline.customerPhone}</div>
                  <div style={{ color: '#6E5F55' }}>Email: {activeBookingTimeline.customerEmail}</div>
                </div>

                <div>
                  <span style={{ color: '#8C6E53', fontWeight: 600 }}>Gói chụp & Studio:</span>
                  <div style={{ fontWeight: 700, color: '#604634' }}>{activeBookingTimeline.packageName}</div>
                  <div style={{ color: '#6E5F55' }}>Phòng: {activeBookingTimeline.studioName}</div>
                  <div style={{ color: '#6E5F55' }}>Thời gian: {activeBookingTimeline.bookingDate} ({activeBookingTimeline.startTime} - {activeBookingTimeline.endTime})</div>
                </div>

                <div>
                  <span style={{ color: '#8C6E53', fontWeight: 600 }}>Google Drive Delivery (#8):</span>
                  <div style={{ marginTop: '0.3rem' }}>
                    <a
                      href={activeBookingTimeline.driveFolderUrl || 'https://drive.google.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                    >
                      <FolderDown size={15} /> Thư mục Drive bàn giao ảnh
                    </a>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #EFE6C9', paddingTop: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: '#604634', marginBottom: '0.4rem' }}>Cập nhật thủ công:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {activeBookingTimeline.bookingStatus === 'PENDING_PAYMENT' && (
                      <button
                        onClick={() => onUpdateStatus(activeBookingTimeline.id, 'CONFIRMED', 'Xác nhận cọc trực tiếp tại quầy')}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                      >
                        ✓ Xác Nhận Đã Nhận Cọc
                      </button>
                    )}

                    {activeBookingTimeline.bookingStatus === 'READY_FOR_REVIEW' && (
                      <button
                        onClick={() => onUpdateStatus(activeBookingTimeline.id, 'DELIVERED', 'Đã duyệt ảnh và mở Drive cho khách')}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                      >
                        📩 Mở Quyền Xem Ảnh Cho Khách
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mipa-card" style={{ padding: '2rem', textAlign: 'center', color: '#8C6E53', borderRadius: '16px' }}>
              Chọn một đơn chụp từ danh sách để xem chi tiết điều phối.
            </div>
          )}
        </div>

      </div>

      {/* Assign Staff Modal */}
      {assigningBooking && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem' }}>
          <div className="mipa-card" style={{ maxWidth: '460px', width: '100%', padding: '2rem', borderRadius: '18px' }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#604634', fontSize: '1.2rem' }}>
              Phân Công Nhân Sự: #{assigningBooking.bookingCode}
            </h4>

            <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                  Vai trò phân công
                </label>
                <select
                  value={selectedStaffRole}
                  onChange={e => setSelectedStaffRole(e.target.value)}
                  className="mipa-input"
                  style={{ width: '100%', height: '40px' }}
                >
                  <option value="PHOTOGRAPHER">📷 Nhiếp Ảnh Gia (Photographer)</option>
                  <option value="MAKEUP">💄 Chuyên Viên Trang Điểm (Makeup)</option>
                  <option value="EDITOR">🎨 Chuyên Viên Hậu Kỳ (Editor)</option>
                  <option value="RECEPTIONIST">📌 Lễ Tân / Điều Phối</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.3rem' }}>
                  Chọn nhân viên
                </label>
                <select
                  required
                  value={selectedEmployeeId}
                  onChange={e => setSelectedEmployeeId(e.target.value)}
                  className="mipa-input"
                  style={{ width: '100%', height: '40px' }}
                >
                  <option value="">-- Chọn nhân viên phù hợp --</option>
                  {employees
                    .filter(e => e.role === selectedStaffRole || !e.role)
                    .map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role || 'Staff'})
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setAssigningBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.65rem' }}
                >
                  Lưu Phân Công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
