// ==============================================================================
// Maison MIPA Memories - Shared Core: driveDeliveryCore.ts
// Reusable, testable engine for Google Drive customer photo delivery.
// Operates against standard Web APIs (Request, Response, fetch).
// Can be executed by Supabase Edge Functions and verified by Vitest tests.
// ==============================================================================

declare const Deno: any;

export interface ProcessContext {
  supabaseAdmin: any;
  callerProfile?: {
    id: string;
    role: string;
    staff_role?: string | null;
    status: string;
    full_name?: string;
    email?: string;
  };
  isServiceRole?: boolean;
  fetchFn?: typeof fetch;
  env?: {
    GOOGLE_DRIVE_CLIENT_ID?: string;
    GOOGLE_DRIVE_CLIENT_SECRET?: string;
    GOOGLE_DRIVE_REDIRECT_URI?: string;
    GOOGLE_DRIVE_REFRESH_TOKEN?: string;
    GOOGLE_DRIVE_ROOT_FOLDER_ID?: string;
  };
}

export interface ActionResult {
  status: number;
  data: any;
}

/**
 * Ensures root folder exists on Google Drive with drive.file scope.
 * Searches by appProperties: { maisonMipaType: 'delivery_root' }.
 */
export async function ensureRootFolder(
  accessToken: string,
  configuredRootId?: string,
  fetchFn: typeof fetch = fetch
): Promise<string | null> {
  if (configuredRootId) return configuredRootId;

  try {
    const searchQ = "appProperties has { key='maisonMipaType' and value='delivery_root' } and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const searchRes = await fetchFn(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(searchQ)}&fields=files(id,name)&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Name search fallback
    const nameQ = "name = 'Maison MIPA Memories - Customer Deliveries' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const nameSearchRes = await fetchFn(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(nameQ)}&fields=files(id,name)&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (nameSearchRes.ok) {
      const data = await nameSearchRes.json();
      if (data.files && data.files.length > 0) {
        const foundId = data.files[0].id;
        await fetchFn(`https://www.googleapis.com/drive/v3/files/${foundId}?supportsAllDrives=true`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appProperties: { maisonMipaType: 'delivery_root' },
          }),
        }).catch(() => {});
        return foundId;
      }
    }

    // Create root folder
    const createRes = await fetchFn('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Maison MIPA Memories - Customer Deliveries',
        mimeType: 'application/vnd.google-apps.folder',
        appProperties: {
          maisonMipaType: 'delivery_root',
        },
      }),
    });

    if (createRes.ok) {
      const created = await createRes.json();
      return created.id || null;
    }
  } catch (e) {
    console.error('ensureRootFolder error:', e);
  }
  return null;
}

/**
 * Exchanges refresh token for short-lived Google access token.
 */
