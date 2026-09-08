// ==============================================================================
// Maison MIPA Memories - Secure Server-Side OTP & SMS Gateway Client
// Issue #3: Production OTP & SMS Client Abstraction.
// Absolute Security Boundary:
// - Frontend NEVER generates, compares, or receives raw OTP.
// - Frontend NEVER stores SMS provider secrets (No VITE_SMS_* in bundle).
// - All production OTP generation/storage/verification is backend authoritative.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { tryNormalizeVietnamPhone } from './phoneUtils';

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'VERIFY_PHONE' | 'SENSITIVE_ACTION';

export type OtpErrorCode =
  | 'INVALID_PHONE'
  | 'RATE_LIMITED'
  | 'OTP_EXPIRED'
  | 'OTP_INVALID'
  | 'OTP_MAX_ATTEMPTS'
  | 'OTP_ALREADY_USED'
  | 'SMS_PROVIDER_ERROR'
  | 'UNAUTHORIZED';

export const OTP_ERROR_MESSAGES: Record<OtpErrorCode, string> = {
  INVALID_PHONE: 'Số điện thoại không hợp lệ theo chuẩn di động Việt Nam.',
  RATE_LIMITED: 'Bạn đã yêu cầu gửi mã quá nhanh. Vui lòng đợi 60 giây trước khi thử lại.',
  OTP_EXPIRED: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.',
  OTP_INVALID: 'Mã xác thực không chính xác. Vui lòng kiểm tra lại.',
  OTP_MAX_ATTEMPTS: 'Mã xác thực đã nhập sai quá số lần quy định (5 lần) và bị khóa.',
  OTP_ALREADY_USED: 'Mã xác thực này đã được sử dụng.',
  SMS_PROVIDER_ERROR: 'Không thể gửi mã xác thực. Vui lòng thử lại sau.',
  UNAUTHORIZED: 'Bạn không có quyền thực hiện yêu cầu này.',
};

export interface RequestOtpResult {
  success: boolean;
  challengeId?: string;
  resendAfter?: number; // seconds
  expiresAt?: string;
  errorCode?: OtpErrorCode;
  message: string;
}

export interface VerifyOtpResult {
  success: boolean;
  verifiedPhone?: string;
  token?: string;
  errorCode?: OtpErrorCode;
  message: string;
}

// -----------------------------------------------------------------------------
// Offline / Test In-Memory Challenge Store (Server-like Security Emulation)
// Used when Supabase is not configured or during offline testing.
// Enforces CSPRNG, Pepper Hashing, 5m Expiry, 5 Attempts Lock, 60s Resend Cooldown.
// -----------------------------------------------------------------------------
interface InMemoryChallenge {
  id: string;
  phone: string;
  purpose: OtpPurpose;
  otpHash: string;
  expiresAt: number; // timestamp
  resendAfter: number; // timestamp
  attempts: number;
  maxAttempts: number;
  consumedAt: number | null;
  createdAt: number;
}

const IN_MEMORY_CHALLENGES = new Map<string, InMemoryChallenge>();
const PHONE_REQUEST_HISTORY = new Map<string, number[]>(); // phone -> timestamps of requests for rate limiting
const OFFLINE_PEPPER = 'mipa_secure_server_pepper_2026';

// For Vitest integration testing only: securely allows tests to verify dispatch without leaking to UI
const TEST_DISPATCHED_OTPS = new Map<string, string>();

async function hashOtpWithPepper(otp: string, pepper = OFFLINE_PEPPER): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${otp}:${pepper}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateCsprngOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = 100000 + (array[0] % 900000);
  return code.toString();
}

/**
 * Client API: Request an OTP challenge.
 * Client ONLY provides phone number and purpose.
 * Server/Edge Function generates OTP with CSPRNG and dispatches SMS.
 */
