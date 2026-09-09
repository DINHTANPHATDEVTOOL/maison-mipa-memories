// ==============================================================================
// Maison MIPA Memories - Production Edge Function: send-email
// Processes notification_outbox and sends transactional emails via Resend API.
// Features:
// - Server-only secrets: RESEND_API_KEY, EMAIL_FROM
// - Strict Idempotency via Resend Idempotency-Key
// - Automatic retry with bounded exponential backoff
// - Sanitized error reporting (no secret leak)
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { renderEmailHtml } from '../_shared/emailTemplates.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'Maison MIPA Memories <no-reply@maisonmipa.io.vn>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Read payload if triggered by database webhook or batch worker
    let targetOutboxId: string | null = null;
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        targetOutboxId = body.outboxId || body.record?.id || null;
      } catch {
        // Ignored, proceed to queue scan
      }
    }

    // 1. Fetch pending notifications ready for sending
    let query = supabaseAdmin
      .from('notification_outbox')
      .select('*')
      .in('status', ['PENDING', 'FAILED'])
      .lt('attempts', 5)
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(10);

    if (targetOutboxId) {
      query = query.eq('id', targetOutboxId);
    }

    const { data: outboxItems, error: fetchErr } = await query;
    if (fetchErr) {
      throw new Error(`Failed to fetch outbox items: ${fetchErr.message}`);
    }

    if (!outboxItems || outboxItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No pending emails to send.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    // Check Resend Key Availability
    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not configured in server environment.');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email provider not configured (RESEND_API_KEY missing).',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // 2. Process each outbox item with idempotency
    for (const item of outboxItems) {
      // Mark as PROCESSING
      await supabaseAdmin
        .from('notification_outbox')
        .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
        .eq('id', item.id);

      const { subject, html } = renderEmailHtml(item.template_key, item.payload);

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': item.idempotency_key,
          },
          body: JSON.stringify({
            from: EMAIL_FROM,
            to: [item.recipient_email],
            subject,
            html,
          }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
          const sanitizedErr = resendData.message || 'Resend provider error';
          const nextAttempt = new Date(Date.now() + Math.pow(2, item.attempts + 1) * 60000).toISOString();

          await supabaseAdmin
            .from('notification_outbox')
            .update({
              status: item.attempts + 1 >= 5 ? 'FAILED' : 'PENDING',
              attempts: item.attempts + 1,
              next_attempt_at: nextAttempt,
              last_error: sanitizedErr,
            })
            .eq('id', item.id);

          results.push({ id: item.id, status: 'FAILED', error: sanitizedErr });
        } else {
          // Success
          await supabaseAdmin
            .from('notification_outbox')
            .update({
              status: 'SENT',
              sent_at: new Date().toISOString(),
              provider_message_id: resendData.id || null,
              last_error: null,
            })
            .eq('id', item.id);

          results.push({ id: item.id, status: 'SENT', providerId: resendData.id });
        }
      } catch (sendErr: any) {
        const sanitized = sendErr?.message || 'Network transport failure';
        const nextAttempt = new Date(Date.now() + Math.pow(2, item.attempts + 1) * 60000).toISOString();

        await supabaseAdmin
          .from('notification_outbox')
          .update({
            status: item.attempts + 1 >= 5 ? 'FAILED' : 'PENDING',
            attempts: item.attempts + 1,
            next_attempt_at: nextAttempt,
            last_error: sanitized,
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: 'FAILED', error: sanitized });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, details: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal Server Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
