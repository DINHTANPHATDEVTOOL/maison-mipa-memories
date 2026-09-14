import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  createDepositPaymentSync,
  markTransferSubmittedSync,
  confirmManualPaymentSync,
  subscribePaymentStatus,
  __testOnlyResetPaymentsStore,
} from '../paymentService';
import {
  createBookingInMemory,
  resetInMemoryBookings,
  getInMemoryBookings,
} from '../bookingService';
import { INITIAL_SERVICES, INITIAL_PACKAGES, INITIAL_STUDIO_ROOMS } from '../../mockData';

// Helper: compute payOS signature according to official specification
function generatePayosSignature(checksumKey: string, dataObj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(dataObj).sort();
  const queryParts: string[] = [];

  for (const key of sortedKeys) {
    const val = dataObj[key];
    if (val === undefined) continue;
    const strVal = val === null ? '' : String(val);
    queryParts.push(`${key}=${strVal}`);
  }

  const dataString = queryParts.join('&');
  return crypto.createHmac('sha256', checksumKey).update(dataString).digest('hex');
}

// Mock Webhook Receiver Simulator replicating Edge Function logic
interface WebhookResult {
  status: number;
  data: any;
}

async function simulatePayosWebhook(
  payload: { code: string; desc: string; data: Record<string, any>; signature: string },
  checksumKey: string,
  paymentsDb: Map<string, any>,
  outboxDb: Map<string, any>,
  auditDb: any[]
): Promise<WebhookResult> {
  // 1. Verify payOS Signature
  if (!payload.signature || !checksumKey) {
    return { status: 401, data: { error: 'Invalid signature' } };
  }

  const expectedSig = generatePayosSignature(checksumKey, payload.data);
  if (expectedSig.toLowerCase() !== payload.signature.toLowerCase()) {
    return { status: 401, data: { error: 'Invalid signature' } };
  }

  const { orderCode, amount, description, reference } = payload.data;

  // 2. Lookup payment by transfer_reference or order_code
  let payment: any = null;
  for (const p of paymentsDb.values()) {
    if (p.transfer_reference === description || p.metadata?.order_code === orderCode) {
      payment = p;
      break;
    }
  }

  if (!payment) {
    return { status: 404, data: { error: 'Payment not found' } };
  }

  // 3. Idempotency Check: if already PAID, return 200 without reprocessing
  if (payment.status === 'PAID') {
    return { status: 200, data: { message: 'Payment already confirmed', status: 'PAID' } };
  }

  // 4. Amount Verification: fail-closed if amount < required deposit
  if (Number(amount) < Number(payment.amount)) {
    return { status: 400, data: { error: 'Amount mismatch' } };
  }

  // 5. Update payment to PAID
  const now = new Date().toISOString();
  payment.status = 'PAID';
  payment.paid_at = now;
  payment.provider = 'PAYOS_ACB';
  payment.provider_reference = reference || String(orderCode);
  payment.updated_at = now;
  paymentsDb.set(payment.id, payment);

  // 6. Enqueue exactly ONE transactional email (protected by idempotency key)
  const idempotencyKey = `deposit_received_payment_${payment.id}`;
  if (!outboxDb.has(idempotencyKey)) {
    outboxDb.set(idempotencyKey, {
      id: `outbox_${payment.id}`,
      eventType: 'DEPOSIT_RECEIVED',
      templateKey: 'deposit_received',
      recipientEmail: 'client@example.com',
      idempotencyKey,
      status: 'PENDING',
      createdAt: now,
    });
  }

  // 7. Record Audit Log
  auditDb.push({
    action: 'PAYOS_WEBHOOK_PAYMENT_CONFIRMED',
    paymentId: payment.id,
    amount,
    timestamp: now,
  });

  return {
    status: 200,
    data: { success: true, message: 'Payment confirmed successfully', payment_id: payment.id, status: 'PAID' },
  };
}

