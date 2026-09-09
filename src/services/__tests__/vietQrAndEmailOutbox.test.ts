import { describe, it, expect } from 'vitest';
import {
  isValidProductionBankConfig,
  buildAuthoritativeVietQrUrl,
  type BusinessBankConfig,
} from '../paymentSettingsService';
import { generateVietQrUrl } from '../../config/bankConfig';

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
  });
});
