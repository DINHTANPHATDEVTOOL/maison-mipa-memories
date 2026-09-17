// ==============================================================================
// Maison MIPA Memories - Production Edge Function: photo-proof
// Authenticated secure customer proof preview proxy
// ==============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { fetchProofPreview } from '../_shared/driveDeliveryCore.ts';

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

    // 2. Parse Request Parameters (URL search params or JSON body)
    const url = new URL(req.url);
    let bookingId = url.searchParams.get('booking_id');
    let proofImageId = url.searchParams.get('proof_image_id');

    if (!bookingId || !proofImageId) {
      if (req.method === 'POST') {
        const body = await req.json().catch(() => ({}));
        bookingId = bookingId || body.booking_id;
        proofImageId = proofImageId || body.proof_image_id;
      }
    }

    if (!bookingId || !proofImageId) {
      return new Response(JSON.stringify({ error: 'Missing required booking_id or proof_image_id parameter.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch Proof Preview via Core
    const result = await fetchProofPreview(bookingId, proofImageId, {
      supabaseAdmin,
      callerProfile,
      isServiceRole,
    });

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, ...result.headers },
      });
    }

    return new Response(result.body, {
      status: result.status,
      headers: { ...corsHeaders, ...result.headers },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
