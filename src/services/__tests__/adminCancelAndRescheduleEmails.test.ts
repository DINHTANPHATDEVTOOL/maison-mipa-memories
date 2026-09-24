import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cancelBookingByManager,
  approveBookingReschedule,
  approveBookingCancel,
  requestBookingCancel,
  requestBookingReschedule,
  getBookingsInMemory,
} from '../bookingService';
import { renderEmailHtml } from '../../../supabase/functions/_shared/emailTemplates';

describe('Admin / Manager Cancellation & Reschedule Email Workflows', () => {
  const sampleBookingId = 'b_test_cancel_1';

  beforeEach(() => {
    // Clear mocks
    vi.clearAllMocks();
  });

  describe('cancelBookingByManager', () => {
    it('throws validation error if reason is empty or whitespace only', async () => {
      await expect(cancelBookingByManager(sampleBookingId, '')).rejects.toThrow('Lý do hủy lịch không được để trống.');
      await expect(cancelBookingByManager(sampleBookingId, '   ')).rejects.toThrow('Lý do hủy lịch không được để trống.');
    });

    it('successfully cancels booking, stores reason, and updates status to CANCELLED', async () => {
      const all = getBookingsInMemory();
      const target = all[0];
      expect(target).toBeDefined();

      const reason = 'Khách báo việc gia đình đột xuất xin hủy đơn';
      const updated = await cancelBookingByManager(target.id, reason);

      expect(updated.bookingStatus).toBe('CANCELLED');
      expect(updated.cancelRequestedReason).toBe(reason);
      expect(updated.staffNote).toContain(reason);
    });

    it('approveBookingCancel delegates to cancelBookingByManager with staff note', async () => {
      const all = getBookingsInMemory();
      const target = all[1] || all[0];

      const updated = await approveBookingCancel(target.id, 'Quản lý chấp thuận hủy đơn theo thỏa thuận');
      expect(updated.bookingStatus).toBe('CANCELLED');
      expect(updated.cancelRequestedReason).toBe('Quản lý chấp thuận hủy đơn theo thỏa thuận');
    });
  });

  describe('approveBookingReschedule', () => {
    it('updates booking date and slot, clears reschedule request flags', async () => {
      const all = getBookingsInMemory();
      const target = all[0];

      // Simulate customer requested reschedule first
      await requestBookingReschedule(target.id, '2026-10-15', '14:00 - 16:00', 'Xin đổi sang buổi chiều');

      const approved = await approveBookingReschedule(target.id, 'Quản lý đã duyệt đổi lịch');
      expect(approved.bookingDate).toBe('2026-10-15');
      expect(approved.startTime).toBe('14:00');
      expect(approved.rescheduleRequestedAt).toBeUndefined();
      expect(approved.rescheduleRequestedDate).toBeUndefined();
      expect(approved.rescheduleRequestedSlot).toBeUndefined();
    });
  });

  describe('Transactional Email Templates for Cancel & Reschedule', () => {
    it('renders booking_cancelled email with prominent cancellation reason and direct link', () => {
      const result = renderEmailHtml('booking_cancelled', {
        bookingCode: 'MIPA-8899',
        customerName: 'Trần Thị Mai',
        serviceName: 'Chụp Ảnh Concept',
        packageName: 'Nàng Thơ Hoàng Gia',
        startAt: '10:00 Ngày 15/10/2026',
        cancelReason: 'Khách hàng có lịch công tác đột xuất',
      });

      expect(result.subject).toContain('Thông báo hủy lịch chụp #MIPA-8899');
      expect(result.html).toContain('Trần Thị Mai');
      expect(result.html).toContain('Khách hàng có lịch công tác đột xuất');
      expect(result.html).toContain('0966 616 546');
      expect(result.html).toContain('maisonmipamemories@gmail.com');
      expect(result.html).toContain('https://maisonmipa.io.vn/account?tab=bookings&bookingCode=MIPA-8899');
    });

    it('renders customer_cancel_request_ack email confirming customer cancellation receipt', () => {
      const result = renderEmailHtml('customer_cancel_request_ack', {
        bookingCode: 'MIPA-7722',
        customerName: 'Nguyễn Văn Nam',
        packageName: 'Doanh Nhân Đẳng Cấp',
        startAt: '14:00 Ngày 20/10/2026',
        cancelReason: 'Xin hủy vì thay đổi kế hoạch sự kiện',
      });

      expect(result.subject).toContain('Đã tiếp nhận yêu cầu hủy lịch #MIPA-7722');
      expect(result.html).toContain('Nguyễn Văn Nam');
      expect(result.html).toContain('Xin hủy vì thay đổi kế hoạch sự kiện');
      expect(result.html).toContain('0966 616 546');
      expect(result.html).toContain('maisonmipamemories@gmail.com');
    });

    it('renders booking_rescheduled email with new date, new slot, and studio details', () => {
      const result = renderEmailHtml('booking_rescheduled', {
        bookingCode: 'MIPA-3344',
        customerName: 'Lê Hoàng Anh',
        packageName: 'Nàng Thơ Vintage',
        serviceName: 'Nhiếp Ảnh Nghệ Thuật',
        studioName: 'Phòng Studio Jardin (Khu Vườn)',
        newDate: '2026-11-05',
        newSlot: '09:00 - 11:00',
      });

      expect(result.subject).toContain('Xác nhận cập nhật lịch chụp mới #MIPA-3344');
      expect(result.html).toContain('Lê Hoàng Anh');
      expect(result.html).toContain('2026-11-05');
      expect(result.html).toContain('09:00 - 11:00');
      expect(result.html).toContain('Phòng Studio Jardin (Khu Vườn)');
      expect(result.html).toContain('0966 616 546');
      expect(result.html).toContain('maisonmipamemories@gmail.com');
    });
  });
});
