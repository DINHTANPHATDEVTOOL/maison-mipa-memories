// ==============================================================================
// Maison MIPA Memories - Production Edge Function: google-drive-oauth
// Handles Google OAuth 2.0 Authorization Code flow with offline access (refresh token).
// Features:
// - Cryptographic one-time state generation with 10-minute expiry (Anti-CSRF)
// - Minimum required scope: https://www.googleapis.com/auth/drive.file
// - Sanitized responses (never leaks client secrets or full raw tokens in logs)
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const GOOGLE_DRIVE_CLIENT_ID = Deno.env.get('GOOGLE_DRIVE_CLIENT_ID') || '';
const GOOGLE_DRIVE_CLIENT_SECRET = Deno.env.get('GOOGLE_DRIVE_CLIENT_SECRET') || '';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify Manager / Admin Authorization
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['MANAGER', 'ADMIN'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden: Only Manager or Admin can manage OAuth integration.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { action, code, state, redirect_uri } = body;

    switch (action) {
      // 1. Generate Auth URL with Anti-CSRF One-Time State
      case 'GET_AUTH_URL': {
        if (!GOOGLE_DRIVE_CLIENT_ID) {
          return new Response(JSON.stringify({ error: 'GOOGLE_DRIVE_CLIENT_ID is not configured in Supabase secrets.' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const randomState = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

        await supabaseAdmin.from('google_drive_oauth_states').insert({
          state: randomState,
          created_by: user.id,
          expires_at: expiresAt,
        });

        const callbackUrl = redirect_uri || 'https://maisonmipa.io.vn/oauth/callback';
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
          state: randomState,
          expires_at: expiresAt,
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Exchange Authorization Code for Tokens
      case 'EXCHANGE_CODE': {
        if (!code || !state) {
          return new Response(JSON.stringify({ error: 'Missing code or state parameter.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Validate state against DB
        const { data: stateRecord, error: stateErr } = await supabaseAdmin
          .from('google_drive_oauth_states')
          .select('*')
          .eq('state', state)
          .single();

        if (stateErr || !stateRecord) {
          return new Response(JSON.stringify({ error: 'Invalid or forged OAuth state (CSRF detected).' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (stateRecord.used_at) {
          return new Response(JSON.stringify({ error: 'OAuth state has already been used.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (new Date(stateRecord.expires_at).getTime() < Date.now()) {
          return new Response(JSON.stringify({ error: 'OAuth state has expired.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Mark state as used
        await supabaseAdmin
          .from('google_drive_oauth_states')
          .update({ used_at: new Date().toISOString() })
          .eq('state', state);

        // Exchange code with Google
        const callbackUrl = redirect_uri || 'https://maisonmipa.io.vn/oauth/callback';
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_DRIVE_CLIENT_ID,
            client_secret: GOOGLE_DRIVE_CLIENT_SECRET,
            redirect_uri: callbackUrl,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok) {
          return new Response(JSON.stringify({ error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Audit OAuth connection
        await supabaseAdmin.from('audit_logs').insert({
          actor_user_id: user.id,
          entity_type: 'GOOGLE_DRIVE',
          entity_id: 'GLOBAL_OAUTH',
          action: 'DRIVE_OAUTH_CONNECTED',
          new_data: { connected_at: new Date().toISOString(), has_refresh_token: Boolean(tokenData.refresh_token) },
        });

        return new Response(JSON.stringify({
          success: true,
          has_refresh_token: Boolean(tokenData.refresh_token),
          refresh_token: tokenData.refresh_token || null,
          message: 'OAuth authorization successful. Please configure GOOGLE_DRIVE_REFRESH_TOKEN in Supabase Secrets.',
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
