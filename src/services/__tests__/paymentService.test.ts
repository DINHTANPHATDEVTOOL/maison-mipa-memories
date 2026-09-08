import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDepositPayment,
  getPayment,
  getBookingPayment,
  markTransferSubmitted,
  confirmManualPayment,
  subscribePaymentStatus,
  __testOnlyResetPaymentsStore,
} from '../paymentService';
import {
  createBookingInMemory,
  resetInMemoryBookings,
  getInMemoryBookings,
} from '../bookingService';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_STUDIO_ROOMS } from '../../mockData';

describe('Authoritative Deposit Payment Service & State Transitions', () => {
  const testService = INITIAL_SERVICES[0];
  const testPackage = INITIAL_PACKAGES[1]; // MIPA SIGNATURE
  const testStudio = INITIAL_STUDIO_ROOMS[0];

  beforeEach(() => {
    resetInMemoryBookings([]);
    __testOnlyResetPaymentsStore();
  });

  describe('1. Authoritative Deposit Amount Authority', () => {
    it('creates deposit payment with amount strictly derived from booking.depositAmount', async () => {
      const booking = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-20',
        timeSlot: '14:00',
        customerName: 'Trần Thu Hà',
        customerPhone: '0966616546',
      });

      expect(booking.depositAmount).toBeGreaterThan(0);

      // Create deposit payment - notice no amount parameter can be passed
      const payment = await createDepositPayment(booking.id, 'BANK_TRANSFER');

      expect(payment).toBeDefined();
      expect(payment.status).toBe('PENDING');
      expect(payment.amount).toBe(booking.depositAmount);
      expect(payment.booking_id).toBe(booking.id);
      expect(payment.transfer_reference).toContain('MIPA');
      expect(payment.paid_at).toBeNull();
    });

    it('returns existing PENDING payment idempotently when called multiple times', async () => {
      const booking = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-20',
        timeSlot: '15:00',
        customerName: 'Lê Hoàng Nam',
      });

      const payment1 = await createDepositPayment(booking.id);
      const payment2 = await createDepositPayment(booking.id);

      expect(payment1.id).toBe(payment2.id);
      expect(payment1.transfer_reference).toBe(payment2.transfer_reference);
    });

    it('rejects creating payment for non-existent booking', async () => {
      await expect(createDepositPayment('non-existent-uuid')).rejects.toThrowError(
        'Không tìm thấy thông tin đơn đặt lịch.'
      );
    });
  });

  describe('2. Customer Action: Transfer Submission vs PAID Authority', () => {
    it('customer marking transfer submitted only records timestamp, payment remains PENDING', async () => {
      const booking = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-20',
        timeSlot: '16:00',
        customerName: 'Phạm Minh',
      });

      const payment = await createDepositPayment(booking.id);
      expect(payment.status).toBe('PENDING');
      expect(payment.transfer_submitted_at).toBeNull();

      // Customer action: "Tôi đã chuyển khoản"
      const updated = await markTransferSubmitted(payment.id);

      expect(updated.status).toBe('PENDING'); // MUST NOT BE PAID
      expect(updated.transfer_submitted_at).not.toBeNull();
      expect(updated.paid_at).toBeNull();

      // Booking status must NOT be DEPOSIT_PAID yet
      const [currentBooking] = getInMemoryBookings();
      expect(['UNPAID', 'PENDING_DEPOSIT']).toContain(currentBooking.paymentStatus);
      expect(currentBooking.paymentStatus).not.toBe('DEPOSIT_PAID');
    });
  });

  describe('3. Management Manual Confirmation & Atomic Booking Update', () => {
    it('confirms payment, marks status PAID, and atomically transitions booking to DEPOSIT_PAID & CONFIRMED', async () => {
      const booking = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-20',
        timeSlot: '17:00',
        customerName: 'Đặng Ngọc Linh',
      });

      const payment = await createDepositPayment(booking.id);

      // Manager/Admin confirms manual bank transfer
      const confirmedPayment = await confirmManualPayment(payment.id, 'Đã nhận chuyển khoản MB Bank');

      expect(confirmedPayment.status).toBe('PAID');
      expect(confirmedPayment.paid_at).not.toBeNull();
      expect((confirmedPayment.metadata as any)?.note).toBe('Đã nhận chuyển khoản MB Bank');

      // Verify that booking has been updated in database/memory atomically
      const [updatedBooking] = getInMemoryBookings();
      expect(updatedBooking.paymentStatus).toBe('DEPOSIT_PAID');
      expect(updatedBooking.bookingStatus).toBe('CONFIRMED');
      expect(updatedBooking.staffNote).toContain('Đã nhận chuyển khoản MB Bank');
    });

    it('manual confirmation is idempotent and safe to invoke multiple times', async () => {
      const booking = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-20',
        timeSlot: '18:00',
        customerName: 'Vũ Đức Thịnh',
      });

      const payment = await createDepositPayment(booking.id);

      const firstConfirm = await confirmManualPayment(payment.id);
      expect(firstConfirm.status).toBe('PAID');

      // Second confirm should not fail or duplicate
      const secondConfirm = await confirmManualPayment(payment.id);
      expect(secondConfirm.status).toBe('PAID');
      expect(secondConfirm.id).toBe(firstConfirm.id);
    });
  });

  describe('4. Realtime / Event Subscriptions', () => {
    it('notifies subscribers when payment status changes to PAID', async () => {
      const booking = createBookingInMemory({
        serviceId: testService.id,
        packageId: testPackage.id,
        studioId: testStudio.id,
        date: '2026-09-20',
        timeSlot: '19:00',
        customerName: 'Nguyễn Bích Ngọc',
      });

      const payment = await createDepositPayment(booking.id);

      const statusEvents: string[] = [];
      const unsubscribe = subscribePaymentStatus(payment.id, (pay) => {
        statusEvents.push(pay.status);
      });

      expect(statusEvents).toContain('PENDING');

      await confirmManualPayment(payment.id, 'Confirmed by Manager');

      expect(statusEvents).toContain('PAID');
      unsubscribe();
    });
  });
});
