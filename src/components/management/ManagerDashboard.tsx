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
  Search,
  AlertTriangle,
  AlertCircle,
  FolderDown,
  Plus,
  X,
  Check,
} from 'lucide-react';
import { INITIAL_EMPLOYEES } from '../../mockData';
import { isSupabaseConfigured, isDemoModeEnabled } from '../../lib/supabase';
import { confirmBookingDeposit, updateBookingConsultation, rejectBookingCancel, cancelBookingByManager, approveBookingReschedule } from '../../services/bookingService';
import {
  determineShiftFromTime,
  SHIFT_CONFIGS,
  getStaffRegisteredShifts,
  assignBookingStaffAndNotify,
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
  targetBookingCode?: string | null;
  targetBookingId?: string | null;
  onOpenBooking: () => void;
  onUpdateStatus: (bookingId: string, newStatus: BookingStatus, note?: string) => void;
  onAssignStaff: (bookingId: string, employeeId: string, role?: string) => void;
  onNavigateTab?: (tab: string) => void;
  onConfirmDeposit?: (bookingId: string, depositAmount: number, depositNote?: string, finalTotalAmount?: number) => Promise<void>;
  onUpdateConsultation?: (bookingId: string, data: any) => Promise<void>;
  onUpdateBooking?: (updated: Booking) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  bookings,
  employees,
  studios: _studios,
  targetBookingCode,
  targetBookingId,
  onOpenBooking,
  onUpdateStatus,
  onAssignStaff,
  onNavigateTab,
  onConfirmDeposit,
  onUpdateConsultation,
  onUpdateBooking,
}) => {
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeBookingTimeline, setActiveBookingTimeline] = useState<Booking | null>(bookings[0] || null);

  useEffect(() => {
    if (targetBookingCode || targetBookingId) {
      const matched = bookings.find(b =>
        (targetBookingId && b.id === targetBookingId) ||
        (targetBookingCode && b.bookingCode?.toLowerCase() === targetBookingCode.toLowerCase())
      );
      if (matched) {
        setActiveBookingTimeline(matched);
        setSelectedStatusFilter('ALL');
        setSearchQuery(targetBookingCode || matched.bookingCode);
        setTimeout(() => {
          const el = document.getElementById(`booking-card-${matched.bookingCode}`) || document.getElementById(`booking-card-${matched.id}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 150);
      }
    }
  }, [targetBookingCode, targetBookingId, bookings]);

  // Assign staff modal/popover state
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(null);
  const [isAssigningStaff, setIsAssigningStaff] = useState(false);
  const [assignStaffError, setAssignStaffError] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [selectedStaffRole, setSelectedStaffRole] = useState<string>('PHOTOGRAPHER');
  const [registeredShifts, setRegisteredShifts] = useState<StaffShiftRegistrationRecord[]>([]);

  useEffect(() => {
    getStaffRegisteredShifts().then(setRegisteredShifts).catch(console.error);

    const handleShiftsUpdate = () => {
      getStaffRegisteredShifts().then(setRegisteredShifts).catch(console.error);
    };
    window.addEventListener('mipa_shifts_updated', handleShiftsUpdate);
    window.addEventListener('storage', handleShiftsUpdate);
    return () => {
      window.removeEventListener('mipa_shifts_updated', handleShiftsUpdate);
      window.removeEventListener('storage', handleShiftsUpdate);
    };
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

  const cancelRequestedBookings = bookings.filter((b) => Boolean(b.cancelRequestedAt) && b.bookingStatus !== 'CANCELLED');
  const cancelledCount = bookings.filter((b) => b.bookingStatus === 'CANCELLED').length;

  // Cancellation modal state (for Manager/Admin with mandatory reason & customer email dispatch)
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelModalReason, setCancelModalReason] = useState<string>('');
  const [cancelModalError, setCancelModalError] = useState<string>('');

  const handleOpenCancelModal = (b: Booking) => {
    setCancelModalBooking(b);
    setCancelModalReason(b.cancelRequestedReason || '');
    setCancelModalError('');
  };

  const handleConfirmCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    const trimmed = cancelModalReason.trim();
    if (!trimmed) {
      setCancelModalError('Vui lòng nhập lý do hủy lịch để gửi thông báo cho khách hàng.');
      return;
    }

    try {
      setWorkflowActionLoading(cancelModalBooking.id);
      setCancelModalError('');
      const updated = await cancelBookingByManager(cancelModalBooking.id, trimmed);
      onUpdateBooking?.(updated);
      setWorkflowNotice(`✓ Đã hủy lịch đơn #${cancelModalBooking.bookingCode} và gửi email thông báo hủy kèm lý do cho khách hàng.`);
      if (activeBookingTimeline?.id === cancelModalBooking.id) {
        setActiveBookingTimeline(updated);
      }
      setCancelModalBooking(null);
      setCancelModalReason('');
      setTimeout(() => setWorkflowNotice(''), 6000);
    } catch (err: any) {
      setCancelModalError(err.message || 'Không thể hủy lịch.');
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleApproveCancel = async (b: Booking) => {
    handleOpenCancelModal(b);
  };

  const handleApproveReschedule = async (b: Booking) => {
    const confirmMsg = `Bạn có chắc chắn muốn DUYỆT ĐỔI LỊCH cho đơn #${b.bookingCode} sang ngày ${b.rescheduleRequestedDate} (${b.rescheduleRequestedSlot})?\nHệ thống sẽ cập nhật ngày chụp mới và tự động gửi email xác nhận cho khách hàng.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      const updated = await approveBookingReschedule(b.id, 'Quản lý duyệt yêu cầu đổi lịch');
      onUpdateBooking?.(updated);
      setWorkflowNotice(`✓ Đã duyệt đổi lịch cho đơn #${b.bookingCode} và gửi email thông báo cho khách hàng.`);
      if (activeBookingTimeline?.id === b.id) {
        setActiveBookingTimeline(updated);
      }
      setTimeout(() => setWorkflowNotice(''), 5000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể duyệt đổi lịch.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  const handleRejectCancel = async (b: Booking) => {
    const confirmMsg = `Bác bỏ yêu cầu hủy của khách và tiếp tục giữ lịch cho đơn #${b.bookingCode}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setWorkflowActionLoading(b.id);
      setWorkflowError('');
      const updated = await rejectBookingCancel(b.id, 'Quản lý đã liên hệ trao đổi và tiếp tục giữ lịch');
      onUpdateBooking?.(updated);
      setWorkflowNotice(`✓ Đã bác bỏ yêu cầu hủy cho đơn ${b.bookingCode}. Lịch chụp được giữ nguyên.`);
      if (activeBookingTimeline?.id === b.id) {
        setActiveBookingTimeline(updated);
      }
      setTimeout(() => setWorkflowNotice(''), 5000);
    } catch (err: any) {
      setWorkflowError(err.message || 'Không thể xử lý yêu cầu hủy.');
      setTimeout(() => setWorkflowError(''), 5000);
    } finally {
      setWorkflowActionLoading(null);
    }
  };

  // Search & Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchesFilter =
      selectedStatusFilter === 'ALL'
        ? true
        : selectedStatusFilter === 'CANCEL_REQUESTS'
        ? Boolean(b.cancelRequestedAt && b.bookingStatus !== 'CANCELLED')
        : b.bookingStatus === selectedStatusFilter;

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
    setIsAssigningStaff(true);
    setAssignStaffError('');

    const baseEmployees = employees.length > 0
      ? employees
      : (!isSupabaseConfigured() && isDemoModeEnabled() ? INITIAL_EMPLOYEES : []);
    const assignedEmp = baseEmployees.find(emp => emp.id === selectedEmployeeId) ||
      registeredShifts.find(s => s.employeeId === selectedEmployeeId);
    const assignedName = (assignedEmp as any)?.name || (assignedEmp as any)?.employeeName || 'Nhân sự';
    const assignedEmail = (assignedEmp as any)?.email;

    try {
      const result = await assignBookingStaffAndNotify({
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
        staffDetails: {
          name: assignedName,
          email: assignedEmail,
        },
      });

      // Update parent state with authoritative assignment
      onAssignStaff(assigningBooking.id, selectedEmployeeId, selectedStaffRole);

      setWorkflowNotice(`✓ ${result.notificationMessage}`);
      setAssigningBooking(null);
      setSelectedEmployeeId('');
      setAssignStaffError('');
      setTimeout(() => setWorkflowNotice(''), 4500);
    } catch (err: any) {
      console.error('Staff assignment error:', err);
      setAssignStaffError(err.message || 'Không thể phân công nhân sự do xung đột lịch hoặc lỗi kết nối.');
    } finally {
      setIsAssigningStaff(false);
    }
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

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSelectedStatusFilter('CANCELLED')}
            className="btn-mipa-secondary"
            style={{ fontSize: '0.85rem' }}
            title="Xem danh sách đơn đặt lịch đã hủy"
          >
            Danh Sách Hủy ({cancelledCount})
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

      {/* CANCELLATION REQUESTS URGENT ALERT BANNER */}
      {cancelRequestedBookings.length > 0 && (
        <div style={{
          padding: '1rem 1.4rem',
          backgroundColor: '#FEF2F2',
          border: '2px solid #F87171',
          borderRadius: '16px',
          color: '#991B1B',
          marginBottom: '1.2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.8rem',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DC2626',
              flexShrink: 0,
            }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em', color: '#991B1B' }}>
                🚨 CÓ {cancelRequestedBookings.length} ĐƠN ĐẶT LỊCH ĐANG YÊU CẦU HỦY TỪ KHÁCH HÀNG
              </div>
              <div style={{ fontSize: '0.82rem', color: '#7F1D1D', marginTop: '0.15rem' }}>
                Khách hàng đã gửi yêu cầu hủy lịch. Vui lòng bấm kiểm tra và duyệt hủy (để giải phóng slot phòng) hoặc liên hệ khách giữ lịch.
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedStatusFilter('CANCEL_REQUESTS')}
            style={{
              backgroundColor: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              padding: '0.55rem 1.2rem',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)',
            }}
          >
            Lọc {cancelRequestedBookings.length} Đơn Yêu Cầu Hủy →
          </button>
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
            10 Hàng đợi theo chuẩn Shoot-to-Delivery
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
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
            { id: 'CANCELLED', label: '10. ĐÃ HỦY', count: cancelledCount, unit: 'đơn' },
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
                { id: 'CANCELLED', label: `Đã hủy (${cancelledCount})` },
                ...(cancelRequestedBookings.length > 0 ? [{ id: 'CANCEL_REQUESTS', label: `🚨 Yêu cầu hủy (${cancelRequestedBookings.length})`, isAlert: true }] : []),
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
              ].map((filterItem) => {
                const isSelected = selectedStatusFilter === filterItem.id;
                const isAlert = (filterItem as any).isAlert;
                return (
                  <button
                    key={filterItem.id}
                    onClick={() => setSelectedStatusFilter(filterItem.id)}
                    style={{
                      border: '1px solid',
                      borderColor: isAlert
                        ? (isSelected ? '#991B1B' : '#FCA5A5')
                        : (isSelected ? '#8C6E53' : '#EFE6C9'),
                      background: isSelected
                        ? (isAlert ? '#DC2626' : 'linear-gradient(135deg, #8C6E53 0%, #604634 100%)')
                        : (isAlert ? '#FEF2F2' : '#FFFDF6'),
                      color: isSelected
                        ? '#FFFDF6'
                        : (isAlert ? '#DC2626' : '#604634'),
                      padding: '0.3rem 0.65rem',
                      borderRadius: '16px',
                      fontSize: '0.73rem',
                      fontWeight: isAlert ? 700 : 600,
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 2px 6px rgba(96, 70, 52, 0.2)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {filterItem.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dedicated Cancelled Bookings List Banner */}
          {selectedStatusFilter === 'CANCELLED' && (
            <div style={{
              padding: '0.75rem 1.2rem',
              backgroundColor: '#FAF6EE',
              border: '1px solid #E6D7B9',
              borderRadius: '12px',
              color: '#604634',
              marginBottom: '1.2rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.8rem',
            }}>
              <div style={{ fontSize: '0.88rem' }}>
                Đang xem <strong>Danh sách đơn đã hủy ({cancelledCount} đơn)</strong>.
              </div>
              <button
                type="button"
                onClick={() => setSelectedStatusFilter('ALL')}
                className="btn-mipa-secondary"
                style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }}
              >
                ✕ Xem tất cả
              </button>
            </div>
          )}

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
                    id={`booking-card-${b.bookingCode}`}
                    onClick={() => setActiveBookingTimeline(b)}
                    style={{
                      padding: '1.2rem',
                      borderRadius: '14px',
                      border: (b.cancelRequestedAt && b.bookingStatus !== 'CANCELLED')
                        ? '2px solid #F87171'
                        : isSelectedForTimeline
                        ? '2px solid #C6A45F'
                        : '1px solid var(--mipa-beige)',
                      backgroundColor: (b.cancelRequestedAt && b.bookingStatus !== 'CANCELLED')
                        ? '#FFFDFD'
                        : isSelectedForTimeline
                        ? '#FFFDF6'
                        : '#FFFFFF',
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
                        {b.cancelRequestedAt && b.bookingStatus !== 'CANCELLED' && (
                          <span
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1.5px solid #F87171',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              padding: '0.15rem 0.55rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)',
                            }}
                          >
                            <AlertTriangle size={12} /> YÊU CẦU HỦY
                          </span>
                        )}
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '0.85rem', color: '#6E5F55' }}>
                          🗓️ <strong>{b.bookingDate}</strong> lúc <strong>{b.startTime}</strong> ({b.studioName})
                        </div>
                        {b.bookingStatus !== 'CANCELLED' && b.bookingStatus !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCancelModal(b);
                            }}
                            className="btn-mipa-secondary"
                            style={{
                              fontSize: '0.74rem',
                              padding: '0.2rem 0.55rem',
                              marginLeft: '0.4rem',
                              color: '#8C6E53',
                            }}
                            title="Hủy đơn đặt lịch này kèm lý do và gửi mail"
                          >
                            Hủy đơn
                          </button>
                        )}
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

                    {/* Hiển thị chi tiết đơn đã hủy */}
                    {b.bookingStatus === 'CANCELLED' && (
                      <div style={{
                        padding: '0.75rem 0.95rem',
                        backgroundColor: '#FAF8F5',
                        border: '1px solid #E6D7B9',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        color: '#604634',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <span style={{ fontWeight: 700, color: '#8C6E53' }}>
                            Đơn đã hủy
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#8C6E53' }}>
                            {b.updatedAt ? new Date(b.updatedAt).toLocaleString('vi-VN') : ''}
                          </span>
                        </div>
                        <div style={{ backgroundColor: '#FFFFFF', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #EFE6C9', marginTop: '0.1rem' }}>
                          Lý do hủy: <strong style={{ color: '#604634' }}>"{b.cancelRequestedReason || (b as any).notes || 'Hủy bởi Quản lý/Admin hoặc Khách hàng'}"</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                          <Check size={14} color="#059669" /> Đã gửi email thông báo hủy kèm lý do đến: <strong>{b.customerEmail || b.customerPhone}</strong>
                        </div>
                      </div>
                    )}

                    {/* Pending Requests Alert */}
                    {b.cancelRequestedAt && b.bookingStatus !== 'CANCELLED' && (
                      <div style={{
                        padding: '0.75rem 0.95rem',
                        backgroundColor: '#FEF2F2',
                        border: '1.5px solid #FCA5A5',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        color: '#991B1B',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#991B1B' }}>
                            <AlertTriangle size={15} color="#DC2626" /> KHÁCH GỬI YÊU CẦU HỦY ĐƠN:
                          </strong>
                          <span style={{ fontSize: '0.73rem', color: '#7F1D1D' }}>
                            {new Date(b.cancelRequestedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div>
                          Lý do hủy: <strong style={{ color: '#7F1D1D' }}>"{b.cancelRequestedReason || 'Khách không cung cấp lý do'}"</strong>
                        </div>
                      </div>
                    )}

                    {b.rescheduleRequestedAt && (
                      <div style={{ padding: '0.6rem 0.8rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '8px', fontSize: '0.8rem', color: '#92400E', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <div>
                          ⚠️ Khách yêu cầu đổi lịch sang ngày: <strong>{b.rescheduleRequestedDate} ({b.rescheduleRequestedSlot})</strong>
                          {b.rescheduleRequestedReason && (
                            <div style={{ fontSize: '0.75rem', marginTop: '2px', color: '#78350F' }}>
                              Lý do: <em>"{b.rescheduleRequestedReason}"</em>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveReschedule(b);
                          }}
                          style={{
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.28rem 0.65rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Duyệt Đổi Lịch
                        </button>
                      </div>
                    )}

                    {/* Assigned Staff Pills & Actions */}
                    <div style={{ padding: '0.66rem 0.8rem', backgroundColor: '#FFFDF6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', border: '1px solid var(--mipa-beige)', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span>📷 Photog: <strong>{b.assignments.find((a) => a.assignmentRole === 'PHOTOGRAPHER')?.employeeName || 'Chưa gán'}</strong></span>
                        <span>💄 Makeup: <strong>{b.assignments.find((a) => a.assignmentRole === 'MAKEUP')?.employeeName || 'Chưa gán'}</strong></span>
                        <span>🎨 Editor: <strong>{b.assignments.find((a) => a.assignmentRole === 'EDITOR')?.employeeName || 'Chưa gán'}</strong></span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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

                        {b.cancelRequestedAt && b.bookingStatus !== 'CANCELLED' ? (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApproveCancel(b);
                              }}
                              style={{
                                backgroundColor: '#DC2626',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              ✓ Duyệt Hủy
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRejectCancel(b);
                              }}
                              className="btn-mipa-secondary"
                              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                            >
                              ✕ Bác Bỏ
                            </button>
                          </>
                        ) : b.bookingStatus !== 'CANCELLED' && b.bookingStatus !== 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenCancelModal(b);
                            }}
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              border: '1px solid #FCA5A5',
                              borderRadius: '8px',
                              padding: '0.35rem 0.75rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                            title="Hủy đơn đặt lịch này và gửi email thông báo kèm lý do cho khách hàng"
                          >
                            🚫 Hủy Lịch
                          </button>
                        ) : null}

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

                    {/* Trạng thái đơn đã hủy */}
                    {activeBookingTimeline.bookingStatus === 'CANCELLED' && (
                      <div style={{
                        padding: '0.8rem 1rem',
                        backgroundColor: '#FAF8F5',
                        border: '1px solid #E6D7B9',
                        borderRadius: '10px',
                        marginBottom: '0.6rem',
                        color: '#604634',
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#8C6E53', marginBottom: '0.3rem' }}>
                          Đơn đặt lịch đã hủy
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#8C6E53', marginBottom: '0.4rem' }}>
                          Thời gian: <strong>{activeBookingTimeline.updatedAt ? new Date(activeBookingTimeline.updatedAt).toLocaleString('vi-VN') : 'Đã ghi nhận'}</strong>
                        </div>
                        <div style={{
                          fontSize: '0.82rem',
                          color: '#604634',
                          backgroundColor: '#FFFFFF',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #EFE6C9',
                          marginBottom: '0.4rem',
                          lineHeight: 1.4,
                        }}>
                          Lý do hủy: <strong>"{activeBookingTimeline.cancelRequestedReason || (activeBookingTimeline as any).notes || 'Hủy bởi Quản lý/Admin hoặc Khách hàng'}"</strong>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Check size={14} color="#059669" /> Đã gửi email thông báo hủy kèm lý do tới khách hàng.
                        </div>
                      </div>
                    )}

                    {/* Nút chủ động hủy đơn cho Manager & Admin (Bắt buộc lý do & tự động gửi mail) */}
                    {activeBookingTimeline.bookingStatus !== 'CANCELLED' && activeBookingTimeline.bookingStatus !== 'COMPLETED' && !activeBookingTimeline.cancelRequestedAt && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(activeBookingTimeline)}
                        className="btn-mipa-secondary"
                        style={{
                          fontSize: '0.82rem',
                          padding: '0.5rem',
                          width: '100%',
                          color: '#8C6E53',
                          marginBottom: '0.3rem',
                        }}
                      >
                        Hủy đơn đặt lịch (kèm lý do & gửi mail)
                      </button>
                    )}
                    {activeBookingTimeline.rescheduleRequestedAt && (
                      <div style={{
                        padding: '0.8rem',
                        backgroundColor: '#FFFBEB',
                        border: '1.5px solid #FCD34D',
                        borderRadius: '10px',
                        marginBottom: '0.6rem',
                      }}>
                        <div style={{ color: '#92400E', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertTriangle size={15} color="#D97706" />
                          <span>KHÁCH XIN ĐỔI LỊCH CHỤP</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#78350F', marginBottom: '0.4rem' }}>
                          Ngày & giờ mới: <strong>{activeBookingTimeline.rescheduleRequestedDate} ({activeBookingTimeline.rescheduleRequestedSlot})</strong>
                          {activeBookingTimeline.rescheduleRequestedReason && (
                            <div style={{ fontSize: '0.75rem', marginTop: '2px', fontStyle: 'italic' }}>
                              "{activeBookingTimeline.rescheduleRequestedReason}"
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApproveReschedule(activeBookingTimeline)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                          }}
                        >
                          ✓ Duyệt Đổi Lịch & Gửi Mail Cho Khách
                        </button>
                      </div>
                    )}

                    {activeBookingTimeline.cancelRequestedAt && activeBookingTimeline.bookingStatus !== 'CANCELLED' && (
                      <div style={{
                        padding: '0.9rem',
                        backgroundColor: '#FEF2F2',
                        border: '2px solid #DC2626',
                        borderRadius: '12px',
                        marginBottom: '0.6rem',
                      }}>
                        <div style={{ color: '#991B1B', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <AlertTriangle size={17} color="#DC2626" />
                          <span>KHÁCH YÊU CẦU HỦY ĐƠN</span>
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#7F1D1D', marginBottom: '0.4rem' }}>
                          Gửi lúc: <strong>{new Date(activeBookingTimeline.cancelRequestedAt).toLocaleString('vi-VN')}</strong>
                        </div>
                        <div style={{
                          fontSize: '0.82rem',
                          color: '#450A0A',
                          backgroundColor: '#FFFFFF',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: '1px solid #FECDD3',
                          marginBottom: '0.7rem',
                          lineHeight: 1.4,
                        }}>
                          Lý do: <em>"{activeBookingTimeline.cancelRequestedReason || 'Khách không cung cấp lý do'}"</em>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleApproveCancel(activeBookingTimeline)}
                            style={{
                              flex: 1,
                              padding: '0.55rem',
                              backgroundColor: '#DC2626',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '8px',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            ✓ Duyệt Hủy Đơn
                          </button>
                          <button
                            onClick={() => handleRejectCancel(activeBookingTimeline)}
                            className="btn-mipa-secondary"
                            style={{ flex: 1, padding: '0.55rem', fontSize: '0.8rem' }}
                          >
                            ✕ Bác Bỏ
                          </button>
                        </div>
                      </div>
                    )}

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

                    {activeBookingTimeline.bookingStatus !== 'CANCELLED' && activeBookingTimeline.bookingStatus !== 'COMPLETED' && !activeBookingTimeline.cancelRequestedAt && (
                      <button
                        type="button"
                        onClick={() => handleOpenCancelModal(activeBookingTimeline)}
                        style={{
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                          borderRadius: '8px',
                          padding: '0.55rem',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.4rem',
                          marginTop: '0.4rem',
                        }}
                      >
                        <AlertCircle size={15} /> 🚫 HỦY ĐƠN ĐẶT LỊCH NÀY (BẮT BUỘC LÝ DO)
                      </button>
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
        const baseEmployees = employees.length > 0
          ? employees
          : (!isSupabaseConfigured() && isDemoModeEnabled() ? INITIAL_EMPLOYEES : []);
        const availableEmployees = [...baseEmployees];
        registeredShifts.forEach(s => {
          if (!availableEmployees.some(e => e.id === s.employeeId)) {
            availableEmployees.unshift({
              id: s.employeeId,
              name: s.employeeName,
              email: `${s.employeeId}@maisonmipa.vn`,
              phone: '',
              role: s.role,
              avatar: '/hero.png',
              skills: [],
              rating: 5.0,
              totalSessions: 0,
              status: 'ACTIVE',
              shiftSchedule: {},
            });
          }
        });
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

                {assignStaffError && (
                  <div
                    role="alert"
                    style={{
                      marginTop: '0.75rem',
                      padding: '0.65rem 0.85rem',
                      backgroundColor: '#FDF2F2',
                      border: '1px solid #F87171',
                      borderRadius: '8px',
                      color: '#991B1B',
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                    }}
                  >
                    ⚠️ {assignStaffError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setAssigningBooking(null);
                      setAssignStaffError('');
                    }}
                    disabled={isAssigningStaff}
                    className="btn-mipa-secondary"
                    style={{ flex: 1, padding: '0.75rem', minHeight: '44px' }}
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={isAssigningStaff || !selectedEmployeeId}
                    className="btn-mipa-gold"
                    style={{ flex: 1, padding: '0.75rem', minHeight: '44px', opacity: isAssigningStaff ? 0.6 : 1 }}
                  >
                    {isAssigningStaff ? 'Đang Xử Lý...' : 'Lưu Phân Công & Gửi Email'}
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

      {/* Cancellation Modal (Manager / Admin Mandatory Reason & Customer Email Dispatch) */}
      {cancelModalBooking && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(44, 34, 30, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem',
          }}
        >
          <FocusTrap>
            <div
              style={{
                backgroundColor: '#FFFDF6',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '540px',
                padding: '1.75rem',
                boxShadow: '0 20px 50px rgba(44, 34, 30, 0.3)',
                border: '1.5px solid #E6D7B9',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertCircle size={15} /> QUYỀN QUẢN TRỊ • HỦY ĐƠN ĐẶT LỊCH
                  </div>
                  <h3 id="cancel-modal-title" style={{ margin: '0.25rem 0 0 0', color: '#604634', fontSize: '1.25rem', fontFamily: 'Playfair Display, serif' }}>
                    #{cancelModalBooking.bookingCode} — {cancelModalBooking.customerName}
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={Boolean(workflowActionLoading)}
                  onClick={() => setCancelModalBooking(null)}
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

              <div style={{ padding: '0.75rem 0.9rem', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '10px', fontSize: '0.82rem', color: '#991B1B', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                ⚠️ <strong>Cảnh báo:</strong> Thao tác này sẽ giải phóng slot phòng chụp và <strong>tự động gửi email thông báo hủy chính thức kèm lý do</strong> đến khách hàng <strong>{cancelModalBooking.customerEmail || cancelModalBooking.customerName}</strong>.
              </div>

              <div style={{ backgroundColor: '#FAF6EE', border: '1px solid #E6D7B9', borderRadius: '8px', padding: '0.7rem 0.85rem', marginBottom: '1rem', fontSize: '0.82rem', color: '#4A3525' }}>
                <div>📸 <strong>Gói:</strong> {cancelModalBooking.packageName} ({cancelModalBooking.serviceName})</div>
                <div>📍 <strong>Phòng:</strong> {cancelModalBooking.studioName} • <strong>Lịch:</strong> {cancelModalBooking.bookingDate} {cancelModalBooking.startTime}</div>
                {cancelModalBooking.customerPhone && <div>📞 <strong>SĐT khách:</strong> {cancelModalBooking.customerPhone}</div>}
              </div>

              <form onSubmit={handleConfirmCancelSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label htmlFor="cancel-reason-textarea" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#604634', marginBottom: '0.4rem' }}>
                    Lý do hủy lịch (Bắt buộc để gửi email cho khách) <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <textarea
                    id="cancel-reason-textarea"
                    rows={4}
                    required
                    disabled={Boolean(workflowActionLoading)}
                    value={cancelModalReason}
                    onChange={(e) => {
                      setCancelModalReason(e.target.value);
                      if (cancelModalError) setCancelModalError('');
                    }}
                    placeholder="Vui lòng nhập chi tiết lý do hủy (ví dụ: Khách gọi điện xin hủy lịch vì việc đột xuất, studio bảo trì cơ sở vật chất, v.v.)..."
                    className="mipa-input"
                    style={{ width: '100%', borderRadius: '8px', border: '1.5px solid #D1C2A5', padding: '0.75rem', fontSize: '0.9rem', resize: 'vertical' }}
                  />
                  {cancelModalError && (
                    <div style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '0.35rem', fontWeight: 700 }}>
                      ⚠️ {cancelModalError}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    disabled={Boolean(workflowActionLoading)}
                    onClick={() => setCancelModalBooking(null)}
                    className="btn-mipa-secondary"
                    style={{ flex: 1, padding: '0.75rem' }}
                  >
                    Quay Lại
                  </button>
                  <button
                    type="submit"
                    disabled={Boolean(workflowActionLoading) || !cancelModalReason.trim()}
                    style={{
                      flex: 1.6,
                      padding: '0.75rem',
                      backgroundColor: '#DC2626',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: Boolean(workflowActionLoading) || !cancelModalReason.trim() ? 'not-allowed' : 'pointer',
                      opacity: Boolean(workflowActionLoading) || !cancelModalReason.trim() ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {workflowActionLoading ? 'Đang xử lý & gửi mail...' : 'XÁC NHẬN HỦY & GỬI MAIL'}
                  </button>
                </div>
              </form>
            </div>
          </FocusTrap>
        </div>
      )}

    </div>
  );
};
