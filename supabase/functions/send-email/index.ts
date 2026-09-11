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
const EMAIL_REPLY_TO = Deno.env.get('EMAIL_REPLY_TO') || 'maisonmipamemories@gmail.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const INTERNAL_WORKER_SECRET = Deno.env.get('INTERNAL_WORKER_SECRET') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Enforce internal/authorized access only (never allow public client arbitrary calls)
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    let isAuthorized = false;
    let isStaffOrAdmin = false;
    let authenticatedUser: any = null;

    if (SUPABASE_SERVICE_ROLE_KEY && token === SUPABASE_SERVICE_ROLE_KEY) {
      isAuthorized = true;
      isStaffOrAdmin = true;
    } else if (INTERNAL_WORKER_SECRET && token === INTERNAL_WORKER_SECRET) {
      isAuthorized = true;
      isStaffOrAdmin = true;
    } else if (token) {
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        authenticatedUser = user;
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile && ['MANAGER', 'ADMIN', 'STAFF'].includes(profile.role)) {
          isAuthorized = true;
          isStaffOrAdmin = true;
        } else if (user) {
          // Allow customer to trigger delivery for their own notification
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized: internal service only' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Read payload if triggered by database webhook, client dispatch, or batch worker
    let targetOutboxId: string | null = null;
    let targetBookingId: string | null = null;
    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        targetOutboxId = body.outboxId || body.record?.id || null;
        targetBookingId = body.bookingId || null;
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
    } else if (targetBookingId) {
      query = query.eq('entity_id', targetBookingId);
    }

    if (!isStaffOrAdmin && authenticatedUser) {
      // Regular customers can only trigger delivery of notifications addressed to themselves
      query = query.or(`recipient_user_id.eq.${authenticatedUser.id},recipient_email.eq.${authenticatedUser.email}`);
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

      // Enrich booking data directly from database if entity_type is BOOKING
      let payload = { ...(item.payload || {}) };
      if (item.entity_type === 'BOOKING' && item.entity_id) {
        try {
          const { data: bData } = await supabaseAdmin
            .from('bookings')
            .select(`
              id, booking_code, customer_name, customer_phone, customer_email,
              occasion, customer_note, start_at, end_at, subtotal, addon_total,
              discount_total, total_amount, deposit_amount,
              services:service_id ( name ),
              packages:package_id ( name, price, duration_minutes, concepts_count, edited_photos_count, features ),
              studio_rooms:studio_room_id ( name )
            `)
            .eq('id', item.entity_id)
            .maybeSingle();

          if (bData) {
            // Also fetch concepts
            const { data: conceptsData } = await supabaseAdmin
              .from('booking_concepts')
              .select('concepts:concept_id ( name )')
              .eq('booking_id', item.entity_id);

            // Also fetch addons
            const { data: addonsData } = await supabaseAdmin
              .from('booking_addons')
              .select('quantity, unit_price, line_total, addons:addon_id ( name )')
              .eq('booking_id', item.entity_id);

            const conceptNames = conceptsData
              ?.map((c: any) => c.concepts?.name)
              .filter(Boolean) || [];

            const addonItems = addonsData
              ?.map((a: any) => ({
                name: a.addons?.name || 'Dịch vụ cộng thêm',
                quantity: a.quantity || 1,
                lineTotal: a.line_total || a.unit_price || 0,
              })) || [];

            let formattedStartAt = payload.start_at || payload.startAt;
            if (bData.start_at) {
              const d = new Date(bData.start_at);
              if (!isNaN(d.getTime())) {
                const timeStr = new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false,
                }).format(d);
                const dateStr = new Intl.DateTimeFormat('en-GB', {
                  timeZone: 'Asia/Ho_Chi_Minh',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }).format(d);
                formattedStartAt = `${timeStr} Ngày ${dateStr}`;
              }
            }

            payload = {
              ...payload,
              booking_code: bData.booking_code || payload.booking_code,
              bookingCode: bData.booking_code || payload.bookingCode,
              customer_name: bData.customer_name || payload.customer_name,
              customerName: bData.customer_name || payload.customerName,
              customer_phone: bData.customer_phone || payload.customer_phone,
              customerPhone: bData.customer_phone || payload.customerPhone,
              customer_email: bData.customer_email || payload.customer_email,
              customerEmail: bData.customer_email || payload.customerEmail,
              service_name: (bData.services as any)?.name || payload.service_name || payload.serviceName,
              serviceName: (bData.services as any)?.name || payload.serviceName || payload.service_name,
              package_name: (bData.packages as any)?.name || payload.package_name || payload.packageName,
              packageName: (bData.packages as any)?.name || payload.packageName || payload.package_name,
              package_price: (bData.packages as any)?.price || payload.package_price || payload.packagePrice,
              packagePrice: (bData.packages as any)?.price || payload.packagePrice || payload.package_price,
              duration_minutes: (bData.packages as any)?.duration_minutes || payload.duration_minutes || payload.durationMinutes,
              durationMinutes: (bData.packages as any)?.duration_minutes || payload.durationMinutes || payload.duration_minutes,
              concepts_count: (bData.packages as any)?.concepts_count || payload.concepts_count || payload.conceptsCount,
              conceptsCount: (bData.packages as any)?.concepts_count || payload.conceptsCount || payload.concepts_count,
              edited_photos_count: (bData.packages as any)?.edited_photos_count || payload.edited_photos_count || payload.editedPhotosCount,
              editedPhotosCount: (bData.packages as any)?.edited_photos_count || payload.editedPhotosCount || payload.edited_photos_count,
              features: (bData.packages as any)?.features || payload.features,
              studio_name: (bData.studio_rooms as any)?.name || payload.studio_name || payload.studioName,
              studioName: (bData.studio_rooms as any)?.name || payload.studioName || payload.studio_name,
              concept_names: conceptNames.length > 0 ? conceptNames : payload.concept_names,
              conceptNames: conceptNames.length > 0 ? conceptNames : payload.conceptNames,
              addons: addonItems.length > 0 ? addonItems : payload.addons,
              total_amount: bData.total_amount ?? payload.total_amount ?? payload.totalAmount,
              totalAmount: bData.total_amount ?? payload.totalAmount ?? payload.total_amount,
              deposit_amount: bData.deposit_amount ?? payload.deposit_amount ?? payload.depositAmount,
              depositAmount: bData.deposit_amount ?? payload.depositAmount ?? payload.deposit_amount,
              subtotal: bData.subtotal ?? payload.subtotal,
              addon_total: bData.addon_total ?? payload.addon_total,
              discount_total: bData.discount_total ?? payload.discount_total,
              start_at: formattedStartAt,
              startAt: formattedStartAt,
              occasion: bData.occasion || payload.occasion,
              customer_note: bData.customer_note || payload.customer_note,
            };
          }
        } catch (enrichErr) {
          console.warn('Notice: Could not enrich booking payload from DB:', enrichErr);
        }
      }

      const { subject, html } = renderEmailHtml(item.template_key, payload);

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
            reply_to: EMAIL_REPLY_TO,
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
