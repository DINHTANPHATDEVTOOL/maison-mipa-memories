// ==============================================================================
// Maison MIPA Memories — Safe Retry Policy with Backoff & Jitter
// Safe for idempotent reads. Rejects non-idempotent transactional mutations.
// ==============================================================================

import { AppError } from './AppError';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  isIdempotent?: boolean;
  operationName?: string;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 300,
  maxDelayMs: 3000,
  backoffFactor: 2,
  isIdempotent: true,
  operationName: 'safe_read_operation',
};

/**
 * Calculates exponential backoff with full jitter:
 * delay = min(maxDelay, initialDelay * (factor ^ attempt)) * (0.5 + Math.random() * 0.5)
 */
export function calculateBackoff(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  factor: number
): number {
  const base = initialDelayMs * Math.pow(factor, attempt);
  const capped = Math.min(base, maxDelayMs);
  const jitter = 0.5 + Math.random() * 0.5;
  return Math.round(capped * jitter);
}

/**
 * Executes an operation with safe exponential backoff.
 * Explicitly guards against retrying non-idempotent operations without authorization.
 */
export async function withSafeRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Guard: transactional writes without idempotency must NOT be retried
  if (!opts.isIdempotent) {
    throw new AppError({
      code: 'RETRY_NOT_ALLOWED',
      category: 'VALIDATION',
      userMessage: 'Thao tác giao dịch không thể tự động thử lại mà không có khóa kiểm soát (Idempotency key).',
      retryable: false,
      operation: opts.operationName,
    });
  }

  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= opts.maxAttempts) {
        throw err;
      }

      if (opts.onRetry) {
        opts.onRetry(attempt, err);
      }

      const delay = calculateBackoff(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffFactor
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
