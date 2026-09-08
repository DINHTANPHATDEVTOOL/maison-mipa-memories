// ==============================================================================
// Maison MIPA Memories - Authoritative Deposit Payment Service
// Issue #3: Production Payment Service.
// Strict Security Rules:
// 1. Client NEVER specifies payment amount; amount is derived strictly from DB booking.deposit_amount.
// 2. Customer CANNOT mark payment as PAID. Customer only submits transfer proof.
// 3. Status transition to PAID is strictly Manager/Admin or Webhook authoritative.
// 4. Booking payment_status & booking_status are updated atomically.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { PaymentRow, PaymentMethod } from '../types/database';
import { getBookingsInMemory, updateBookingInMemory } from './bookingService';

export interface CreatePaymentParams {
  bookingId: string;
  method?: PaymentMethod;
}

export type PaymentErrorCode =
  | 'BOOKING_NOT_FOUND'
  | 'PAYMENT_NOT_ALLOWED'
  | 'PAYMENT_ALREADY_PAID'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_AMOUNT_MISMATCH'
  | 'PROVIDER_ERROR'
  | 'UNAUTHORIZED';

export const PAYMENT_ERROR_MESSAGES: Record<PaymentErrorCode, string> = {
  BOOKING_NOT_FOUND: 'Không tìm thấy thông tin đơn đặt lịch.',
  PAYMENT_NOT_ALLOWED: 'Đơn đặt lịch không ở trạng thái cho phép thanh toán cọc.',
  PAYMENT_ALREADY_PAID: 'Đơn đặt lịch này đã được thanh toán cọc thành công.',
  PAYMENT_EXPIRED: 'Phiên thanh toán đã hết hạn. Vui lòng tạo yêu cầu mới.',
  PAYMENT_AMOUNT_MISMATCH: 'Số tiền thanh toán không khớp với tiền cọc quy định.',
  PROVIDER_ERROR: 'Lỗi kết nối cổng thanh toán. Vui lòng thử lại.',
  UNAUTHORIZED: 'Bạn không có quyền thực hiện thao tác thanh toán này.',
};

// -----------------------------------------------------------------------------
// Offline / Test In-Memory Payments Store
// -----------------------------------------------------------------------------
const IN_MEMORY_PAYMENTS = new Map<string, PaymentRow>();
type PaymentSubscriber = (payment: PaymentRow) => void;
const PAYMENT_SUBSCRIBERS = new Map<string, Set<PaymentSubscriber>>();

const notifySubscribers = (payment: PaymentRow) => {
  const subs = PAYMENT_SUBSCRIBERS.get(payment.id);
  if (subs) {
    subs.forEach(cb => {
      try {
        cb(payment);
      } catch (err) {
        console.error('Error notifying payment subscriber:', err);
      }
    });
  }
};

/**
 * Creates a deposit payment for a booking.
 * CRITICAL: Client cannot specify amount. Amount is strictly loaded from the booking record.
 */
export const createDepositPayment = async (
  bookingId: string,
  method: PaymentMethod = 'BANK_TRANSFER'
): Promise<PaymentRow> => {
  if (!bookingId) {
    throw new Error('Booking ID is required to create payment');
  }

  // 1. Production Mode with Supabase Database
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('create_deposit_payment', {
      p_booking_id: bookingId,
      p_method: method,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Không thể khởi tạo giao dịch thanh toán.');
    }

    return data as PaymentRow;
  }

  return createDepositPaymentSync(bookingId, method);
};

/**
 * Synchronous in-memory variant for offline / demo / test execution
 */
export const createDepositPaymentSync = (
  bookingId: string,
  method: PaymentMethod = 'BANK_TRANSFER'
): PaymentRow => {
  const allBookings = getBookingsInMemory();
  const booking = allBookings.find(b => b.id === bookingId);
  if (!booking) {
    const err = new Error(PAYMENT_ERROR_MESSAGES.BOOKING_NOT_FOUND);
    err.name = 'BookingNotFoundError';
    throw err;
  }

  // Check if already paid
  if (booking.paymentStatus === 'DEPOSIT_PAID' || booking.paymentStatus === 'FULLY_PAID') {
    const err = new Error(PAYMENT_ERROR_MESSAGES.PAYMENT_ALREADY_PAID);
    err.name = 'PaymentAlreadyPaidError';
    throw err;
  }

  // Idempotency: return existing active PENDING payment if one already exists
  for (const existing of IN_MEMORY_PAYMENTS.values()) {
    if (existing.booking_id === bookingId && existing.status === 'PENDING') {
      return existing;
    }
  }

  // Format transfer reference: MIPA <booking_code> <ref>
  const shortRef = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rawCode = booking.bookingCode.replace('MIPA-', '');
  const transferReference = `MIPA ${rawCode} ${shortRef}`;

  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Authoritative amount loaded from booking.depositAmount (Client cannot tamper)
  const payment: PaymentRow = {
    id: `pay_${crypto.randomUUID()}`,
    booking_id: bookingId,
    payment_type: 'DEPOSIT',
    method,
    status: 'PENDING',
    amount: booking.depositAmount,
    currency: 'VND',
    provider: method === 'VIETQR' ? 'VIETQR' : 'MANUAL_BANK_TRANSFER',
    provider_reference: null,
    idempotency_key: `idemp_${bookingId}_${Date.now()}`,
    transfer_reference: transferReference,
    transfer_submitted_at: null,
    paid_at: null,
    failed_at: null,
    expired_at: expiresIso,
    refunded_at: null,
    metadata: { booking_code: booking.bookingCode },
    created_at: nowIso,
    updated_at: nowIso,
  };

  IN_MEMORY_PAYMENTS.set(payment.id, payment);
  return payment;
};