export async function getGoogleAccessToken(
  ctx: ProcessContext
): Promise<{ accessToken: string; rootFolderId?: string } | { error: string; reauthRequired?: boolean }> {
  const fetchFn = ctx.fetchFn || fetch;
  const env = ctx.env || {};

  let clientId = env.GOOGLE_DRIVE_CLIENT_ID;
  let clientSecret = env.GOOGLE_DRIVE_CLIENT_SECRET;
  let refreshToken = env.GOOGLE_DRIVE_REFRESH_TOKEN;
  let rootFolderId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

  if (typeof Deno !== 'undefined') {
    clientId = clientId || Deno.env.get('GOOGLE_DRIVE_CLIENT_ID');
    clientSecret = clientSecret || Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET');
    refreshToken = refreshToken || Deno.env.get('GOOGLE_DRIVE_REFRESH_TOKEN');
    rootFolderId = rootFolderId || Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID');
  }

  if (!refreshToken && ctx.supabaseAdmin) {
    const { data: integration } = await ctx.supabaseAdmin
      .from('google_drive_integrations')
      .select('refresh_token, root_folder_id, is_active')
      .eq('id', 'primary')
      .maybeSingle();

    if (integration && integration.is_active && integration.refresh_token) {
      refreshToken = integration.refresh_token;
      if (!rootFolderId && integration.root_folder_id) {
        rootFolderId = integration.root_folder_id;
      }
    }
  }

  if (!clientId || !clientSecret || !refreshToken) {
    return {
      error: 'Google Drive integration is not configured on server (missing OAuth credentials).',
      reauthRequired: true,
    };
  }

  try {
    const tokenRes = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      const errorMsg = tokenData.error || 'Failed to obtain access token';
      if (tokenData.error === 'invalid_grant' || tokenData.error_description?.includes('revoked')) {
        if (ctx.supabaseAdmin) {
          await ctx.supabaseAdmin.from('audit_logs').insert({
            entity_type: 'GOOGLE_DRIVE',
            entity_id: 'GLOBAL_OAUTH',
            action: 'DRIVE_REAUTH_REQUIRED',
            old_data: { error: errorMsg },
            new_data: { timestamp: new Date().toISOString() },
          });
        }

        return {
          error: 'Google Drive refresh token has expired or been revoked. Re-authentication required.',
          reauthRequired: true,
        };
      }

      return { error: `Google OAuth error: ${errorMsg}` };
    }

    return { accessToken: tokenData.access_token, rootFolderId: rootFolderId || undefined };
  } catch (err: any) {
    return { error: `Network error during token refresh: ${err?.message || 'unknown'}` };
  }
}

/**
 * Handles authoritative drive-delivery actions: CREATE_FOLDER, MARK_READY, REVOKE, RECONCILE.
 */
