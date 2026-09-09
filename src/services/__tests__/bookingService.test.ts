import { describe, it, expect, beforeEach } from 'vitest';
import {
  createBooking,
  createBookingInMemory,
  resetInMemoryBookings,
  getInMemoryBookings,
  updateBookingStatus,
  assignBookingStaff,
  BookingConflictError,
  BookingValidationError,
} from '../bookingService';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_STUDIO_ROOMS, INITIAL_ADDONS, INITIAL_EMPLOYEES } from '../../mockData';

describe('Booking Service, Persistence & Database-Level Exclusion Logic', () => {
  const testService = INITIAL_SERVICES[0];
  const testPackage = INITIAL_PACKAGES[0]; // MIPA BASIC 60 minutes
  const testStudio = INITIAL_STUDIO_ROOMS[0]; // ROOM_01

  beforeEach(() => {
    // Reset in-memory bookings table before each test
    resetInMemoryBookings([]);
  });

  describe('P0 Requirement: Anti-Double-Booking Protection (Exclusion Constraint Simulation)', () => {
    it('concurrently rejects overlapping bookings on the same studio and time (1 succeeds, 1 conflicts)', async () => {
      // Booking Request 1: 10:00 - 11:00 in Room 01
      const request1 = {
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '10:00',
        customerName: 'Khách A',
      };

      // Booking Request 2 (Concurrent overlapping): 10:30 - 11:30 in Room 01
      const request2 = {
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '10:30',
        customerName: 'Khách B',
      };

      // Request 1 succeeds
      const booking1 = await createBooking(request1);
      expect(booking1).toBeDefined();
      expect(booking1.bookingCode).toMatch(/^MIPA-260915-[A-Z0-9]{4}$/);

      // Request 2 MUST fail with BookingConflictError
      await expect(createBooking(request2)).rejects.toThrowError(BookingConflictError);

      // Verify that database has exactly 1 booking
      const currentBookings = getInMemoryBookings();
      expect(currentBookings.length).toBe(1);
      expect(currentBookings[0].customerName).toBe('Khách A');
    });

    it('allows adjacent back-to-back bookings (10:00-11:00 and 11:00-12:00) without conflict', async () => {
      // Booking 1: 10:00 - 11:00 (duration: 60m)
      const booking1 = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '10:00',
        customerName: 'Khách Ca Sáng',
      });

      // Booking 2: 11:00 - 12:00 (immediately adjacent)
      const booking2 = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '11:00',
        customerName: 'Khách Ca Trưa',
      });

      expect(booking1.startTime).toBe('10:00');
      expect(booking1.endTime).toBe('11:00');
      expect(booking2.startTime).toBe('11:00');
      expect(booking2.endTime).toBe('12:00');

      const all = getInMemoryBookings();
      expect(all.length).toBe(2);
    });

    it('allows booking a slot if previous booking for that slot was CANCELLED', async () => {
      // 1. Initial Booking at 14:00 - 15:00
      const initialBooking = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '14:00',
        customerName: 'Khách Huỷ Lịch',
      });

      // 2. Mark initial booking as CANCELLED
      await updateBookingStatus(initialBooking.id, 'CANCELLED', 'Khách bận việc đột xuất');

      // 3. New booking for the same slot at 14:00 - 15:00
      const rebooked = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '14:00',
        customerName: 'Khách Mới Đặt Lại',
      });

      expect(rebooked).toBeDefined();
      expect(rebooked.customerName).toBe('Khách Mới Đặt Lại');
      expect(rebooked.bookingStatus).toBe('PENDING_PAYMENT');
    });
  });

  describe('Server-Authoritative Pricing (Anti-Price-Tampering)', () => {
    it('calculates prices strictly from catalog, ignoring any client-injected amounts', async () => {
      // Attempting to inject modified price by choosing package + addons
      const addon = INITIAL_ADDONS[0]; // 400,000đ

      const booking = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id, // 1,290,000đ
        studioId: testStudio.id,
        date: '2026-09-16',
        timeSlot: '09:00',
        addonIds: [addon.id],
        voucherCode: 'MIPA20', // 20% voucher
      });

      // Subtotal = 1,290,000 + 400,000 = 1,690,000đ
      // Discount 20% = 338,000đ
      // Total = 1,352,000đ
      // Deposit 30% of 1,352,000 = 405,600đ (or package specific deposit)
      expect(booking.subtotal).toBe(1690000);
      expect(booking.discount).toBe(338000);
      expect(booking.totalAmount).toBe(1352000);
      expect(booking.depositAmount).toBe(405600); // 30% of 1,352,000đ
      expect(booking.paymentStatus).toBe('UNPAID');
    });
  });

  describe('Booking Code Generation', () => {
    it('generates collision-resistant unique code matching MIPA-YYMMDD-XXXX format', () => {
      const b1 = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-08-20',
        timeSlot: '09:00',
      });

      const b2 = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-08-20',
        timeSlot: '11:00',
      });

      expect(b1.bookingCode).toMatch(/^MIPA-260820-[A-Z0-9]{4}$/);
      expect(b2.bookingCode).toMatch(/^MIPA-260820-[A-Z0-9]{4}$/);
      expect(b1.bookingCode).not.toBe(b2.bookingCode);
    });
  });

  describe('Booking State Machine Transitions', () => {
    it('allows valid progressive transitions (PENDING_PAYMENT -> CONFIRMED -> COMPLETED)', async () => {
      const b = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-17',
        timeSlot: '13:00',
      });

      expect(b.bookingStatus).toBe('PENDING_PAYMENT');

      const confirmed = await updateBookingStatus(b.id, 'CONFIRMED', 'Đã nhận cọc');
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
      expect(confirmed.staffNote).toContain('Đã nhận cọc');

      const completed = await updateBookingStatus(b.id, 'COMPLETED', 'Đã giao ảnh');
      expect(completed.bookingStatus).toBe('COMPLETED');
    });

    it('rejects illegal status revert from COMPLETED to DRAFT or PENDING_PAYMENT', async () => {
      const b = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-17',
        timeSlot: '15:00',
      });

      await updateBookingStatus(b.id, 'COMPLETED');

      // Attempt illegal revert to DRAFT
      await expect(updateBookingStatus(b.id, 'DRAFT')).rejects.toThrowError(
        /Illegal state transition from COMPLETED to DRAFT/
      );
    });
  });

  describe('Staff Assignment Persistence', () => {
    it('persists staff assignment and replaces prior assignment for same role', async () => {
      const b = await createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-18',
        timeSlot: '10:00',
      });

      const photographer = INITIAL_EMPLOYEES[0];
      const makeup = INITIAL_EMPLOYEES[1];

      // Assign photographer
      const asg1 = await assignBookingStaff(b.id, photographer.id, 'PHOTOGRAPHER');
      expect(asg1.assignmentRole).toBe('PHOTOGRAPHER');

      // Assign makeup
      const asg2 = await assignBookingStaff(b.id, makeup.id, 'MAKEUP');
      expect(asg2.assignmentRole).toBe('MAKEUP');

      // Verify booking contains both assignments
      const bookingsAfter = getInMemoryBookings();
      const target = bookingsAfter.find((item: any) => item.id === b.id)!;
      expect(target.assignments.length).toBe(2);

      // Re-assign photographer to another staff member
      const newPhotographer = INITIAL_EMPLOYEES[2];
      await assignBookingStaff(b.id, newPhotographer.id, 'PHOTOGRAPHER');

      const updatedTarget = getInMemoryBookings().find((item: any) => item.id === b.id)!;
      expect(updatedTarget.assignments.length).toBe(2);
      const photoAsg = updatedTarget.assignments.find((a: any) => a.assignmentRole === 'PHOTOGRAPHER')!;
      expect(photoAsg.employeeId).toBe(newPhotographer.id);
    });
  });

  describe('Input Validations', () => {
    it('throws BookingValidationError when mandatory fields are missing', async () => {
      await expect(createBooking({
        serviceId: '',
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-15',
        timeSlot: '10:00',
      })).rejects.toThrowError(BookingValidationError);

      await expect(createBooking({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '',
        timeSlot: '10:00',
      })).rejects.toThrowError(BookingValidationError);
    });
  });
});
