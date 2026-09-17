import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordPaymentReceipt,
  getFinancialTransactions,
  getFinancialLedgerSummary,
  resetInMemoryFinancialLedger,
  setInMemoryTransactions,
} from '../financialLedgerService';

describe('Internal Financial Ledger Service (Staff Only)', () => {
  beforeEach(() => {
    resetInMemoryFinancialLedger();
  });

  it('rejects invalid or negative payment amount', async () => {
    await expect(
      recordPaymentReceipt({
        bookingId: 'booking-1',
        transactionType: 'BALANCE',
        amount: -500000,
        method: 'CASH',
      })
    ).rejects.toThrow('Số tiền ghi nhận phải là số dương lớn hơn 0.');

    await expect(
      recordPaymentReceipt({
        bookingId: 'booking-1',
        transactionType: 'BALANCE',
        amount: 0,
        method: 'CASH',
      })
    ).rejects.toThrow('Số tiền ghi nhận phải là số dương lớn hơn 0.');
  });

  it('records payment receipt and correctly updates net cash received', async () => {
    const res1 = await recordPaymentReceipt({
      bookingId: 'booking-1',
      transactionType: 'DEPOSIT',
      amount: 1000000,
      method: 'BANK_TRANSFER',
      referenceNote: 'Tiền cọc giữ lịch',
    });

    expect(res1.transactionId).toBeDefined();
    expect(res1.newNetCash).toBe(1000000);

    const res2 = await recordPaymentReceipt({
      bookingId: 'booking-1',
      transactionType: 'BALANCE',
      amount: 1000000,
      method: 'CASH',
      referenceNote: 'Thanh toán nốt tại studio',
    });

    expect(res2.newNetCash).toBe(2000000);
  });

  it('prevents double-counting using deterministic idempotency key', async () => {
    const idempotencyKey = 'booking-deposit:booking-abc';

    const res1 = await recordPaymentReceipt({
      bookingId: 'booking-abc',
      transactionType: 'DEPOSIT',
      amount: 1500000,
      method: 'BANK_TRANSFER',
      idempotencyKey,
    });

    // Replay with identical idempotency key
    const res2 = await recordPaymentReceipt({
      bookingId: 'booking-abc',
      transactionType: 'DEPOSIT',
      amount: 1500000,
      method: 'BANK_TRANSFER',
      idempotencyKey,
    });

    expect(res2.transactionId).toBe(res1.transactionId);

    // Verify only 1 transaction exists
    const txs = await getFinancialTransactions({ bookingId: 'booking-abc' });
    expect(txs.length).toBe(1);
    expect(txs[0].amount).toBe(1500000);
  });

  it('refund transaction correctly decreases net cash received', async () => {
    await recordPaymentReceipt({
      bookingId: 'booking-refund-test',
      transactionType: 'DEPOSIT',
      amount: 2000000,
      method: 'BANK_TRANSFER',
    });

    const refundRes = await recordPaymentReceipt({
      bookingId: 'booking-refund-test',
      transactionType: 'REFUND',
      amount: 500000,
      method: 'BANK_TRANSFER',
      referenceNote: 'Hoàn một phần cọc',
    });

    // Initial 2,000,000 IN - 500,000 OUT = 1,500,000 net cash
    expect(refundRes.newNetCash).toBe(1500000);
  });

  it('distinguishes booking value from collected cash and never makes outstanding negative', async () => {
    setInMemoryTransactions([
      {
        id: 'tx-1',
        bookingId: 'booking-over',
        customerId: 'cust-1',
        transactionType: 'BALANCE',
        direction: 'IN',
        amount: 3000000,
        method: 'BANK_TRANSFER',
        receivedAt: new Date().toISOString(),
        recordedBy: 'staff-1',
        createdAt: new Date().toISOString(),
      },
    ]);

    const summary = await getFinancialLedgerSummary();
    expect(summary.actualCashReceived).toBe(3000000);
    // Booking value is contractual total, not cash
    expect(summary.confirmedBookingValue).toBe(50000000);
    expect(summary.outstandingBalance).toBeGreaterThanOrEqual(0);
  });
});
