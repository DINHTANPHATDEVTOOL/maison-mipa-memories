import { describe, it, expect } from 'vitest';
import {
  ALLOWED_TRANSITIONS,
  getNextActionForBooking,
  filterBookingsForRole,
} from '../../utils/bookingStateMachine';
import type { Booking, User } from '../../types';

describe('Role, RBAC & ABAC State Machine Enforcement (Phase B & C)', () => {
  const customerA: User = {
    id: 'user_cust_a',
    fullName: 'Khách Hàng A',
    name: 'Khách Hàng A',
    email: 'khachA@gmail.com',
    phone: '0901111111',
    role: 'CUSTOMER',
    avatar: '',
  };

  const customerB: User = {
    id: 'user_cust_b',
    fullName: 'Khách Hàng B',
    name: 'Khách Hàng B',
    email: 'khachB@gmail.com',
    phone: '0902222222',
    role: 'CUSTOMER',
    avatar: '',
  };

  const receptionistUser: User = {
    id: 'emp_rec_01',
    fullName: 'Tiếp Tân Minh',
    name: 'Tiếp Tân Minh',
    email: 'tieptan@mipa.vn',
    phone: '0903333333',
    role: 'STAFF',
    staffRole: 'RECEPTIONIST',
    avatar: '',
  };

  const photographerUser: User = {
    id: 'emp_photo_01',
    fullName: 'Nhiếp Ảnh Gia Lâm',
    name: 'Nhiếp Ảnh Gia Lâm',
    email: 'lam.photo@mipa.vn',
    phone: '0904444444',
    role: 'STAFF',
    staffRole: 'PHOTOGRAPHER',
    avatar: '',
  };

  const makeupUser: User = {
    id: 'emp_mu_01',
    fullName: 'Makeup Artist Trang',
    name: 'Makeup Artist Trang',
    email: 'trang.mu@mipa.vn',
    phone: '0905555555',
    role: 'STAFF',
    staffRole: 'MAKEUP',
    avatar: '',
  };

  const editorUser: User = {
    id: 'emp_edit_01',
    fullName: 'Editor Hoàng',
    name: 'Editor Hoàng',
    email: 'hoang.editor@mipa.vn',
    phone: '0906666666',
    role: 'STAFF',
    staffRole: 'EDITOR',
    avatar: '',
  };

  const managerUser: User = {
    id: 'user_mgr_01',
    fullName: 'Quản Lý Hà',
    name: 'Quản Lý Hà',
    email: 'manager@mipa.vn',
    phone: '0907777777',
    role: 'MANAGER',
    avatar: '',
  };

  const sampleBookings: Booking[] = [
    {
      id: 'bk_a_001',
      bookingCode: 'MIPA-260901-001',
      customerId: 'user_cust_a',
      customerName: 'Khách Hàng A',
      customerPhone: '0901111111',
      customerEmail: 'khachA@gmail.com',
      serviceId: 'srv_photo',
      serviceName: 'Chụp Studio',
      packageId: 'pkg_couple',
      packageName: 'Gói Couple',
      packagePrice: 2000000,
      bookingDate: '2026-09-10',
      startTime: '09:00',
      endTime: '11:00',
      studioId: 'rm_01',
      studioName: 'Phòng 01',
      addons: [],
      subtotal: 2000000,
      discount: 0,
      depositAmount: 600000,
      totalAmount: 2000000,
      paymentStatus: 'DEPOSIT_PAID',
      bookingStatus: 'CONFIRMED',
      assignments: [
        {
          id: 'asg_1',
          bookingId: 'bk_a_001',
          employeeId: 'emp_photo_01',
          employeeName: 'Nhiếp Ảnh Gia Lâm',
          assignmentRole: 'PHOTOGRAPHER',
          startTime: '09:00',
          endTime: '11:00',
        },
      ],
      createdAt: '2026-09-01',
      updatedAt: '2026-09-01',
    },
    {
      id: 'bk_b_002',
      bookingCode: 'MIPA-260901-002',
      customerId: 'user_cust_b',
      customerName: 'Khách Hàng B',
      customerPhone: '0902222222',
      customerEmail: 'khachB@gmail.com',
      serviceId: 'srv_photo',
      serviceName: 'Chụp Studio',
      packageId: 'pkg_couple',
      packageName: 'Gói Couple',
      packagePrice: 2000000,
      bookingDate: '2026-09-10',
      startTime: '13:00',
      endTime: '15:00',
      studioId: 'rm_01',
      studioName: 'Phòng 01',
      addons: [],
      subtotal: 2000000,
      discount: 0,
      depositAmount: 600000,
      totalAmount: 2000000,
      paymentStatus: 'DEPOSIT_PAID',
      bookingStatus: 'SHOOT_COMPLETED',
      assignments: [
        {
          id: 'asg_2',
          bookingId: 'bk_b_002',
          employeeId: 'emp_edit_01',
          employeeName: 'Editor Hoàng',
          assignmentRole: 'EDITOR',
          startTime: '15:00',
          endTime: '18:00',
        },
      ],
      createdAt: '2026-09-01',
      updatedAt: '2026-09-01',
    },
  ];

  describe('Isolation: Customer A vs Customer B', () => {
    it('Customer A only views bookings where customerId matches auth.uid (cannot view Customer B)', () => {
      const filteredForA = filterBookingsForRole(sampleBookings, customerA, 'CUSTOMER');
      expect(filteredForA.length).toBe(1);
      expect(filteredForA[0].id).toBe('bk_a_001');
      expect(filteredForA[0].customerId).toBe(customerA.id);

      const filteredForB = filterBookingsForRole(sampleBookings, customerB, 'CUSTOMER');
      expect(filteredForB.length).toBe(1);
      expect(filteredForB[0].id).toBe('bk_b_002');
      expect(filteredForB[0].customerId).toBe(customerB.id);
    });

    it('Customer cannot set PAID or DEPOSIT_PAID operational status', () => {
      const transitionsPending = ALLOWED_TRANSITIONS['PENDING_PAYMENT'];
      const depositPaidAllowedRoles = transitionsPending.find(t => t.next.includes('DEPOSIT_PAID'))?.allowedRoles || [];
      expect(depositPaidAllowedRoles).not.toContain('CUSTOMER');

      const action = getNextActionForBooking(sampleBookings[0], 'CUSTOMER');
      expect(action).toBeNull();
    });
  });

  describe('Staff Roles ABAC Authorization', () => {
    it('Receptionist: can only check-in confirmed bookings, cannot start shooting or editing', () => {
      const actionConfirmed = getNextActionForBooking(sampleBookings[0], 'STAFF', 'RECEPTIONIST');
      expect(actionConfirmed?.targetStatus).toBe('CHECKED_IN');
      expect(actionConfirmed?.label).toContain('CHECK-IN');

      const shootingBooking: Booking = { ...sampleBookings[0], bookingStatus: 'CHECKED_IN' };
      const actionShooting = getNextActionForBooking(shootingBooking, 'STAFF', 'RECEPTIONIST');
      expect(actionShooting).toBeNull();

      const editingBooking: Booking = { ...sampleBookings[0], bookingStatus: 'SHOOT_COMPLETED' };
      const actionEditing = getNextActionForBooking(editingBooking, 'STAFF', 'RECEPTIONIST');
      expect(actionEditing).toBeNull();
    });

    it('Photographer: only sees assigned bookings and transitions CHECKED_IN -> SHOOTING -> SHOOT_COMPLETED', () => {
      const filteredForPhoto = filterBookingsForRole(sampleBookings, photographerUser, 'STAFF');
      expect(filteredForPhoto.length).toBe(1);
      expect(filteredForPhoto[0].id).toBe('bk_a_001');

      const checkedInBooking: Booking = { ...sampleBookings[0], bookingStatus: 'CHECKED_IN' };
      const startShootingAction = getNextActionForBooking(checkedInBooking, 'STAFF', 'PHOTOGRAPHER');
      expect(startShootingAction?.targetStatus).toBe('SHOOTING');

      const inShootingBooking: Booking = { ...sampleBookings[0], bookingStatus: 'SHOOTING' };
      const finishShootingAction = getNextActionForBooking(inShootingBooking, 'STAFF', 'PHOTOGRAPHER');
      expect(finishShootingAction?.targetStatus).toBe('SHOOT_COMPLETED');

      // Cannot start editing or do check-in
      const editAction = getNextActionForBooking(sampleBookings[1], 'STAFF', 'PHOTOGRAPHER');
      expect(editAction).toBeNull();
    });

    it('Makeup: cannot mutate main booking operational status', () => {
      const action = getNextActionForBooking(sampleBookings[0], 'STAFF', 'MAKEUP');
      expect(action).toBeNull();
    });

    it('Editor: only sees assigned bookings and transitions SHOOT_COMPLETED -> EDITING -> READY_FOR_REVIEW', () => {
      const filteredForEditor = filterBookingsForRole(sampleBookings, editorUser, 'STAFF');
      expect(filteredForEditor.length).toBe(1);
      expect(filteredForEditor[0].id).toBe('bk_b_002');

      const shootCompletedBooking: Booking = { ...sampleBookings[1], bookingStatus: 'SHOOT_COMPLETED' };
      const startEditAction = getNextActionForBooking(shootCompletedBooking, 'STAFF', 'EDITOR');
      expect(startEditAction?.targetStatus).toBe('EDITING');

      const editingBooking: Booking = { ...sampleBookings[1], bookingStatus: 'EDITING' };
      const finishEditAction = getNextActionForBooking(editingBooking, 'STAFF', 'EDITOR');
      expect(finishEditAction?.targetStatus).toBe('READY_FOR_REVIEW');

      // Cannot check-in or start shooting
      const checkinAction = getNextActionForBooking(sampleBookings[0], 'STAFF', 'EDITOR');
      expect(checkinAction).toBeNull();
    });

    it('Manager: sees all bookings, can confirm manual payment and advance state', () => {
      const filteredForManager = filterBookingsForRole(sampleBookings, managerUser, 'MANAGER');
      expect(filteredForManager.length).toBe(2);

      const depositPaidBooking: Booking = { ...sampleBookings[0], bookingStatus: 'DEPOSIT_PAID' };
      const confirmAction = getNextActionForBooking(depositPaidBooking, 'MANAGER');
      expect(confirmAction?.targetStatus).toBe('CONFIRMED');
      expect(confirmAction?.label).toContain('XÁC NHẬN CỌC');
    });
  });
});
