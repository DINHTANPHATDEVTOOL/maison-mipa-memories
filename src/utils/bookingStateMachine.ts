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

// 1. State Machine Allowed Transitions Graph (Strictly enforced at backend)
export const ALLOWED_TRANSITIONS: Record<BookingStatus, { next: BookingStatus[]; allowedRoles: (UserRole | StaffRole)[] }[]> = {
  DRAFT: [
    { next: ['PENDING_PAYMENT'], allowedRoles: ['CUSTOMER', 'GUEST', 'MANAGER', 'ADMIN'] },
  ],
  PENDING_PAYMENT: [
    // Note: DEPOSIT_PAID transition is STRICTLY backend-authoritative (Manager/Admin or Payment Webhook)
    { next: ['DEPOSIT_PAID'], allowedRoles: ['MANAGER', 'ADMIN'] },
    { next: ['CANCELLED'], allowedRoles: ['CUSTOMER', 'MANAGER', 'ADMIN'] },
  ],
  DEPOSIT_PAID: [
    { next: ['CONFIRMED'], allowedRoles: ['MANAGER', 'ADMIN'] },
    { next: ['CANCELLED'], allowedRoles: ['MANAGER', 'ADMIN'] },
    { next: ['RESCHEDULED'], allowedRoles: ['MANAGER', 'ADMIN'] },
  ],
  CONFIRMED: [
    { next: ['CHECKED_IN'], allowedRoles: ['RECEPTIONIST', 'STAFF', 'MANAGER', 'ADMIN'] },
    { next: ['CANCELLED'], allowedRoles: ['MANAGER', 'ADMIN'] },
  ],
  CHECKED_IN: [
    { next: ['SHOOTING'], allowedRoles: ['PHOTOGRAPHER', 'MANAGER', 'ADMIN'] },
  ],
  SHOOTING: [
    { next: ['SHOOT_COMPLETED'], allowedRoles: ['PHOTOGRAPHER', 'MANAGER', 'ADMIN'] },
  ],
  SHOOT_COMPLETED: [
    { next: ['EDITING'], allowedRoles: ['EDITOR', 'MANAGER', 'ADMIN'] },
  ],
  EDITING: [
    { next: ['READY_FOR_REVIEW'], allowedRoles: ['EDITOR', 'MANAGER', 'ADMIN'] },
  ],
  READY_FOR_REVIEW: [
    { next: ['DELIVERED'], allowedRoles: ['MANAGER', 'ADMIN'] },
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

// 2. Compute "Next Action" Button Label and Target Status based on user role & staff_role
export const getNextActionForBooking = (
  booking: Booking,
  userRole: UserRole,
  userStaffRole?: StaffRole
): { label: string; targetStatus: BookingStatus; buttonClass: string } | null => {
  const status = booking.bookingStatus;

  // Customer Actions: Acknowledgements & Deliveries (Never operational mutations)
  if (userRole === 'CUSTOMER') {
    if (status === 'DELIVERED') {
      return { label: '⭐ HOÀN TẤT & ĐÁNH GIÁ', targetStatus: 'COMPLETED', buttonClass: 'btn-mipa-gold' };
    }
    return null;
  }

  // Staff Actions: Strictly filtered by specialized staff_role
  if (userRole === 'STAFF') {
    // RECEPTIONIST: Check-in only
    if (userStaffRole === 'RECEPTIONIST') {
      if (status === 'CONFIRMED') {
        return { label: '📌 XÁC NHẬN KHÁCH CHECK-IN', targetStatus: 'CHECKED_IN', buttonClass: 'btn-mipa-gold' };
      }
      return null;
    }

    // PHOTOGRAPHER: Shoot Start & Shoot Complete
    if (userStaffRole === 'PHOTOGRAPHER') {
      if (status === 'CHECKED_IN') {
        return { label: '📷 BẮT ĐẦU BUỔI CHỤP', targetStatus: 'SHOOTING', buttonClass: 'btn-mipa-gold' };
      }
      if (status === 'SHOOTING') {
        return { label: '✅ HOÀN TẤT BUỔI CHỤP (LƯU VÀO DRIVE)', targetStatus: 'SHOOT_COMPLETED', buttonClass: 'btn-mipa-primary' };
      }
      return null;
    }

    // EDITOR: Editing Start & Finish for Review
    if (userStaffRole === 'EDITOR') {
      if (status === 'SHOOT_COMPLETED') {
        return { label: '🎨 NHẬN TASK HẬU KỲ', targetStatus: 'EDITING', buttonClass: 'btn-mipa-gold' };
      }
      if (status === 'EDITING') {
        return { label: '✨ HOÀN TẤT HẬU KỲ (SẴN SÀNG DUYỆT)', targetStatus: 'READY_FOR_REVIEW', buttonClass: 'btn-mipa-gold' };
      }
      return null;
    }

    // MAKEUP: Does not mutate main booking operational state
    if (userStaffRole === 'MAKEUP') {
      return null;
    }

    // Generic fallback for staff without specific staff_role set
    if (status === 'CONFIRMED') return { label: '📌 XÁC NHẬN CHECK-IN', targetStatus: 'CHECKED_IN', buttonClass: 'btn-mipa-gold' };
    if (status === 'CHECKED_IN') return { label: '📷 BẮT ĐẦU BUỔI CHỤP', targetStatus: 'SHOOTING', buttonClass: 'btn-mipa-gold' };
    if (status === 'SHOOTING') return { label: '✅ HOÀN TẤT BUỔI CHỤP', targetStatus: 'SHOOT_COMPLETED', buttonClass: 'btn-mipa-primary' };
    if (status === 'SHOOT_COMPLETED') return { label: '🎨 NHẬN TASK HẬU KỲ', targetStatus: 'EDITING', buttonClass: 'btn-mipa-gold' };
    if (status === 'EDITING') return { label: '✨ HOÀN TẤT HẬU KỲ', targetStatus: 'READY_FOR_REVIEW', buttonClass: 'btn-mipa-gold' };
  }

  // Manager & Admin Actions
  if (userRole === 'MANAGER' || userRole === 'ADMIN') {
    if (status === 'DEPOSIT_PAID') return { label: '✔️ XÁC NHẬN CỌC & GÁN KÍP CHỤP', targetStatus: 'CONFIRMED', buttonClass: 'btn-mipa-gold' };
    if (status === 'CONFIRMED' && booking.assignments.length === 0) return { label: '👤 GÁN PHOTOGRAPHER & MAKEUP', targetStatus: 'CONFIRMED', buttonClass: 'btn-mipa-secondary' };
    if (status === 'CONFIRMED') return { label: '📌 XÁC NHẬN KHÁCH CHECK-IN', targetStatus: 'CHECKED_IN', buttonClass: 'btn-mipa-gold' };
    if (status === 'READY_FOR_REVIEW') return { label: '📩 DUYỆT BỘ ẢNH & MỞ DRIVE CHO KHÁCH', targetStatus: 'DELIVERED', buttonClass: 'btn-mipa-gold' };
    if (status === 'DELIVERED') return { label: '🏁 HOÀN TẤT ĐƠN', targetStatus: 'COMPLETED', buttonClass: 'btn-mipa-primary' };
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

  if (role === 'ADMIN' || role === 'MANAGER') {
    return bookings;
  }

  if (role === 'STAFF') {
    const staffRole = user.staffRole;

    // Receptionist sees today's bookings for front desk check-in
    if (staffRole === 'RECEPTIONIST') {
      const today = new Date().toISOString().split('T')[0];
      return bookings.filter(b => b.bookingDate === today || b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'CHECKED_IN');
    }

    // Photographer, Makeup, Editor see ONLY assigned bookings
    const userFirstName = (user.fullName || user.name || '').split(' ')[0]?.toLowerCase();
    return bookings.filter((b) => {
      return b.assignments.some(
        (a) => a.employeeId === user.id || (Boolean(userFirstName) && a.employeeName.toLowerCase().includes(userFirstName))
      );
    });
  }

  if (role === 'CUSTOMER') {
    // Customer sees strictly their own bookings
    return bookings.filter((b) => b.customerId === user.id);
  }

  return [];
};

// 4. Operations Inbox Aggregator for Manager / Admin
export const getOperationsInboxStats = (bookings: Booking[]) => {
  const pendingDeposit = bookings.filter((b) => b.bookingStatus === 'PENDING_PAYMENT' || b.bookingStatus === 'DRAFT');
  const pendingConfirmation = bookings.filter((b) => b.bookingStatus === 'DEPOSIT_PAID');
  const pendingDepositAndConfirmation = bookings.filter(
    (b) => b.bookingStatus === 'PENDING_PAYMENT' || b.bookingStatus === 'DRAFT' || b.bookingStatus === 'DEPOSIT_PAID'
  );
  const unassignedStaff = bookings.filter(
    (b) => (b.bookingStatus === 'CONFIRMED' || b.bookingStatus === 'DEPOSIT_PAID') && (!b.assignments || b.assignments.length === 0)
  );
  const shootingNow = bookings.filter((b) => b.bookingStatus === 'SHOOTING' || b.bookingStatus === 'CHECKED_IN');
  const editingQueue = bookings.filter((b) => b.bookingStatus === 'SHOOT_COMPLETED' || b.bookingStatus === 'EDITING');
  const readyToDeliver = bookings.filter((b) => b.bookingStatus === 'READY_FOR_REVIEW');

  return {
    pendingDepositCount: pendingDeposit.length,
    pendingConfirmationCount: pendingConfirmation.length,
    pendingDepositAndConfirmationCount: pendingDepositAndConfirmation.length,
    unassignedStaffCount: unassignedStaff.length,
    shootingNowCount: shootingNow.length,
    editingQueueCount: editingQueue.length,
    readyToDeliverCount: readyToDeliver.length,
    totalActionRequired:
      pendingDepositAndConfirmation.length +
      unassignedStaff.length +
      editingQueue.length +
      readyToDeliver.length,
  };
};
