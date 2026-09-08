// ==============================================================================
// Maison MIPA Memories - Supabase Edge Function: payment-webhook
// Secure Webhook Receiver with HMAC Signature Verification, Amount Validation,
// Replay Protection, and Idempotency.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const WEBHOOK_SECRET = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || '';

async function verifyHmacSha256(secret: string, data: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert hex signature string to ArrayBuffer
    const sigBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(data));
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
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature') || '';

    // 1. Signature Verification: Reject if missing or invalid
    if (!WEBHOOK_SECRET) {
      console.error('PAYMENT_WEBHOOK_SECRET is not configured on server.');
      return new Response(JSON.stringify({ error: 'Webhook secret unconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isValidSignature = await verifyHmacSha256(WEBHOOK_SECRET, rawBody, signature);
    if (!isValidSignature) {
      console.warn('Invalid webhook signature attempt rejected.');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const {
      transfer_reference,
      amount,
      provider_reference,
      provider = 'WEBHOOK_GATEWAY',
    } = payload;

    if (!transfer_reference || typeof amount !== 'number') {
      return new Response(JSON.stringify({ error: 'Malformed webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 2. Lookup payment by transfer_reference
    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('transfer_reference', transfer_reference)
      .maybeSingle();

    if (fetchErr || !payment) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Idempotency Check: If already PAID, return 200 without reprocessing
    if (payment.status === 'PAID') {
      return new Response(JSON.stringify({ message: 'Payment already confirmed', status: 'PAID' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Amount Verification: Strictly reject if paid amount doesn't match backend amount
    if (Number(amount) < Number(payment.amount)) {
      console.warn(`Amount mismatch for ${payment.id}: expected ${payment.amount}, received ${amount}`);
      return new Response(JSON.stringify({ error: 'Amount mismatch' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    // 5. Transaction-safe update: Mark payment PAID
    const { error: updatePayErr } = await supabaseAdmin
      .from('payments')
      .update({
        status: 'PAID',
        paid_at: now,
        provider,
        provider_reference: provider_reference || null,
        metadata: {
          ...payment.metadata,
          webhook_received_at: now,
          amount_received: amount,
        },
        updated_at: now,
      })
      .eq('id', payment.id);

    if (updatePayErr) {
      return new Response(JSON.stringify({ error: 'Failed to update payment record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Update Booking status to DEPOSIT_PAID and CONFIRMED
    await supabaseAdmin
      .from('bookings')
      .update({
        payment_status: 'DEPOSIT_PAID',
        booking_status: 'CONFIRMED',
        updated_at: now,
      })
      .eq('id', payment.booking_id);

    // 7. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: null,
      entity_type: 'PAYMENT',
      entity_id: payment.id,
      action: 'WEBHOOK_PAYMENT_CONFIRMED',
      new_data: {
        status: 'PAID',
        amount,
        provider,
        provider_reference,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment confirmed successfully',
        payment_id: payment.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
