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
  Search,
  AlertTriangle,
  FolderDown,
  Plus,
  X,
} from 'lucide-react';
import { INITIAL_EMPLOYEES } from '../../mockData';
import { confirmBookingDeposit, updateBookingConsultation } from '../../services/bookingService';

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

  // Confirm Deposit modal state
  const [confirmDepositBooking, setConfirmDepositBooking] = useState<Booking | null>(null);
  const [depositAmountInput, setDepositAmountInput] = useState<number>(0);
  const [depositNoteInput, setDepositNoteInput] = useState<string>('');
  const [agreedTotalAmountInput, setAgreedTotalAmountInput] = useState<number>(0);
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Consultation editor modal state
  const [editingConsultationBooking, setEditingConsultationBooking] = useState<Booking | null>(null);
  const [consultationTotalInput, setConsultationTotalInput] = useState<number>(0);
  const [consultationStaffNoteInput, setConsultationStaffNoteInput] = useState<string>('');
  const [isSubmittingConsultation, setIsSubmittingConsultation] = useState<boolean>(false);
  const [consultationError, setConsultationError] = useState<string | null>(null);

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

  const handleConfirmDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDepositBooking) return;
    if (depositAmountInput < 0) {
      setDepositError('Số tiền cọc không được là số âm.');
      return;
    }
    if (depositAmountInput > agreedTotalAmountInput) {
      setDepositError('Số tiền cọc không được lớn hơn tổng giá trị buổi chụp.');
      return;
    }
    setIsSubmittingDeposit(true);
    setDepositError(null);
    try {
      await confirmBookingDeposit({
        bookingId: confirmDepositBooking.id,
        depositAmount: depositAmountInput,
        depositNote: depositNoteInput.trim() || 'Xác nhận cọc thủ công tại studio',
        finalTotal: agreedTotalAmountInput,
      });
      onUpdateStatus(confirmDepositBooking.id, 'CONFIRMED', depositNoteInput);
      setConfirmDepositBooking(null);
    } catch (err: any) {
      setDepositError(err.message || 'Không thể xác nhận cọc.');
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConsultationBooking) return;
    setIsSubmittingConsultation(true);
    setConsultationError(null);
    try {
      await updateBookingConsultation({
        bookingId: editingConsultationBooking.id,
        totalAmount: consultationTotalInput,
        staffNote: consultationStaffNoteInput,
      });
      onUpdateStatus(editingConsultationBooking.id, 'CONSULTING', consultationStaffNoteInput);
      setEditingConsultationBooking(null);
    } catch (err: any) {
      setConsultationError(err.message || 'Không thể cập nhật tư vấn.');
    } finally {
      setIsSubmittingConsultation(false);
    }
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
        backgroundColor: '#FFFDF6',
        border: '1.5px solid #E6D7B9',
        borderRadius: '20px',
        padding: '1.2rem 1.6rem',
        marginBottom: '1.8rem',
        boxShadow: '0 4px 20px rgba(96, 70, 52, 0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#604634', fontWeight: 700, fontSize: '1rem' }}>
            <AlertTriangle size={19} color="#C6A45F" />
            <span>HÀNG ĐỢI ĐIỀU PHỐI — {inboxStats.totalActionRequired} VIỆC CẦN XỬ LÝ:</span>
          </div>
          <span style={{ fontSize: '0.78rem', backgroundColor: '#F8F3E6', color: '#8C6E53', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 700, border: '1px solid #E6D7B9' }}>
            Ưu tiên xử lý theo luồng vận hành studio
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <button
            onClick={() => setSelectedStatusFilter('CONSULTATION_REQUESTED')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: selectedStatusFilter === 'CONSULTATION_REQUESTED' ? '#FAF6EE' : '#FFFFFF',
              border: selectedStatusFilter === 'CONSULTATION_REQUESTED' ? '1.5px solid #8C6E53' : '1px solid #EFE6C9',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>YÊU CẦU TƯ VẤN MỚI</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#604634', marginTop: '0.15rem' }}>{inboxStats.newConsultationsCount} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('CONSULTING')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: selectedStatusFilter === 'CONSULTING' ? '#FAF6EE' : '#FFFFFF',
              border: selectedStatusFilter === 'CONSULTING' ? '1.5px solid #8C6E53' : '1px solid #EFE6C9',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>ĐANG TƯ VẤN</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#604634', marginTop: '0.15rem' }}>{inboxStats.consultingQueueCount} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('CONFIRMED')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: selectedStatusFilter === 'CONFIRMED' ? '#FAF6EE' : '#FFFFFF',
              border: selectedStatusFilter === 'CONFIRMED' ? '1.5px solid #8C6E53' : '1px solid #EFE6C9',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>ĐÃ XÁC NHẬN LỊCH</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#604634', marginTop: '0.15rem' }}>{bookings.filter(b => b.bookingStatus === 'CONFIRMED').length} đơn</div>
          </button>

          <button
            onClick={() => setSelectedStatusFilter('READY_FOR_REVIEW')}
            style={{
              padding: '0.8rem 1rem',
              borderRadius: '12px',
              backgroundColor: selectedStatusFilter === 'READY_FOR_REVIEW' ? '#FAF6EE' : '#FFFFFF',
              border: selectedStatusFilter === 'READY_FOR_REVIEW' ? '1.5px solid #8C6E53' : '1px solid #EFE6C9',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#8C6E53', fontWeight: 600 }}>CHỜ DUYỆT GIAO ẢNH</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#604634', marginTop: '0.15rem' }}>{inboxStats.readyToDeliverCount} bộ</div>
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

            {/* Status Filter Pills with Vietnamese labels */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'CONSULTATION_REQUESTED', label: 'Yêu cầu tư vấn' },
                { id: 'CONSULTING', label: 'Đang tư vấn' },
                { id: 'CONFIRMED', label: 'Đã xác nhận lịch & cọc' },
                { id: 'SHOOTING', label: 'Đang chụp' },
                { id: 'READY_FOR_REVIEW', label: 'Chờ duyệt ảnh' },
                { id: 'COMPLETED', label: 'Hoàn thành' },
              ].map((filterItem) => (
                <button
                  key={filterItem.id}
                  onClick={() => setSelectedStatusFilter(filterItem.id)}
                  style={{
                    border: '1px solid',
                    borderColor: selectedStatusFilter === filterItem.id ? '#8C6E53' : '#EFE6C9',
                    background: selectedStatusFilter === filterItem.id ? 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)' : '#FFFDF6',
                    color: selectedStatusFilter === filterItem.id ? '#FFFDF6' : '#604634',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: selectedStatusFilter === filterItem.id ? '0 2px 6px rgba(96, 70, 52, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {filterItem.label}
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
                          ● {b.bookingStatus === 'CONSULTATION_REQUESTED' ? 'YÊU CẦU TƯ VẤN' :
                             b.bookingStatus === 'CONSULTING' ? 'ĐANG TƯ VẤN' :
                             b.bookingStatus === 'CONFIRMED' ? 'ĐÃ XÁC NHẬN LỊCH & CỌC' :
                             b.bookingStatus}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                        🗓️ <strong>{b.bookingDate}</strong> lúc <strong>{b.startTime}</strong> ({b.studioName})
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <h4 style={{ fontSize: '1.05rem', color: '#604634', margin: 0 }}>{b.packageName} ({b.serviceName})</h4>
                        <div style={{ fontSize: '0.82rem', color: '#6E5F55', marginTop: '0.2rem' }}>
                          Khách: <strong>{b.customerName}</strong> • SĐT: <strong>{b.customerPhone}</strong>
                        </div>
                        {b.customerNote && (
                          <div style={{ fontSize: '0.8rem', color: '#8C6E53', marginTop: '0.25rem', fontStyle: 'italic' }}>
                            💬 Khách ghi chú: "{b.customerNote}"
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#8C6E53' }}>
                          {b.totalAmount.toLocaleString('vi-VN')} đ
                        </div>
                        <div style={{ fontSize: '0.75rem', color: b.depositAmount > 0 ? '#047857' : '#8C6E53', fontWeight: 600 }}>
                          {b.depositAmount > 0
                            ? `Đã cọc: ${b.depositAmount.toLocaleString('vi-VN')} đ`
                            : b.bookingStatus === 'CONSULTATION_REQUESTED' || b.bookingStatus === 'CONSULTING'
                            ? 'Chi phí dự kiến'
                            : 'Chưa có cọc'}
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
                        {b.bookingStatus === 'CONSULTATION_REQUESTED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateStatus(b.id, 'CONSULTING', 'Bắt đầu tư vấn');
                            }}
                            className="btn-mipa-gold"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          >
                            📞 Bắt đầu tư vấn
                          </button>
                        )}

                        {b.bookingStatus === 'CONSULTING' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConsultationBooking(b);
                                setConsultationTotalInput(b.totalAmount);
                                setConsultationStaffNoteInput(b.staffNote || '');
                                setConsultationError(null);
                              }}
                              className="btn-mipa-secondary"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            >
                              ✏️ Sửa giá/ghi chú
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDepositBooking(b);
                                setAgreedTotalAmountInput(b.totalAmount);
                                setDepositAmountInput(b.depositAmount > 0 ? b.depositAmount : Math.round(b.totalAmount * 0.3));
                                setDepositNoteInput(b.depositNote || '');
                                setDepositError(null);
                              }}
                              className="btn-mipa-gold"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            >
                              💰 Xác nhận đã nhận cọc
                            </button>
                          </>
                        )}

                        {b.bookingStatus !== 'CONSULTATION_REQUESTED' && b.bookingStatus !== 'CONSULTING' && (
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
                        )}

                        {nextAction && b.bookingStatus !== 'CONSULTING' && (
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
                  <div style={{ fontWeight: 700, color: '#604634', marginBottom: '0.4rem' }}>Hành động tư vấn & xác nhận:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {activeBookingTimeline.bookingStatus === 'CONSULTATION_REQUESTED' && (
                      <button
                        onClick={() => onUpdateStatus(activeBookingTimeline.id, 'CONSULTING', 'Bắt đầu tư vấn')}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                      >
                        📞 Bắt Đầu Tư Vấn Khách Hàng
                      </button>
                    )}

                    {(activeBookingTimeline.bookingStatus === 'CONSULTING' || activeBookingTimeline.bookingStatus === 'PENDING_PAYMENT') && (
                      <>
                        <button
                          onClick={() => {
                            setConfirmDepositBooking(activeBookingTimeline);
                            setAgreedTotalAmountInput(activeBookingTimeline.totalAmount);
                            setDepositAmountInput(activeBookingTimeline.depositAmount > 0 ? activeBookingTimeline.depositAmount : Math.round(activeBookingTimeline.totalAmount * 0.3));
                            setDepositNoteInput(activeBookingTimeline.depositNote || '');
                            setDepositError(null);
                          }}
                          className="btn-mipa-gold"
                          style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                        >
                          ✓ XÁC NHẬN ĐÃ NHẬN CỌC
                        </button>
                        <button
                          onClick={() => {
                            setEditingConsultationBooking(activeBookingTimeline);
                            setConsultationTotalInput(activeBookingTimeline.totalAmount);
                            setConsultationStaffNoteInput(activeBookingTimeline.staffNote || '');
                            setConsultationError(null);
                          }}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                        >
                          ✏️ Chỉnh Sửa Thông Tin Chốt
                        </button>
                      </>
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
      {assigningBooking && (() => {
        const availableEmployees = employees.length > 0 ? employees : INITIAL_EMPLOYEES;
        const matchingEmployees = availableEmployees.filter(e => e.role === selectedStaffRole);
        const otherEmployees = availableEmployees.filter(e => e.role !== selectedStaffRole);

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(30, 20, 15, 0.65)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '1rem',
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setAssigningBooking(null);
            }}
          >
            <div
              className="mipa-card"
              style={{
                maxWidth: '500px',
                width: '100%',
                padding: '2rem',
                borderRadius: '20px',
                backgroundColor: '#FFFDF9',
                boxShadow: '0 20px 50px rgba(44, 34, 30, 0.3)',
                border: '1px solid #E6D7B9',
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ĐIỀU PHỐI NHÂN SỰ STUDIO
                  </div>
                  <h3 style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.25rem', fontFamily: 'Playfair Display, serif' }}>
                    Phân Công: #{assigningBooking.bookingCode}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningBooking(null)}
                  style={{
                    background: '#F3EDE2',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#604634',
                    transition: 'background 0.2s',
                  }}
                  aria-label="Đóng cửa sổ"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Booking Context Preview Card */}
              <div
                style={{
                  backgroundColor: '#FAF7F2',
                  border: '1px solid #EAE0D0',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  marginBottom: '1.25rem',
                  fontSize: '0.85rem',
                  color: '#6E5F55',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div>
                  <strong style={{ color: '#43281C' }}>Khách hàng:</strong> {assigningBooking.customerName} {assigningBooking.customerPhone ? `(${assigningBooking.customerPhone})` : ''}
                </div>
                <div>
                  <strong style={{ color: '#43281C' }}>Gói chụp:</strong> {assigningBooking.packageName || assigningBooking.serviceName}
                </div>
                <div>
                  <strong style={{ color: '#43281C' }}>Lịch chụp:</strong> {assigningBooking.bookingDate} lúc {assigningBooking.startTime} ({assigningBooking.studioName || 'Studio MIPA'})
                </div>
              </div>

              <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label
                    htmlFor="assign-staff-role-select"
                    style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.4rem' }}
                  >
                    Vai trò phân công
                  </label>
                  <select
                    id="assign-staff-role-select"
                    value={selectedStaffRole}
                    onChange={e => setSelectedStaffRole(e.target.value)}
                    className="mipa-input"
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      padding: '0.65rem 1rem',
                      lineHeight: '1.5',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#FAF7F2',
                      border: '1.5px solid #D1C2A5',
                      borderRadius: '10px',
                      color: '#43281C',
                    }}
                  >
                    <option value="PHOTOGRAPHER">📷 Nhiếp Ảnh Gia (Photographer)</option>
                    <option value="MAKEUP">💄 Chuyên Viên Trang Điểm (Makeup)</option>
                    <option value="EDITOR">🎨 Chuyên Viên Hậu Kỳ (Editor)</option>
                    <option value="RECEPTIONIST">📌 Lễ Tân / Điều Phối</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="assign-staff-employee-select"
                    style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.4rem' }}
                  >
                    Chọn nhân viên
                  </label>
                  <select
                    id="assign-staff-employee-select"
                    required
                    value={selectedEmployeeId}
                    onChange={e => setSelectedEmployeeId(e.target.value)}
                    className="mipa-input"
                    style={{
                      width: '100%',
                      minHeight: '48px',
                      padding: '0.65rem 1rem',
                      lineHeight: '1.5',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      backgroundColor: '#FAF7F2',
                      border: '1.5px solid #D1C2A5',
                      borderRadius: '10px',
                      color: '#43281C',
                    }}
                  >
                    <option value="">-- Chọn nhân viên phù hợp --</option>
                    {matchingEmployees.length > 0 && (
                      <optgroup label={`⭐ Đúng chuyên môn (${selectedStaffRole})`}>
                        {matchingEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — {emp.role || 'Chuyên viên'} {emp.phone ? `• ${emp.phone}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {otherEmployees.length > 0 && (
                      <optgroup label="👥 Nhân sự studio khác (sẵn sàng điều phối)">
                        {otherEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — {emp.role || 'Staff'} {emp.phone ? `• ${emp.phone}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setAssigningBooking(null)}
                    className="btn-mipa-secondary"
                    style={{ flex: 1, padding: '0.75rem', minHeight: '44px' }}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="btn-mipa-gold"
                    style={{ flex: 1, padding: '0.75rem', minHeight: '44px' }}
                  >
                    Lưu Phân Công
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal: Xác Nhận Đã Nhận Cọc */}
      {confirmDepositBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(30, 20, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingDeposit) setConfirmDepositBooking(null);
          }}
        >
          <div
            className="mipa-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              borderRadius: '20px',
              backgroundColor: '#FFFDF9',
              boxShadow: '0 20px 50px rgba(44, 34, 30, 0.3)',
              border: '1.5px solid #C6A45F',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  XÁC NHẬN CỌC THỦ CÔNG & GIỮ LỊCH CHÍNH THỨC
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.3rem', fontFamily: 'Playfair Display, serif' }}>
                  Đơn #{confirmDepositBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingDeposit}
                onClick={() => setConfirmDepositBooking(null)}
                style={{
                  background: '#F3EDE2',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#604634',
                }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: '#FAF7F2',
                border: '1px solid #EAE0D0',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                color: '#6E5F55',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div><strong style={{ color: '#43281C' }}>Khách hàng:</strong> {confirmDepositBooking.customerName} ({confirmDepositBooking.customerPhone})</div>
              <div><strong style={{ color: '#43281C' }}>Gói chụp:</strong> {confirmDepositBooking.packageName} ({confirmDepositBooking.serviceName})</div>
              <div><strong style={{ color: '#43281C' }}>Lịch chụp:</strong> {confirmDepositBooking.bookingDate} lúc {confirmDepositBooking.startTime} ({confirmDepositBooking.studioName})</div>
            </div>

            {depositError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#991B1B', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {depositError}
              </div>
            )}

            <form onSubmit={handleConfirmDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Tổng giá trị đã chốt (VNĐ) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={agreedTotalAmountInput}
                  onChange={(e) => setAgreedTotalAmountInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="mipa-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Số tiền cọc đã nhận (VNĐ) *
                </label>
                <input
                  type="number"
                  min="0"
                  max={agreedTotalAmountInput}
                  required
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="mipa-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Ghi chú cọc / Đối soát giao dịch
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Nhận cọc chuyển khoản VCB, nhân viên Lan tiếp nhận..."
                  value={depositNoteInput}
                  onChange={(e) => setDepositNoteInput(e.target.value)}
                  className="mipa-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>

              {/* Dynamic remaining calculation */}
              <div
                style={{
                  backgroundColor: '#FFFDF6',
                  border: '1px solid #E6D7B9',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.82rem', color: '#8C6E53', fontWeight: 600 }}>CÒN LẠI CẦN THANH TOÁN:</span>
                <strong style={{ fontSize: '1.2rem', color: '#604634' }}>
                  {Math.max(0, agreedTotalAmountInput - depositAmountInput).toLocaleString('vi-VN')} đ
                </strong>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isSubmittingDeposit}
                  onClick={() => setConfirmDepositBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDeposit}
                  className="btn-mipa-gold"
                  style={{ flex: 1.5, padding: '0.75rem', fontWeight: 700 }}
                >
                  {isSubmittingDeposit ? 'Đang xác nhận...' : 'XÁC NHẬN ĐÃ NHẬN CỌC'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Chỉnh Sửa Thông Tin Tư Vấn */}
      {editingConsultationBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(30, 20, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingConsultation) setEditingConsultationBooking(null);
          }}
        >
          <div
            className="mipa-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              borderRadius: '20px',
              backgroundColor: '#FFFDF9',
              boxShadow: '0 20px 50px rgba(44, 34, 30, 0.3)',
              border: '1px solid #E6D7B9',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  CHỈNH SỬA THÔNG TIN TƯ VẤN
                </div>
                <h3 style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.3rem', fontFamily: 'Playfair Display, serif' }}>
                  Đơn #{editingConsultationBooking.bookingCode}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingConsultation}
                onClick={() => setEditingConsultationBooking(null)}
                style={{
                  background: '#F3EDE2',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#604634',
                }}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {consultationError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', color: '#991B1B', fontSize: '0.85rem', marginBottom: '1rem' }}>
                ⚠️ {consultationError}
              </div>
            )}

            <form onSubmit={handleConsultationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Tổng giá trị chốt (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={consultationTotalInput}
                  onChange={(e) => setConsultationTotalInput(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className="mipa-input"
                  style={{ width: '100%', height: '42px', borderRadius: '10px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Ghi chú nội bộ studio / Trao đổi với khách
                </label>
                <textarea
                  rows={3}
                  value={consultationStaffNoteInput}
                  onChange={(e) => setConsultationStaffNoteInput(e.target.value)}
                  placeholder="Ghi chú về yêu cầu trang phục, phụ kiện, số lượng người tham gia..."
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isSubmittingConsultation}
                  onClick={() => setEditingConsultationBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsultation}
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  {isSubmittingConsultation ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
