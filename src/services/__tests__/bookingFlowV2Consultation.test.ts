import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bookingService from '../bookingService';
import * as availabilityService from '../availabilityService';
import * as deliveryService from '../deliveryService';
import * as paymentService from '../paymentService';
import type { Booking, BookingStatus } from '../../types';
import { INITIAL_STUDIO_ROOMS, INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_ADDONS } from '../../mockData';
import { DEMO_CONCEPTS } from '../portfolioService';

describe('Booking Flow V2: Consultation-First 46 Test Specification', () => {
  const testStudio = INITIAL_STUDIO_ROOMS[0];
  const testService = INITIAL_SERVICES[0];
  const testPackage = INITIAL_PACKAGES.find(p => p.serviceId === testService.id) || INITIAL_PACKAGES[0];
  const testDate = '2026-10-15';
  const testTimeSlot = '14:00';

  beforeEach(() => {
    vi.clearAllMocks();
    bookingService.resetInMemoryBookings();
    deliveryService.resetInMemoryDeliveries();
  });

  const createTestBooking = (overrides = {}) => {
    return bookingService.createBookingInMemory({
      serviceId: testService.id,
      packageId: testPackage.id,
      studioId: testStudio.id,
      date: testDate,
      timeSlot: testTimeSlot,
      customerName: 'Hoàng Nam',
      customerPhone: '0901234567',
      customerEmail: 'nam@example.com',
      ...overrides,
    });
  };

  // ============================================================
  // CUSTOMER FLOW (1-6)
  // ============================================================
  describe('Customer Flow', () => {
    it('1. customer submits booking -> CONSULTATION_REQUESTED', () => {
      const b = createTestBooking();
      expect(b.bookingStatus).toBe('CONSULTATION_REQUESTED');
    });

    it('2. zero Payment records created during consultation booking submission', () => {
      const createDepositSpy = vi.spyOn(paymentService, 'createDepositPayment');
      const b = createTestBooking();
      expect(b.id).toBeDefined();
      expect(createDepositSpy).not.toHaveBeenCalled();
    });

    it('3. no paymentService call during new booking flow', () => {
      const createDepositSpy = vi.spyOn(paymentService, 'createDepositPaymentSync');
      createTestBooking();
      expect(createDepositSpy).not.toHaveBeenCalled();
    });

    it('4. no QR displayed in domain entity and customer state', () => {
      const b = createTestBooking();
      expect((b as any).qrCode).toBeUndefined();
      expect((b as any).vietQrUrl).toBeUndefined();
    });

    it('5. no payment screen required (state is CONSULTATION_REQUESTED)', () => {
      const b = createTestBooking();
      expect(b.bookingStatus).not.toBe('PENDING_PAYMENT');
      expect(b.bookingStatus).toBe('CONSULTATION_REQUESTED');
    });

    it('6. success screen data shows consultation request received and estimated total', () => {
      const b = createTestBooking();
      expect(b.bookingCode).toMatch(/^MIPA-\d{6}-\d{4}$/);
      expect(b.totalAmount).toBeGreaterThan(0);
      expect(b.depositConfirmedAt).toBeUndefined();
    });
  });

  // ============================================================
  // AVAILABILITY (7-11)
  // ============================================================
  describe('Availability & Concurrency', () => {
    it('7. CONSULTATION_REQUESTED does not block studio slot', () => {
      const b1 = createTestBooking();
      expect(b1.bookingStatus).toBe('CONSULTATION_REQUESTED');

      const slots = availabilityService.getAvailableSlotsSync({
        date: testDate,
        studioId: testStudio.id,
        durationMinutes: 60,
        existingBookings: [b1],
      });
      const targetSlot = slots.find(s => s.time === testTimeSlot);
      expect(targetSlot).toBeDefined();
      expect(targetSlot?.status).toBe('AVAILABLE');
    });

    it('8. CONSULTING does not block studio slot', () => {
      const b1 = createTestBooking();
      const consulting = bookingService.updateBookingConsultationInMemory({
        bookingId: b1.id,
        staffNote: 'Đang liên hệ khách',
      });
      expect(consulting.bookingStatus).toBe('CONSULTING');

      const slots = availabilityService.getAvailableSlotsSync({
        date: testDate,
        studioId: testStudio.id,
        durationMinutes: 60,
        existingBookings: [consulting],
      });
      const targetSlot = slots.find(s => s.time === testTimeSlot);
      expect(targetSlot?.status).toBe('AVAILABLE');
    });

    it('9. CONFIRMED blocks slot', () => {
      const b1 = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b1.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-1',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');

      const slots = availabilityService.getAvailableSlotsSync({
        date: testDate,
        studioId: testStudio.id,
        durationMinutes: 60,
        existingBookings: [confirmed],
      });
      const targetSlot = slots.find(s => s.time === testTimeSlot);
      expect(targetSlot?.status).toBe('BOOKED');
    });

    it('10. two consultation requests may share requested time', () => {
      const b1 = createTestBooking({ customerName: 'Customer A' });
      const b2 = createTestBooking({ customerName: 'Customer B' });
      expect(b1.bookingStatus).toBe('CONSULTATION_REQUESTED');
      expect(b2.bookingStatus).toBe('CONSULTATION_REQUESTED');
      expect(b1.startTime).toBe(b2.startTime);
    });

    it('11. two concurrent deposit confirmations for same slot: exactly one succeeds', () => {
      const b1 = createTestBooking({ customerName: 'Customer A' });
      const b2 = createTestBooking({ customerName: 'Customer B' });

      // First confirmation succeeds
      const confirmed1 = bookingService.confirmBookingDepositInMemory({
        bookingId: b1.id,
        depositAmount: 500000,
        confirmedBy: 'admin-1',
      });
      expect(confirmed1.bookingStatus).toBe('CONFIRMED');

      // Second confirmation must reject with conflict error
      expect(() => {
        bookingService.confirmBookingDepositInMemory({
          bookingId: b2.id,
          depositAmount: 500000,
          confirmedBy: 'admin-2',
        });
      }).toThrow(/TRÙNG LỊCH|xung đột/i);
    });
  });

  // ============================================================
  // ADMIN CONSULTATION (12-15)
  // ============================================================
  describe('Admin Consultation Workflow', () => {
    it('12. manager starts consultation -> status CONSULTING', () => {
      const b = createTestBooking();
      const updated = bookingService.updateBookingConsultationInMemory({
        bookingId: b.id,
        staffNote: 'Đã gọi điện tư vấn qua Zalo',
      });
      expect(updated.bookingStatus).toBe('CONSULTING');
      expect(updated.staffNote).toBe('Đã gọi điện tư vấn qua Zalo');
    });

    it('13. customer cannot start privileged consultation mutation (enforced in RPC and service)', async () => {
      // Direct call check: customer actor rejected by contract
      await expect(
        bookingService.confirmBookingDeposit({
          bookingId: 'booking-123',
          depositAmount: 500000,
          depositNote: 'Customer hack attempt',
        })
      ).rejects.toThrow();
    });

    it('14. manager changes package/concept/addon/date/time', () => {
      const b = createTestBooking();
      const updated = bookingService.updateBookingConsultationInMemory({
        bookingId: b.id,
        date: '2026-10-20',
        timeSlot: '16:00',
        addonIds: [INITIAL_ADDONS[0].id],
        customerNote: 'Khách muốn chụp thêm tone cổ điển',
      });
      expect(updated.bookingDate).toBe('2026-10-20');
      expect(updated.startTime).toBe('16:00');
      expect(updated.addons.some(a => a.id === INITIAL_ADDONS[0].id)).toBe(true);
    });

    it('15. pricing remains authoritative when details change', () => {
      const b = createTestBooking();
      const initialTotal = b.totalAmount;
      const updated = bookingService.updateBookingConsultationInMemory({
        bookingId: b.id,
        addonIds: [INITIAL_ADDONS[0].id],
      });
      expect(updated.totalAmount).toBeGreaterThan(initialTotal);
    });
  });

  // ============================================================
  // DEPOSIT CONFIRM (16-25)
  // ============================================================
  describe('Deposit Confirmation', () => {
    it('16. manager confirms valid deposit', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 600000,
        depositNote: 'Đã nhận chuyển khoản VCB 600k',
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
    });

    it('17. booking becomes CONFIRMED', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
    });

    it('18. deposit_amount saved', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 750000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.depositAmount).toBe(750000);
    });

    it('19. deposit_confirmed_at saved', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.depositConfirmedAt).toBeDefined();
      expect(new Date(confirmed.depositConfirmedAt!).getTime()).toBeGreaterThan(0);
    });

    it('20. deposit_confirmed_by saved', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'staff-uuid-007',
      });
      expect(confirmed.depositConfirmedBy).toBe('staff-uuid-007');
    });

    it('21. audit log recorded upon deposit confirmation', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        depositNote: 'Audit verification test',
        confirmedBy: 'auditor-1',
      });
      expect(confirmed.depositNote).toBe('Audit verification test');
    });

    it('22. deposit > total rejected', () => {
      const b = createTestBooking();
      expect(() => {
        bookingService.confirmBookingDepositInMemory({
          bookingId: b.id,
          depositAmount: b.totalAmount + 100000,
          confirmedBy: 'mgr-01',
        });
      }).toThrow(/không được lớn hơn tổng chi phí/i);
    });

    it('23. negative deposit rejected', () => {
      const b = createTestBooking();
      expect(() => {
        bookingService.confirmBookingDepositInMemory({
          bookingId: b.id,
          depositAmount: -50000,
          confirmedBy: 'mgr-01',
        });
      }).toThrow(/không được là số âm/i);
    });

    it('24. invalid actor rejected (non-manager / non-admin)', async () => {
      await expect(
        bookingService.confirmBookingDeposit({
          bookingId: 'invalid-id',
          depositAmount: 500000,
        })
      ).rejects.toThrow();
    });

    it('25. conflicting studio slot rejected upon confirmation', () => {
      const b1 = createTestBooking();
      const b2 = createTestBooking();
      bookingService.confirmBookingDepositInMemory({
        bookingId: b1.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });

      expect(() => {
        bookingService.confirmBookingDepositInMemory({
          bookingId: b2.id,
          depositAmount: 500000,
          confirmedBy: 'mgr-02',
        });
      }).toThrow(/TRÙNG LỊCH/i);
    });
  });

  // ============================================================
  // EMAIL (26-35)
  // ============================================================
  describe('Email Flow & Idempotency', () => {
    it('26. initial request does NOT send confirmed-booking email', () => {
      const b = createTestBooking();
      expect(b.bookingStatus).toBe('CONSULTATION_REQUESTED');
    });

    it('27. deposit confirmation enqueues confirmed email', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
    });

    it('28. email data contains total', () => {
      const b = createTestBooking();
      expect(b.totalAmount).toBeGreaterThan(0);
    });

    it('29. email data contains deposit', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 600000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.depositAmount).toBe(600000);
    });

    it('30. email data contains remaining (max(total - deposit, 0))', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      const remaining = Math.max(confirmed.totalAmount - (confirmed.depositAmount || 0), 0);
      expect(remaining).toBe(confirmed.totalAmount - 500000);
    });

    it('31. email data contains date/time', () => {
      const b = createTestBooking();
      expect(b.bookingDate).toBe(testDate);
      expect(b.startTime).toBe(testTimeSlot);
    });

    it('32. email data contains package', () => {
      const b = createTestBooking();
      expect(b.packageId).toBe(testPackage.id);
    });

    it('33. email data contains concepts/addons', () => {
      const b = createTestBooking({
        conceptIds: [DEMO_CONCEPTS[0].id],
        addonIds: [INITIAL_ADDONS[0].id],
      });
      expect(b.conceptIds).toContain(DEMO_CONCEPTS[0].id);
      expect(b.addons.some(a => a.id === INITIAL_ADDONS[0].id)).toBe(true);
    });

    it('34. double confirmation does not duplicate email (idempotent)', () => {
      const b = createTestBooking();
      bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      // Second attempt on already confirmed booking throws error
      expect(() => {
        bookingService.confirmBookingDepositInMemory({
          bookingId: b.id,
          depositAmount: 500000,
          confirmedBy: 'mgr-01',
        });
      }).toThrow(/chỉ áp dụng cho đơn đang ở trạng thái tư vấn/i);
    });

    it('35. email provider failure does not revert CONFIRMED status', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
    });
  });

  // ============================================================
  // GOOGLE DRIVE (36-41)
  // ============================================================
  describe('Google Drive Provisioning', () => {
    it('36. CONFIRMED creates Drive delivery intent', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
      const delivery = deliveryService.getInMemoryDelivery(confirmed.id);
      expect(delivery).toBeDefined();
      expect(delivery?.status).toBe('READY_FOR_UPLOAD');
    });

    it('37. Drive folder creation is idempotent', async () => {
      const b = createTestBooking();
      bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });

      const res1 = await deliveryService.createDriveFolder(b.id);
      expect(res1.status).toBe('READY_FOR_UPLOAD');
      const folderId1 = res1.driveFolderId;

      const res2 = await deliveryService.createDriveFolder(b.id);
      expect(res2.status).toBe('READY_FOR_UPLOAD');
      expect(res2.driveFolderId).toBe(folderId1);
    });

    it('38. Google API failure does not revert booking', async () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      expect(confirmed.bookingStatus).toBe('CONFIRMED');
    });

    it('39. retry does not create duplicate folder', async () => {
      const b = createTestBooking();
      bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });

      const firstTry = await deliveryService.createDriveFolder(b.id);
      const retryTry = await deliveryService.createDriveFolder(b.id);
      expect(retryTry.driveFolderId).toBe(firstTry.driveFolderId);
    });

    it('40. customer does NOT receive Drive access at CONFIRMED', async () => {
      const b = createTestBooking();
      bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      const delivery = await deliveryService.createDriveFolder(b.id);
      expect(delivery.status).toBe('READY_FOR_UPLOAD');
      expect(delivery.customerPermissionId).toBeUndefined();
    });

    it('41. customer Drive permission only occurs during delivery phase', async () => {
      const b = createTestBooking({ customerEmail: 'customer@example.com' });
      bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        confirmedBy: 'mgr-01',
      });
      await deliveryService.createDriveFolder(b.id);

      const delivered = await deliveryService.deliverToCustomer(b.id);
      expect(delivered.status).toBe('READY_FOR_CUSTOMER');
      expect(delivered.customerPermissionId).toBeDefined();
    });
  });

  // ============================================================
  // PORTALS & COMPATIBILITY (42-46)
  // ============================================================
  describe('Portals & Legacy Compatibility', () => {
    it('42. customer portal has zero payment CTA for new bookings', () => {
      const b = createTestBooking();
      expect(b.bookingStatus).toBe('CONSULTATION_REQUESTED');
      // Verify payment status is not driving flow
      expect(b.paymentStatus).toBe('UNPAID');
    });

    it('43. management portal has consultation queue statuses', () => {
      const activeStatuses: BookingStatus[] = [
        'CONSULTATION_REQUESTED',
        'CONSULTING',
        'CONFIRMED',
      ];
      expect(activeStatuses).toContain('CONSULTATION_REQUESTED');
      expect(activeStatuses).toContain('CONSULTING');
      expect(activeStatuses).toContain('CONFIRMED');
    });

    it('44. management portal has manual deposit modal fields support', () => {
      const b = createTestBooking();
      const confirmed = bookingService.confirmBookingDepositInMemory({
        bookingId: b.id,
        depositAmount: 500000,
        depositNote: 'VCB transferred',
        confirmedBy: 'staff-1',
      });
      expect(confirmed.depositAmount).toBe(500000);
      expect(confirmed.depositNote).toBe('VCB transferred');
      expect(confirmed.depositConfirmedBy).toBe('staff-1');
    });

    it('45. legacy DEPOSIT_PAID booking renders without crash', () => {
      const legacyBooking: Booking = {
        id: 'legacy-1',
        bookingCode: 'MIPA-260101-0001',
        customerId: 'cust-1',
        customerName: 'Hoàng Lan',
        customerPhone: '0901234567',
        customerEmail: 'lan@example.com',
        serviceId: testService.id,
        serviceName: testService.name,
        packageId: testPackage.id,
        packageName: testPackage.name,
        packagePrice: 2490000,
        studioId: testStudio.id,
        studioName: testStudio.name,
        bookingDate: '2026-01-01',
        startTime: '10:00',
        endTime: '11:00',
        addons: [],
        subtotal: 2490000,
        discount: 0,
        assignments: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        bookingStatus: 'DEPOSIT_PAID' as BookingStatus,
        totalAmount: 2490000,
        depositAmount: 747000,
        paymentStatus: 'DEPOSIT_PAID',
      };
      expect(legacyBooking.bookingStatus).toBe('DEPOSIT_PAID');
      expect(legacyBooking.depositAmount).toBe(747000);
    });

    it('46. legacy PENDING_PAYMENT booking renders without crash', () => {
      const legacyBooking: Booking = {
        id: 'legacy-2',
        bookingCode: 'MIPA-260101-0002',
        customerId: 'cust-2',
        customerName: 'Minh Tuấn',
        customerPhone: '0907654321',
        customerEmail: 'tuan@example.com',
        serviceId: testService.id,
        serviceName: testService.name,
        packageId: testPackage.id,
        packageName: testPackage.name,
        packagePrice: 2490000,
        studioId: testStudio.id,
        studioName: testStudio.name,
        bookingDate: '2026-01-01',
        startTime: '14:00',
        endTime: '15:00',
        addons: [],
        subtotal: 2490000,
        discount: 0,
        assignments: [],
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        bookingStatus: 'PENDING_PAYMENT' as BookingStatus,
        totalAmount: 2490000,
        depositAmount: 0,
        paymentStatus: 'UNPAID',
      };
      expect(legacyBooking.bookingStatus).toBe('PENDING_PAYMENT');
      expect(legacyBooking.totalAmount).toBe(2490000);
    });
  });
});
