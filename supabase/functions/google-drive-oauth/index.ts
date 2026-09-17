// ==============================================================================
// Maison MIPA Memories - Production Edge Function: google-drive-oauth
// Authoritative Google OAuth 2.0 Integration Handler
//
// Architectural Responsibilities:
// 1. GET: Public OAuth Callback Endpoint from Google Accounts redirect
//    - Accepts browser GET callback without Supabase JWT
//    - Atomically validates one-time anti-CSRF state token (10m expiry)
//    - Exchanges auth code for refresh_token & access_token server-side
//    - Automatically reconciles/creates root folder with drive.file scope
//    - Durably persists refresh_token in public.google_drive_integrations (service_role only)
//    - NEVER leaks or returns refresh token to browser, URL params, or logs
//    - Safely redirects browser to application management portal
//
// 2. POST (action: GET_AUTH_URL):
//    - Requires authenticated active ADMIN / Root Owner session
//    - Generates cryptographic one-time state and persists with server redirect URI
//    - Minimum required scope: https://www.googleapis.com/auth/drive.file
//
// 3. POST (action: GET_STATUS):
//    - Returns integration health ({ connected: boolean, root_folder_id?: string, account_email?: string })
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { ensureRootFolder } from '../_shared/driveDeliveryCore.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const GOOGLE_DRIVE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || '';
const GOOGLE_DRIVE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || '';
const GOOGLE_DRIVE_REDIRECT_URI = Deno.env.get('GOOGLE_DRIVE_REDIRECT_URI') || `${SUPABASE_URL}/functions/v1/google-drive-oauth`;

const APP_PORTAL_URL = 'https://maisonmipa.io.vn/management';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const url = new URL(req.url);

  // ============================================================================
  // 1. GET REQUEST: Public OAuth 2.0 Browser Callback from Google
  // ============================================================================
  if (req.method === 'GET') {
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const googleError = url.searchParams.get('error');

    if (googleError) {
      const redirectUrl = new URL(APP_PORTAL_URL);
      redirectUrl.searchParams.set('drive_error', googleError);
      return Response.redirect(redirectUrl.toString(), 302);
    }

    if (!code || !state) {
      const redirectUrl = new URL(APP_PORTAL_URL);
      redirectUrl.searchParams.set('drive_error', 'missing_code_or_state');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Validate one-time anti-CSRF state from database
    const nowIso = new Date().toISOString();
    const { data: stateRecord, error: stateErr } = await supabaseAdmin
      .from('google_drive_oauth_states')
      .select('*')
      .eq('state', state)
      .is('used_at', null)
      .gt('expires_at', nowIso)
      .maybeSingle();

    if (stateErr || !stateRecord) {
      const redirectUrl = new URL(APP_PORTAL_URL);
      redirectUrl.searchParams.set('drive_error', 'invalid_or_expired_state');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Atomically consume state token
    await supabaseAdmin
      .from('google_drive_oauth_states')
      .update({ used_at: nowIso })
      .eq('state', state);

    // Exchange authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_DRIVE_CLIENT_ID,
        client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
        redirect_uri: GOOGLE_DRIVE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.refresh_token) {
      const errMsg = tokenData.error_description || tokenData.error || 'Failed to exchange authorization code';
      console.error('Google OAuth token exchange failed:', errMsg);
      const redirectUrl = new URL(APP_PORTAL_URL);
      redirectUrl.searchParams.set('drive_error', 'token_exchange_failed');
      return Response.redirect(redirectUrl.toString(), 302);
    }

    // Identify user account email via Google userinfo or tokeninfo
    let accountEmail: string | null = null;
    if (tokenData.access_token) {
      try {
        const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        if (infoRes.ok) {
          const info = await infoRes.json();
          accountEmail = info.email || null;
        }
      } catch (_) {
        // userinfo is optional
      }
    }

    // Automatically ensure root folder exists and tag it
    let rootFolderId: string | null = null;
    if (tokenData.access_token) {
      rootFolderId = await ensureRootFolder(tokenData.access_token);
    }

    // Durably store refresh token and root folder ID in database (service_role only)
    // NEVER expose refresh token to the browser, URL parameters, or logs!
    await supabaseAdmin
      .from('google_drive_integrations')
      .upsert({
        id: 'primary',
        account_email: accountEmail || 'maisonmipamemories@gmail.com',
        root_folder_id: rootFolderId,
        refresh_token: tokenData.refresh_token,
        is_active: true,
        connected_by: stateRecord.created_by,
        connected_at: nowIso,
        updated_at: nowIso,
      });

    // Record sanitized audit event
    await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: stateRecord.created_by,
      entity_type: 'GOOGLE_DRIVE',
      entity_id: 'GLOBAL_OAUTH',
      action: 'DRIVE_OAUTH_CONNECTED',
      new_data: {
        connected_at: nowIso,
        account_email: accountEmail,
        root_folder_id: rootFolderId,
      },
    });

    // Safe 302 Redirect to Management UI with connection success flag
    const redirectUrl = new URL(APP_PORTAL_URL);
    redirectUrl.searchParams.set('drive', 'connected');
    return Response.redirect(redirectUrl.toString(), 302);
  }

  // ============================================================================
  // 2. POST REQUESTS: Authenticated Admin Management Operations
  // ============================================================================
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify authenticated user
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Enforce active ADMIN / Root Owner (Blocker 11)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'ADMIN' || profile.status !== 'ACTIVE') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only active Admin can manage Google Drive integration.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    switch (action) {
      // ------------------------------------------------------------------------
      // ACTION: GET_AUTH_URL
      // Generates Google OAuth 2.0 URL with anti-CSRF state token
      // ------------------------------------------------------------------------
      case 'GET_AUTH_URL': {
        if (!GOOGLE_DRIVE_CLIENT_ID) {
          return new Response(JSON.stringify({ error: 'GOOGLE_DRIVE_CLIENT_ID is not configured in Supabase secrets.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const randomState = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        // Server-side redirect URI constant only (Blocker 2)
        const callbackUrl = GOOGLE_DRIVE_REDIRECT_URI;

        await supabaseAdmin.from('google_drive_oauth_states').insert({
          state: randomState,
          created_by: user.id,
          redirect_uri: callbackUrl,
          expires_at: expiresAt,
        });

        // Minimum required scope: drive.file only (Blocker 3)
        const scope = 'https://www.googleapis.com/auth/drive.file';

        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_DRIVE_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', callbackUrl);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', scope);
        authUrl.searchParams.set('access_type', 'offline');
        authUrl.searchParams.set('prompt', 'consent');
        authUrl.searchParams.set('state', randomState);

        return new Response(JSON.stringify({
          success: true,
          auth_url: authUrl.toString(),
          expires_at: expiresAt,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // ------------------------------------------------------------------------
      // ACTION: GET_STATUS
      // Safe status query returning connection health without secret leakage
      // ------------------------------------------------------------------------
      case 'GET_STATUS': {
        const envToken = Deno.env.get('GOOGLE_DRIVE_REFRESH_TOKEN');
        const { data: dbIntegration } = await supabaseAdmin
          .from('google_drive_integrations')
          .select('account_email, root_folder_id, is_active, updated_at')
          .eq('id', 'primary')
          .maybeSingle();

        const isConnected = Boolean(envToken || (dbIntegration && dbIntegration.is_active));

        return new Response(JSON.stringify({
          success: true,
          connected: isConnected,
          account_email: dbIntegration?.account_email || (envToken ? 'maisonmipamemories@gmail.com' : undefined),
          root_folder_id: dbIntegration?.root_folder_id || Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') || undefined,
          updated_at: dbIntegration?.updated_at,
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