/**
 * Gets payment details by payment ID
 */
export const getPayment = async (paymentId: string): Promise<PaymentRow | null> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error || !data) return null;
    return data as PaymentRow;
  }

  return IN_MEMORY_PAYMENTS.get(paymentId) || null;
};

/**
 * Gets the active or most recent payment for a booking
 */
export const getBookingPayment = async (bookingId: string): Promise<PaymentRow | null> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data as PaymentRow;
  }

  const matches = Array.from(IN_MEMORY_PAYMENTS.values())
    .filter(p => p.booking_id === bookingId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return matches[0] || null;
};

/**
 * Customer action: Marks that they have submitted a bank transfer ("Tôi đã chuyển khoản").
 * Note: Does NOT mark as PAID. Sets transfer_submitted_at while keeping status PENDING.
 */
export const markTransferSubmitted = async (paymentId: string): Promise<PaymentRow> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('mark_transfer_submitted', {
      p_payment_id: paymentId,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Không thể ghi nhận thông tin chuyển khoản.');
    }

    return data as PaymentRow;
  }

  return markTransferSubmittedSync(paymentId);
};

export const markTransferSubmittedSync = (paymentId: string): PaymentRow => {
  const payment = IN_MEMORY_PAYMENTS.get(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  payment.transfer_submitted_at = new Date().toISOString();
  payment.updated_at = new Date().toISOString();
  IN_MEMORY_PAYMENTS.set(paymentId, payment);
  notifySubscribers(payment);
  return payment;
};

/**
 * Management Action: Confirms manual bank transfer payment.
 * Restricted to MANAGER / ADMIN roles.
 * Atomically marks payment PAID and updates booking payment_status to DEPOSIT_PAID.
 * Idempotent: safe to invoke repeatedly.
 */
export const confirmManualPayment = async (
  paymentId: string,
  note?: string
): Promise<PaymentRow> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('confirm_manual_payment', {
      p_payment_id: paymentId,
      p_note: note || null,
    });

    if (error || !data) {
      throw new Error(error?.message || 'Không thể xác nhận thanh toán cọc.');
    }

    return data as PaymentRow;
  }

  return confirmManualPaymentSync(paymentId, note);
};

export const confirmManualPaymentSync = (
  paymentId: string,
  note?: string
): PaymentRow => {
  const payment = IN_MEMORY_PAYMENTS.get(paymentId);
  if (!payment) {
    throw new Error('Payment not found');
  }

  // Idempotency: if already paid, return safely
  if (payment.status === 'PAID') {
    return payment;
  }

  const nowIso = new Date().toISOString();
  payment.status = 'PAID';
  payment.paid_at = nowIso;
  payment.updated_at = nowIso;
  if (note) {
    payment.metadata = { ...(payment.metadata as Record<string, unknown> || {}), note };
  }

  IN_MEMORY_PAYMENTS.set(paymentId, payment);

  // Atomically update associated booking in memory
  updateBookingInMemory(payment.booking_id, {
    paymentStatus: 'DEPOSIT_PAID',
    bookingStatus: 'CONFIRMED',
    staffNote: note ? `[Xác nhận cọc]: ${note}` : undefined,
  });

  notifySubscribers(payment);
  return payment;
};


/**
 * Subscribes to payment status changes in real-time.
 * In Supabase: Uses Realtime postgres_changes + polling fallback.
 * In Offline/Demo: Uses in-memory event emitter + polling fallback.
 */
export const subscribePaymentStatus = (
  paymentId: string,
  onStatusChange: (payment: PaymentRow) => void
): (() => void) => {
  let isSubscribed = true;

  // 1. Supabase Realtime Subscription
  if (isSupabaseConfigured()) {
    const channel = supabase
      .channel(`payment-status-${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`,
        },
        payload => {
          if (isSubscribed && payload.new) {
            onStatusChange(payload.new as PaymentRow);
          }
        }
      )
      .subscribe();

    // Polling safety fallback every 3 seconds
    const intervalId = setInterval(async () => {
      if (!isSubscribed) return;
      const current = await getPayment(paymentId);
      if (current && isSubscribed) {
        onStatusChange(current);
        if (current.status === 'PAID' || current.status === 'FAILED' || current.status === 'EXPIRED') {
          clearInterval(intervalId);
        }
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
      supabase.removeChannel(channel);
    };
  }

  // 2. Offline / In-Memory Event Subscription
  if (!PAYMENT_SUBSCRIBERS.has(paymentId)) {
    PAYMENT_SUBSCRIBERS.set(paymentId, new Set());
  }
  PAYMENT_SUBSCRIBERS.get(paymentId)!.add(onStatusChange);

  // Initial trigger if already available
  const existing = IN_MEMORY_PAYMENTS.get(paymentId);
  if (existing) {
    onStatusChange(existing);
  }

  return () => {
    isSubscribed = false;
    const subs = PAYMENT_SUBSCRIBERS.get(paymentId);
    if (subs) {
      subs.delete(onStatusChange);
      if (subs.size === 0) {
        PAYMENT_SUBSCRIBERS.delete(paymentId);
      }
    }
  };
};

/**
 * Test-only reset helper for Vitest test isolation
 */
export const __testOnlyResetPaymentsStore = (): void => {
  IN_MEMORY_PAYMENTS.clear();
  PAYMENT_SUBSCRIBERS.clear();
};
