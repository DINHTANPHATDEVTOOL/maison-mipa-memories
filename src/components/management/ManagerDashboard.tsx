// ==============================================================================
// Maison MIPA Memories - Studio Operations Dashboard (Manager OS)
// Hardened for Issue #7:
// - Operations Action Center prioritizing actionable tasks
// - Staff assignments (Photographer, Makeup, Editor)
// - Reschedule / Cancel requests review & approval
// - Google Drive delivery readiness toggle (#8 integration)
// - Protected operations search (no public PII exposure)
// ==============================================================================
import React, { useState, useEffect } from 'react';
import { FocusTrap } from '../ui/FocusTrap';
import type { Booking, BookingStatus, Employee, StudioRoom } from '../../types';
import { getOperationsInboxStats, getNextActionForBooking } from '../../utils/bookingStateMachine';
import {
  Calendar,
  Search,
  AlertTriangle,
  FolderDown,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { INITIAL_EMPLOYEES } from '../../mockData';
import { confirmBookingDeposit, updateBookingConsultation } from '../../services/bookingService';
import {
  determineShiftFromTime,
  SHIFT_CONFIGS,
  getStaffRegisteredShifts,
  assignStaffAndSendEmailNotification,
  type StaffShiftRegistrationRecord,
} from '../../services/staffSchedulingService';
import {
  checkInBooking,
  startBookingShoot,
  completeBookingShoot,
  syncBookingProofs,
  syncFinalAssets,
  bypassCustomerSelection,
  reopenPhotoSelection,
  completeBookingEditing,
  requestBookingRevision,
  approveAndDeliverFinals,
  completeBooking,
} from '../../services/photoWorkflowService';

interface ManagerDashboardProps {
  bookings: Booking[];
  employees: Employee[];
  studios: StudioRoom[];
  onOpenBooking: () => void;
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
  onAssignStaff: (bookingId: string, employeeId: string, role?: string) => void;
  onNavigateTab: (tab: string) => void;
  onConfirmDeposit?: (bookingId: string, depositAmount: number, depositNote?: string, finalTotalAmount?: number) => Promise<void>;
  onUpdateConsultation?: (bookingId: string, data: any) => Promise<void>;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  bookings,
  employees,
  studios: _studios,
  onOpenBooking,
  onUpdateStatus,
  onAssignStaff,
  onNavigateTab,
  onConfirmDeposit,
  onUpdateConsultation,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBookingTimeline, setActiveBookingTimeline] = useState<Booking | null>(bookings[0] || null);

  // Assign staff modal/popover state
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedStaffRole, setSelectedStaffRole] = useState<string>('PHOTOGRAPHER');
  const [registeredShifts, setRegisteredShifts] = useState<StaffShiftRegistrationRecord[]>([]);

  useEffect(() => {
    getStaffRegisteredShifts().then(setRegisteredShifts).catch(console.error);
  }, [assigningBooking]);

  // Manual Deposit Modal State
  const [depositModalBooking, setDepositModalBooking] = useState<Booking | null>(null);
  const [depositFinalTotalInput, setDepositFinalTotalInput] = useState<number>(0);
  const [depositAmountInput, setDepositAmountInput] = useState<number>(0);
  const [depositNoteInput, setDepositNoteInput] = useState<string>('');
  const [isConfirmingDeposit, setIsConfirmingDeposit] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string | null>(null);

  // Consultation Editor Modal State
  const [consultationModalBooking, setConsultationModalBooking] = useState<Booking | null>(null);
  const [consultationDateInput, setConsultationDateInput] = useState<string>('');
  const [consultationTimeInput, setConsultationTimeInput] = useState<string>('');
  const [consultationCustomerNoteInput, setConsultationCustomerNoteInput] = useState<string>('');
  const [consultationStaffNoteInput, setConsultationStaffNoteInput] = useState<string>('');
  const [isUpdatingConsultation, setIsUpdatingConsultation] = useState<boolean>(false);
  const [consultationError, setConsultationError] = useState<string | null>(null);

  // Workflow Modals State
  const [revisionModalBooking, setRevisionModalBooking] = useState<Booking | null>(null);
  const [revisionNotesInput, setRevisionNotesInput] = useState<string>('');

  const [reopenModalBooking, setReopenModalBooking] = useState<Booking | null>(null);
  const [reopenReasonInput, setReopenReasonInput] = useState<string>('');

  const [bypassModalBooking, setBypassModalBooking] = useState<Booking | null>(null);
  const [bypassReasonInput, setBypassReasonInput] = useState<string>('');

  const [workflowActionLoading, setWorkflowActionLoading] = useState<string | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState<string>('');
  const [workflowError, setWorkflowError] = useState<string>('');

  // Computed Operations Inbox stats
  const inboxStats = getOperationsInboxStats(bookings);

  const openDepositModal = (b: Booking) => {
    setDepositModalBooking(b);
    setDepositFinalTotalInput(b.totalAmount);
    setDepositAmountInput(b.depositAmount > 0 ? b.depositAmount : Math.round(b.totalAmount * 0.3));
    setDepositNoteInput(b.depositNote || 'Đã nhận cọc chuyển khoản ngân hàng');
    setDepositError(null);
  };

  const handleConfirmDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositModalBooking) return;
    if (depositAmountInput < 0) {
      setDepositError('Số tiền cọc không được nhỏ hơn 0.');
      return;
    }
    if (depositAmountInput > depositFinalTotalInput) {
      setDepositError('Số tiền cọc không được lớn hơn tổng giá trị đơn.');
      return;
    }

    setIsConfirmingDeposit(true);
    setDepositError(null);
    try {
      if (onConfirmDeposit) {
        await onConfirmDeposit(depositModalBooking.id, depositAmountInput, depositNoteInput, depositFinalTotalInput);
      } else {
        await confirmBookingDeposit(
          depositModalBooking.id,
          depositAmountInput,
          depositNoteInput,
          depositFinalTotalInput
        );
        onUpdateStatus(depositModalBooking.id, 'CONFIRMED', `Đã nhận cọc: ${depositAmountInput.toLocaleString('vi-VN')} đ`);
      }
      setDepositModalBooking(null);
    } catch (err: any) {
      setDepositError(err.message || 'Không thể xác nhận tiền cọc.');
    } finally {
      setIsConfirmingDeposit(false);
    }
  };

  const openConsultationModal = (b: Booking) => {
    setConsultationModalBooking(b);
    setConsultationDateInput(b.bookingDate);
    setConsultationTimeInput(b.startTime);
    setConsultationCustomerNoteInput(b.customerNote || '');
    setConsultationStaffNoteInput(b.staffNote || '');
    setConsultationError(null);
  };

  const handleUpdateConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consultationModalBooking) return;
    setIsUpdatingConsultation(true);
    setConsultationError(null);
    try {
      const startAtStr = consultationDateInput && consultationTimeInput ? `${consultationDateInput}T${consultationTimeInput}:00Z` : undefined;
      if (onUpdateConsultation) {
        await onUpdateConsultation(consultationModalBooking.id, {
          startAt: startAtStr,
          customerNote: consultationCustomerNoteInput,
          staffNote: consultationStaffNoteInput,
        });
      } else {
        await updateBookingConsultation(consultationModalBooking.id, {
          startAt: startAtStr,
          customerNote: consultationCustomerNoteInput,
          staffNote: consultationStaffNoteInput,
        });
        onUpdateStatus(consultationModalBooking.id, 'CONSULTING', 'Đã cập nhật thông tin tư vấn');
      }
      setConsultationModalBooking(null);
    } catch (err: any) {
      setConsultationError(err.message || 'Không thể cập nhật thông tin tư vấn.');
    } finally {
      setIsUpdatingConsultation(false);
    }
  };

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

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningBooking || !selectedEmployeeId) return;
    const availableEmployees = employees.length > 0 ? employees : INITIAL_EMPLOYEES;
    const assignedEmp = availableEmployees.find(emp => emp.id === selectedEmployeeId);

    onAssignStaff(assigningBooking.id, selectedEmployeeId, selectedStaffRole);

    try {
      await assignStaffAndSendEmailNotification({
        bookingId: assigningBooking.id,
        employeeId: selectedEmployeeId,
        role: selectedStaffRole as any,
        bookingDetails: {
          bookingCode: assigningBooking.bookingCode,
          customerName: assigningBooking.customerName,
          customerPhone: assigningBooking.customerPhone,
          shootDate: assigningBooking.bookingDate,
          shootTime: assigningBooking.startTime,
          packageName: assigningBooking.packageName,
          serviceName: assigningBooking.serviceName,
          studioName: assigningBooking.studioName,
          notes: assigningBooking.customerNote,
        },
      });
    } catch (err) {
      console.warn('Could not dispatch staff email notification:', err);
    }

    setWorkflowNotice(`✓ Đã phân công ${assignedEmp?.name || 'nhân sự'} và tự động gửi email thông báo buổi chụp!`);
    setAssigningBooking(null);
    setSelectedEmployeeId('');
    setTimeout(() => setWorkflowNotice(''), 4500);
  };

  const handleCheckIn = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      await checkInBooking(b.id);
      onUpdateStatus(b.id, 'CHECKED_IN', 'Đã xác nhận khách check-in');
      setWorkflowNotice(`✓ Khách ${b.customerName} đã check-in thành công.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể check-in.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleStartShoot = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      await startBookingShoot(b.id);
      onUpdateStatus(b.id, 'SHOOTING', 'Bắt đầu chụp tại studio');
      setWorkflowNotice(`✓ Đã bắt đầu ca chụp cho đơn ${b.bookingCode}.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể bắt đầu ca chụp.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleCompleteShoot = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      await completeBookingShoot(b.id);
      onUpdateStatus(b.id, 'SHOOT_COMPLETED', 'Buổi chụp hoàn tất');
      setWorkflowNotice(`✓ Buổi chụp ${b.bookingCode} đã hoàn tất. Vui lòng tải ảnh lên Drive và đồng bộ.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể hoàn tất buổi chụp.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleSyncProofs = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      const res = await syncBookingProofs(b.id);
      onUpdateStatus(b.id, 'AWAITING_SELECTION', `Đồng bộ ${res.proofFileCount} ảnh proof thành công`);
      setWorkflowNotice(`✓ Đã đồng bộ ${res.proofFileCount} ảnh proof vào hệ thống cho khách chọn.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể đồng bộ ảnh proof.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleSyncFinal = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      const res = await syncFinalAssets(b.id);
      setWorkflowNotice(`✓ Đã đồng bộ ${res.finalFileCount} ảnh final từ Google Drive.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể đồng bộ ảnh final.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleCompleteEditing = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      await completeBookingEditing(b.id);
      onUpdateStatus(b.id, 'READY_FOR_REVIEW', 'Hoàn tất hậu kỳ, sẵn sàng duyệt');
      setWorkflowNotice(`✓ Đã chuyển đơn ${b.bookingCode} sang trạng thái chờ duyệt.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể hoàn tất hậu kỳ.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleApproveDelivery = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      await approveAndDeliverFinals(b.id);
      onUpdateStatus(b.id, 'DELIVERED', 'Đã duyệt và mở quyền Drive cho khách hàng');
      setWorkflowNotice(`✓ Đã duyệt và giao ảnh thành công cho khách hàng ${b.customerName}!`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể giao ảnh.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleCompleteOrder = async (b: Booking) => {
    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      await completeBooking(b.id);
      onUpdateStatus(b.id, 'COMPLETED', 'Đơn đặt lịch hoàn tất thành công');
      setWorkflowNotice(`✓ Đơn đặt lịch ${b.bookingCode} đã hoàn tất.`);
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể hoàn tất đơn.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleRequestRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionModalBooking || !revisionNotesInput.trim()) return;
    try {
      setWorkflowActionLoading(revisionModalBooking.id);
      await requestBookingRevision(revisionModalBooking.id, revisionNotesInput.trim());
      onUpdateStatus(revisionModalBooking.id, 'EDITING', `Yêu cầu chỉnh sửa: ${revisionNotesInput.trim()}`);
      setRevisionModalBooking(null);
      setRevisionNotesInput('');
      setWorkflowNotice('✓ Đã gửi yêu cầu chỉnh sửa cho bộ phận hậu kỳ.');
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể gửi yêu cầu chỉnh sửa.');
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleReopenSelectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopenModalBooking || !reopenReasonInput.trim()) return;
    try {
      setWorkflowActionLoading(reopenModalBooking.id);
      await reopenPhotoSelection(reopenModalBooking.id, reopenReasonInput.trim());
      onUpdateStatus(reopenModalBooking.id, 'AWAITING_SELECTION', `Mở lại chọn ảnh: ${reopenReasonInput.trim()}`);
      setReopenModalBooking(null);
      setReopenReasonInput('');
      setWorkflowNotice('✓ Đã mở lại khâu chọn ảnh cho khách hàng.');
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể mở lại khâu chọn ảnh.');
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleBypassSelectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bypassModalBooking || !bypassReasonInput.trim()) return;
    try {
      setWorkflowActionLoading(bypassModalBooking.id);
      await bypassCustomerSelection(bypassModalBooking.id, bypassReasonInput.trim());
      onUpdateStatus(bypassModalBooking.id, 'EDITING', `Không cần khách chọn ảnh: ${bypassReasonInput.trim()}`);
      setBypassModalBooking(null);
      setBypassReasonInput('');
      setWorkflowNotice('✓ Đã chuyển thẳng vào khâu hậu kỳ.');
      setTimeout(() => setWorkflowNotice(''), 4000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể bỏ qua chọn ảnh.');
    } finally {
      setWorkflowActionLoading(null);
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

      {workflowNotice && (
        <div style={{
          padding: '0.8rem 1.2rem',
          backgroundColor: '#ECFDF5',
          border: '1px solid #6EE7B7',
          borderRadius: '12px',
          color: '#065F46',
          fontWeight: 600,
          fontSize: '0.88rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <Check size={18} /> {workflowNotice}
        </div>
      )}

      {workflowError && (
        <div style={{
          padding: '0.8rem 1.2rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          color: '#991B1B',
          fontWeight: 600,
          fontSize: '0.88rem',
          marginBottom: '1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          <AlertTriangle size={18} /> {workflowError}
        </div>
      )}

      {/* OPERATIONS INBOX BANNER - 9 Operational Queues (Phase 18) */}
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
            <span>HÀNG ĐỢI VẬN HÀNH STUDIO (OPERATIONS PIPELINE):</span>
          </div>
          <span style={{ fontSize: '0.78rem', backgroundColor: '#F8F3E6', color: '#8C6E53', padding: '0.2rem 0.6rem', borderRadius: '10px', fontWeight: 700, border: '1px solid #E6D7B9' }}>
            9 Hàng đợi theo chuẩn Shoot-to-Delivery
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.6rem' }}>
          {[
            { id: 'CONFIRMED', label: '1. SẮP CHỤP', count: inboxStats.confirmedCount, unit: 'đơn' },
            { id: 'CHECKED_IN', label: '2. ĐÃ CHECK-IN', count: inboxStats.checkedInCount, unit: 'ca' },
            { id: 'SHOOTING', label: '3. ĐANG CHỤP', count: inboxStats.shootingCount, unit: 'ca' },
            { id: 'SHOOT_COMPLETED', label: '4. CHỜ SYNC ẢNH', count: inboxStats.shootCompletedCount, unit: 'đơn' },
            { id: 'AWAITING_SELECTION', label: '5. KHÁCH CHỌN ẢNH', count: inboxStats.awaitingSelectionCount, unit: 'đơn' },
            { id: 'EDITING', label: '6. ĐANG HẬU KỲ', count: inboxStats.editingCount, unit: 'bộ' },
            { id: 'READY_FOR_REVIEW', label: '7. CHỜ DUYỆT', count: inboxStats.readyForReviewCount, unit: 'bộ' },
            { id: 'DELIVERED', label: '8. ĐÃ GIAO', count: inboxStats.deliveredCount, unit: 'đơn' },
            { id: 'COMPLETED', label: '9. HOÀN TẤT', count: inboxStats.completedCount, unit: 'đơn' },
          ].map((queue) => (
            <button
              key={queue.id}
              onClick={() => setSelectedStatusFilter(queue.id)}
              style={{
                padding: '0.65rem 0.75rem',
                borderRadius: '12px',
                backgroundColor: selectedStatusFilter === queue.id ? '#FAF6EE' : '#FFFFFF',
                border: selectedStatusFilter === queue.id ? '1.5px solid #8C6E53' : '1px solid #EFE6C9',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '0.68rem', color: '#8C6E53', fontWeight: 700 }}>{queue.label}</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#604634', marginTop: '0.1rem' }}>
                {queue.count} {queue.unit}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Section: Schedule & Booking Control Pipeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '1.5rem' }}>

        {/* Left Column: Bookings Table / List */}
        <div className="mipa-card" style={{ padding: '1.5rem', borderRadius: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            {/* Protected In-Portal Search */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
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
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'CONFIRMED', label: 'Sắp chụp' },
                { id: 'CHECKED_IN', label: 'Đã check-in' },
                { id: 'SHOOTING', label: 'Đang chụp' },
                { id: 'SHOOT_COMPLETED', label: 'Chờ sync ảnh' },
                { id: 'AWAITING_SELECTION', label: 'Khách chọn' },
                { id: 'EDITING', label: 'Đang hậu kỳ' },
                { id: 'READY_FOR_REVIEW', label: 'Chờ duyệt' },
                { id: 'DELIVERED', label: 'Đã giao' },
                { id: 'COMPLETED', label: 'Hoàn tất' },
                { id: 'CONSULTATION_REQUESTED', label: 'Tư vấn mới' },
                { id: 'CONSULTING', label: 'Đang tư vấn' },
              ].map((filterItem) => (
                <button
                  key={filterItem.id}
                  onClick={() => setSelectedStatusFilter(filterItem.id)}
                  style={{
                    border: '1px solid',
                    borderColor: selectedStatusFilter === filterItem.id ? '#8C6E53' : '#EFE6C9',
                    background: selectedStatusFilter === filterItem.id ? 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)' : '#FFFDF6',
                    color: selectedStatusFilter === filterItem.id ? '#FFFDF6' : '#604634',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '16px',
                    fontSize: '0.73rem',
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
                          ● {b.bookingStatus}
                        </span>
                        {(() => {
                          const todayVn = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
                          const isOverdue = Boolean(b.bookingDate && b.bookingDate < todayVn && ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'SHOOTING'].includes(b.bookingStatus));
                          if (!isOverdue) return null;
                          return (
                            <span
                              style={{
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FCA5A5',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.2rem',
                              }}
                            >
                              ⚠️ QUÁ HẠN
                            </span>
                          );
                        })()}
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
                        <div style={{ fontSize: '0.75rem', color: (b.depositAmount > 0 || b.depositConfirmedAt || b.paymentStatus === 'DEPOSIT_PAID' || b.paymentStatus === 'FULLY_PAID') ? '#047857' : '#D97706', fontWeight: 600 }}>
                          {b.depositAmount > 0 || b.depositConfirmedAt
                            ? `Cọc: ${b.depositAmount.toLocaleString('vi-VN')} đ`
                            : b.bookingStatus === 'CONSULTATION_REQUESTED'
                            ? 'Chờ tư vấn'
                            : b.bookingStatus === 'CONSULTING'
                            ? 'Chờ chốt cọc'
                            : `Cọc: ${b.depositAmount.toLocaleString('vi-VN')} đ`}
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

                        {(b.bookingStatus === 'CONSULTATION_REQUESTED' || b.bookingStatus === 'CONSULTING') && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openConsultationModal(b);
                              }}
                              className="btn-mipa-secondary"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            >
                              ✏️ Tư Vấn
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDepositModal(b);
                              }}
                              className="btn-mipa-gold"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            >
                              💵 Nhận Cọc
                            </button>
                          </>
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
                      href={
                        (activeBookingTimeline.driveFolderUrl && activeBookingTimeline.driveFolderUrl !== 'https://drive.google.com' && activeBookingTimeline.driveFolderUrl !== 'https://drive.google.com/')
                          ? activeBookingTimeline.driveFolderUrl
                          : `https://drive.google.com/drive/search?q=${encodeURIComponent(activeBookingTimeline.bookingCode)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#047857', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                    >
                      <FolderDown size={15} /> Thư mục Drive bàn giao ảnh ({activeBookingTimeline.bookingCode})
                    </a>
                  </div>
                </div>

                <div style={{ marginTop: '0.5rem', borderTop: '1px solid #EFE6C9', paddingTop: '0.8rem' }}>
                  <div style={{ fontWeight: 700, color: '#604634', marginBottom: '0.4rem' }}>Hành động vận hành:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {activeBookingTimeline.bookingStatus === 'CONSULTATION_REQUESTED' && (
                      <button
                        onClick={() => onUpdateStatus(activeBookingTimeline.id, 'CONSULTING', 'Bắt đầu tư vấn')}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                      >
                        📞 Bắt Đầu Tư Vấn
                      </button>
                    )}

                    {(activeBookingTimeline.bookingStatus === 'CONSULTATION_REQUESTED' || activeBookingTimeline.bookingStatus === 'CONSULTING' || activeBookingTimeline.bookingStatus === 'PENDING_PAYMENT') && (
                      <>
                        <button
                          onClick={() => openDepositModal(activeBookingTimeline)}
                          className="btn-mipa-gold"
                          style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%', backgroundColor: '#047857', color: '#FFFFFF' }}
                        >
                          ✓ XÁC NHẬN ĐÃ NHẬN CỌC
                        </button>
                        <button
                          onClick={() => openConsultationModal(activeBookingTimeline)}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.82rem', padding: '0.5rem', width: '100%' }}
                        >
                          ✏️ Tư Vấn & Chỉnh Sửa Đơn
                        </button>
                      </>
                    )}

                    {activeBookingTimeline.bookingStatus === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCheckIn(activeBookingTimeline)}
                        disabled={workflowActionLoading === activeBookingTimeline.id}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700 }}
                      >
                        📌 CHECK-IN KHÁCH
                      </button>
                    )}

                    {activeBookingTimeline.bookingStatus === 'CHECKED_IN' && (
                      <button
                        onClick={() => handleStartShoot(activeBookingTimeline)}
                        disabled={workflowActionLoading === activeBookingTimeline.id}
                        className="btn-mipa-gold"
                        style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700 }}
                      >
                        📷 BẮT ĐẦU BUỔI CHỤP
                      </button>
                    )}

                    {activeBookingTimeline.bookingStatus === 'SHOOTING' && (
                      <button
                        onClick={() => handleCompleteShoot(activeBookingTimeline)}
                        disabled={workflowActionLoading === activeBookingTimeline.id}
                        className="btn-mipa-primary"
                        style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700 }}
                      >
                        ✅ HOÀN TẤT BUỔI CHỤP
                      </button>
                    )}

                    {activeBookingTimeline.bookingStatus === 'SHOOT_COMPLETED' && (
                      <>
                        <button
                          onClick={() => handleSyncProofs(activeBookingTimeline)}
                          disabled={workflowActionLoading === activeBookingTimeline.id}
                          className="btn-mipa-gold"
                          style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700 }}
                        >
                          📤 ĐỒNG BỘ ẢNH PROOFS (DRIVE)
                        </button>
                        <button
                          onClick={() => {
                            setBypassModalBooking(activeBookingTimeline);
                            setBypassReasonInput('Gói dịch vụ không yêu cầu khách chọn ảnh hoặc quản lý duyệt nhanh');
                          }}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.45rem', width: '100%' }}
                        >
                          ⏩ Bỏ Qua Khâu Chọn Ảnh
                        </button>
                      </>
                    )}

                    {activeBookingTimeline.bookingStatus === 'AWAITING_SELECTION' && (
                      <>
                        <div style={{ padding: '0.5rem', backgroundColor: '#FFFBEB', borderRadius: '8px', fontSize: '0.78rem', color: '#92400E' }}>
                          Khách đang chọn ảnh (Giới hạn: {activeBookingTimeline.selectionLimit || 10} ảnh)
                        </div>
                        <button
                          onClick={() => {
                            setBypassModalBooking(activeBookingTimeline);
                            setBypassReasonInput('Khách nhờ studio chọn thay hoặc duyệt trực tiếp');
                          }}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.45rem', width: '100%' }}
                        >
                          ⏩ Bỏ Qua Chọn Ảnh (Vào Hậu Kỳ)
                        </button>
                      </>
                    )}

                    {activeBookingTimeline.bookingStatus === 'EDITING' && (
                      <>
                        <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                          Ảnh final hiện có: <strong>{activeBookingTimeline.finalFileCount || 0}</strong>
                        </div>
                        <button
                          onClick={() => handleSyncFinal(activeBookingTimeline)}
                          disabled={workflowActionLoading === activeBookingTimeline.id}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.82rem', padding: '0.45rem', width: '100%' }}
                        >
                          📤 Đồng Bộ Ảnh Final (03_FINAL)
                        </button>
                        <button
                          onClick={() => handleCompleteEditing(activeBookingTimeline)}
                          disabled={workflowActionLoading === activeBookingTimeline.id}
                          className="btn-mipa-gold"
                          style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700 }}
                        >
                          ✨ HOÀN TẤT HẬU KỲ (SẴN SÀNG DUYỆT)
                        </button>
                        <button
                          onClick={() => {
                            setReopenModalBooking(activeBookingTimeline);
                            setReopenReasonInput('');
                          }}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.78rem', padding: '0.4rem', width: '100%', color: '#8C6E53' }}
                        >
                          🔄 Mở Lại Khâu Chọn Ảnh
                        </button>
                      </>
                    )}

                    {activeBookingTimeline.bookingStatus === 'READY_FOR_REVIEW' && (
                      <>
                        <div style={{ fontSize: '0.8rem', color: '#6E5F55' }}>
                          Số lượng file final: <strong>{activeBookingTimeline.finalFileCount || 0}</strong>
                        </div>
                        <button
                          onClick={() => handleApproveDelivery(activeBookingTimeline)}
                          disabled={workflowActionLoading === activeBookingTimeline.id}
                          className="btn-mipa-gold"
                          style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700, backgroundColor: '#047857' }}
                        >
                          📩 DUYỆT & GIAO ẢNH CHO KHÁCH
                        </button>
                        <button
                          onClick={() => {
                            setRevisionModalBooking(activeBookingTimeline);
                            setRevisionNotesInput('');
                          }}
                          className="btn-mipa-secondary"
                          style={{ fontSize: '0.8rem', padding: '0.45rem', width: '100%', color: '#DC2626', borderColor: '#FCA5A5' }}
                        >
                          ↩️ Yêu Cầu Chỉnh Sửa Lại
                        </button>
                      </>
                    )}

                    {activeBookingTimeline.bookingStatus === 'DELIVERED' && (
                      <button
                        onClick={() => handleCompleteOrder(activeBookingTimeline)}
                        disabled={workflowActionLoading === activeBookingTimeline.id}
                        className="btn-mipa-primary"
                        style={{ fontSize: '0.85rem', padding: '0.55rem', width: '100%', fontWeight: 700 }}
                      >
                        🏁 HOÀN TẤT ĐƠN ĐẶT LỊCH
                      </button>
                    )}

                    {activeBookingTimeline.bookingStatus === 'COMPLETED' && (
                      <div style={{ padding: '0.5rem', backgroundColor: '#ECFDF5', color: '#065F46', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, textAlign: 'center' }}>
                        ✓ Đơn đặt lịch đã hoàn tất trọn vẹn
                      </div>
                    )}
                  </div>
                </div>

                {/* Detailed 12-Step Operational Timeline (Phase 18) */}
                <div style={{ marginTop: '1rem', borderTop: '1px solid #EFE6C9', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8C6E53', marginBottom: '0.6rem' }}>
                    TIẾN TRÌNH CHI TIẾT (TIMELINE):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.78rem' }}>
                    {[
                      { label: '1. Yêu cầu tư vấn', isDone: true, time: activeBookingTimeline.createdAt },
                      { label: '2. Đang tư vấn', isDone: activeBookingTimeline.bookingStatus !== 'CONSULTATION_REQUESTED', time: undefined },
                      { label: '3. Đã nhận cọc', isDone: ['CONFIRMED', 'CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: activeBookingTimeline.depositConfirmedAt },
                      { label: '4. Đã check-in', isDone: ['CHECKED_IN', 'SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '5. Bắt đầu chụp', isDone: ['SHOOTING', 'SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '6. Hoàn tất buổi chụp', isDone: ['SHOOT_COMPLETED', 'AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '7. Mở chọn ảnh', isDone: ['AWAITING_SELECTION', 'EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '8. Khách gửi ảnh chọn', isDone: ['EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: activeBookingTimeline.selectionSubmittedAt },
                      { label: '9. Đang hậu kỳ', isDone: ['EDITING', 'READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '10. Chờ duyệt ảnh', isDone: ['READY_FOR_REVIEW', 'DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '11. Đã giao ảnh', isDone: ['DELIVERED', 'COMPLETED'].includes(activeBookingTimeline.bookingStatus), time: undefined },
                      { label: '12. Hoàn tất đơn', isDone: activeBookingTimeline.bookingStatus === 'COMPLETED', time: undefined },
                    ].map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: step.isDone ? '#047857' : '#A39385' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Check size={13} color={step.isDone ? '#047857' : '#A39385'} />
                          <span style={{ fontWeight: step.isDone ? 600 : 400 }}>{step.label}</span>
                        </div>
                        {step.time && (
                          <span style={{ fontSize: '0.7rem', color: '#6E5F55' }}>
                            {new Date(step.time).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                    ))}
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
        const bookingDate = assigningBooking.bookingDate;
        const bookingTime = assigningBooking.startTime;
        const shiftType = determineShiftFromTime(bookingTime);
        const shiftConfig = SHIFT_CONFIGS[shiftType];

        // Find employees who registered for this shift on this date
        const registeredIds = new Set(
          registeredShifts
            .filter(s => s.shiftDate === bookingDate && s.shiftType === shiftType)
            .map(s => s.employeeId)
        );

        const matchingRoleEmployees = availableEmployees.filter(e => e.role === selectedStaffRole);
        const registeredForShift = matchingRoleEmployees.filter(e => registeredIds.has(e.id));
        const notRegisteredForShift = matchingRoleEmployees.filter(e => !registeredIds.has(e.id));
        const otherRoleEmployees = availableEmployees.filter(e => e.role !== selectedStaffRole);

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
            <FocusTrap
              onEscape={() => setAssigningBooking(null)}
              aria-labelledby="assign-staff-modal-title"
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
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    ĐIỀU PHỐI NHÂN SỰ STUDIO
                  </div>
                  <h3 id="assign-staff-modal-title" style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.25rem', fontFamily: 'Playfair Display, serif' }}>
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
                <div>
                  <strong style={{ color: '#43281C' }}>Ca làm việc:</strong>{' '}
                  <span style={{ color: shiftType === 'MORNING' ? '#B45309' : '#C2410C', fontWeight: 700 }}>
                    ☀️ {shiftConfig.name} ({shiftConfig.timeRange})
                  </span>
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
                    Chọn nhân viên điều phối
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
                    {matchingRoleEmployees.length > 0 && (
                      <optgroup label={`⭐ Đúng chuyên môn (${selectedStaffRole})`}>
                        {matchingRoleEmployees.map(emp => {
                          const isRegistered = registeredIds.has(emp.id);
                          return (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} — {emp.role || 'Chuyên viên'}{isRegistered ? ` [🟢 Đã Đăng Ký ${shiftConfig.name.toUpperCase()}]` : ` [Chưa đăng ký ${shiftConfig.name}]`} {emp.phone ? `• ${emp.phone}` : ''}
                            </option>
                          );
                        })}
                      </optgroup>
                    )}
                    {otherRoleEmployees.length > 0 && (
                      <optgroup label="👥 Nhân sự studio khác (sẵn sàng điều phối)">
                        {otherRoleEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} — {emp.role || 'Staff'} {emp.phone ? `• ${emp.phone}` : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginTop: '0.4rem', lineHeight: 1.4, backgroundColor: '#FFFDF6', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #EFE6C9' }}>
                    ✉️ <strong>Hệ thống tự động:</strong> Khi chọn nhân viên, hệ thống sẽ gửi email thông báo chi tiết và tự động đồng bộ lịch chụp vào trang cá nhân của thợ/makeup.
                  </div>
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
                    Lưu Phân Công &amp; Gửi Email
                  </button>
                </div>
              </form>
            </FocusTrap>
          </div>
        );
      })()}

      {/* Manual Deposit Modal */}
      {depositModalBooking && (
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
            if (e.target === e.currentTarget && !isConfirmingDeposit) setDepositModalBooking(null);
          }}
        >
          <FocusTrap
            onEscape={() => !isConfirmingDeposit && setDepositModalBooking(null)}
            aria-labelledby="deposit-modal-title"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  XÁC NHẬN ĐÃ NHẬN CỌC
                </div>
                <h3 id="deposit-modal-title" style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.25rem', fontFamily: 'Playfair Display, serif' }}>
                  #{depositModalBooking.bookingCode} — {depositModalBooking.customerName}
                </h3>
              </div>
              <button
                type="button"
                disabled={isConfirmingDeposit}
                onClick={() => setDepositModalBooking(null)}
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

            {depositError && (
              <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '0.82rem', marginBottom: '1rem' }}>
                ⚠️ {depositError}
              </div>
            )}

            <form onSubmit={handleConfirmDepositSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Tổng giá trị đã chốt (VNĐ) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  disabled={isConfirmingDeposit}
                  value={depositFinalTotalInput}
                  onChange={(e) => setDepositFinalTotalInput(Number(e.target.value) || 0)}
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Số tiền cọc đã nhận (VNĐ) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  max={depositFinalTotalInput}
                  disabled={isConfirmingDeposit}
                  value={depositAmountInput}
                  onChange={(e) => setDepositAmountInput(Number(e.target.value) || 0)}
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              {/* Calculated Remaining Balance Display */}
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: '#FAF7F2',
                borderRadius: '10px',
                border: '1px solid #EAE0D0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.9rem',
              }}>
                <span style={{ color: '#6E5F55', fontWeight: 600 }}>Còn lại thanh toán tại studio:</span>
                <strong style={{ color: '#047857', fontSize: '1.1rem' }}>
                  {Math.max(depositFinalTotalInput - depositAmountInput, 0).toLocaleString('vi-VN')} đ
                </strong>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Ghi chú cọc
                </label>
                <textarea
                  rows={2}
                  disabled={isConfirmingDeposit}
                  value={depositNoteInput}
                  onChange={(e) => setDepositNoteInput(e.target.value)}
                  placeholder="Ghi rõ phương thức nhận (VCB, MoMo, Tiền mặt...) và mã giao dịch nếu có"
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isConfirmingDeposit}
                  onClick={() => setDepositModalBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isConfirmingDeposit || depositAmountInput < 0 || depositAmountInput > depositFinalTotalInput}
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  {isConfirmingDeposit ? 'Đang xác nhận...' : 'XÁC NHẬN ĐÃ NHẬN CỌC'}
                </button>
              </div>
            </form>
          </FocusTrap>
        </div>
      )}

      {/* Consultation Editor Modal */}
      {consultationModalBooking && (
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
            if (e.target === e.currentTarget && !isUpdatingConsultation) setConsultationModalBooking(null);
          }}
        >
          <FocusTrap
            onEscape={() => !isUpdatingConsultation && setConsultationModalBooking(null)}
            aria-labelledby="consultation-modal-title"
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
                  TƯ VẤN & CHỐT ĐƠN CHỤP
                </div>
                <h3 id="consultation-modal-title" style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.25rem', fontFamily: 'Playfair Display, serif' }}>
                  #{consultationModalBooking.bookingCode} — {consultationModalBooking.customerName}
                </h3>
              </div>
              <button
                type="button"
                disabled={isUpdatingConsultation}
                onClick={() => setConsultationModalBooking(null)}
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
              <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#991B1B', fontSize: '0.82rem', marginBottom: '1rem' }}>
                ⚠️ {consultationError}
              </div>
            )}

            <form onSubmit={handleUpdateConsultationSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                    Ngày chụp chốt *
                  </label>
                  <input
                    type="date"
                    required
                    disabled={isUpdatingConsultation}
                    value={consultationDateInput}
                    onChange={(e) => setConsultationDateInput(e.target.value)}
                    className="mipa-input"
                    style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                    Giờ bắt đầu *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isUpdatingConsultation}
                    value={consultationTimeInput}
                    onChange={(e) => setConsultationTimeInput(e.target.value)}
                    placeholder="09:00"
                    className="mipa-input"
                    style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Ghi chú của khách hàng
                </label>
                <textarea
                  rows={2}
                  disabled={isUpdatingConsultation}
                  value={consultationCustomerNoteInput}
                  onChange={(e) => setConsultationCustomerNoteInput(e.target.value)}
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Ghi chú nội bộ studio (Staff Notes)
                </label>
                <textarea
                  rows={2}
                  disabled={isUpdatingConsultation}
                  value={consultationStaffNoteInput}
                  onChange={(e) => setConsultationStaffNoteInput(e.target.value)}
                  placeholder="Yêu cầu makeup đặc biệt, tone ánh sáng, đạo cụ cần chuẩn bị..."
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isUpdatingConsultation}
                  onClick={() => setConsultationModalBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingConsultation}
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  {isUpdatingConsultation ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </FocusTrap>
        </div>
      )}

      {/* Revision Request Modal (Phase 13) */}
      {revisionModalBooking && (
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
            if (e.target === e.currentTarget && !workflowActionLoading) setRevisionModalBooking(null);
          }}
        >
          <FocusTrap
            onEscape={() => !workflowActionLoading && setRevisionModalBooking(null)}
            aria-labelledby="revision-modal-title"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  YÊU CẦU CHỈNH SỬA LẠI (REVISION)
                </div>
                <h3 id="revision-modal-title" style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Playfair Display, serif' }}>
                  #{revisionModalBooking.bookingCode} — {revisionModalBooking.customerName}
                </h3>
              </div>
              <button
                type="button"
                disabled={Boolean(workflowActionLoading)}
                onClick={() => setRevisionModalBooking(null)}
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

            <form onSubmit={handleRequestRevisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Ghi chú yêu cầu chỉnh sửa cho Editor *
                </label>
                <textarea
                  rows={4}
                  required
                  disabled={Boolean(workflowActionLoading)}
                  value={revisionNotesInput}
                  onChange={(e) => setRevisionNotesInput(e.target.value)}
                  placeholder="Ghi rõ ảnh nào cần chỉnh lại (màu sắc, da, dáng, ánh sáng...)"
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={Boolean(workflowActionLoading)}
                  onClick={() => setRevisionModalBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={Boolean(workflowActionLoading) || !revisionNotesInput.trim()}
                  className="btn-mipa-primary"
                  style={{ flex: 1, padding: '0.75rem', backgroundColor: '#DC2626', color: '#FFF' }}
                >
                  {workflowActionLoading ? 'Đang gửi yêu cầu...' : 'GỬI YÊU CẦU CHỈNH SỬA'}
                </button>
              </div>
            </form>
          </FocusTrap>
        </div>
      )}

      {/* Reopen Selection Modal (Phase 10) */}
      {reopenModalBooking && (
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
            if (e.target === e.currentTarget && !workflowActionLoading) setReopenModalBooking(null);
          }}
        >
          <FocusTrap
            onEscape={() => !workflowActionLoading && setReopenModalBooking(null)}
            aria-labelledby="reopen-modal-title"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  MỞ LẠI KHÂU CHỌN ẢNH (CHO KHÁCH)
                </div>
                <h3 id="reopen-modal-title" style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Playfair Display, serif' }}>
                  #{reopenModalBooking.bookingCode} — {reopenModalBooking.customerName}
                </h3>
              </div>
              <button
                type="button"
                disabled={Boolean(workflowActionLoading)}
                onClick={() => setReopenModalBooking(null)}
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

            <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.8rem', color: '#92400E', marginBottom: '1rem' }}>
              ℹ️ Hệ thống sẽ chuyển trạng thái về <strong>AWAITING_SELECTION</strong> và giữ lại danh sách ảnh khách đã chọn trước đó làm bản nháp để khách tiện đổi ý.
            </div>

            <form onSubmit={handleReopenSelectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Lý do mở lại khâu chọn ảnh *
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={Boolean(workflowActionLoading)}
                  value={reopenReasonInput}
                  onChange={(e) => setReopenReasonInput(e.target.value)}
                  placeholder="Khách yêu cầu đổi ảnh chọn, thêm ảnh..."
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={Boolean(workflowActionLoading)}
                  onClick={() => setReopenModalBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={Boolean(workflowActionLoading) || !reopenReasonInput.trim()}
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  {workflowActionLoading ? 'Đang mở lại...' : 'XÁC NHẬN MỞ LẠI'}
                </button>
              </div>
            </form>
          </FocusTrap>
        </div>
      )}

      {/* Bypass Selection Modal (Phase 2) */}
      {bypassModalBooking && (
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
            if (e.target === e.currentTarget && !workflowActionLoading) setBypassModalBooking(null);
          }}
        >
          <FocusTrap
            onEscape={() => !workflowActionLoading && setBypassModalBooking(null)}
            aria-labelledby="bypass-modal-title"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8C6E53', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  BỎ QUA KHÂU KHÁCH CHỌN ẢNH
                </div>
                <h3 id="bypass-modal-title" style={{ margin: '0.2rem 0 0 0', color: '#604634', fontSize: '1.2rem', fontFamily: 'Playfair Display, serif' }}>
                  #{bypassModalBooking.bookingCode} — {bypassModalBooking.customerName}
                </h3>
              </div>
              <button
                type="button"
                disabled={Boolean(workflowActionLoading)}
                onClick={() => setBypassModalBooking(null)}
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

            <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.8rem', color: '#92400E', marginBottom: '1rem' }}>
              ℹ️ Thao tác này sẽ chuyển đơn trực tiếp sang trạng thái <strong>EDITING</strong> (Đang hậu kỳ) mà không cần khách chọn ảnh qua cổng portal.
            </div>

            <form onSubmit={handleBypassSelectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#604634', marginBottom: '0.35rem' }}>
                  Lý do bỏ qua chọn ảnh *
                </label>
                <textarea
                  rows={3}
                  required
                  disabled={Boolean(workflowActionLoading)}
                  value={bypassReasonInput}
                  onChange={(e) => setBypassReasonInput(e.target.value)}
                  placeholder="Gói không cần chọn ảnh / Studio tự chọn / Khách chốt qua Zalo..."
                  className="mipa-input"
                  style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.6rem 0.8rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={Boolean(workflowActionLoading)}
                  onClick={() => setBypassModalBooking(null)}
                  className="btn-mipa-secondary"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={Boolean(workflowActionLoading) || !bypassReasonInput.trim()}
                  className="btn-mipa-gold"
                  style={{ flex: 1, padding: '0.75rem' }}
                >
                  {workflowActionLoading ? 'Đang xử lý...' : 'XÁC NHẬN VÀO HẬU KỲ'}
                </button>
              </div>
            </form>
          </FocusTrap>
        </div>
      )}

    </div>
  );
};
