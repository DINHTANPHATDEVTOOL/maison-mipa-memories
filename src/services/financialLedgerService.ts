// ==============================================================================
// Maison MIPA Memories - Internal Financial Ledger Service (Staff/Admin Only)
// Zero customer payment runtime. Authoritative manual cash collection tracking.
// ==============================================================================

import { supabase, isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import type {
  FinancialTransaction,
  FinancialTransactionType,
  FinancialPaymentMethod,
  RecordPaymentReceiptInput,
} from '../types';

let inMemoryTransactions: FinancialTransaction[] = [];

export const resetInMemoryFinancialLedger = () => {
  inMemoryTransactions = [];
};

export const setInMemoryTransactions = (transactions: FinancialTransaction[]) => {
  inMemoryTransactions = [...transactions];
};

export interface FinancialSummary {
  confirmedBookingValue: number;
  completedBookingValue: number;
  confirmedDeposits: number;
  actualCashReceived: number;
  outstandingBalance: number;
  totalRefunded: number;
  totalTransactionsCount: number;
}

export interface GetFinancialTransactionsParams {
  bookingId?: string;
  customerId?: string;
  transactionType?: FinancialTransactionType;
  method?: FinancialPaymentMethod;
  limit?: number;
  offset?: number;
}

/**
 * Records an authoritative payment receipt into the internal financial ledger via RPC.
 * Used for "Xác nhận đã thu phần còn lại", deposits, adjustments, or refunds.
 */
export async function recordPaymentReceipt(
  input: RecordPaymentReceiptInput
): Promise<{ transactionId: string; newNetCash: number; outstandingBalance: number }> {
  if (!input.bookingId) {
    throw new Error('Mã booking không được để trống.');
  }

  if (typeof input.amount !== 'number' || isNaN(input.amount) || input.amount <= 0) {
    throw new Error('Số tiền ghi nhận phải là số dương lớn hơn 0.');
  }

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('record_booking_payment_receipt', {
      p_booking_id: input.bookingId,
      p_transaction_type: input.transactionType,
      p_amount: input.amount,
      p_method: input.method,
      p_reference_note: input.referenceNote || null,
      p_idempotency_key: input.idempotencyKey || null,
      p_received_at: input.receivedAt || null,
    });

    if (error) {
      console.error('[Finance] record_booking_payment_receipt RPC error:', error);
      throw new Error(`Không thể ghi nhận giao dịch: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Ghi nhận giao dịch không thành công.');
    }

    return {
      transactionId: data.transaction_id,
      newNetCash: Number(data.new_net_cash || 0),
      outstandingBalance: Number(data.outstanding_balance || 0),
    };
  }

  // In-memory implementation for unit testing and demo mode
  const direction = input.transactionType === 'REFUND' ? 'OUT' : 'IN';
  const newTx: FinancialTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    bookingId: input.bookingId,
    customerId: 'cust-mock-id',
    transactionType: input.transactionType,
    direction,
    amount: input.amount,
    method: input.method,
    receivedAt: input.receivedAt || new Date().toISOString(),
    referenceNote: input.referenceNote,
    idempotencyKey: input.idempotencyKey,
    recordedBy: 'staff-mock-id',
    recordedByName: 'Nhân viên MIPA',
    createdAt: new Date().toISOString(),
  };

  // Check idempotency key if provided
  if (input.idempotencyKey) {
    const existing = inMemoryTransactions.find(t => t.idempotencyKey === input.idempotencyKey);
    if (existing) {
      return {
        transactionId: existing.id,
        newNetCash: existing.amount,
        outstandingBalance: 0,
      };
    }
  }

  inMemoryTransactions.unshift(newTx);

  const netCash = inMemoryTransactions
    .filter(t => t.bookingId === input.bookingId)
    .reduce((sum, t) => sum + (t.direction === 'IN' ? t.amount : -t.amount), 0);

  return {
    transactionId: newTx.id,
    newNetCash: netCash,
    outstandingBalance: Math.max(0, 2000000 - netCash),
  };
}

/**
 * Retrieves financial transaction history with optional filters.
 */
export async function getFinancialTransactions(
  params: GetFinancialTransactionsParams = {}
): Promise<FinancialTransaction[]> {
  const { limit = 50, offset = 0 } = params;

  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    let query = supabase
      .from('booking_financial_transactions')
      .select(`
        *,
        booking:bookings!booking_financial_transactions_booking_id_fkey(booking_code, total_amount),
        customer:profiles!booking_financial_transactions_customer_id_fkey(full_name, phone),
        recorder:profiles!booking_financial_transactions_recorded_by_fkey(full_name)
      `)
      .order('received_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params.bookingId) {
      query = query.eq('booking_id', params.bookingId);
    }
    if (params.customerId) {
      query = query.eq('customer_id', params.customerId);
    }
    if (params.transactionType) {
      query = query.eq('transaction_type', params.transactionType);
    }
    if (params.method) {
      query = query.eq('method', params.method);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Finance] get transactions error:', error);
      throw new Error(`Không thể tải lịch sử giao dịch: ${error.message}`);
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      bookingId: r.booking_id,
      bookingCode: r.booking?.booking_code,
      customerId: r.customer_id,
      customerName: r.customer?.full_name,
      customerPhone: r.customer?.phone,
      transactionType: r.transaction_type as FinancialTransactionType,
      direction: r.direction,
      amount: Number(r.amount),
      method: r.method as FinancialPaymentMethod,
      receivedAt: r.received_at,
      referenceNote: r.reference_note || undefined,
      idempotencyKey: r.idempotency_key || undefined,
      recordedBy: r.recorded_by,
      recordedByName: r.recorder?.full_name,
      createdAt: r.created_at,
    }));
  }

  let list = [...inMemoryTransactions];
  if (params.bookingId) {
    list = list.filter(t => t.bookingId === params.bookingId);
  }
  if (params.customerId) {
    list = list.filter(t => t.customerId === params.customerId);
  }
  if (params.transactionType) {
    list = list.filter(t => t.transactionType === params.transactionType);
  }
  if (params.method) {
    list = list.filter(t => t.method === params.method);
  }

  return list.slice(offset, offset + limit);
}

/**
 * Calculates current overall financial summary metrics.
 */
export async function getFinancialLedgerSummary(
  startAt?: string,
  endAt?: string
): Promise<FinancialSummary> {
  if (isSupabaseConfigured() && !isDemoModeEnabled()) {
    const { data, error } = await supabase.rpc('get_crm_dashboard_summary', {
      p_start_at: startAt || null,
      p_end_at: endAt || null,
    });

    if (error) {
      console.error('[Finance] get_crm_dashboard_summary error:', error);
      throw new Error(`Không thể tải tóm tắt tài chính: ${error.message}`);
    }

    const fin = data?.financials || {};
    return {
      confirmedBookingValue: Number(fin.confirmed_booking_value || 0),
      completedBookingValue: Number(fin.completed_booking_value || 0),
      confirmedDeposits: Number(fin.confirmed_deposits || 0),
      actualCashReceived: Number(fin.actual_cash_received || 0),
      outstandingBalance: Number(fin.outstanding_balance || 0),
      totalRefunded: Number(fin.refunded_amount || 0),
      totalTransactionsCount: 0,
    };
  }

  const inTxs = inMemoryTransactions.filter(t => t.direction === 'IN');
  const outTxs = inMemoryTransactions.filter(t => t.direction === 'OUT');

  const cashIn = inTxs.reduce((sum, t) => sum + t.amount, 0);
  const cashOut = outTxs.reduce((sum, t) => sum + t.amount, 0);
  const actualCashReceived = cashIn - cashOut;

  const confirmedDeposits = inMemoryTransactions
    .filter(t => t.transactionType === 'DEPOSIT')
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    confirmedBookingValue: 50000000,
    completedBookingValue: 35000000,
    confirmedDeposits,
    actualCashReceived,
    outstandingBalance: Math.max(0, 50000000 - actualCashReceived),
    totalRefunded: cashOut,
    totalTransactionsCount: inMemoryTransactions.length,
  };
}
