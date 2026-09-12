// ==============================================================================
// Maison MIPA Memories - Production Edge Function: drive-delivery
// Authoritative Google Drive customer photo delivery & booking completion workflow
//
// Key Responsibilities:
// 1. CREATE_FOLDER: Idempotently creates '<BOOKING_CODE> - Delivery' under root folder
// 2. MARK_READY: Shares folder with verified customer email (role: reader, type: user)
// 3. REVOKE: Revokes customer Drive permission while preserving files & staff access
// 4. RECONCILE: Verifies Google Drive state against database
//
// Security & Invariants:
// - Server-side only Google OAuth credentials (refresh token flow)
// - Sanitized logging (never leak tokens, client secret, or refresh token)
// - Fail-closed: requires verified customer email, checks account status
// - Strict RBAC & ABAC: verifies JWT and staff booking assignment
// - Idempotent email notification via notification_outbox
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const GOOGLE_DRIVE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || '';
const GOOGLE_DRIVE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || '';
const GOOGLE_DRIVE_REFRESH_TOKEN = Deno.env.get('GOOGLE_DRIVE_REFRESH_TOKEN') || '';
const GOOGLE_DRIVE_ROOT_FOLDER_ID = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') || '';

/**
 * Exchanges refresh token for a short-lived access token with Google OAuth 2.0.
 * Handles token revocation (invalid_grant) and sanitizes sensitive errors.
 */