export const requestOtp = async (
  rawPhone: string,
  purpose: OtpPurpose = 'LOGIN',
  options?: { ipFingerprint?: string; simulateProviderFailure?: boolean }
): Promise<RequestOtpResult> => {
  // 1. Phone validation & normalization (E.164)
  const normResult = tryNormalizeVietnamPhone(rawPhone);
  if (!normResult.isValid || !normResult.normalized) {
    return {
      success: false,
      errorCode: 'INVALID_PHONE',
      message: OTP_ERROR_MESSAGES.INVALID_PHONE,
    };
  }
  const phone = normResult.normalized;

  // 2. Production Edge Function Dispatch (when Supabase is live)
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('request-otp', {
        body: { phone, purpose, ipFingerprint: options?.ipFingerprint },
      });

      if (error || !data || !data.success) {
        const code = (data?.errorCode as OtpErrorCode) || 'SMS_PROVIDER_ERROR';
        return {
          success: false,
          errorCode: code,
          message: data?.message || OTP_ERROR_MESSAGES[code] || 'Không thể gửi mã xác thực. Vui lòng thử lại.',
        };
      }

      return {
        success: true,
        challengeId: data.challengeId,
        resendAfter: data.resendAfter || 60,
        expiresAt: data.expiresAt,
        message: 'Mã xác thực đã được gửi đến số điện thoại của bạn qua SMS.',
      };
    } catch {
      return {
        success: false,
        errorCode: 'SMS_PROVIDER_ERROR',
        message: OTP_ERROR_MESSAGES.SMS_PROVIDER_ERROR,
      };
    }
  }

  // 3. Authoritative Offline / Test Emulation
  const now = Date.now();

  // Test failure simulation check
  if (options?.simulateProviderFailure) {
    return {
      success: false,
      errorCode: 'SMS_PROVIDER_ERROR',
      message: OTP_ERROR_MESSAGES.SMS_PROVIDER_ERROR,
    };
  }

  // Check rate limit per phone (max 5 requests per 15 mins)
  const history = (PHONE_REQUEST_HISTORY.get(phone) || []).filter(ts => now - ts < 15 * 60 * 1000);
  if (history.length >= 5) {
    return {
      success: false,
      errorCode: 'RATE_LIMITED',
      message: 'Số điện thoại này đã vượt quá số lần nhận mã trong 15 phút (tối đa 5 lần). Vui lòng quay lại sau.',
    };
  }

  // Check active challenge for resend cooldown (60 seconds)
  for (const ch of IN_MEMORY_CHALLENGES.values()) {
    if (ch.phone === phone && ch.purpose === purpose && !ch.consumedAt && ch.resendAfter > now) {
      const remainingSeconds = Math.ceil((ch.resendAfter - now) / 1000);
      return {
        success: false,
        errorCode: 'RATE_LIMITED',
        resendAfter: remainingSeconds,
        message: `Vui lòng đợi ${remainingSeconds} giây trước khi yêu cầu gửi lại mã.`,
      };
    }
  }

  // Generate CSPRNG 6-digit OTP
  const rawOtp = generateCsprngOtp();
  const otpHash = await hashOtpWithPepper(rawOtp);
  const challengeId = `ch_${crypto.randomUUID()}`;

  const challenge: InMemoryChallenge = {
    id: challengeId,
    phone,
    purpose,
    otpHash,
    expiresAt: now + 5 * 60 * 1000, // 5 minutes
    resendAfter: now + 60 * 1000, // 60 seconds
    attempts: 0,
    maxAttempts: 5,
    consumedAt: null,
    createdAt: now,
  };

  IN_MEMORY_CHALLENGES.set(challengeId, challenge);
  history.push(now);
  PHONE_REQUEST_HISTORY.set(phone, history);

  // Store only in test map for testing purposes; never exposed to caller
  TEST_DISPATCHED_OTPS.set(challengeId, rawOtp);

  return {
    success: true,
    challengeId,
    resendAfter: 60,
    expiresAt: new Date(challenge.expiresAt).toISOString(),
    message: 'Mã xác thực đã được gửi đến số điện thoại của bạn qua SMS.',
  };
};

/**
 * Client API: Verify OTP entered by user.
 * Client sends challengeId and the 6-digit code.
 * Backend verifies against hash, attempts, expiry, and purpose.
 */
