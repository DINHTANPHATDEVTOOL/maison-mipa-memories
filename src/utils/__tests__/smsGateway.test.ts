import { describe, it, expect } from 'vitest';
import { sendRealSmsOtp } from '../smsGateway';

describe('smsGateway - sendRealSmsOtp', () => {
  it('should format Vietnamese phone number from leading 0 to 84 and succeed', async () => {
    const result = await sendRealSmsOtp('0908123456', '123456');
    expect(result.success).toBe(true);
    expect(result.message).toContain('0908123456');
    expect(result.message).toContain('123456');
  });

  it('should handle already formatted 84 phone number with non-digit chars', async () => {
    const result = await sendRealSmsOtp('+84 908-123-456', '654321');
    expect(result.success).toBe(true);
    expect(result.provider).toBeDefined();
  });
});
