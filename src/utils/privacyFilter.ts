// ==============================================================================
// Maison MIPA Memories — Privacy & Secret Redaction Filter
// Ensures telemetry, logging, and error trackers NEVER ingest PII or secrets.
// ==============================================================================

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /passphrase/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /bearer/i,
  /otp/i,
  /service_role/i,
  /refresh_token/i,
  /access_token/i,
  /client_secret/i,
  /api_key/i,
  /bank/i,
  /account_number/i,
  /cookie/i,
  /credit_card/i,
  /cvv/i,
];

const PII_KEY_PATTERNS = [
  /phone/i,
  /mobile/i,
  /telephone/i,
  /email/i,
  /customer_note/i,
  /notes?/i,
  /raw_payload/i,
];

/**
 * Mask an email address: e.g. "minhanh.nguyen@gmail.com" -> "m***h@gmail.com"
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '[REDACTED_EMAIL]';
  const parts = email.split('@');
  const user = parts[0];
  const domain = parts[1];
  if (user.length <= 2) {
    return `*@${domain}`;
  }
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

/**
 * Mask a phone number: e.g. "0966616546" -> "***-***-6546"
 */
export function maskPhone(phone: string): string {
  if (!phone) return '[REDACTED_PHONE]';
  const clean = phone.replace(/[^0-9]/g, '');
  if (clean.length < 4) return '[REDACTED_PHONE]';
  const tail = clean.slice(-4);
  return `***-***-${tail}`;
}

/**
 * Redacts any object, array, or primitive to ensure safe output for logging or monitoring.
 */
export function redactSensitiveData<T = any>(data: T, depth = 0): T {
  if (depth > 6) return '[MAX_DEPTH_REACHED]' as unknown as T;
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Check for email patterns in text
    let out: string = data;
    if (out.includes('@') && /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(out)) {
      out = out.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (m) => maskEmail(m));
    }
    // Check for phone number patterns (10-11 digits)
    if (/\b0[0-9]{9,10}\b/.test(out)) {
      out = out.replace(/\b0[0-9]{9,10}\b/g, (m) => maskPhone(m));
    }
    return out as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitiveData(item, depth + 1)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      // 1. Strict secret matching
      if (SENSITIVE_KEY_PATTERNS.some((p) => p.test(key))) {
        result[key] = '[REDACTED_SECRET]';
        continue;
      }

      // 2. PII specific matching
      if (/email/i.test(key) && typeof value === 'string') {
        result[key] = maskEmail(value);
        continue;
      }
      if (/phone|mobile|tel/i.test(key) && typeof value === 'string') {
        result[key] = maskPhone(value);
        continue;
      }
      if (/customer_note|notes?/i.test(key) && typeof value === 'string') {
        result[key] = '[REDACTED_NOTE]';
        continue;
      }

      // 3. Recursive sanitize
      result[key] = redactSensitiveData(value, depth + 1);
    }
    return result as unknown as T;
  }

  return data;
}
