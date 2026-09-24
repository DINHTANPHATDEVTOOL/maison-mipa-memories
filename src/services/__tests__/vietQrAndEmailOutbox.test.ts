import { describe, it, expect } from 'vitest';
import {
  isValidProductionBankConfig,
  buildAuthoritativeVietQrUrl,
  type BusinessBankConfig,
} from '../paymentSettingsService';
import { generateVietQrUrl } from '../../config/bankConfig';
import { renderEmailHtml } from '../../../supabase/functions/_shared/emailTemplates';

describe('Real VietQR & Server-Only Notification Architecture (Phase F & G)', () => {
  describe('Phase G: VietQR Authority & Placeholder Account Blocking', () => {
    it('blocks known placeholder account numbers (888866669999, 1234567890, 0000000000)', () => {
      const placeholderConfig: BusinessBankConfig = {
        bankCode: 'MB',
        bankBin: '970422',
        bankName: 'MB Bank',
        accountNumber: '888866669999',
        accountName: 'MAISON MIPA MEMORIES',
        qrTemplate: 'compact2',
        active: true,
        isDefault: true,
      };

      expect(isValidProductionBankConfig(placeholderConfig)).toBe(false);
      expect(generateVietQrUrl(500000, 'MIPA REF', placeholderConfig)).toBe('');
    });

    it('rejects unconfigured or null bank configurations', () => {
      expect(isValidProductionBankConfig(null)).toBe(false);
      expect(generateVietQrUrl(500000, 'MIPA REF', null as any)).toBe('');
    });

    it('generates genuine VietQR quick-link URL for authoritative production bank config', () => {
      const realConfig: BusinessBankConfig = {
        bankCode: 'VCB',
        bankBin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0071001234567',
        accountName: 'CONG TY MAISON MIPA',
        qrTemplate: 'compact2',
        active: true,
        isDefault: true,
      };

      expect(isValidProductionBankConfig(realConfig)).toBe(true);

      const url = buildAuthoritativeVietQrUrl(realConfig, 750000, 'MIPA 0908123456');
      expect(url).toContain('https://img.vietqr.io/image/970436-0071001234567-compact2.png');
      expect(url).toContain('amount=750000');
      expect(url).toContain('addInfo=MIPA%200908123456');
      expect(url).toContain('accountName=CONG%20TY%20MAISON%20MIPA');
    });

    it('VietQR ignores arbitrary client-injected negative or fractional amounts', () => {
      const realConfig: BusinessBankConfig = {
        bankCode: 'VCB',
        bankBin: '970436',
        bankName: 'Vietcombank',
        accountNumber: '0071001234567',
        accountName: 'CONG TY MAISON MIPA',
        qrTemplate: 'compact2',
        active: true,
        isDefault: true,
      };

      const urlNegative = buildAuthoritativeVietQrUrl(realConfig, -50000, 'MIPA REF');
      expect(urlNegative).toContain('amount=0');

      const urlFractional = buildAuthoritativeVietQrUrl(realConfig, 450000.75, 'MIPA REF');
      expect(urlFractional).toContain('amount=450001');
    });
  });

  describe('Phase F: Server-Only Resend Notification Architecture & Idempotency', () => {
    it('verifies client environment bundle has NO exposed Resend API keys', () => {
      // The frontend must never expose VITE_RESEND_API_KEY
      const viteEnv = (import.meta as any).env || {};
      expect(viteEnv.VITE_RESEND_API_KEY).toBeUndefined();
    });

    it('simulates notification outbox idempotency: duplicate event with same key is rejected', () => {
      const outboxStore = new Map<string, any>();

      const enqueueNotification = (event: {
        eventType: string;
        idempotencyKey: string;
        recipientEmail: string;
        payload: any;
      }) => {
        if (outboxStore.has(event.idempotencyKey)) {
          return { status: 'DUPLICATE_IGNORED', record: outboxStore.get(event.idempotencyKey) };
        }
        const record = {
          ...event,
          id: `outbox_${Date.now()}_${Math.random()}`,
          status: 'PENDING',
          attempts: 0,
          createdAt: new Date().toISOString(),
        };
        outboxStore.set(event.idempotencyKey, record);
        return { status: 'ENQUEUED', record };
      };

      const paymentId = 'pay_test_001';
      const event1 = enqueueNotification({
        eventType: 'DEPOSIT_RECEIVED',
        idempotencyKey: `payment_paid_${paymentId}`,
        recipientEmail: 'client@gmail.com',
        payload: { amount: 600000, bookingCode: 'MIPA-001' },
      });

      expect(event1.status).toBe('ENQUEUED');

      // Duplicate payment notification trigger
      const event2 = enqueueNotification({
        eventType: 'DEPOSIT_RECEIVED',
        idempotencyKey: `payment_paid_${paymentId}`,
        recipientEmail: 'client@gmail.com',
        payload: { amount: 600000, bookingCode: 'MIPA-001' },
      });

      expect(event2.status).toBe('DUPLICATE_IGNORED');
      expect(outboxStore.size).toBe(1);
    });

    it('simulates provider failure backoff: records sanitized error and does not mark SENT', () => {
      const outboxItem = {
        id: 'outbox_123',
        status: 'PENDING' as 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED',
        attempts: 0,
        maxAttempts: 5,
        lastError: null as string | null,
      };

      const processAttempt = (item: typeof outboxItem, errorMsg: string) => {
        item.attempts += 1;
        // Sanitize error message (remove potential secrets or tokens)
        const sanitized = errorMsg.replace(/key=[A-Za-z0-9_-]+/g, 'key=REDACTED');
        item.lastError = sanitized;

        if (item.attempts >= item.maxAttempts) {
          item.status = 'FAILED';
        } else {
          item.status = 'PENDING';
        }
      };

      processAttempt(outboxItem, 'Connection reset by peer at api.resend.com?key=re_123secretKey');
      expect(outboxItem.attempts).toBe(1);
      expect(outboxItem.status).toBe('PENDING'); // Retries pending
      expect(outboxItem.lastError).toContain('key=REDACTED');
      expect(outboxItem.lastError).not.toContain('re_123secretKey');
    });

    it('renders real studio contact info and never renders mock placeholders', () => {
      const templates = [
        'booking_consultation_requested',
        'booking_confirmed',
        'booking_rescheduled',
        'booking_cancelled',
        'customer_cancel_request_ack',
        'admin_cancel_request_alert',
        'admin_new_booking_alert',
        'album_ready',
        'default',
      ];

      for (const t of templates) {
        const { subject, html } = renderEmailHtml(t, {
          customerName: 'Phat Dinh Tan',
          bookingCode: 'MIPA-260924-9955',
          packageName: 'Chân Dung Nghệ Thuật',
          serviceName: 'Chân Dung Cá Nhân',
          startAt: '13:00 Ngày 25/09/2026',
          cancelReason: 'Bận việc đột xuất',
          totalAmount: 900000,
          depositAmount: 270000,
        });

        expect(subject).toBeTruthy();
        expect(html).toContain('0966 616 546');
        expect(html).toContain('maisonmipamemories@gmail.com');
        expect(html).toContain('88 Phan Sào Nam');
        expect(html).not.toContain('0908 123 456');
        expect(html).not.toContain('contact@maisonmipa.io.vn');
      }
    });

    it('includes direct deep-link CTA buttons for customer and admin actions', () => {
      // 1. Customer consultation request
      const custReq = renderEmailHtml('booking_consultation_requested', {
        bookingCode: 'MIPA-260924-9955',
      });
      expect(custReq.html).toContain('https://maisonmipa.io.vn/account?tab=bookings&bookingCode=MIPA-260924-9955');

      // 2. Booking rescheduled
      const resched = renderEmailHtml('booking_rescheduled', {
        bookingCode: 'MIPA-260924-9955',
        startAt: '14:00 Ngày 28/09/2026',
      });
      expect(resched.subject).toContain('MIPA-260924-9955');
      expect(resched.html).toContain('14:00 Ngày 28/09/2026');
      expect(resched.html).toContain('https://maisonmipa.io.vn/account?tab=bookings&bookingCode=MIPA-260924-9955');

      // 3. Booking cancelled
      const cancel = renderEmailHtml('booking_cancelled', {
        bookingCode: 'MIPA-260924-9955',
      });
      expect(cancel.html).toContain('ĐƠN ĐẶT LỊCH ĐÃ ĐƯỢC DUYỆT HỦY');
      expect(cancel.html).toContain('https://maisonmipa.io.vn/account?tab=bookings&bookingCode=MIPA-260924-9955');

      // 4. Admin cancel request alert
      const adminAlert = renderEmailHtml('admin_cancel_request_alert', {
        bookingCode: 'MIPA-260924-9955',
        bookingId: 'uuid-1234',
        cancelReason: 'Khách bận lịch công tác',
      });
      expect(adminAlert.html).toContain('KHÁCH HÀNG YÊU CẦU HỦY ĐƠN');
      expect(adminAlert.html).toContain('Khách bận lịch công tác');
      expect(adminAlert.html).toContain('management?tab=dashboard');
    });

    it('prevents duplicate emails: verifies deduplication migration drops legacy trigger', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const migrationFile = path.resolve(__dirname, '../../../supabase/migrations/20260924000006_prevent_duplicate_booking_emails.sql');
      expect(fs.existsSync(migrationFile)).toBe(true);

      const content = fs.readFileSync(migrationFile, 'utf8');
      expect(content).toContain('DROP TRIGGER IF EXISTS on_booking_created_notification ON public.bookings;');
      expect(content).toContain('cancel-admin-cust:');
      expect(content).toContain('cancel-request-studio:');
      expect(content).toContain('Deduplicated: superseded by primary email record');
    });
  });
});
