// ==============================================================================
// Maison MIPA Memories - Server-side SMS Provider Abstraction
// Supports: eSMS, SpeedSMS, and Mock (for staging/automated testing)
// Secrets strictly sourced via Deno.env (Supabase Secrets), NEVER client-side.
// ==============================================================================

export interface SmsSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface SmsProvider {
  name: string;
  sendOtp(phone: string, otpCode: string): Promise<SmsSendResult>;
}

/**
 * eSMS Provider Implementation
 * Docs: https://esms.vn/api-tai-lieu
 */
export class EsmsProvider implements SmsProvider {
  name = 'eSMS';

  private apiKey: string;
  private secretKey: string;
  private brandName: string;

  constructor() {
    this.apiKey = Deno.env.get('SMS_API_KEY') || '';
    this.secretKey = Deno.env.get('SMS_SECRET') || '';
    this.brandName = Deno.env.get('SMS_BRANDNAME') || 'MIPA';
  }

  async sendOtp(phone: string, otpCode: string): Promise<SmsSendResult> {
    if (!this.apiKey || !this.secretKey) {
      return {
        success: false,
        provider: this.name,
        error: 'SMS_PROVIDER_NOT_CONFIGURED: Missing API Key or Secret',
      };
    }

    try {
      const content = `Ma xac thuc Maison MIPA Memories cua ban la ${otpCode}. Ma co hieu luc trong 5 phut.`;
      const url = `http://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ApiKey: this.apiKey,
          SecretKey: this.secretKey,
          Phone: phone,
          Content: content,
          SmsType: '2', // CSKH / OTP Brandname
          Brandname: this.brandName,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: `HTTP_${response.status}: Failed to reach eSMS gateway`,
        };
      }

      const resData = await response.json();
      // eSMS CodeResult '100' indicates success
      if (resData.CodeResult === '100') {
        return {
          success: true,
          messageId: resData.SMSID || `esms_${Date.now()}`,
          provider: this.name,
        };
      }

      return {
        success: false,
        provider: this.name,
        error: `eSMS_ERROR_${resData.CodeResult}: ${resData.ErrorMessage || 'Send failed'}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        provider: this.name,
        error: `NETWORK_ERROR: ${message}`,
      };
    }
  }
}

/**
 * SpeedSMS Provider Implementation
 * Docs: https://speedsms.vn/sms-api-service/
 */
export class SpeedSmsProvider implements SmsProvider {
  name = 'SpeedSMS';

  private authToken: string;
  private senderId: string;

  constructor() {
    this.authToken = Deno.env.get('SMS_API_KEY') || Deno.env.get('SPEEDSMS_AUTH_TOKEN') || '';
    this.senderId = Deno.env.get('SMS_BRANDNAME') || 'MIPA';
  }

  async sendOtp(phone: string, otpCode: string): Promise<SmsSendResult> {
    if (!this.authToken) {
      return {
        success: false,
        provider: this.name,
        error: 'SPEEDSMS_NOT_CONFIGURED: Missing Auth Token',
      };
    }

    try {
      const content = `Ma xac thuc Maison MIPA Memories cua ban la ${otpCode}. Ma co hieu luc trong 5 phut.`;
      const response = await fetch('https://api.speedsms.vn/index.php/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${this.authToken}:x`)}`,
        },
        body: JSON.stringify({
          to: [phone],
          content: content,
          sms_type: 2,
          sender: this.senderId,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          error: `HTTP_${response.status}: SpeedSMS gateway unreachable`,
        };
      }

      const resData = await response.json();
      if (resData.status === 'success') {
        return {
          success: true,
          messageId: resData.data?.tranId || `speedsms_${Date.now()}`,
          provider: this.name,
        };
      }

      return {
        success: false,
        provider: this.name,
        error: `SPEEDSMS_ERROR_${resData.code}: ${resData.message || 'Dispatch failed'}`,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        provider: this.name,
        error: `NETWORK_ERROR: ${message}`,
      };
    }
  }
}

/**
 * Mock Provider for development / CI environments where SMS credentials are not provisioned
 */
export class MockSmsProvider implements SmsProvider {
  name = 'MockSmsProvider';

  async sendOtp(phone: string, _otpCode: string): Promise<SmsSendResult> {
    // In dev / staging, simulate dispatch without leaking OTP to logs
    return {
      success: true,
      messageId: `mock_${Date.now()}_${phone.slice(-4)}`,
      provider: this.name,
    };
  }
}

/**
 * Factory to get configured SMS provider
 */
export const getSmsProvider = (): SmsProvider => {
  const providerType = (Deno.env.get('SMS_PROVIDER') || '').toLowerCase();
  if (providerType === 'esms') {
    return new EsmsProvider();
  }
  if (providerType === 'speedsms') {
    return new SpeedSmsProvider();
  }
  // Default to mock provider when no live SMS gateway credentials exist
  return new MockSmsProvider();
};
