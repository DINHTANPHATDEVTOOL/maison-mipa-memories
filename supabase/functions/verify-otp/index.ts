// ==============================================================================
// Maison MIPA Memories - Supabase Edge Function: verify-otp
// Verifies entered 6-digit OTP against server pepper hash, enforces max attempts,
// check expiry and single-use consumption.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const OTP_PEPPER = Deno.env.get('OTP_PEPPER') || 'mipa_default_server_pepper_2026';

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { challengeId, code } = await req.json();

    if (!challengeId || !code || !/^\d{6}$/.test(String(code).trim())) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OTP_INVALID',
          message: 'Mã xác thực không hợp lệ. Vui lòng nhập đúng 6 chữ số.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const cleanCode = String(code).trim();
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch Challenge Record
    const { data: challenge, error: fetchErr } = await supabaseAdmin
      .from('otp_challenges')
      .select('*')
      .eq('id', challengeId)
      .maybeSingle();

    if (fetchErr || !challenge) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OTP_INVALID',
          message: 'Yêu cầu xác thực không tồn tại hoặc đã bị xóa.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    const now = new Date();

    // 2. Check if already consumed
    if (challenge.consumed_at) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OTP_ALREADY_USED',
          message: 'Mã xác thực này đã được sử dụng trước đó.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Check attempts limit
    if (challenge.attempts >= challenge.max_attempts) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OTP_MAX_ATTEMPTS',
          message: 'Mã xác thực đã nhập sai quá 5 lần và bị khóa.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 4. Check expiration
    if (new Date(challenge.expires_at) < now) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OTP_EXPIRED',
          message: 'Mã xác thực đã hết hạn sau 5 phút. Vui lòng yêu cầu mã mới.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 5. Compare Hashes
    const enteredHash = await sha256(`${cleanCode}:${OTP_PEPPER}`);

    if (enteredHash !== challenge.otp_hash) {
      const nextAttempts = challenge.attempts + 1;
      await supabaseAdmin
        .from('otp_challenges')
        .update({ attempts: nextAttempts })
        .eq('id', challengeId);

      if (nextAttempts >= challenge.max_attempts) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'OTP_MAX_ATTEMPTS',
            message: 'Mã xác thực đã nhập sai quá số lần quy định và bị khóa.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        );
      }

      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'OTP_INVALID',
          message: `Mã xác thực không chính xác. Bạn còn ${challenge.max_attempts - nextAttempts} lần thử.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 6. Verification Success: Mark Consumed
    await supabaseAdmin
      .from('otp_challenges')
      .update({ consumed_at: now.toISOString() })
      .eq('id', challengeId);

    return new Response(
      JSON.stringify({
        success: true,
        verifiedPhone: challenge.phone,
        message: 'Xác thực số điện thoại thành công!',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        errorCode: 'OTP_INVALID',
        message: `Lỗi máy chủ: ${message}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
