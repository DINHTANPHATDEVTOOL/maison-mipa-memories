import type { Booking, BookingStatus, UserRole, User, StaffRole } from '../types';

export interface BookingActivityLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  fromStatus?: BookingStatus;
  toStatus?: BookingStatus;
  notes?: string;
}

// 1. State Machine Allowed Transitions Graph
export const ALLOWED_TRANSITIONS: Record<BookingStatus, { next: BookingStatus[]; allowedRoles: (UserRole | StaffRole)[] }[]> = {
  DRAFT: [
    { next: ['PENDING_PAYMENT'], allowedRoles: ['CUSTOMER', 'GUEST', 'MANAGER', 'ADMIN'] },
  ],
  PENDING_PAYMENT: [
    { next: ['DEPOSIT_PAID'], allowedRoles: ['CUSTOMER', 'MANAGER', 'ADMIN'] },
    { next: ['CANCELLED'], allowedRoles: ['CUSTOMER', 'MANAGER', 'ADMIN'] },
  ],
  DEPOSIT_PAID: [
    { next: ['CONFIRMED'], allowedRoles: ['MANAGER', 'ADMIN'] },
    { next: ['CANCELLED'], allowedRoles: ['MANAGER', 'ADMIN', 'CUSTOMER'] },
    { next: ['RESCHEDULED'], allowedRoles: ['MANAGER', 'ADMIN', 'CUSTOMER'] },
  ],
  CONFIRMED: [
    { next: ['CHECKED_IN'], allowedRoles: ['RECEPTIONIST', 'STAFF', 'MANAGER', 'ADMIN'] },
    { next: ['RESCHEDULED'], allowedRoles: ['MANAGER', 'ADMIN', 'CUSTOMER'] },
    { next: ['CANCELLED'], allowedRoles: ['MANAGER', 'ADMIN'] },
  ],
  CHECKED_IN: [
    { next: ['SHOOTING'], allowedRoles: ['PHOTOGRAPHER', 'STAFF', 'MANAGER', 'ADMIN'] },
  ],
  SHOOTING: [
    { next: ['SHOOT_COMPLETED'], allowedRoles: ['PHOTOGRAPHER', 'STAFF', 'MANAGER', 'ADMIN'] },
  ],
  SHOOT_COMPLETED: [
    { next: ['EDITING'], allowedRoles: ['EDITOR', 'STAFF', 'MANAGER', 'ADMIN'] },
  ],
  EDITING: [
    { next: ['READY_FOR_REVIEW'], allowedRoles: ['EDITOR', 'STAFF', 'MANAGER', 'ADMIN'] },
  ],
  READY_FOR_REVIEW: [
    { next: ['DELIVERED'], allowedRoles: ['MANAGER', 'ADMIN', 'CUSTOMER'] },
  ],
  DELIVERED: [
    { next: ['COMPLETED'], allowedRoles: ['CUSTOMER', 'MANAGER', 'ADMIN'] },
  ],
  COMPLETED: [],
  CANCELLED: [],
  RESCHEDULED: [
    { next: ['CONFIRMED'], allowedRoles: ['MANAGER', 'ADMIN'] },
  ],
};

