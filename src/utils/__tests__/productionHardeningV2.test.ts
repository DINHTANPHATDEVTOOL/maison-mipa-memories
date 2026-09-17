// ==============================================================================
// Maison MIPA Memories — Production Hardening V2 Comprehensive Test Suite
// Validates AppError, Privacy Redaction, Logger, Monitoring, Analytics,
// Retry Policy, Idempotency, and Zero Customer Payment Runtime.
// ==============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppError, normalizeError } from '../AppError';
import { maskEmail, maskPhone, redactSensitiveData } from '../privacyFilter';
import { logger } from '../logger';
import { monitoring } from '../monitoring';
import { analytics } from '../analytics';
import { calculateBackoff, withSafeRetry } from '../retryPolicy';
import { generateCorrelationId } from '../correlationId';
import { getSystemHealthReport } from '../healthCheck';

describe('Production Hardening V2 — Core Reliability & Observability', () => {
  describe('1. Normalized AppError Model', () => {
    it('creates an AppError with full options and toPublicJSON omits internal cause', () => {
      const internalCause = new Error('Database socket timed out at 10.0.1.25');
      const err = new AppError({
        code: 'DB_TIMEOUT',
        category: 'DATABASE',
        userMessage: 'Hệ thống đang bận. Vui lòng thử lại.',
        retryable: true,
        operation: 'booking_fetch',
        correlationId: 'mipa_booking_123',
        cause: internalCause,
      });

      expect(err.code).toBe('DB_TIMEOUT');
      expect(err.category).toBe('DATABASE');
      expect(err.userMessage).toBe('Hệ thống đang bận. Vui lòng thử lại.');
      expect(err.retryable).toBe(true);
      expect(err.correlationId).toBe('mipa_booking_123');

      const pub = err.toPublicJSON();
      expect(pub.code).toBe('DB_TIMEOUT');
      expect((pub as any).cause).toBeUndefined();
    });

    it('maps network disconnects into NETWORK category', () => {
      const fetchError = new TypeError('Failed to fetch');
      const normalized = normalizeError(fetchError, 'fetch_catalog');
      expect(normalized.category).toBe('NETWORK');
      expect(normalized.retryable).toBe(true);
      expect(normalized.userMessage).toContain('Không thể kết nối máy chủ');
    });

    it('maps auth JWT expiration into AUTH category with non-retryable flag', () => {
      const authErr = { message: 'JWT expired', status: 401 };
      const normalized = normalizeError(authErr, 'user_profile');
      expect(normalized.category).toBe('AUTH');
      expect(normalized.retryable).toBe(false);
      expect(normalized.userMessage).toContain('Phiên đăng nhập đã hết hạn');
    });

    it('maps RLS / 403 into PERMISSION category', () => {
      const permErr = { message: 'new row violates row-level security policy for table bookings', code: '42501' };
      const normalized = normalizeError(permErr, 'mutate_booking');
      expect(normalized.category).toBe('PERMISSION');
      expect(normalized.retryable).toBe(false);
      expect(normalized.userMessage).toContain('Bạn không có quyền');
    });

    it('maps Google Drive errors into DRIVE category', () => {
      const driveErr = new Error('Google Drive quota exceeded for folder 02_PROOFS');
      const normalized = normalizeError(driveErr, 'drive_sync');
      expect(normalized.category).toBe('DRIVE');
      expect(normalized.retryable).toBe(true);
      expect(normalized.userMessage).toContain('Google Drive');
    });
  });

  describe('2. PII & Secret Redaction Filter', () => {
    it('masks emails correctly', () => {
      expect(maskEmail('minhanh.nguyen@gmail.com')).toBe('m***n@gmail.com');
      expect(maskEmail('ab@studio.vn')).toBe('*@studio.vn');
      expect(maskEmail('')).toBe('[REDACTED_EMAIL]');
    });

    it('masks phone numbers to keep only last 4 digits', () => {
      expect(maskPhone('0966616546')).toBe('***-***-6546');
      expect(maskPhone('+84966616546')).toBe('***-***-6546');
      expect(maskPhone('12')).toBe('[REDACTED_PHONE]');
    });

    it('strictly redacts sensitive keys: tokens, passwords, secrets, service_role', () => {
      const sensitivePayload = {
        user_id: 'usr_001',
        password: 'SuperSecretPassword123!',
        service_role_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
        google_drive_refresh_token: '1//dummy_token_abc',
        resend_api_key: 're_1234567890abcdef',
        bank_account: '987654321',
        otp_code: '849201',
      };

      const sanitized = redactSensitiveData(sensitivePayload);
      expect(sanitized.user_id).toBe('usr_001');
      expect(sanitized.password).toBe('[REDACTED_SECRET]');
      expect(sanitized.service_role_key).toBe('[REDACTED_SECRET]');
      expect(sanitized.google_drive_refresh_token).toBe('[REDACTED_SECRET]');
      expect(sanitized.resend_api_key).toBe('[REDACTED_SECRET]');
      expect(sanitized.bank_account).toBe('[REDACTED_SECRET]');
      expect(sanitized.otp_code).toBe('[REDACTED_SECRET]');
    });

    it('redacts customer notes and masks email/phone in nested structures', () => {
      const customerPayload = {
        bookingId: 'b_100',
        customer: {
          email: 'phat.customer@example.com',
          phone: '0901234567',
          customer_note: 'Khách muốn makeup tone Tây, mang 2 bộ đồ riêng',
        },
      };

      const sanitized = redactSensitiveData(customerPayload);
      expect(sanitized.customer.email).toBe('p***r@example.com');
      expect(sanitized.customer.phone).toBe('***-***-4567');
      expect(sanitized.customer.customer_note).toBe('[REDACTED_NOTE]');
    });
  });

  describe('3. Structured Logger', () => {
    it('sanitizes logged objects and redacts secrets before console output', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      logger.error('TestService', 'Error happened', {
        password: 'my_secret_password',
        customerEmail: 'test@maisonmipa.vn',
      });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedData = consoleErrorSpy.mock.calls[0][1];
      expect(loggedData.password).toBe('[REDACTED_SECRET]');
      expect(loggedData.customerEmail).toBe('t***t@maisonmipa.vn');
      consoleErrorSpy.mockRestore();
    });
  });

  describe('4. Monitoring Abstraction', () => {
    it('captures exceptions without crashing when external provider is absent', () => {
      expect(() => {
        monitoring.captureException(new Error('Test render crash'), {
          customerNote: 'Private note',
        });
      }).not.toThrow();
    });

    it('setUser only stores id and role, never email or phone', () => {
      const customAdapter = {
        captureException: vi.fn(),
        captureMessage: vi.fn(),
        addBreadcrumb: vi.fn(),
        setUser: vi.fn(),
        trackEvent: vi.fn(),
      };
      monitoring.setAdapter(customAdapter);

      monitoring.setUser({
        id: 'usr_abc_123',
        role: 'CUSTOMER',
        // Attempt to pass PII
        ...({ email: 'leak@example.com', phone: '0900000000' } as any),
      });

      expect(customAdapter.setUser).toHaveBeenCalledWith({
        id: 'usr_abc_123',
        role: 'CUSTOMER',
      });
      const passedUser = customAdapter.setUser.mock.calls[0][0];
      expect((passedUser as any).email).toBeUndefined();
      expect((passedUser as any).phone).toBeUndefined();
    });
  });

  describe('5. Product Analytics Privacy & Zero Payment Regression', () => {
    it('allows privacy-safe consultation-first events', () => {
      const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      analytics.track('consultation_submitted', {
        serviceId: 'srv_portrait',
        packageId: 'pkg_signature',
        depositTarget: 750000,
      });

      expect(debugSpy).toHaveBeenCalledWith(
        'Analytics',
        '[Event: consultation_submitted]',
        expect.objectContaining({
          serviceId: 'srv_portrait',
          packageId: 'pkg_signature',
          depositTarget: 750000,
        })
      );
      debugSpy.mockRestore();
    });

    it('blocks deprecated payment analytics events and logs warning', () => {
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
      analytics.track('deposit_paid' as any, { amount: 500000 });
      analytics.track('payos_checkout_completed' as any, { orderCode: 1234 });

      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy.mock.calls[0][1]).toContain('Blocked deprecated payment');
      warnSpy.mockRestore();
    });

    it('filters out any PII properties from analytics payload', () => {
      const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => {});
      analytics.track('booking_started', {
        serviceId: 'srv_couple',
        name: 'Nguyen Van A',
        phone: '0966616546',
        email: 'customer@gmail.com',
        customer_note: 'Take candid shots',
      });

      const loggedProps = debugSpy.mock.calls[0][2];
      expect(loggedProps.serviceId).toBe('srv_couple');
      expect(loggedProps.name).toBeUndefined();
      expect(loggedProps.phone).toBeUndefined();
      expect(loggedProps.email).toBeUndefined();
      expect(loggedProps.customer_note).toBeUndefined();
      debugSpy.mockRestore();
    });
  });

  describe('6. Safe Retry Policy & Idempotency Enforcement', () => {
    it('calculates exponential backoff with bounded jitter', () => {
      const delay0 = calculateBackoff(0, 100, 1000, 2);
      expect(delay0).toBeGreaterThanOrEqual(50);
      expect(delay0).toBeLessThanOrEqual(100);

      const delay1 = calculateBackoff(1, 100, 1000, 2);
      expect(delay1).toBeGreaterThanOrEqual(100);
      expect(delay1).toBeLessThanOrEqual(200);
    });

    it('rejects retrying non-idempotent transactional operations without authorization', async () => {
      const nonIdempotentMutation = vi.fn().mockRejectedValue(new Error('Network drop during deposit confirmation'));

      await expect(
        withSafeRetry(nonIdempotentMutation, {
          isIdempotent: false,
          operationName: 'manual_deposit_confirm',
        })
      ).rejects.toThrow('Thao tác giao dịch không thể tự động thử lại mà không có khóa kiểm soát');

      expect(nonIdempotentMutation).not.toHaveBeenCalled();
    });

    it('successfully retries safe idempotent read operation until fulfilled', async () => {
      let attempts = 0;
      const safeCatalogRead = vi.fn(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary database blip');
        }
        return ['service_1', 'service_2'];
      });

      const result = await withSafeRetry(safeCatalogRead, {
        maxAttempts: 4,
        initialDelayMs: 10,
        maxDelayMs: 50,
        isIdempotent: true,
      });

      expect(result).toEqual(['service_1', 'service_2']);
      expect(attempts).toBe(3);
    });
  });

  describe('7. Correlation ID & System Health', () => {
    it('generates unique structured correlation IDs', () => {
      const id1 = generateCorrelationId('booking_create');
      const id2 = generateCorrelationId('booking_create');

      expect(id1).toMatch(/^mipa_booking_create_[a-z0-9]+_[a-z0-9]+$/);
      expect(id2).toMatch(/^mipa_booking_create_[a-z0-9]+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('system health report checks configuration without exposing secret values', () => {
      const report = getSystemHealthReport();
      expect(['OK', 'NOT_CONFIGURED']).toContain(report.supabase);
      expect(typeof report.demoMode).toBe('boolean');
      expect(['ENABLED', 'DISABLED']).toContain(report.monitoring);
      expect(typeof report.storageAvailable).toBe('boolean');
      expect(typeof report.online).toBe('boolean');

      // Assert no sensitive keys exist on health report
      expect((report as any).service_role_key).toBeUndefined();
      expect((report as any).resend_api_key).toBeUndefined();
      expect((report as any).google_client_secret).toBeUndefined();
    });
  });
});
