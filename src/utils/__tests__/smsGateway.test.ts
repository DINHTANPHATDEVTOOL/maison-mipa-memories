import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  requestOtp,
  verifyOtp,
  __testOnlyGetActiveChallengeOtp,
  __testOnlyResetOtpStore,
  OTP_ERROR_MESSAGES,
} from '../smsGateway';

describe('Server-side Authoritative OTP & SMS Gateway Client', () => {
  beforeEach(() => {
    __testOnlyResetOtpStore();
    vi.useRealTimers();
  });

  describe('1. OTP Request & Generation Security', () => {
    it('normalizes valid Vietnamese phone to E.164 upon requesting OTP', async () => {
      const res = await requestOtp('0966 616 546', 'LOGIN');
      expect(res.success).toBe(true);
      expect(res.challengeId).toBeDefined();
      expect(res.resendAfter).toBe(60);
      expect(res.expiresAt).toBeDefined();
    });

    it('rejects invalid Vietnamese phone number without creating a challenge', async () => {
      const res = await requestOtp('0123456789', 'LOGIN');
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('INVALID_PHONE');
      expect(res.message).toBe(OTP_ERROR_MESSAGES.INVALID_PHONE);
      expect(res.challengeId).toBeUndefined();
    });

    it('NEVER returns plaintext OTP to client', async () => {
      const res = await requestOtp('0908123456', 'LOGIN');
      expect(res.success).toBe(true);
      // Ensure no raw OTP property exists on the response object
      expect((res as any).otp).toBeUndefined();
      expect((res as any).code).toBeUndefined();
      expect((res as any).otpCode).toBeUndefined();
      expect((res as any).rawOtp).toBeUndefined();
    });

    it('returns SMS_PROVIDER_ERROR when SMS provider fails', async () => {
      const res = await requestOtp('0908123456', 'LOGIN', {
        simulateProviderFailure: true,
      });
      expect(res.success).toBe(false);
      expect(res.errorCode).toBe('SMS_PROVIDER_ERROR');
      expect(res.message).toContain('Không thể gửi mã xác thực');
    });
  });

  describe('2. Resend Cooldown & Rate Limiting', () => {
    it('enforces 60-second cooldown on consecutive requests for the same target', async () => {
      const first = await requestOtp('0908123456', 'LOGIN');
      expect(first.success).toBe(true);

      // Immediate second request within 60s cooldown
      const second = await requestOtp('0908123456', 'LOGIN');
      expect(second.success).toBe(false);
      expect(second.errorCode).toBe('RATE_LIMITED');
      expect(second.resendAfter).toBeGreaterThan(0);
      expect(second.resendAfter).toBeLessThanOrEqual(60);
    });

    it('enforces phone rate limit (max 5 requests per 15 minutes)', async () => {
      vi.useFakeTimers();
      const phone = '0908123456';

      for (let i = 0; i < 5; i++) {
        const res = await requestOtp(phone, 'LOGIN');
        expect(res.success).toBe(true);
        // Advance clock past 60s cooldown
        vi.advanceTimersByTime(61 * 1000);
      }

      // 6th request within 15 minutes should be rate limited
      const sixth = await requestOtp(phone, 'LOGIN');
      expect(sixth.success).toBe(false);
      expect(sixth.errorCode).toBe('RATE_LIMITED');
      expect(sixth.message).toContain('quá số lần nhận mã');
    });
  });

  describe('3. OTP Verification & Attempt Limits', () => {
    it('successfully verifies correct OTP', async () => {
      const req = await requestOtp('0908123456', 'LOGIN');
      expect(req.success).toBe(true);

      const secretOtp = __testOnlyGetActiveChallengeOtp(req.challengeId!);
      expect(secretOtp).toMatch(/^\d{6}$/);

      const verify = await verifyOtp(req.challengeId!, secretOtp!);
      expect(verify.success).toBe(true);
      expect(verify.verifiedPhone).toBe('+84908123456');
    });

    it('fails when wrong OTP is provided and reports remaining attempts', async () => {
      const req = await requestOtp('0908123456', 'LOGIN');
      expect(req.success).toBe(true);

      const verify = await verifyOtp(req.challengeId!, '000000');
      expect(verify.success).toBe(false);
      expect(verify.errorCode).toBe('OTP_INVALID');
      expect(verify.message).toContain('Bạn còn 4 lần thử');
    });

    it('locks challenge after max 5 failed attempts (prevents brute-force)', async () => {
      const req = await requestOtp('0908123456', 'LOGIN');
      expect(req.success).toBe(true);

      const secretOtp = __testOnlyGetActiveChallengeOtp(req.challengeId!);

      // 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        await verifyOtp(req.challengeId!, '111111');
      }

      // 6th attempt with correct OTP must STILL fail due to lock
      const locked = await verifyOtp(req.challengeId!, secretOtp!);
      expect(locked.success).toBe(false);
      expect(locked.errorCode).toBe('OTP_MAX_ATTEMPTS');
      expect(locked.message).toContain('bị khóa');
    });

    it('prevents reuse of consumed OTP challenge', async () => {
      const req = await requestOtp('0908123456', 'LOGIN');
      const secretOtp = __testOnlyGetActiveChallengeOtp(req.challengeId!);

      // First verification succeeds
      const first = await verifyOtp(req.challengeId!, secretOtp!);
      expect(first.success).toBe(true);

      // Second verification attempt on the same challenge must fail
      const second = await verifyOtp(req.challengeId!, secretOtp!);
      expect(second.success).toBe(false);
      expect(second.errorCode).toBe('OTP_ALREADY_USED');
    });

    it('rejects OTP after expiration (5 minutes)', async () => {
      vi.useFakeTimers();
      const req = await requestOtp('0908123456', 'LOGIN');
      const secretOtp = __testOnlyGetActiveChallengeOtp(req.challengeId!);

      // Advance clock by 5 minutes + 1 second
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      const verify = await verifyOtp(req.challengeId!, secretOtp!);
      expect(verify.success).toBe(false);
      expect(verify.errorCode).toBe('OTP_EXPIRED');
    });
  });
});