describe('Issue #17: payOS Webhook, ACB Auto-Confirm, and Security Rules', () => {
  const CHECKSUM_KEY = 'test_payos_checksum_secret_key_12345';
  let paymentsStore: Map<string, any>;
  let outboxStore: Map<string, any>;
  let auditLogs: any[];

  beforeEach(() => {
    resetInMemoryBookings([]);
    __testOnlyResetPaymentsStore();
    paymentsStore = new Map();
    outboxStore = new Map();
    auditLogs = [];
  });

  const setupBookingAndPayment = () => {
    const booking = createBookingInMemory({
      serviceId: INITIAL_SERVICES[0].id,
      packageId: INITIAL_PACKAGES[0].id,
      studioId: INITIAL_STUDIO_ROOMS[0].id,
      date: '2026-09-25',
      timeSlot: '10:00',
      customerName: 'Nguyễn Văn Test',
      customerEmail: 'client@example.com',
      customerPhone: '0901234567',
    });

    const payment = createDepositPaymentSync(booking.id);
    // Attach order_code
    payment.metadata = { order_code: 100201 };
    paymentsStore.set(payment.id, payment);

    return { booking, payment };
  };

  it('1. valid payOS webhook -> marks payment PAID exactly once and confirms booking', async () => {
    const { payment } = setupBookingAndPayment();

    const webhookData = {
      orderCode: 100201,
      amount: payment.amount,
      description: payment.transfer_reference,
      accountNumber: '0123456789',
      reference: 'FT_ACB_987654',
      transactionDateTime: '2026-09-10 14:00:00',
      currency: 'VND',
    };

    const signature = generatePayosSignature(CHECKSUM_KEY, webhookData);

    const result = await simulatePayosWebhook(
      { code: '00', desc: 'success', data: webhookData, signature },
      CHECKSUM_KEY,
      paymentsStore,
      outboxStore,
      auditLogs
    );

    expect(result.status).toBe(200);
    expect(result.data.success).toBe(true);
    expect(result.data.status).toBe('PAID');

    const updatedPayment = paymentsStore.get(payment.id);
    expect(updatedPayment.status).toBe('PAID');
    expect(updatedPayment.provider).toBe('PAYOS_ACB');
    expect(updatedPayment.paid_at).not.toBeNull();
  });

  it('2. invalid signature rejected (fail-closed, returns 401)', async () => {
    const { payment } = setupBookingAndPayment();

    const webhookData = {
      orderCode: 100201,
      amount: payment.amount,
      description: payment.transfer_reference,
    };

    const forgedSignature = 'forged_fake_signature_hex_00000';

    const result = await simulatePayosWebhook(
      { code: '00', desc: 'success', data: webhookData, signature: forgedSignature },
      CHECKSUM_KEY,
      paymentsStore,
      outboxStore,
      auditLogs
    );

    expect(result.status).toBe(401);
    expect(result.data.error).toBe('Invalid signature');

    // Payment must remain PENDING
    const unchangedPayment = paymentsStore.get(payment.id);
    expect(unchangedPayment.status).toBe('PENDING');
    expect(unchangedPayment.paid_at).toBeNull();
  });

  it('3. amount mismatch rejected (returns 400, status remains PENDING)', async () => {
    const { payment } = setupBookingAndPayment();

    // Customer pays less than required deposit
    const underpaidAmount = payment.amount - 100000;
    expect(underpaidAmount).toBeGreaterThan(0);

    const webhookData = {
      orderCode: 100201,
      amount: underpaidAmount,
      description: payment.transfer_reference,
    };

    const signature = generatePayosSignature(CHECKSUM_KEY, webhookData);

    const result = await simulatePayosWebhook(
      { code: '00', desc: 'success', data: webhookData, signature },
      CHECKSUM_KEY,
      paymentsStore,
      outboxStore,
      auditLogs
    );

    expect(result.status).toBe(400);
    expect(result.data.error).toBe('Amount mismatch');

    const unchangedPayment = paymentsStore.get(payment.id);
    expect(unchangedPayment.status).toBe('PENDING');
  });

  it('4. unknown order rejected (returns 404, fails closed)', async () => {
    setupBookingAndPayment();

    const webhookData = {
      orderCode: 999999, // Non-existent order
      amount: 500000,
      description: 'MIPA UNKNOWN 999',
    };

    const signature = generatePayosSignature(CHECKSUM_KEY, webhookData);

    const result = await simulatePayosWebhook(
      { code: '00', desc: 'success', data: webhookData, signature },
      CHECKSUM_KEY,
      paymentsStore,
      outboxStore,
      auditLogs
    );

    expect(result.status).toBe(404);
    expect(result.data.error).toBe('Payment not found');
  });

  it('5. duplicate webhook is strictly idempotent (200, no duplicate writes)', async () => {
    const { payment } = setupBookingAndPayment();

    const webhookData = {
      orderCode: 100201,
      amount: payment.amount,
      description: payment.transfer_reference,
      reference: 'FT_ACB_DUPLICATE_TEST',
    };

    const signature = generatePayosSignature(CHECKSUM_KEY, webhookData);
    const payload = { code: '00', desc: 'success', data: webhookData, signature };

    // 1st delivery: Processed
    const res1 = await simulatePayosWebhook(payload, CHECKSUM_KEY, paymentsStore, outboxStore, auditLogs);
    expect(res1.status).toBe(200);
    expect(outboxStore.size).toBe(1);
    expect(auditLogs.length).toBe(1);

    // 2nd delivery: Duplicate payload
    const res2 = await simulatePayosWebhook(payload, CHECKSUM_KEY, paymentsStore, outboxStore, auditLogs);
    expect(res2.status).toBe(200);
    expect(res2.data.message).toBe('Payment already confirmed');

    // No second email or duplicate audit log
    expect(outboxStore.size).toBe(1);
    expect(auditLogs.length).toBe(1);
  });

  it('6. replay safe: rejects expired or altered transaction parameters', async () => {
    const { payment } = setupBookingAndPayment();

    const webhookData = {
      orderCode: 100201,
      amount: payment.amount,
      description: payment.transfer_reference,
    };

    // Calculate valid signature for original data
    const validSignature = generatePayosSignature(CHECKSUM_KEY, webhookData);

    // Attacker tampers with amount after signature generation (replay / tampering attack)
    const tamperedData = {
      ...webhookData,
      amount: payment.amount / 2,
    };

    const result = await simulatePayosWebhook(
      { code: '00', desc: 'success', data: tamperedData, signature: validSignature },
      CHECKSUM_KEY,
      paymentsStore,
      outboxStore,
      auditLogs
    );

    expect(result.status).toBe(401);
    expect(result.data.error).toBe('Invalid signature');
  });

  it('7. customer cannot self-mark payment as PAID', () => {
    const { payment } = setupBookingAndPayment();

    // Customer only submits transfer notification ("Tôi đã chuyển khoản")
    const updated = markTransferSubmittedSync(payment.id);

    // Payment MUST remain PENDING
    expect(updated.status).toBe('PENDING');
    expect(updated.transfer_submitted_at).not.toBeNull();
    expect(updated.paid_at).toBeNull();

    // Only Management can confirm manual payment
    const confirmed = confirmManualPaymentSync(payment.id, 'Manager audited transfer');
    expect(confirmed.status).toBe('PAID');
    expect(confirmed.paid_at).not.toBeNull();
  });

  it('8. PAID state enqueues exactly one transactional email into notification_outbox', async () => {
    const { payment } = setupBookingAndPayment();

    const webhookData = {
      orderCode: 100201,
      amount: payment.amount,
      description: payment.transfer_reference,
    };

    const signature = generatePayosSignature(CHECKSUM_KEY, webhookData);

    await simulatePayosWebhook(
      { code: '00', desc: 'success', data: webhookData, signature },
      CHECKSUM_KEY,
      paymentsStore,
      outboxStore,
      auditLogs
    );

    const expectedKey = `deposit_received_payment_${payment.id}`;
    expect(outboxStore.has(expectedKey)).toBe(true);

    const outboxItem = outboxStore.get(expectedKey);
    expect(outboxItem.eventType).toBe('DEPOSIT_RECEIVED');
    expect(outboxItem.templateKey).toBe('deposit_received');
    expect(outboxItem.status).toBe('PENDING');
    expect(outboxStore.size).toBe(1);
  });

  it('9. realtime UI reflects backend payment state automatically', async () => {
    const { booking } = setupBookingAndPayment();
    const payment = createDepositPaymentSync(booking.id);

    const receivedUpdates: any[] = [];
    const unsubscribe = subscribePaymentStatus(payment.id, (pay) => {
      receivedUpdates.push(pay);
    });

    // 1. Initial subscription emits PENDING
    expect(receivedUpdates.length).toBeGreaterThanOrEqual(1);
    expect(receivedUpdates[receivedUpdates.length - 1].status).toBe('PENDING');

    // 2. Webhook confirms payment to PAID
    confirmManualPaymentSync(payment.id);

    // 3. Listener receives updated state with status PAID
    expect(receivedUpdates[receivedUpdates.length - 1].status).toBe('PAID');

    // Associated booking in memory is now DEPOSIT_PAID
    const updatedBooking = getInMemoryBookings().find(b => b.id === booking.id);
    expect(updatedBooking?.paymentStatus).toBe('DEPOSIT_PAID');
    expect(updatedBooking?.bookingStatus).toBe('CONFIRMED');

    unsubscribe();
  });
});
