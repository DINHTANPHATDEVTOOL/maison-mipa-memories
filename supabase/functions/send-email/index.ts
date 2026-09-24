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

const STUDIO_NOTIFICATION_EMAIL = Deno.env.get('STUDIO_NOTIFICATION_EMAIL') || Deno.env.get('EMAIL_REPLY_TO') || 'maisonmipamemories@gmail.com';

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
    let targetAction: string | null = null;
    let targetReason: string | null = null;
    let targetNewDate: string | null = null;
    let targetNewSlot: string | null = null;

    if (req.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await req.json();
        targetOutboxId = body.outboxId || body.record?.id || null;
        targetBookingId = body.bookingId || null;
        targetAction = (body.action || body.eventType || '').toUpperCase().trim();
        targetReason = body.reason || null;
        targetNewDate = body.newDate || body.date || null;
        targetNewSlot = body.newSlot || body.slot || null;
      } catch {
        // Ignored, proceed to queue scan
      }
    }

    // Customer authorization check if targetBookingId is provided
    if (!isStaffOrAdmin && authenticatedUser && targetBookingId) {
      const { data: bOwner } = await supabaseAdmin
        .from('bookings')
        .select('id, customer_id, customer_email')
        .eq('id', targetBookingId)
        .maybeSingle();

      if (!bOwner || (bOwner.customer_id !== authenticatedUser.id && bOwner.customer_email !== authenticatedUser.email)) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Booking does not belong to you' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Helper to fetch rich booking record for generating outbox items
    let cachedBookingRecord: any = null;
    const getBookingRecord = async (bId: string) => {
      if (cachedBookingRecord && cachedBookingRecord.id === bId) return cachedBookingRecord;
      const { data: rec } = await supabaseAdmin
        .from('bookings')
        .select(`
          id, booking_code, customer_id, customer_name, customer_phone, customer_email,
          customer_note, cancel_requested_reason, start_at, total_amount, deposit_amount, subtotal,
          services:service_id(name), packages:package_id(name), studio_rooms:studio_room_id(name),
          booking_concepts(concepts(name)), booking_addons(addons(name, price))
        `)
        .eq('id', bId)
        .maybeSingle();
      cachedBookingRecord = rec;
      return rec;
    };

    // If an explicit action is provided (e.g. CANCEL, RESCHEDULE, CANCEL_REQUEST), enqueue targeted notifications
    if (targetBookingId && targetAction) {
      const bRec = await getBookingRecord(targetBookingId);
      if (bRec) {
        const rawConcepts = (bRec.booking_concepts as any[]) || [];
        const conceptList = rawConcepts.map(c => c.concepts?.name).filter(Boolean);
        const rawAddons = (bRec.booking_addons as any[]) || [];
        const addonList = rawAddons.map(a => a.addons?.name).filter(Boolean);

        const basePayload = {
          bookingId: bRec.id,
          bookingCode: bRec.booking_code,
          customerName: bRec.customer_name || 'Quý khách',
          customerPhone: bRec.customer_phone || '',
          customerEmail: bRec.customer_email || '',
          customerNote: bRec.customer_note || '',
          serviceName: (bRec.services as any)?.name || 'Dịch Vụ Tiệm Ảnh',
          packageName: (bRec.packages as any)?.name || 'Gói Chụp Tiệm Ảnh',
          studioName: (bRec.studio_rooms as any)?.name || 'Không gian Tiệm Ảnh',
          conceptNames: conceptList.length > 0 ? conceptList.join(', ') : 'Theo tư vấn studio',
          addonNames: addonList.length > 0 ? addonList.join(', ') : 'Không có',
          startAt: bRec.start_at,
          totalAmount: bRec.total_amount || bRec.subtotal || 0,
          depositAmount: bRec.deposit_amount || 0,
          directLink: `https://maisonmipa.io.vn/account?tab=bookings&bookingCode=${bRec.booking_code}`,
        };

        if ((targetAction === 'CANCEL' || targetAction === 'BOOKING_CANCELLED') && bRec.customer_email) {
          const { data: existingCancel } = await supabaseAdmin
            .from('notification_outbox')
            .select('id')
            .eq('entity_id', bRec.id)
            .eq('event_type', 'BOOKING_CANCELLED')
            .in('status', ['PENDING', 'PROCESSING', 'SENT'])
            .limit(1);

          if (!existingCancel || existingCancel.length === 0) {
            const finalReason = targetReason || bRec.cancel_requested_reason || 'Đã duyệt hủy theo yêu cầu';
            await supabaseAdmin.from('notification_outbox').insert({
              event_type: 'BOOKING_CANCELLED',
              recipient_user_id: bRec.customer_id,
              recipient_email: bRec.customer_email,
              entity_type: 'BOOKING',
              entity_id: bRec.id,
              template_key: 'booking_cancelled',
              payload: { ...basePayload, cancelReason: finalReason, reason: finalReason },
              idempotency_key: `booking-cancelled-direct:${bRec.id}`,
              status: 'PENDING',
            });
          }
        } else if ((targetAction === 'RESCHEDULE' || targetAction === 'BOOKING_RESCHEDULED') && bRec.customer_email) {
          const { data: existingResched } = await supabaseAdmin
            .from('notification_outbox')
            .select('id')
            .eq('entity_id', bRec.id)
            .eq('event_type', 'BOOKING_RESCHEDULED')
            .in('status', ['PENDING', 'PROCESSING', 'SENT'])
            .limit(1);

          if (!existingResched || existingResched.length === 0) {
            await supabaseAdmin.from('notification_outbox').insert({
              event_type: 'BOOKING_RESCHEDULED',
              recipient_user_id: bRec.customer_id,
              recipient_email: bRec.customer_email,
              entity_type: 'BOOKING',
              entity_id: bRec.id,
              template_key: 'booking_rescheduled',
              payload: {
                ...basePayload,
                newDate: targetNewDate || basePayload.startAt,
                newSlot: targetNewSlot || 'Theo khung giờ đã thỏa thuận',
                rescheduleRequestedDate: targetNewDate,
                rescheduleRequestedSlot: targetNewSlot,
                reason: targetReason,
              },
              idempotency_key: `booking-rescheduled-direct:${bRec.id}`,
              status: 'PENDING',
            });
          }
        } else if (targetAction === 'CANCEL_REQUEST' || targetAction === 'BOOKING_CANCEL_REQUESTED') {
          const { data: existingReq } = await supabaseAdmin
            .from('notification_outbox')
            .select('id')
            .eq('entity_id', bRec.id)
            .in('event_type', ['BOOKING_CANCEL_REQUESTED', 'CUSTOMER_CANCEL_REQUEST_ACK'])
            .in('status', ['PENDING', 'PROCESSING', 'SENT'])
            .limit(1);

          if (!existingReq || existingReq.length === 0) {
            const reason = targetReason || bRec.cancel_requested_reason || 'Khách gửi yêu cầu hủy';
            // 1. Studio alert
            await supabaseAdmin.from('notification_outbox').insert({
              event_type: 'BOOKING_CANCEL_REQUESTED',
              recipient_user_id: null,
              recipient_email: STUDIO_NOTIFICATION_EMAIL,
              entity_type: 'BOOKING',
              entity_id: bRec.id,
              template_key: 'studio_cancel_request_notification',
              payload: { ...basePayload, cancelReason: reason, reason },
              idempotency_key: `cancel-request-studio:${bRec.id}`,
              status: 'PENDING',
            });
            // 2. Customer ack
            if (bRec.customer_email) {
              await supabaseAdmin.from('notification_outbox').insert({
                event_type: 'CUSTOMER_CANCEL_REQUEST_ACK',
                recipient_user_id: bRec.customer_id,
                recipient_email: bRec.customer_email,
                entity_type: 'BOOKING',
                entity_id: bRec.id,
                template_key: 'customer_cancel_request_ack',
                payload: { ...basePayload, cancelReason: reason, reason },
                idempotency_key: `cancel-ack-customer:${bRec.id}`,
                status: 'PENDING',
              });
            }
          }
        }
      }
    }

    // If targetBookingId is provided without explicit action, ensure initial creation emails exist
    if (targetBookingId && !targetAction) {
      const { data: existingOutbox } = await supabaseAdmin
        .from('notification_outbox')
        .select('id, template_key')
        .eq('entity_id', targetBookingId);

      const hasCustomerEmail = existingOutbox?.some((o: any) => o.template_key === 'booking_consultation_requested' || o.template_key === 'booking_created');
      const hasStudioAlert = existingOutbox?.some((o: any) => o.template_key === 'admin_new_booking_alert' || o.template_key === 'studio_new_booking_notification');

      if (!hasCustomerEmail || !hasStudioAlert) {
        const bookingRecord = await getBookingRecord(targetBookingId);

        if (bookingRecord) {
          const rawConcepts = (bookingRecord.booking_concepts as any[]) || [];
          const conceptList = rawConcepts.map((c: any) => c.concepts?.name).filter(Boolean);
          const rawAddons = (bookingRecord.booking_addons as any[]) || [];
          const addonList = rawAddons.map((a: any) => a.addons?.name).filter(Boolean);

          const basePayload = {
            bookingId: bookingRecord.id,
            bookingCode: bookingRecord.booking_code,
            customerName: bookingRecord.customer_name || 'Quý khách',
            customerPhone: bookingRecord.customer_phone || '',
            customerEmail: bookingRecord.customer_email || '',
            customerNote: bookingRecord.customer_note || '',
            serviceName: (bookingRecord.services as any)?.name || 'Dịch Vụ Tiệm Ảnh',
            packageName: (bookingRecord.packages as any)?.name || 'Gói Chụp Tiệm Ảnh',
            studioName: (bookingRecord.studio_rooms as any)?.name || 'Không gian Tiệm Ảnh',
            conceptNames: conceptList.length > 0 ? conceptList.join(', ') : 'Theo tư vấn studio',
            addonNames: addonList.length > 0 ? addonList.join(', ') : 'Không có',
            startAt: bookingRecord.start_at,
            totalAmount: bookingRecord.total_amount || bookingRecord.subtotal || 0,
            depositAmount: bookingRecord.deposit_amount || 0,
            directLink: `https://maisonmipa.io.vn/management?tab=dashboard&bookingCode=${bookingRecord.booking_code}&bookingId=${bookingRecord.id}`,
          };

          // 1. Enqueue customer consultation email if missing
          if (!hasCustomerEmail && bookingRecord.customer_email) {
            await supabaseAdmin.from('notification_outbox').insert({
              event_type: 'BOOKING_CONSULTATION_REQUESTED',
              recipient_user_id: bookingRecord.customer_id,
              recipient_email: bookingRecord.customer_email,
              entity_type: 'BOOKING',
              entity_id: bookingRecord.id,
              template_key: 'booking_consultation_requested',
              payload: basePayload,
              idempotency_key: `booking-consultation-customer:${bookingRecord.id}`,
              status: 'PENDING',
            });
          }

          // 2. Enqueue studio admin alert to MIPA email if missing
          if (!hasStudioAlert) {
            await supabaseAdmin.from('notification_outbox').insert({
              event_type: 'ADMIN_NEW_BOOKING_ALERT',
              recipient_user_id: null,
              recipient_email: STUDIO_NOTIFICATION_EMAIL,
              entity_type: 'BOOKING',
              entity_id: bookingRecord.id,
              template_key: 'admin_new_booking_alert',
              payload: basePayload,
              idempotency_key: `booking-admin-alert:${bookingRecord.id}`,
              status: 'PENDING',
            });
          }
        }
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
    } else if (!isStaffOrAdmin && authenticatedUser) {
      // Regular customers poll: only their own notifications
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
    const processedDedupKeys = new Set<string>();

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

      // Smart template key resolution:
      // If template_key is missing or generic, infer from event_type and recipient
      let resolvedKey = (item.template_key || payload.template_key || '').trim();
      const ev = (item.event_type || payload.event_type || '').toUpperCase().trim();
      const isStudioRecipient = Boolean(
        item.recipient_email === STUDIO_NOTIFICATION_EMAIL ||
        item.recipient_email === 'maisonmipamemories@gmail.com' ||
        (!item.recipient_user_id && (ev.startsWith('ADMIN_') || ev.startsWith('STUDIO_')))
      );

      if (!resolvedKey || resolvedKey === 'system_notification' || resolvedKey === 'default') {
        if (ev === 'BOOKING_CANCEL_REQUESTED') {
          resolvedKey = isStudioRecipient ? 'studio_cancel_request_notification' : 'customer_cancel_request_ack';
        } else if (ev === 'ADMIN_NEW_BOOKING_ALERT') {
          resolvedKey = 'admin_new_booking_alert';
        } else if (ev === 'BOOKING_CONFIRMED' || ev === 'DEPOSIT_CONFIRMED') {
          resolvedKey = 'booking_confirmed';
        } else if (ev === 'BOOKING_RESCHEDULED') {
          resolvedKey = 'booking_rescheduled';
        } else if (ev === 'BOOKING_CANCELLED') {
          resolvedKey = 'booking_cancelled';
        } else if (ev === 'ALBUM_READY' || ev === 'DELIVERED') {
          resolvedKey = 'album_ready';
        } else if (ev === 'BOOKING_CONSULTATION_REQUESTED' || ev === 'BOOKING_CREATED') {
          resolvedKey = isStudioRecipient ? 'admin_new_booking_alert' : 'booking_consultation_requested';
        } else if (ev === 'DEPOSIT_RECEIVED') {
          resolvedKey = 'deposit_received';
        } else {
          resolvedKey = item.event_type || item.template_key || '';
        }
      }

      // Strict Deduplication Check across current batch:
      // Normalize category (booking_created and booking_consultation_requested are identical customer emails)
      let dedupCategory = resolvedKey;
      if (resolvedKey === 'booking_created' || resolvedKey === 'booking_consultation_requested') {
        dedupCategory = isStudioRecipient ? 'admin_new_booking_alert' : 'booking_consultation_requested';
      }
      const dedupKey = `${(item.recipient_email || '').toLowerCase().trim()}:${item.entity_id || 'global'}:${dedupCategory}`;

      if (processedDedupKeys.has(dedupKey)) {
        console.warn(`[send-email] Deduplicating redundant outbox entry ${item.id} for key ${dedupKey}`);
        await supabaseAdmin
          .from('notification_outbox')
          .update({
            status: 'CANCELLED',
            last_error: 'Deduplicated: redundant email entry prevented in batch execution',
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);

        results.push({ id: item.id, status: 'SKIPPED_DUPLICATE', dedupKey });
        continue;
      }
      processedDedupKeys.add(dedupKey);

      const { subject, html } = renderEmailHtml(resolvedKey, {
        ...payload,
        event_type: item.event_type,
        eventType: item.event_type,
        recipient_email: item.recipient_email,
        directLink: payload.directLink || (isStudioRecipient
          ? `https://maisonmipa.io.vn/management?tab=dashboard&bookingCode=${encodeURIComponent(payload.bookingCode || payload.booking_code || '')}&bookingId=${item.entity_id || payload.bookingId || ''}`
          : `https://maisonmipa.io.vn/account?tab=bookings&bookingCode=${encodeURIComponent(payload.bookingCode || payload.booking_code || '')}`),
      });

      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': item.idempotency_key || `mipa-email:${dedupKey}`,
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
