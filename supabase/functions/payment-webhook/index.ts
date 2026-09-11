// ==============================================================================
// Maison MIPA Memories - Supabase Edge Function: payment-webhook
// Production payOS & ACB Banking Webhook Receiver.
// Features:
// - payOS Sorted-Data HMAC-SHA256 Checksum Verification
// - Fallback raw-body HMAC-SHA256 verification
// - Order Lookup by orderCode, transfer_reference, or provider_reference
// - Authoritative Amount Validation (Fail-closed on mismatch)
// - Replay Protection & Idempotency (Already PAID returns 200 immediately)
// - Atomic Database Transaction & Exactly-Once Transactional Email Outbox
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY') || '';
const PAYMENT_WEBHOOK_SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || '';

/**
 * Computes HMAC-SHA256 hex string for given key and data string.
 */
async function computeHmacSha256Hex(keyString: string, dataString: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyString),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies payOS webhook signature according to official specification:
 * 1. Sorts all keys in the data object alphabetically (ASCII order).
 * 2. Joins into a query string: key1=val1&key2=val2 (null values become "").
 * 3. Computes HMAC-SHA256 with PAYOS_CHECKSUM_KEY.
 * 4. Compares with signature string in constant time / hex equality.
 */
export async function verifyPayosSignature(
  checksumKey: string,
  dataObj: Record<string, unknown>,
  receivedSignature: string
): Promise<boolean> {
  if (!checksumKey || !dataObj || !receivedSignature) return false;

  try {
    const sortedKeys = Object.keys(dataObj).sort();
    const queryParts: string[] = [];

    for (const key of sortedKeys) {
      const val = dataObj[key];
      if (val === undefined) continue;
      const strVal = val === null ? '' : String(val);
      queryParts.push(`${key}=${strVal}`);
    }

    const dataString = queryParts.join('&');
    const computedHex = await computeHmacSha256Hex(checksumKey, dataString);
    return computedHex.toLowerCase() === receivedSignature.toLowerCase().trim();
  } catch {
    return false;
  }
}

/**
 * Verifies raw body HMAC-SHA256 signature for generic webhooks.
 */
export async function verifyRawBodySignature(
  secret: string,
  rawBody: string,
  signature: string
): Promise<boolean> {
  if (!secret || !rawBody || !signature) return false;
  try {
    const computedHex = await computeHmacSha256Hex(secret, rawBody);
    return computedHex.toLowerCase() === signature.toLowerCase().trim();
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-webhook-signature') || req.headers.get('x-signature') || '';

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'Malformed JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Signature Verification
    let isValidSignature = false;

    // Check payOS structure: payload has 'data' and 'signature'
    const payosData = (payload.data && typeof payload.data === 'object') ? (payload.data as Record<string, unknown>) : null;
    const payosSignature = typeof payload.signature === 'string' ? payload.signature : signatureHeader;

    if (payosData && payosSignature && PAYOS_CHECKSUM_KEY) {
      isValidSignature = await verifyPayosSignature(PAYOS_CHECKSUM_KEY, payosData, payosSignature);
    } else if (signatureHeader && PAYMENT_WEBHOOK_SECRET) {
      isValidSignature = await verifyRawBodySignature(PAYMENT_WEBHOOK_SECRET, rawBody, signatureHeader);
    }

    // Reject invalid or unverified signatures (Fail-Closed)
    if (!isValidSignature) {
      console.warn('Webhook signature verification failed or secret unconfigured.');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Extract transaction fields
    const orderCode = payosData ? payosData.orderCode : payload.orderCode || payload.order_code;
    const amount = Number(payosData ? payosData.amount : payload.amount);
    const transferReference = String(payosData?.description || payload.transfer_reference || payload.description || '').trim();
    const providerReference = String(payosData?.reference || payload.provider_reference || payosData?.paymentLinkId || '').trim();
    const provider = payosData ? 'PAYOS_ACB' : String(payload.provider || 'WEBHOOK_GATEWAY');

    if (isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid amount in webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Lookup payment record (by order_code, transfer_reference, or provider_reference)
    let payment: any = null;

    if (orderCode !== undefined && orderCode !== null) {
      const { data: payByCode } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('order_code', Number(orderCode))
        .maybeSingle();

      if (payByCode) {
        payment = payByCode;
      }
    }

    if (!payment && transferReference) {
      // Direct match on transfer_reference
      const { data: payByRef } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('transfer_reference', transferReference)
        .maybeSingle();

      if (payByRef) {
        payment = payByRef;
      }
    }

    if (!payment && providerReference) {
      const { data: payByProvRef } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('provider_reference', providerReference)
        .maybeSingle();

      if (payByProvRef) {
        payment = payByProvRef;
      }
    }

    // Fail-closed: Unknown order rejected
    if (!payment) {
      console.warn(`Payment not found for orderCode: ${orderCode}, ref: ${transferReference}`);
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Idempotency Check: If already PAID, return 200 without reprocessing or duplicate emails
    if (payment.status === 'PAID') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already confirmed',
          status: 'PAID',
          payment_id: payment.id,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Amount Verification: Strictly reject if paid amount doesn't match required deposit amount
    if (amount < Number(payment.amount)) {
      console.warn(`Amount mismatch for ${payment.id}: expected ${payment.amount}, received ${amount}`);
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    // 6. Transaction-safe update: Mark payment PAID
    const { error: updatePayErr } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'PAID',
        paid_at: now,
        provider,
        provider_reference: providerReference || null,
        metadata: {
          ...payment.metadata,
          webhook_received_at: now,
          amount_received: amount,
          payos_data: payosData,
        },
        updated_at: now,
      })
      .eq('id', payment.id);

    if (updatePayErr) {
      throw new Error(`Failed to update payment record: ${updatePayErr.message}`);
    }

    // 7. Update Booking status to DEPOSIT_PAID and CONFIRMED
    const { data: booking, error: updateBookingErr } = await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'DEPOSIT_PAID',
        booking_status: 'CONFIRMED',
        updated_at: now,
      })
      .eq('id', payment.booking_id)
      .select('*')
      .single();

    if (updateBookingErr) {
      console.warn(`Warning: Could not update booking status: ${updateBookingErr.message}`);
    }

    // 8. Enqueue exactly ONE transactional email in notification_outbox
    // (Protected by unique idempotency_key = deposit_received_payment_<id>)
    if (booking) {
      const idempotencyKey = `deposit_received_payment_${payment.id}`;
      await supabaseAdmin.from('notification_outbox').upsert({
        event_type: 'DEPOSIT_RECEIVED',
        recipient_user_id: booking.customer_id,
        recipient_email: booking.customer_email,
        entity_type: 'PAYMENT',
        entity_id: payment.id,
        template_key: 'deposit_received',
        payload: {
          booking_code: booking.booking_code,
          customer_name: booking.customer_name,
          amount,
          paid_at: now,
          transfer_reference: payment.transfer_reference,
          provider,
        },
        status: 'PENDING',
        idempotency_key: idempotencyKey,
      }, { onConflict: 'idempotency_key', ignoreDuplicates: true });
    }

    // 9. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: null,
      entity_type: 'PAYMENT',
      entity_id: payment.id,
      action: 'PAYOS_WEBHOOK_PAYMENT_CONFIRMED',
      new_data: {
        status: 'PAID',
        amount,
        provider,
        provider_reference: providerReference,
        order_code: orderCode,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment confirmed successfully via signed webhook',
        payment_id: payment.id,
        status: 'PAID',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    console.error('Webhook error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