export async function executeDriveDeliveryAction(
  action: 'CREATE_FOLDER' | 'MARK_READY' | 'REVOKE' | 'RECONCILE',
  bookingId: string,
  ctx: ProcessContext
): Promise<ActionResult> {
  const { supabaseAdmin, isServiceRole } = ctx;
  const callerProfile = ctx.callerProfile || { id: '00000000-0000-0000-0000-000000000000', role: 'ADMIN', status: 'ACTIVE' };
  const fetchFn = ctx.fetchFn || fetch;

  // 1. Authoritative Booking Fetch
  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('id, booking_code, customer_id, booking_status, start_at')
    .eq('id', bookingId)
    .single();

  if (bErr || !booking) {
    return { status: 404, data: { error: 'Booking not found.' } };
  }

  switch (action) {
    // ==========================================================================
    // ACTION: CREATE_FOLDER
    // ==========================================================================
    case 'CREATE_FOLDER': {
      const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;

      if (!isManagerOrAdmin) {
        const { data: assignment } = await supabaseAdmin
          .from('booking_assignments')
          .select('id')
          .eq('booking_id', booking.id)
          .eq('employee_id', callerProfile.id)
          .maybeSingle();

        if (!assignment) {
          return { status: 403, data: { error: 'Access Denied: You are not assigned to this booking.' } };
        }
      }

      // Ensure delivery intent row exists
      await supabaseAdmin.from('booking_deliveries').upsert({
        booking_id: booking.id,
        provider: 'GOOGLE_DRIVE',
        status: 'NOT_CREATED',
      }, { onConflict: 'booking_id', ignoreDuplicates: true });

      // Atomic DB Claim: Only one worker transitions from NOT_CREATED/ERROR to CREATING (Blocker 5)
      const nowIso = new Date().toISOString();
      const { data: claimedDelivery } = await supabaseAdmin
        .from('booking_deliveries')
        .update({ status: 'CREATING', updated_at: nowIso })
        .eq('booking_id', booking.id)
        .in('status', ['NOT_CREATED', 'ERROR', 'NEEDS_RECONCILE'])
        .select()
        .maybeSingle();

      if (!claimedDelivery) {
        const { data: currentDelivery } = await supabaseAdmin
          .from('booking_deliveries')
          .select('*')
          .eq('booking_id', booking.id)
          .single();

        if (currentDelivery && ['READY_FOR_UPLOAD', 'READY_FOR_CUSTOMER'].includes(currentDelivery.status)) {
          return {
            status: 200,
            data: {
              success: true,
              delivery: currentDelivery,
              message: 'Delivery folder is already ready.',
            },
          };
        }

        return {
          status: 200,
          data: {
            success: true,
            delivery: currentDelivery,
            message: 'Delivery folder is currently being prepared.',
          },
        };
      }

      // Obtain Google Access Token
      const tokenResult = await getGoogleAccessToken(ctx);
      if ('error' in tokenResult) {
        await supabaseAdmin.from('booking_deliveries').update({
          status: 'ERROR',
          last_error: tokenResult.error,
          updated_at: new Date().toISOString(),
        }).eq('booking_id', booking.id);

        return {
          status: tokenResult.reauthRequired ? 403 : 500,
          data: tokenResult,
        };
      }

      const accessToken = tokenResult.accessToken;
      const rootFolderId = await ensureRootFolder(accessToken, tokenResult.rootFolderId, fetchFn);

      let driveFolderId: string | null = null;
      let driveFolderUrl: string | null = null;
      let isReconciled = false;

      // Search by immutable appProperties bookingId to avoid duplicate/name-collision (Blocker 3 & 5)
      const appPropQuery = `appProperties has { key='bookingId' and value='${booking.id}' } and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const appSearchRes = await fetchFn(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(appPropQuery)}&fields=files(id,name,webViewLink)&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (appSearchRes.ok) {
        const appData = await appSearchRes.json();
        if (appData.files && appData.files.length > 0) {
          driveFolderId = appData.files[0].id;
          driveFolderUrl = appData.files[0].webViewLink || `https://drive.google.com/drive/folders/${driveFolderId}`;
          isReconciled = true;
        }
      }

      // Name search fallback
      const targetFolderName = `${booking.booking_code} - Delivery`;
      if (!driveFolderId) {
        let nameQuery = `name = '${targetFolderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
        if (rootFolderId) {
          nameQuery += ` and '${rootFolderId}' in parents`;
        }

        const nameSearchRes = await fetchFn(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(nameQuery)}&fields=files(id,name,webViewLink)&supportsAllDrives=true`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (nameSearchRes.ok) {
          const nameData = await nameSearchRes.json();
          if (nameData.files && nameData.files.length > 0) {
            driveFolderId = nameData.files[0].id;
            driveFolderUrl = nameData.files[0].webViewLink || `https://drive.google.com/drive/folders/${driveFolderId}`;
            isReconciled = true;

            await fetchFn(`https://www.googleapis.com/drive/v3/files/${driveFolderId}?supportsAllDrives=true`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                appProperties: {
                  maisonMipaType: 'booking_delivery',
                  bookingId: booking.id,
                },
              }),
            }).catch(() => {});
          }
        }
      }

      // Create new child folder
      if (!driveFolderId) {
        const createPayload: any = {
          name: targetFolderName,
          mimeType: 'application/vnd.google-apps.folder',
          appProperties: {
            maisonMipaType: 'booking_delivery',
            bookingId: booking.id,
          },
        };
        if (rootFolderId) {
          createPayload.parents = [rootFolderId];
        }

        const createRes = await fetchFn('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
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

          await supabaseAdmin.from('booking_deliveries').update({
            status: 'ERROR',
            last_error: errText,
            updated_at: new Date().toISOString(),
          }).eq('booking_id', booking.id);

          await supabaseAdmin.from('audit_logs').insert({
            actor_user_id: callerProfile.id,
            entity_type: 'BOOKING',
            entity_id: booking.id,
            action: 'DRIVE_FOLDER_CREATE_FAILED',
            old_data: { booking_code: booking.booking_code },
            new_data: { error: errText },
          });

          return { status: 502, data: { error: errText } };
        }

        const newFolder = await createRes.json();
        driveFolderId = newFolder.id;
        driveFolderUrl = `https://drive.google.com/drive/folders/${driveFolderId}`;
      }

      // Update delivery state in database
      const { data: savedDelivery, error: saveErr } = await supabaseAdmin
        .from('booking_deliveries')
        .update({
          drive_folder_id: driveFolderId,
          drive_folder_url: driveFolderUrl,
          status: 'READY_FOR_UPLOAD',
          created_by: callerProfile.id,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', booking.id)
        .select()
        .single();

      if (saveErr) {
        return { status: 500, data: { error: saveErr.message } };
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerProfile.id,
        entity_type: 'BOOKING',
        entity_id: booking.id,
        action: isReconciled ? 'DRIVE_FOLDER_RECONCILED' : 'DRIVE_FOLDER_CREATED',
        old_data: { booking_code: booking.booking_code },
        new_data: { folder_id: driveFolderId, status: 'READY_FOR_UPLOAD' },
      });

      return {
        status: 200,
        data: {
          success: true,
          delivery: savedDelivery,
        },
      };
    }

    // ==========================================================================
    // ACTION: MARK_READY
    // ==========================================================================
    case 'MARK_READY': {
      const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;
      if (!isManagerOrAdmin) {
        return { status: 403, data: { error: 'Access Denied: Only Manager or Admin can deliver photos to customer.' } };
      }

      // 1. Enforce State Machine (Blocker 6)
      if (booking.booking_status !== 'READY_FOR_REVIEW' && booking.booking_status !== 'DELIVERED') {
        return {
          status: 409,
          data: {
            error: `Không thể giao ảnh: Đơn đặt lịch đang ở trạng thái "${booking.booking_status}". Ảnh phải ở trạng thái "READY_FOR_REVIEW" mới được giao cho khách.`,
          },
        };
      }

      // 2. Load existing delivery
      const { data: delivery, error: dErr } = await supabaseAdmin
        .from('booking_deliveries')
        .select('*')
        .eq('booking_id', booking.id)
        .single();

      if (dErr || !delivery || !delivery.drive_folder_id) {
        return { status: 400, data: { error: 'Thư mục Google Drive chưa được tạo cho đơn đặt lịch này.' } };
      }

      if (delivery.status !== 'READY_FOR_UPLOAD' && delivery.status !== 'READY_FOR_CUSTOMER') {
        return {
          status: 409,
          data: {
            error: `Trạng thái thư mục hiện tại là "${delivery.status}". Thư mục phải ở trạng thái "READY_FOR_UPLOAD" trước khi giao.`,
          },
        };
      }

      // 3. Authoritative Email Verification from auth.users (Blocker 7)
      const { data: authUserData, error: authUserErr } = await supabaseAdmin.auth.admin.getUserById(booking.customer_id);
      if (authUserErr || !authUserData?.user) {
        return { status: 400, data: { error: 'Không tìm thấy tài khoản xác thực hệ thống của khách hàng.' } };
      }

      const authUser = authUserData.user;
      if (!authUser.email) {
        return { status: 400, data: { error: 'Tài khoản khách hàng không có email xác thực.' } };
      }

      if (!authUser.email_confirmed_at) {
        return {
          status: 400,
          data: {
            error: 'Tài khoản email của khách hàng chưa được xác thực (email_confirmed_at chưa có). Khách hàng phải xác thực email trước khi nhận ảnh.',
          },
        };
      }

      // 4. Verify customer profile status
      const { data: customerProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, status, full_name')
        .eq('id', booking.customer_id)
        .single();

      if (!customerProfile || customerProfile.status !== 'ACTIVE') {
        return {
          status: 400,
          data: {
            error: `Tài khoản khách hàng đang ở trạng thái "${customerProfile?.status || 'UNKNOWN'}". Không thể cấp quyền truy cập.`,
          },
        };
      }

      const customerEmail = authUser.email.trim().toLowerCase();

      // Idempotent check
      if (delivery.status === 'READY_FOR_CUSTOMER' && delivery.customer_permission_id && delivery.share_email === customerEmail) {
        return {
          status: 200,
          data: {
            success: true,
            delivery,
            message: 'Thư mục đã được chia sẻ cho email khách hàng.',
          },
        };
      }

      // 5. Get Google Access Token
      const tokenResult = await getGoogleAccessToken(ctx);
      if ('error' in tokenResult) {
        return {
          status: tokenResult.reauthRequired ? 403 : 500,
          data: tokenResult,
        };
      }

      // 6. Grant Google Drive Permission (role=reader, type=user) — NEVER type=anyone (Blocker 7)
      const permRes = await fetchFn(
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

        return { status: 502, data: { error: errMsg } };
      }

      const permData = await permRes.json();
      const permissionId = permData.id;

      // 7. Update booking_deliveries record to READY_FOR_CUSTOMER
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
        return { status: 500, data: { error: uErr.message } };
      }

      // Transition booking status to DELIVERED
      await supabaseAdmin
        .from('bookings')
        .update({
          booking_status: 'DELIVERED',
          updated_at: nowIso,
        })
        .eq('id', booking.id);

      // 8. Enqueue Transactional Notification Email via service_role (Blocker 10)
      try {
        await supabaseAdmin.rpc('enqueue_drive_delivery_email', {
          p_booking_id: booking.id,
          p_actor_id: callerProfile.id,
        });
      } catch (mailErr) {
        console.warn('enqueue_drive_delivery_email warning:', mailErr);
      }

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

      return {
        status: 200,
        data: {
          success: true,
          delivery: updatedDelivery,
        },
      };
    }

    // ==========================================================================
    // ACTION: REVOKE
    // ==========================================================================
    case 'REVOKE': {
      const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;
      if (!isManagerOrAdmin) {
        return { status: 403, data: { error: 'Access Denied: Only Manager or Admin can revoke delivery access.' } };
      }

      const { data: delivery, error: dErr } = await supabaseAdmin
        .from('booking_deliveries')
        .select('*')
        .eq('booking_id', booking.id)
        .single();

      if (dErr || !delivery) {
        return { status: 404, data: { error: 'Delivery record not found.' } };
      }

      if (delivery.status === 'REVOKED' || !delivery.customer_permission_id) {
        return {
          status: 200,
          data: {
            success: true,
            delivery,
            message: 'Delivery is already revoked.',
          },
        };
      }

      const tokenResult = await getGoogleAccessToken(ctx);
      if ('error' in tokenResult) {
        return {
          status: tokenResult.reauthRequired ? 403 : 500,
          data: tokenResult,
        };
      }

      const delRes = await fetchFn(
        `https://www.googleapis.com/drive/v3/files/${delivery.drive_folder_id}/permissions/${delivery.customer_permission_id}?supportsAllDrives=true`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${tokenResult.accessToken}` },
        }
      );

      if (!delRes.ok && delRes.status !== 404) {
        const errData = await delRes.json().catch(() => ({}));
        const errMsg = errData.error?.message || 'Failed to delete Google Drive permission';
        return { status: 502, data: { error: errMsg } };
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
        return { status: 500, data: { error: rErr.message } };
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerProfile.id,
        entity_type: 'BOOKING',
        entity_id: booking.id,
        action: 'DRIVE_CUSTOMER_REVOKED',
        old_data: { status: delivery.status, permission_id: delivery.customer_permission_id },
        new_data: { status: 'REVOKED' },
      });

      return {
        status: 200,
        data: {
          success: true,
          delivery: revokedDelivery,
        },
      };
    }

    // ==========================================================================
    // ACTION: RECONCILE (Blocker 8)
    // ==========================================================================
    case 'RECONCILE': {
      const isManagerOrAdmin = ['MANAGER', 'ADMIN'].includes(callerProfile.role) || isServiceRole;
      if (!isManagerOrAdmin) {
        return { status: 403, data: { error: 'Access Denied: Only Manager or Admin can reconcile delivery.' } };
      }

      const { data: delivery } = await supabaseAdmin
        .from('booking_deliveries')
        .select('*')
        .eq('booking_id', booking.id)
        .maybeSingle();

      if (!delivery || !delivery.drive_folder_id) {
        return {
          status: 400,
          data: {
            success: false,
            error: 'No delivery folder exists to reconcile.',
          },
        };
      }

      const tokenResult = await getGoogleAccessToken(ctx);
      if ('error' in tokenResult) {
        return {
          status: tokenResult.reauthRequired ? 403 : 500,
          data: tokenResult,
        };
      }

      const accessToken = tokenResult.accessToken;
      let newStatus = delivery.status;
      let lastError = null;

      // 1. Verify folder on Google Drive
      const fileRes = await fetchFn(
        `https://www.googleapis.com/drive/v3/files/${delivery.drive_folder_id}?fields=id,name,mimeType,trashed,appProperties&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!fileRes.ok) {
        newStatus = 'ERROR';
        lastError = 'Thư mục không tồn tại hoặc đã bị xóa trên Google Drive.';
      } else {
        const fileData = await fileRes.json();
        if (fileData.trashed || fileData.mimeType !== 'application/vnd.google-apps.folder') {
          newStatus = 'ERROR';
          lastError = 'Thư mục nằm trong thùng rác hoặc không phải là thư mục hợp lệ.';
        } else if (delivery.status === 'READY_FOR_CUSTOMER' && delivery.customer_permission_id) {
          // 2. Verify customer permission on Google Drive
          const permRes = await fetchFn(
            `https://www.googleapis.com/drive/v3/files/${delivery.drive_folder_id}/permissions/${delivery.customer_permission_id}?supportsAllDrives=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );

          if (!permRes.ok) {
            newStatus = 'READY_FOR_UPLOAD';
            lastError = 'Quyền xem của khách hàng không còn tồn tại trên Google Drive. Cần giao lại.';
          } else {
            const permData = await permRes.json();
            if (permData.role !== 'reader') {
              newStatus = 'READY_FOR_UPLOAD';
              lastError = `Quyền Drive bất thường: ${permData.role}. Cần kiểm tra lại.`;
            }
          }
        }
      }

      const nowIso = new Date().toISOString();
      const { data: updatedDelivery, error: rErr } = await supabaseAdmin
        .from('booking_deliveries')
        .update({
          status: newStatus,
          last_reconciled_at: nowIso,
          last_error: lastError,
          updated_at: nowIso,
        })
        .eq('booking_id', booking.id)
        .select()
        .single();

      if (rErr) {
        return { status: 500, data: { error: rErr.message } };
      }

      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerProfile.id,
        entity_type: 'BOOKING',
        entity_id: booking.id,
        action: 'DRIVE_FOLDER_RECONCILED',
        new_data: { reconciled_at: nowIso, status: newStatus, error: lastError },
      });

      return {
        status: 200,
        data: {
          success: true,
          delivery: updatedDelivery,
        },
      };
    }

    default:
      return { status: 400, data: { error: `Unsupported action: ${action}` } };
  }
}

/**
 * Handles Google OAuth actions: GET_AUTH_URL, GET_STATUS, and GET callback.
 */
export async function executeOAuthAction(
  method: 'GET' | 'POST',
  bodyOrParams: { action?: string; code?: string; state?: string; redirect_uri?: string },
  ctx: ProcessContext
): Promise<ActionResult> {
  const { supabaseAdmin } = ctx;
  const callerProfile = ctx.callerProfile || { id: '00000000-0000-0000-0000-000000000000', role: 'ADMIN', status: 'ACTIVE' };
  const fetchFn = ctx.fetchFn || fetch;
  const env = ctx.env || {};

  const clientId = env.GOOGLE_DRIVE_CLIENT_ID || (typeof Deno !== 'undefined' ? Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') : '') || '';
  const clientSecret = env.GOOGLE_DRIVE_CLIENT_SECRET || (typeof Deno !== 'undefined' ? Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') : '') || '';
  const redirectUri = env.GOOGLE_DRIVE_REDIRECT_URI || (typeof Deno !== 'undefined' ? Deno.env.get('GOOGLE_DRIVE_REDIRECT_URI') : '') || 'https://dkvkhysnabhtbbuvommu.supabase.co/functions/v1/google-drive-oauth';

  // GET: Callback from Google redirect
  if (method === 'GET') {
    const { code, state } = bodyOrParams;
    if (!code || !state) {
      return { status: 400, data: { error: 'Missing code or state.' } };
    }

    const nowIso = new Date().toISOString();
    const { data: stateRecord, error: stateErr } = await supabaseAdmin
      .from('google_drive_oauth_states')
      .select('*')
      .eq('state', state)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (stateErr || !stateRecord) {
      return { status: 400, data: { error: 'Invalid, used, or expired OAuth state.' } };
    }

    // Atomically consume state
    await supabaseAdmin
      .from('google_drive_oauth_states')
      .update({ used_at: nowIso })
      .eq('state', state);

    // Exchange code
    const tokenRes = await fetchFn('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.refresh_token) {
      return { status: 400, data: { error: 'Failed to exchange authorization code.' } };
    }

    // Persist refresh token server-side in google_drive_integrations (service_role only)
    await supabaseAdmin.from('google_drive_integrations').upsert({
      id: 'primary',
      account_email: 'maisonmipamemories@gmail.com',
      refresh_token: tokenData.refresh_token,
      is_active: true,
      connected_by: stateRecord.created_by,
      connected_at: nowIso,
      updated_at: nowIso,
    });

    // NEVER return refresh_token in response! (Blocker 1)
    return {
      status: 200,
      data: {
        success: true,
        connected: true,
        message: 'OAuth connection successful.',
      },
    };
  }

  // POST: Admin operations
  if (callerProfile.role !== 'ADMIN' || callerProfile.status !== 'ACTIVE') {
    return { status: 403, data: { error: 'Forbidden: Only active Admin can manage Google Drive integration.' } };
  }

  const { action } = bodyOrParams;

  if (action === 'GET_AUTH_URL') {
    if (!clientId) {
      return { status: 500, data: { error: 'GOOGLE_DRIVE_CLIENT_ID not configured.' } };
    }

    const randomState = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : 'test_state_' + Date.now();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabaseAdmin.from('google_drive_oauth_states').insert({
      state: randomState,
      created_by: callerProfile.id,
      redirect_uri: redirectUri,
      expires_at: expiresAt,
    });

    const scope = 'https://www.googleapis.com/auth/drive.file';
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', randomState);

    return {
      status: 200,
      data: {
        success: true,
        auth_url: authUrl.toString(),
        url: authUrl.toString(),
        expires_at: expiresAt,
      },
    };
  }

  if (action === 'GET_STATUS') {
    const { data: dbIntegration } = await supabaseAdmin
      .from('google_drive_integrations')
      .select('account_email, root_folder_id, is_active, updated_at')
      .eq('id', 'primary')
      .maybeSingle();

    return {
      status: 200,
      data: {
        success: true,
        connected: Boolean(dbIntegration && dbIntegration.is_active),
        account_email: dbIntegration?.account_email,
        root_folder_id: dbIntegration?.root_folder_id,
      },
    };
  }

  return { status: 400, data: { error: `Unsupported action: ${action}` } };
}