// 2. Compute "Next Action" Button Label and Target Status based on current role & booking status
export const getNextActionForBooking = (
  booking: Booking,
  userRole: UserRole,
  userStaffRole?: StaffRole
): { label: string; targetStatus: BookingStatus; buttonClass: string } | null => {
  const status = booking.bookingStatus;

  // Customer Actions
  if (userRole === 'CUSTOMER') {
    if (status === 'PENDING_PAYMENT') return { label: '💳 THANH TOÁN TIỀN CỌC 30%', targetStatus: 'DEPOSIT_PAID', buttonClass: 'btn-mipa-gold' };
    if (status === 'DEPOSIT_PAID' || status === 'CONFIRMED') return { label: '📅 YÊU CẦU ĐỔI LỊCH CHỤP', targetStatus: 'RESCHEDULED', buttonClass: 'btn-mipa-secondary' };
    if (status === 'READY_FOR_REVIEW') return { label: '🖼️ CHỌN ẢNH BÌA & VÀO GALLERY', targetStatus: 'DELIVERED', buttonClass: 'btn-mipa-gold' };
    if (status === 'DELIVERED') return { label: '⭐ ĐÁNH GIÁ TRẢI NGHIỆM MAISON MIPA', targetStatus: 'COMPLETED', buttonClass: 'btn-mipa-gold' };
  }

  // Staff (Photographer / Editor / Receptionist) Actions
  if (userRole === 'STAFF') {
    if (status === 'CONFIRMED') return { label: '📌 XÁC NHẬN KHÁCH CHECK-IN', targetStatus: 'CHECKED_IN', buttonClass: 'btn-mipa-gold' };
    if (status === 'CHECKED_IN') return { label: '📷 BẮT ĐẦU BUỔI CHỤP', targetStatus: 'SHOOTING', buttonClass: 'btn-mipa-gold' };
    if (status === 'SHOOTING') return { label: '✅ HOÀN THÀNH BỘ ẢNH (BẮT ĐẦU HẬU KỲ)', targetStatus: 'SHOOT_COMPLETED', buttonClass: 'btn-mipa-primary' };
    if (status === 'SHOOT_COMPLETED') return { label: '🎨 NHẬN TASK HẬU KỲ & ĐỔI TONE', targetStatus: 'EDITING', buttonClass: 'btn-mipa-gold' };
    if (status === 'EDITING') return { label: '✨ UPLOAD ALBUM CHẤT LƯỢNG CAO', targetStatus: 'READY_FOR_REVIEW', buttonClass: 'btn-mipa-gold' };
  }

  // Manager & Admin Actions
  if (userRole === 'MANAGER' || userRole === 'ADMIN') {
    if (status === 'DEPOSIT_PAID') return { label: '✔️ XÁC NHẬN CỌC & GÁN KÍP CHỤP', targetStatus: 'CONFIRMED', buttonClass: 'btn-mipa-gold' };
    if (status === 'CONFIRMED' && booking.assignments.length === 0) return { label: '👤 GÁN PHOTOGRAPHER & MAKEUP', targetStatus: 'CONFIRMED', buttonClass: 'btn-mipa-secondary' };
    if (status === 'READY_FOR_REVIEW') return { label: '📩 GỬI LINK ALBUM CHO KHÁCH HÀNG', targetStatus: 'DELIVERED', buttonClass: 'btn-mipa-gold' };
    if (status === 'DELIVERED') return { label: '🏁 HOÀN TẤT & LƯU HỒ SƠ CỦA KHÁCH', targetStatus: 'COMPLETED', buttonClass: 'btn-mipa-primary' };
  }

  return null;
};

// 3. RBAC + ABAC Data Access Control Filter
export const filterBookingsForRole = (
  bookings: Booking[],
  user: User | null,
  role: UserRole
): Booking[] => {
  if (!user || role === 'GUEST') return [];

  if (role === 'ADMIN') {
    // Admin sees ALL bookings
    return bookings;
  }

  if (role === 'MANAGER') {
    // Manager sees all studio branch bookings
    return bookings;
  }

  if (role === 'STAFF') {
    // Staff sees ONLY bookings assigned to them (or matching name/id)
    return bookings.filter((b) => {
      // Check assignment by employeeId or employeeName substring
      const isAssigned = b.assignments.some(
        (a) => a.employeeId === user.id || a.employeeName.toLowerCase().includes(user.fullName.split(' ')[0].toLowerCase())
      );
      // Also allow staff to view today's confirmed/checked-in bookings for studio coordination
      return isAssigned || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN' || b.bookingStatus === 'SHOOTING';
    });
  }

  if (role === 'CUSTOMER') {
    // Customer sees ONLY bookings belonging to their customerId or matching email/phone
    const userPhoneDigits = user.phone.replace(/[^0-9]/g, '');
    return bookings.filter((b) => {
      if (b.customerId === user.id) return true;
      if (b.customerEmail.toLowerCase() === user.email.toLowerCase()) return true;
      if (userPhoneDigits.length >= 8 && b.customerPhone.replace(/[^0-9]/g, '') === userPhoneDigits) return true;
      return false;
    });
  }

  return [];
};

// 4. Operations Inbox Aggregator for Manager / Admin
export const getOperationsInboxStats = (bookings: Booking[]) => {
  const pendingDeposit = bookings.filter((b) => b.bookingStatus === 'PENDING_PAYMENT');
  const pendingConfirmation = bookings.filter((b) => b.bookingStatus === 'DEPOSIT_PAID');
  const unassignedStaff = bookings.filter((b) => (b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'DEPOSIT_PAID') && b.assignments.length === 0);
  const shootingNow = bookings.filter((b) => b.bookingStatus === 'SHOOTING' || b.bookingStatus === 'CHECKED_IN');
  const editingQueue = bookings.filter((b) => b.bookingStatus === 'SHOOT_COMPLETED' || b.bookingStatus === 'EDITING');
  const readyToDeliver = bookings.filter((b) => b.bookingStatus === 'READY_FOR_REVIEW');

  return {
    pendingDepositCount: pendingDeposit.length,
    pendingConfirmationCount: pendingConfirmation.length,
    unassignedStaffCount: unassignedStaff.length,
    shootingNowCount: shootingNow.length,
    editingQueueCount: editingQueue.length,
    readyToDeliverCount: readyToDeliver.length,
    totalActionRequired: pendingConfirmation.length + unassignedStaff.length + editingQueue.length + readyToDeliver.length,
  };
};
