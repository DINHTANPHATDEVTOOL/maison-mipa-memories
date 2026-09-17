// ==============================================================================
// Maison MIPA Memories — Standard Application Error Contract
// Normalizes low-level Supabase, network, and validation errors.
// Prevents raw SQL, secrets, or internal endpoints from leaking to UI.
// ==============================================================================

export type ErrorCategory =
  | 'AUTH'
  | 'NETWORK'
  | 'DATABASE'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'EMAIL'
  | 'DRIVE'
  | 'PERMISSION'
  | 'CONFIG'
  | 'UNKNOWN';

export interface AppErrorOptions {
  code: string;
  category: ErrorCategory;
  userMessage: string;
  retryable?: boolean;
  operation?: string;
  correlationId?: string;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly category: ErrorCategory;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly operation: string;
  readonly correlationId?: string;
  readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.userMessage);
    this.name = 'AppError';
    this.code = options.code;
    this.category = options.category;
    this.userMessage = options.userMessage;
    this.retryable = options.retryable ?? false;
    this.operation = options.operation ?? 'system';
    this.correlationId = options.correlationId;
    this.cause = options.cause;

    // Maintain standard prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Sanitized payload safe for client UI display or transmission.
   * Internal cause and raw stacks are omitted.
   */
  toPublicJSON(): {
    code: string;
    category: ErrorCategory;
    userMessage: string;
    retryable: boolean;
    operation: string;
    correlationId?: string;
  } {
    return {
      code: this.code,
      category: this.category,
      userMessage: this.userMessage,
      retryable: this.retryable,
      operation: this.operation,
      correlationId: this.correlationId,
    };
  }
}

/**
 * Maps arbitrary low-level errors (Supabase PostgrestError, TypeError, FetchError, etc.)
 * into a safe, normalized AppError.
 */
export function normalizeError(
  err: unknown,
  fallbackOperation = 'operation',
  correlationId?: string
): AppError {
  if (err instanceof AppError) {
    if (correlationId && !err.correlationId) {
      return new AppError({
        code: err.code,
        category: err.category,
        userMessage: err.userMessage,
        retryable: err.retryable,
        operation: err.operation,
        correlationId,
        cause: err.cause,
      });
    }
    return err;
  }

  const rawMessage = (err as any)?.message || String(err);
  const rawCode = (err as any)?.code || (err as any)?.status || 'UNKNOWN';

  // 1. Network / Offline errors
  if (
    typeof navigator !== 'undefined' && !navigator.onLine ||
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('timeout')
  ) {
    return new AppError({
      code: 'NETWORK_DISCONNECTED',
      category: 'NETWORK',
      userMessage: 'Không thể kết nối máy chủ. Vui lòng kiểm tra Internet và thử lại.',
      retryable: true,
      operation: fallbackOperation,
      correlationId,
      cause: err,
    });
  }

  // 2. Auth / Permission errors
  if (
    rawCode === 'PGRST301' ||
    rawCode === 401 ||
    rawMessage.includes('JWT') ||
    rawMessage.includes('token') ||
    rawMessage.includes('session expired') ||
    rawMessage.includes('not authenticated')
  ) {
    return new AppError({
      code: 'AUTH_SESSION_EXPIRED',
      category: 'AUTH',
      userMessage: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      retryable: false,
      operation: fallbackOperation,
      correlationId,
      cause: err,
    });
  }

  if (
    rawCode === 403 ||
    rawMessage.includes('permission denied') ||
    rawMessage.includes('RLS') ||
    rawMessage.includes('row-level security')
  ) {
    return new AppError({
      code: 'PERMISSION_DENIED',
      category: 'PERMISSION',
      userMessage: 'Bạn không có quyền thực hiện thao tác này.',
      retryable: false,
      operation: fallbackOperation,
      correlationId,
      cause: err,
    });
  }

  // 3. Conflict / Unique constraint errors
  if (
    rawCode === '23505' ||
    rawMessage.includes('already exists') ||
    rawMessage.includes('duplicate key') ||
    rawMessage.includes('conflict')
  ) {
    return new AppError({
      code: 'CONFLICT_DUPLICATE',
      category: 'CONFLICT',
      userMessage: 'Dữ liệu đã tồn tại hoặc đang có thao tác trùng lặp. Vui lòng tải lại.',
      retryable: false,
      operation: fallbackOperation,
      correlationId,
      cause: err,
    });
  }

  // 4. Drive specific errors
  if (rawMessage.includes('drive') || rawMessage.includes('Drive') || fallbackOperation.includes('drive')) {
    return new AppError({
      code: 'DRIVE_OPERATION_FAILED',
      category: 'DRIVE',
      userMessage: 'Thao tác Google Drive chưa hoàn thành. Bạn có thể thử đồng bộ lại sau.',
      retryable: true,
      operation: fallbackOperation,
      correlationId,
      cause: err,
    });
  }

  // Default / Database fallback (sanitized user message)
  return new AppError({
    code: typeof rawCode === 'string' ? rawCode : 'SYSTEM_ERROR',
    category: 'DATABASE',
    userMessage: 'Hệ thống đang bận hoặc có lỗi kết nối. Vui lòng thử lại.',
    retryable: true,
    operation: fallbackOperation,
    correlationId,
    cause: err,
  });
}
