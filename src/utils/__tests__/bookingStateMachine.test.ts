import { describe, it, expect } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  getNextActionForBooking,
  filterBookingsForRole,
  getOperationsInboxStats,
} from '../bookingStateMachine';
import type { Booking, User, BookingStatus } from '../../types';

describe('bookingStateMachine - ALLOWED_TRANSITIONS', () => {
  it('should define valid transitions from DRAFT', () => {
    const transitions = ALLOWED_TRANSITIONS['DRAFT'];
    expect(transitions).toBeDefined();
    expect(transitions[0].next).toContain('PENDING_PAYMENT');
  });

  it('should allow deposit payment transition to CONFIRMED or CANCELLED or RESCHEDULED', () => {
    const transitions = ALLOWED_TRANSITIONS['DEPOSIT_PAID'];
    const allNext = transitions.flatMap((t) => t.next);
    expect(allNext).toContain('CONFIRMED');
    expect(allNext).toContain('CANCELLED');
    expect(allNext).toContain('RESCHEDULED');
  });

  it('should have empty transitions for terminal states (COMPLETED, CANCELLED)', () => {
    expect(ALLOWED_TRANSITIONS['COMPLETED']).toEqual([]);
    expect(ALLOWED_TRANSITIONS['CANCELLED']).toEqual([]);
  });
});

describe('bookingStateMachine - getNextActionForBooking', () => {
  const baseBooking: Booking = {
    id: 'bk_test_01',
    bookingCode: 'MIPA-260815-101',
    customerId: 'cust_01',
    customerName: 'Nguyễn Minh Anh',
    customerPhone: '0908123456',
    customerEmail: 'minhanh.nguyen@gmail.com',
    serviceId: 'srv_photo',
    serviceName: 'Chụp Studio',
    packageId: 'pkg_couple',
    packageName: 'Gói Couple Lãng Mạn',
    packagePrice: 2500000,
    subtotal: 2500000,
    discount: 0,
    addons: [],
    bookingDate: '2026-08-15',
    startTime: '13:30',
    endTime: '15:30',
    studioId: 'rm_01',
    studioName: 'Phòng VIP',
    totalAmount: 2500000,
    depositAmount: 750000,
    paymentStatus: 'UNPAID',
    bookingStatus: 'PENDING_PAYMENT',
    assignments: [],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
  };

  it('should return pay deposit action for CUSTOMER when status is PENDING_PAYMENT', () => {
    const action = getNextActionForBooking(baseBooking, 'CUSTOMER');
    expect(action).not.toBeNull();
    expect(action?.targetStatus).toBe('DEPOSIT_PAID');
    expect(action?.label).toContain('THANH TOÁN TIỀN CỌC');
  });

  it('should return reschedule option for CUSTOMER when status is CONFIRMED', () => {
    const confirmedBooking = { ...baseBooking, bookingStatus: 'CONFIRMED' as BookingStatus };
    const action = getNextActionForBooking(confirmedBooking, 'CUSTOMER');
    expect(action?.targetStatus).toBe('RESCHEDULED');
  });

  it('should return check-in action for STAFF when booking is CONFIRMED', () => {
    const confirmedBooking = { ...baseBooking, bookingStatus: 'CONFIRMED' as BookingStatus };
    const action = getNextActionForBooking(confirmedBooking, 'STAFF');
    expect(action?.targetStatus).toBe('CHECKED_IN');
    expect(action?.label).toContain('CHECK-IN');
  });

  it('should return shooting start action for STAFF when booking is CHECKED_IN', () => {
    const checkedInBooking = { ...baseBooking, bookingStatus: 'CHECKED_IN' as BookingStatus };
    const action = getNextActionForBooking(checkedInBooking, 'STAFF');
    expect(action?.targetStatus).toBe('SHOOTING');
  });

  it('should return confirm deposit action for MANAGER when status is DEPOSIT_PAID', () => {
    const depositPaidBooking = { ...baseBooking, bookingStatus: 'DEPOSIT_PAID' as BookingStatus };
    const action = getNextActionForBooking(depositPaidBooking, 'MANAGER');
    expect(action?.targetStatus).toBe('CONFIRMED');
    expect(action?.label).toContain('XÁC NHẬN CỌC');
  });

  it('should return null if no action is valid for the role and status', () => {
    const completedBooking = { ...baseBooking, bookingStatus: 'COMPLETED' as BookingStatus };
    const action = getNextActionForBooking(completedBooking, 'STAFF');
    expect(action).toBeNull();
  });
});

