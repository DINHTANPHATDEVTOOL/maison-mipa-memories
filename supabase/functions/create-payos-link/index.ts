// ==============================================================================
// Maison MIPA Memories - Supabase Edge Function: create-payos-link
// Secure server-side payOS payment request generation.
// Consumes PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY strictly server-side.
// Returns payment details and QR code without exposing secrets to client.
// ==============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';

const PAYOS_CLIENT_ID = Deno.env.get('PAYOS_CLIENT_ID') || '';
const PAYOS_API_KEY = Deno.env.get('PAYOS_API_KEY') || '';
const PAYOS_CHECKSUM_KEY = Deno.env.get('PAYOS_CHECKSUM_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function computeHmacSha256Hex(keyString: string, dataString: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(keyString),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(dataString));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'Missing bookingId parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Verify caller session
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch booking details
    const { data: booking, error: bErr } = await supabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bErr || !booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership or management role
    if (booking.customer_id !== user.id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || !['MANAGER', 'ADMIN'].includes(profile.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden: You do not own this booking' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 3. Create or fetch deposit payment
    const { data: payment, error: payErr } = await supabaseAdmin.rpc('create_deposit_payment', {
      p_booking_id: bookingId,
      p_method: 'VIETQR',
    });

    if (payErr || !payment) {
      return new Response(JSON.stringify({ error: payErr?.message || 'Failed to create payment record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Fetch active bank configuration (ACB priority)
    const { data: bankSettings } = await supabaseAdmin
      .from('payment_settings')
      .select('*')
      .eq('active', true)
      .order('is_default', { ascending: false })
      .limit(1)
      .maybeSingle();

    const bankBin = bankSettings?.bank_bin || '970416'; // Default to ACB
    const accountNumber = bankSettings?.account_number || '';
    const accountName = bankSettings?.account_name || 'MAISON MIPA MEMORIES';
    const amount = Number(payment.amount);
    const orderCode = payment.order_code || Date.now() % 1000000000;
    const transferRef = payment.transfer_reference;

    // Build VietQR image fallback URL
    const vietQrUrl = accountNumber
      ? `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferRef)}&accountName=${encodeURIComponent(accountName)}`
      : null;

    // 5. If payOS credentials are configured, create payOS payment request
    if (PAYOS_CLIENT_ID && PAYOS_API_KEY && PAYOS_CHECKSUM_KEY) {
      try {
        const description = transferRef.substring(0, 25);
        const returnUrl = `${req.headers.get('origin') || 'https://maisonmipa.io.vn'}/booking?status=success&bookingId=${bookingId}`;
        const cancelUrl = `${req.headers.get('origin') || 'https://maisonmipa.io.vn'}/booking?status=cancelled&bookingId=${bookingId}`;

        // Create signature string sorted alphabetically: amount, cancelUrl, description, orderCode, returnUrl
        const signaturePayload = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
        const signature = await computeHmacSha256Hex(PAYOS_CHECKSUM_KEY, signaturePayload);

        const payosRes = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
          method: 'POST',
          headers: {
            'x-client-id': PAYOS_CLIENT_ID,
            'x-api-key': PAYOS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderCode,
            amount,
            description,
            buyerName: booking.customer_name,
            buyerEmail: booking.customer_email,
            buyerPhone: booking.customer_phone,
            cancelUrl,
            returnUrl,
            signature,
          }),
        });

        const payosResult = await payosRes.json();

        if (payosRes.ok && payosResult.code === '00' && payosResult.data) {
          // Update payment metadata with payOS link details
          await supabaseAdmin
            .from('payments')
            .update({
              provider: 'PAYOS_ACB',
              provider_reference: payosResult.data.paymentLinkId || String(orderCode),
              metadata: {
                ...payment.metadata,
                checkout_url: payosResult.data.checkoutUrl,
                payos_order_code: orderCode,
              },
            })
            .eq('id', payment.id);

          return new Response(
            JSON.stringify({
              success: true,
              mode: 'PAYOS',
              payment: {
                ...payment,
                provider: 'PAYOS_ACB',
                provider_reference: payosResult.data.paymentLinkId,
              },
              checkoutUrl: payosResult.data.checkoutUrl,
              qrCode: payosResult.data.qrCode,
              vietQrUrl: vietQrUrl || payosResult.data.qrCode,
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.warn('payOS API error:', payosResult.desc || payosResult.message);
        }
      } catch (payosErr: any) {
        console.warn('payOS integration error (falling back to VietQR):', payosErr.message);
      }
    }

    // Fallback: Authoritative VietQR mode with ACB bank settings
    return new Response(
      JSON.stringify({
        success: true,
        mode: 'VIETQR_DIRECT',
        payment,
        vietQrUrl,
        bankInfo: {
          bankBin,
          bankName: bankSettings?.bank_name || 'Ngân hàng TMCP Á Châu (ACB)',
          accountNumber,
          accountName,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal Server Error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
