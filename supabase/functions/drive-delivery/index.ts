// ==============================================================================
// Maison MIPA Memories - Production Edge Function: drive-delivery
// Authoritative Google Drive customer photo delivery & booking completion workflow
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { executeDriveDeliveryAction } from '../_shared/driveDeliveryCore.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

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

    let callerProfile: any = null;
    let isServiceRole = false;

    if (SUPABASE_SERVICE_ROLE_KEY && token === SUPABASE_SERVICE_ROLE_KEY) {
      isServiceRole = true;
      callerProfile = { id: '00000000-0000-0000-0000-000000000000', role: 'ADMIN', status: 'ACTIVE' };
    } else {
      const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Invalid authentication session.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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

    // 3. Delegate to Authoritative Core
    const result = await executeDriveDeliveryAction(action, booking_id, {
      supabaseAdmin,
      callerProfile,
      isServiceRole,
    });

    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