describe('bookingStateMachine - filterBookingsForRole', () => {
  const bookings: Booking[] = [
    {
      id: 'bk_01',
      bookingCode: 'MIPA-01',
      customerId: 'cust_01',
      customerName: 'Customer A',
      customerPhone: '0901111111',
      customerEmail: 'cust_a@gmail.com',
      serviceId: 'srv_1',
      serviceName: 'Concept',
      packageId: 'pkg_1',
      packageName: 'Pkg 1',
      packagePrice: 1000000,
      subtotal: 1000000,
      discount: 0,
      addons: [],
      bookingDate: '2026-08-15',
      startTime: '10:00',
      endTime: '12:00',
      studioId: 'rm_1',
      studioName: 'Room 1',
      totalAmount: 1000000,
      depositAmount: 300000,
      paymentStatus: 'DEPOSIT_PAID',
      bookingStatus: 'CONFIRMED',
      assignments: [
        {
          id: 'asg_1',
          bookingId: 'MIPA-01',
          employeeId: 'emp_staff_01',
          employeeName: 'Photographer Minh',
          assignmentRole: 'PHOTOGRAPHER',
          startTime: '10:00',
          endTime: '12:00',
        },
      ],
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'bk_02',
      bookingCode: 'MIPA-02',
      customerId: 'cust_02',
      customerName: 'Customer B',
      customerPhone: '0902222222',
      customerEmail: 'cust_b@gmail.com',
      serviceId: 'srv_2',
      serviceName: 'Family',
      packageId: 'pkg_2',
      packageName: 'Pkg 2',
      packagePrice: 2000000,
      subtotal: 2000000,
      discount: 0,
      addons: [],
      bookingDate: '2026-08-16',
      startTime: '14:00',
      endTime: '16:00',
      studioId: 'rm_2',
      studioName: 'Room 2',
      totalAmount: 2000000,
      depositAmount: 600000,
      paymentStatus: 'UNPAID',
      bookingStatus: 'PENDING_PAYMENT',
      assignments: [],
      createdAt: '2026-08-02',
      updatedAt: '2026-08-02',
    },
  ];

  it('should return empty list for GUEST or null user', () => {
    expect(filterBookingsForRole(bookings, null, 'GUEST')).toEqual([]);
  });

  it('should return all bookings for ADMIN and MANAGER', () => {
    const adminUser: User = {
      id: 'admin_01',
      fullName: 'Admin',
      email: 'admin@maisonmipa.vn',
      phone: '0900000000',
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    expect(filterBookingsForRole(bookings, adminUser, 'ADMIN')).toHaveLength(2);
    expect(filterBookingsForRole(bookings, adminUser, 'MANAGER')).toHaveLength(2);
  });

  it('should filter bookings strictly for CUSTOMER matching their identity', () => {
    const customerUser: User = {
      id: 'cust_01',
      fullName: 'Customer A',
      email: 'cust_a@gmail.com',
      phone: '0901111111',
      role: 'CUSTOMER',
      status: 'ACTIVE',
    };
    const result = filterBookingsForRole(bookings, customerUser, 'CUSTOMER');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('bk_01');
  });

  it('should filter bookings for STAFF matching assignment or active coordination status', () => {
    const staffUser: User = {
      id: 'emp_staff_01',
      fullName: 'Minh Hoàng',
      email: 'minh@maisonmipa.vn',
      phone: '0903333333',
      role: 'STAFF',
      staffRole: 'PHOTOGRAPHER',
      status: 'ACTIVE',
    };
    const result = filterBookingsForRole(bookings, staffUser, 'STAFF');
    expect(result.some((b) => b.id === 'bk_01')).toBe(true);
  });
});

describe('bookingStateMachine - getOperationsInboxStats', () => {
  const templateBooking = (id: string, bookingStatus: BookingStatus): Booking => ({
    id,
    bookingCode: `B${id}`,
    customerId: `c${id}`,
    customerName: `N${id}`,
    customerPhone: `P${id}`,
    customerEmail: `E${id}`,
    serviceId: `s${id}`,
    serviceName: `S${id}`,
    packageId: `p${id}`,
    packageName: `P${id}`,
    packagePrice: 100,
    subtotal: 100,
    discount: 0,
    addons: [],
    bookingDate: '2026-08-01',
    startTime: '10:00',
    endTime: '12:00',
    studioId: 'r1',
    studioName: 'R1',
    totalAmount: 100,
    depositAmount: 30,
    paymentStatus: 'UNPAID',
    bookingStatus,
    assignments: [],
    createdAt: '2026-08-01',
    updatedAt: '2026-08-01',
  });

  it('should correctly calculate inbox operational metrics', () => {
    const testBookings: Booking[] = [
      templateBooking('1', 'PENDING_PAYMENT'),
      templateBooking('2', 'DEPOSIT_PAID'),
      templateBooking('3', 'SHOOTING'),
    ];

    const stats = getOperationsInboxStats(testBookings);
    expect(stats.pendingDepositCount).toBe(1);
    expect(stats.pendingConfirmationCount).toBe(1);
    expect(stats.shootingNowCount).toBe(1);
    expect(stats.unassignedStaffCount).toBe(1); // B2 is DEPOSIT_PAID with 0 assignments
  });
});