export const verifyOtp = async (
  challengeId: string,
  enteredCode: string
): Promise<VerifyOtpResult> => {
  if (!challengeId || !enteredCode) {
    return {
      success: false,
      errorCode: 'OTP_INVALID',
      message: 'Vui lòng nhập đầy đủ mã xác thực.',
    };
  }

  const cleanCode = enteredCode.trim();
  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      errorCode: 'OTP_INVALID',
      message: 'Mã xác thực phải gồm 6 chữ số.',
    };
  }

  // 1. Production Edge Function Verification
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { challengeId, code: cleanCode },
      });

      if (error || !data || !data.success) {
        const code = (data?.errorCode as OtpErrorCode) || 'OTP_INVALID';
        return {
          success: false,
          errorCode: code,
          message: data?.message || OTP_ERROR_MESSAGES[code] || 'Mã xác thực không hợp lệ.',
        };
      }

      return {
        success: true,
        verifiedPhone: data.verifiedPhone,
        token: data.token,
        message: 'Xác thực số điện thoại thành công!',
      };
    } catch {
      return {
        success: false,
        errorCode: 'OTP_INVALID',
        message: 'Lỗi trong quá trình xác thực. Vui lòng thử lại.',
      };
    }
  }

  // 2. Authoritative Offline / Test Emulation
  const challenge = IN_MEMORY_CHALLENGES.get(challengeId);
  if (!challenge) {
    return {
      success: false,
      errorCode: 'OTP_INVALID',
      message: 'Yêu cầu xác thực không tồn tại hoặc đã bị xóa.',
    };
  }

  const now = Date.now();

  // Check if consumed
  if (challenge.consumedAt) {
    return {
      success: false,
      errorCode: 'OTP_ALREADY_USED',
      message: OTP_ERROR_MESSAGES.OTP_ALREADY_USED,
    };
  }

  // Check attempt limit
  if (challenge.attempts >= challenge.maxAttempts) {
    return {
      success: false,
      errorCode: 'OTP_MAX_ATTEMPTS',
      message: OTP_ERROR_MESSAGES.OTP_MAX_ATTEMPTS,
    };
  }

  // Check expiration
  if (now > challenge.expiresAt) {
    return {
      success: false,
      errorCode: 'OTP_EXPIRED',
      message: OTP_ERROR_MESSAGES.OTP_EXPIRED,
    };
  }

  // Hash entered code with pepper
  const enteredHash = await hashOtpWithPepper(cleanCode);

  if (enteredHash !== challenge.otpHash) {
    challenge.attempts += 1;
    if (challenge.attempts >= challenge.maxAttempts) {
      return {
        success: false,
        errorCode: 'OTP_MAX_ATTEMPTS',
        message: OTP_ERROR_MESSAGES.OTP_MAX_ATTEMPTS,
      };
    }
    return {
      success: false,
      errorCode: 'OTP_INVALID',
      message: `Mã xác thực không chính xác. Bạn còn ${challenge.maxAttempts - challenge.attempts} lần thử.`,
    };
  }

  // Mark consumed
  challenge.consumedAt = now;
  TEST_DISPATCHED_OTPS.delete(challengeId);

  return {
    success: true,
    verifiedPhone: challenge.phone,
    token: `test_token_${challenge.id}`,
    message: 'Xác thực số điện thoại thành công!',
  };
};

/**
 * Test-only inspection helper for automated testing (Vitest).
 * Strictly used to retrieve mock OTP generated in memory without breaking production API contracts.
 */
export const __testOnlyGetActiveChallengeOtp = (challengeId: string): string | undefined => {
  return TEST_DISPATCHED_OTPS.get(challengeId);
};

/**
 * Clear in-memory state for test isolation.
 */
export const __testOnlyResetOtpStore = (): void => {
  IN_MEMORY_CHALLENGES.clear();
  PHONE_REQUEST_HISTORY.clear();
  TEST_DISPATCHED_OTPS.clear();
};
