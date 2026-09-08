// ==============================================================================
// Maison MIPA Memories - Supabase Edge Function: request-otp
// Generates CSPRNG 6-digit OTP, enforces rate limits & cooldowns, hashes with pepper,
// dispatches via configured SMS provider.
// NEVER returns raw OTP or logs plaintext OTP.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { tryNormalizeVietnamPhone } from '../_shared/phone.ts';
import { getSmsProvider } from '../_shared/smsProvider.ts';

const OTP_PEPPER = Deno.env.get('OTP_PEPPER') || 'mipa_default_server_pepper_2026';

async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateCsprngOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  const code = 100000 + (arr[0] % 900000);
  return code.toString();
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone: rawPhone, purpose = 'LOGIN', ipFingerprint } = await req.json();

    // 1. Validate & Normalize Phone (E.164)
    const norm = tryNormalizeVietnamPhone(rawPhone);
    if (!norm.isValid || !norm.normalized) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'INVALID_PHONE',
          message: norm.error || 'Số điện thoại không hợp lệ.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    const phone = norm.normalized;
    const phoneHash = await sha256(phone);

    // 2. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();

    // 3. Rate Limit Check: Max 5 requests per phone per 15 minutes
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    const { count: recentCount, error: countErr } = await supabaseAdmin
      .from('otp_challenges')
      .select('*', { count: 'exact', head: true })
      .eq('phone_hash', phoneHash)
      .gte('created_at', fifteenMinsAgo);

    if (!countErr && (recentCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'RATE_LIMITED',
          message: 'Số điện thoại này đã vượt quá số lần nhận mã trong 15 phút (tối đa 5 lần). Vui lòng thử lại sau.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 4. Cooldown Check: 60 seconds per phone & purpose
    const { data: activeChallenge } = await supabaseAdmin
      .from('otp_challenges')
      .select('*')
      .eq('phone_hash', phoneHash)
      .eq('purpose', purpose)
      .is('consumed_at', null)
      .gt('resend_after', now.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (activeChallenge) {
      const waitSeconds = Math.ceil(
        (new Date(activeChallenge.resend_after).getTime() - now.getTime()) / 1000
      );
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'RATE_LIMITED',
          resendAfter: waitSeconds,
          message: `Vui lòng đợi ${waitSeconds} giây trước khi yêu cầu gửi lại mã.`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      );
    }

    // 5. Generate CSPRNG OTP & Hash with Pepper
    const rawOtp = generateCsprngOtp();
    const otpHashed = await sha256(`${rawOtp}:${OTP_PEPPER}`);

    // 6. Dispatch SMS via SMS Provider
    const smsProvider = getSmsProvider();
    const sendResult = await smsProvider.sendOtp(phone, rawOtp);

    if (!sendResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'SMS_PROVIDER_ERROR',
          message: 'Không thể gửi mã xác thực. Vui lòng thử lại.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

    // 7. Store OTP Challenge in Database (Plaintext OTP is never persisted)
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 mins
    const resendAfter = new Date(now.getTime() + 60 * 1000).toISOString(); // 60s cooldown

    const { data: newChallenge, error: insertErr } = await supabaseAdmin
      .from('otp_challenges')
      .insert({
        phone,
        phone_hash: phoneHash,
        purpose,
        otp_hash: otpHashed,
        expires_at: expiresAt,
        resend_after: resendAfter,
        attempts: 0,
        max_attempts: 5,
        consumed_at: null,
        ip_fingerprint: ipFingerprint ? await sha256(ipFingerprint) : null,
      })
      .select('id, expires_at, resend_after')
      .single();

    if (insertErr || !newChallenge) {
      return new Response(
        JSON.stringify({
          success: false,
          errorCode: 'SMS_PROVIDER_ERROR',
          message: 'Lỗi lưu trữ phiên xác thực. Vui lòng thử lại.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 8. Return response WITHOUT raw OTP
    return new Response(
      JSON.stringify({
        success: true,
        challengeId: newChallenge.id,
        resendAfter: 60,
        expiresAt: newChallenge.expires_at,
        message: 'Mã xác thực đã được gửi đến số điện thoại của bạn qua SMS.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({
        success: false,
        errorCode: 'SMS_PROVIDER_ERROR',
        message: `Lỗi máy chủ: ${message}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