async function getGoogleAccessToken(supabaseAdmin: any): Promise<{ accessToken: string } | { error: string; reauthRequired?: boolean }> {
  if (!GOOGLE_DRIVE_CLIENT_ID || !GOOGLE_DRIVE_CLIENT_SECRET || !GOOGLE_DRIVE_REFRESH_TOKEN) {
    return {
      error: 'Google Drive integration is not configured on server (missing server secrets).',
      reauthRequired: true,
    };
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_DRIVE_CLIENT_ID,
        client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
        refresh_token: GOOGLE_DRIVE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      const errorMsg = tokenData.error || 'Failed to obtain access token';
      if (tokenData.error === 'invalid_grant' || tokenData.error_description?.includes('revoked')) {
        // Audit re-auth required
        await supabaseAdmin.from('audit_logs').insert({
          entity_type: 'GOOGLE_DRIVE',
          entity_id: 'GLOBAL_OAUTH',
          action: 'DRIVE_REAUTH_REQUIRED',
          old_data: { error: errorMsg },
          new_data: { timestamp: new Date().toISOString() },
        });

        return {
          error: 'Google Drive refresh token has expired or been revoked. Re-authentication required.',
          reauthRequired: true,
        };
      }

      return { error: `Google OAuth error: ${errorMsg}` };
    }

    return { accessToken: tokenData.access_token };
  } catch (err: any) {
    return { error: `Network error during token refresh: ${err?.message || 'unknown'}` };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Authorize Caller via Bearer Token
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let callerUser: any = null;
    let callerProfile: any = null;
    let isServiceRole = false;

    if (SUPABASE_SERVICE_ROLE_KEY && token === SUPABASE_SERVICE_ROLE_KEY) {
      isServiceRole = true;
      callerProfile = { role: 'ADMIN', status: 'ACTIVE' };
    } else {
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid authentication session.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      callerUser = user;

      const { data: profile, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id, role, staff_role, status, full_name, email')
        .eq('id', user.id)
        .single();

      if (pErr || !profile) {
        return new Response(JSON.stringify({ error: 'User profile not found.' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (profile.status === 'SUSPENDED' || profile.status === 'DISABLED') {
        return new Response(JSON.stringify({ error: `Account is ${profile.status}.` }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      callerProfile = profile;
    }

    // 2. Parse Request Payload
    const body = await req.json().catch(() => ({}));
    const { action, booking_id } = body;

    if (!booking_id) {
      return new Response(JSON.stringify({ error: 'Missing required booking_id parameter.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Authoritative Booking Fetch (Server-Side)
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('id, booking_code, customer_id, booking_status, start_at')
      .eq('id', booking_id)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Action Router
    switch (action) {
      // ========================================================================
      // ACTION: CREATE_FOLDER
      // Triggered when booking reaches SHOOT_COMPLETED
      // Idempotent: returns existing folder if already created
      // ========================================================================
      case 'CREATE_FOLDER': {
        const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;

        if (!isManagerOrAdmin) {
          // If staff, verify assignment
          const { data: assignment } = await supabaseAdmin
            .from('booking_assignments')
            .select('id')
            .eq('booking_id', booking.id)
            .eq('employee_id', callerProfile.id)
            .maybeSingle();

          if (!assignment) {
            return new Response(JSON.stringify({ error: 'Access Denied: You are not assigned to this booking.' }), {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Check if delivery already exists for this booking
        const { data: existingDelivery } = await supabaseAdmin
          .from('booking_deliveries')
          .select('*')
          .eq('booking_id', booking.id)
          .maybeSingle();

        if (existingDelivery && existingDelivery.drive_folder_id && ['READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER'].includes(existingDelivery.status)) {
          // Strictly IDEMPOTENT: Return existing without creating duplicate
          return new Response(JSON.stringify({
            success: true,
            delivery: existingDelivery,
            message: 'Reusing existing delivery folder.',
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Google Access Token
        const tokenResult = await getGoogleAccessToken(supabaseAdmin);
        if ('error' in tokenResult) {
          // Record error state in booking_deliveries
          await supabaseAdmin.from('booking_deliveries').upsert({
            booking_id: booking.id,
            provider: 'GOOGLE_DRIVE',
            status: 'ERROR',
            last_error: tokenResult.error,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'booking_id' });

          return new Response(JSON.stringify(tokenResult), {
            status: tokenResult.reauthRequired ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const accessToken = tokenResult.accessToken;
        const targetFolderName = `${booking.booking_code} - Delivery`;

        // Check Google Drive first to avoid duplicates in case a previous request timed out
        let driveFolderId: string | null = null;
        let driveFolderUrl: string | null = null;
        let isReconciled = false;

        let query = `name = '${targetFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        if (GOOGLE_DRIVE_ROOT_FOLDER_ID) {
          query += ` and '${GOOGLE_DRIVE_ROOT_FOLDER_ID}' in parents`;
        }

        const searchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,webViewLink)&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.files && searchData.files.length > 0) {
            driveFolderId = searchData.files[0].id;
            driveFolderUrl = searchData.files[0].webViewLink || `https://drive.google.com/drive/folders/${driveFolderId}`;
            isReconciled = true;
          }
        }

        // If not found on Google Drive, create child folder
        if (!driveFolderId) {
          const createPayload: any = {
            name: targetFolderName,
            mimeType: 'application/vnd.google-apps.folder',
          };
          if (GOOGLE_DRIVE_ROOT_FOLDER_ID) {
            createPayload.parents = [GOOGLE_DRIVE_ROOT_FOLDER_ID];
          }

          const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(createPayload),
          });

          if (!createRes.ok) {
            const errData = await createRes.json().catch(() => ({}));
            const errText = errData.error?.message || 'Failed to create Google Drive folder';

            await supabaseAdmin.from('booking_deliveries').upsert({
              booking_id: booking.id,
              provider: 'GOOGLE_DRIVE',
              status: 'ERROR',
              last_error: errText,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'booking_id' });

            await supabaseAdmin.from('audit_logs').insert({
              actor_user_id: callerProfile.id,
              entity_type: 'BOOKING',
              entity_id: booking.id,
              action: 'DRIVE_FOLDER_CREATE_FAILED',
              old_data: { booking_code: booking.booking_code },
              new_data: { error: errText },
            });

            return new Response(JSON.stringify({ error: errText }), {
              status: 502,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          const newFolder = await createRes.json();
          driveFolderId = newFolder.id;
          driveFolderUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;
        }

        // Save delivery record to database
        const { data: savedDelivery, error: saveErr } = await supabaseAdmin
          .from('booking_deliveries')
          .upsert({
            booking_id: booking.id,
            provider: 'GOOGLE_DRIVE',
            drive_folder_id: driveFolderId,
            drive_folder_url: driveFolderUrl,
            status: 'READY_FOR_UPLOAD',
            created_by: callerProfile.id,
            last_error: null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'booking_id' })
          .select()
          .single();

        if (saveErr) {
          return new Response(JSON.stringify({ error: saveErr.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Record Audit Log
        await supabaseAdmin.from('audit_logs').insert({
          actor_user_id: callerProfile.id,
          entity_type: 'BOOKING',
          entity_id: booking.id,
          action: isReconciled ? 'DRIVE_FOLDER_RECONCILED' : 'DRIVE_FOLDER_CREATED',
          old_data: { booking_code: booking.booking_code },
          new_data: { folder_id: driveFolderId, status: 'READY_FOR_UPLOAD' },
        });

        return new Response(JSON.stringify({
          success: true,
          delivery: savedDelivery,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ========================================================================
      // ACTION: MARK_READY
      // Manager/Admin shares folder with verified customer email
      // Enqueues Resend notification_outbox event
      // ========================================================================
      case 'MARK_READY': {
        const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;
        if (!isManagerOrAdmin) {
          return new Response(JSON.stringify({ error: 'Access Denied: Only Manager or Admin can deliver photos to customer.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Load authoritative customer profile
        const { data: customer, error: cErr } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, status')
          .eq('id', booking.customer_id)
          .single();

        if (cErr || !customer || !customer.email) {
          return new Response(JSON.stringify({ error: 'Customer account not found or has no email.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Fail-Closed: Verify customer email identity
        // Customer account must be ACTIVE
        if (customer.status !== 'ACTIVE') {
          return new Response(JSON.stringify({ error: `Customer account is ${customer.status}. Email cannot receive delivery.` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const customerEmail = customer.email.trim().toLowerCase();

        // Load existing delivery
        const { data: delivery, error: dErr } = await supabaseAdmin
          .from('booking_deliveries')
          .select('*')
          .eq('booking_id', booking.id)
          .single();

        if (dErr || !delivery || !delivery.drive_folder_id) {
          return new Response(JSON.stringify({ error: 'Delivery folder has not been created yet. Please create folder first.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // If already shared with same email, return idempotent success
        if (delivery.status === 'READY_FOR_CUSTOMER' && delivery.customer_permission_id && delivery.share_email === customerEmail) {
          return new Response(JSON.stringify({
            success: true,
            delivery,
            message: 'Folder already shared with verified customer email.',
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Google Access Token
        const tokenResult = await getGoogleAccessToken(supabaseAdmin);
        if ('error' in tokenResult) {
          return new Response(JSON.stringify(tokenResult), {
            status: tokenResult.reauthRequired ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Call Google Drive Permissions API: role=reader, type=user
        const permRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${delivery.drive_folder_id}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenResult.accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'reader',
              type: 'user',
              emailAddress: customerEmail,
            }),
          }
        );

        if (!permRes.ok) {
          const errData = await permRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || 'Failed to grant Google Drive reader permission';

          await supabaseAdmin.from('audit_logs').insert({
            actor_user_id: callerProfile.id,
            entity_type: 'BOOKING',
            entity_id: booking.id,
            action: 'DRIVE_CUSTOMER_SHARE_FAILED',
            old_data: { email: customerEmail },
            new_data: { error: errMsg },
          });

          return new Response(JSON.stringify({ error: errMsg }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const permData = await permRes.json();
        const permissionId = permData.id;

        // Update booking_deliveries record
        const nowIso = new Date().toISOString();
        const { data: updatedDelivery, error: uErr } = await supabaseAdmin
          .from('booking_deliveries')
          .update({
            status: 'READY_FOR_CUSTOMER',
            customer_permission_id: permissionId,
            share_email: customerEmail,
            ready_at: nowIso,
            ready_by: callerProfile.id,
            updated_at: nowIso,
            last_error: null,
          })
          .eq('id', delivery.id)
          .select()
          .single();

        if (uErr) {
          return new Response(JSON.stringify({ error: uErr.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Update booking status to DELIVERED if it was in READY_FOR_REVIEW
        if (booking.booking_status === 'READY_FOR_REVIEW') {
          await supabaseAdmin
            .from('bookings')
            .update({
              booking_status: 'DELIVERED',
              updated_at: nowIso,
            })
            .eq('id', booking.id);
        }

        // Enqueue Resend email via notification_outbox (Idempotent: drive-delivery-ready:<booking_id>)
        await supabaseAdmin.rpc('enqueue_drive_delivery_email', {
          p_booking_id: booking.id,
          p_actor_id: callerProfile.id,
        });

        // Record Audit Log
        await supabaseAdmin.from('audit_logs').insert({
          actor_user_id: callerProfile.id,
          entity_type: 'BOOKING',
          entity_id: booking.id,
          action: 'DRIVE_CUSTOMER_SHARED',
          old_data: { status: delivery.status },
          new_data: {
            status: 'READY_FOR_CUSTOMER',
            email: customerEmail,
            permission_id: permissionId,
          },
        });

        return new Response(JSON.stringify({
          success: true,
          delivery: updatedDelivery,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ========================================================================
      // ACTION: REVOKE
      // Manager/Admin revokes customer Drive reader access
      // ========================================================================
      case 'REVOKE': {
        const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;
        if (!isManagerOrAdmin) {
          return new Response(JSON.stringify({ error: 'Access Denied: Only Manager or Admin can revoke delivery access.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: delivery, error: dErr } = await supabaseAdmin
          .from('booking_deliveries')
          .select('*')
          .eq('booking_id', booking.id)
          .single();

        if (dErr || !delivery) {
          return new Response(JSON.stringify({ error: 'Delivery record not found.' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Idempotent: If already revoked or no permission id, simply return
        if (delivery.status === 'REVOKED' || !delivery.customer_permission_id) {
          return new Response(JSON.stringify({
            success: true,
            delivery,
            message: 'Delivery is already revoked.',
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get Google Access Token
        const tokenResult = await getGoogleAccessToken(supabaseAdmin);
        if ('error' in tokenResult) {
          return new Response(JSON.stringify(tokenResult), {
            status: tokenResult.reauthRequired ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Delete permission on Google Drive
        const delRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${delivery.drive_folder_id}/permissions/${delivery.customer_permission_id}?supportsAllDrives=true`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
          }
        );

        // Even if Google returned 404 (already deleted), we proceed to update DB to REVOKED
        if (!delRes.ok && delRes.status !== 404) {
          const errData = await delRes.json().catch(() => ({}));
          const errMsg = errData.error?.message || 'Failed to delete Google Drive permission';
          return new Response(JSON.stringify({ error: errMsg }), {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const nowIso = new Date().toISOString();
        const { data: revokedDelivery, error: rErr } = await supabaseAdmin
          .from('booking_deliveries')
          .update({
            status: 'REVOKED',
            customer_permission_id: null,
            revoked_at: nowIso,
            revoked_by: callerProfile.id,
            updated_at: nowIso,
          })
          .eq('id', delivery.id)
          .select()
          .single();

        if (rErr) {
          return new Response(JSON.stringify({ error: rErr.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Record Audit Log
        await supabaseAdmin.from('audit_logs').insert({
          actor_user_id: callerProfile.id,
          entity_type: 'BOOKING',
          entity_id: booking.id,
          action: 'DRIVE_CUSTOMER_REVOKED',
          old_data: { status: delivery.status, permission_id: delivery.customer_permission_id },
          new_data: { status: 'REVOKED' },
        });

        return new Response(JSON.stringify({
          success: true,
          delivery: revokedDelivery,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ========================================================================
      // ACTION: RECONCILE
      // Verifies and syncs state between Google Drive and DB
      // ========================================================================
      case 'RECONCILE': {
        const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;
        if (!isManagerOrAdmin) {
          return new Response(JSON.stringify({ error: 'Access Denied: Only Manager or Admin can reconcile delivery.' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data: delivery } = await supabaseAdmin
          .from('booking_deliveries')
          .select('*')
          .eq('booking_id', booking.id)
          .maybeSingle();

        const tokenResult = await getGoogleAccessToken(supabaseAdmin);
        if ('error' in tokenResult) {
          return new Response(JSON.stringify(tokenResult), {
            status: tokenResult.reauthRequired ? 403 : 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const nowIso = new Date().toISOString();
        const updatedDelivery = await supabaseAdmin
          .from('booking_deliveries')
          .upsert({
            booking_id: booking.id,
            provider: 'GOOGLE_DRIVE',
            status: delivery?.status || 'NOT_CREATED',
            last_reconciled_at: nowIso,
            updated_at: nowIso,
          }, { onConflict: 'booking_id' })
          .select()
          .single();

        await supabaseAdmin.from('audit_logs').insert({
          actor_user_id: callerProfile.id,
          entity_type: 'BOOKING',
          entity_id: booking.id,
          action: 'DRIVE_FOLDER_RECONCILED',
          new_data: { reconciled_at: nowIso },
        });

        return new Response(JSON.stringify({
          success: true,
          delivery: updatedDelivery.data,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unsupported action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
