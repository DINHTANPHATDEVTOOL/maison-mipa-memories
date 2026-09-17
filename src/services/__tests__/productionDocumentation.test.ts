import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Documentation Integrity Guard', () => {
  const rootDir = path.resolve(__dirname, '../../../');
  const pendingDocPath = path.join(rootDir, 'PRODUCTION_CONFIG_PENDING.md');
  const releaseStatusPath = path.join(rootDir, 'PRODUCTION_RELEASE_STATUS.md');
  const readmePath = path.join(rootDir, 'README.md');

  it('1. PRODUCTION_CONFIG_PENDING.md is a clean tombstone with zero stale deployment instructions', () => {
    expect(fs.existsSync(pendingDocPath)).toBe(true);
    const content = fs.readFileSync(pendingDocPath, 'utf-8');

    // Forbidden stale deployment patterns
    const forbiddenPatterns = [
      'functions deploy payment-webhook',
      'functions deploy create-payos-link',
      'PAYOS_CLIENT_ID=',
      'PAYOS_API_KEY=',
      'PAYOS_CHECKSUM_KEY=',
      'PAYMENT_WEBHOOK_SECRET=',
      'HISTORY_NOT_VERIFIED',
      'LOCAL_MIGRATIONS (18)',
      'OWNER_ACTION_REQUIRED',
      'UPDATE public.payment_settings',
    ];

    for (const pattern of forbiddenPatterns) {
      expect(content).not.toContain(pattern);
    }

    // Required authoritative tombstone markers
    expect(content).toContain('PRODUCTION_RELEASE_STATUS.md');
    expect(content).toContain('LEGACY');
    expect(content).toContain('DO NOT USE');
  });

  it('2. PRODUCTION_RELEASE_STATUS.md exists and certifies Booking Flow V2 in production', () => {
    expect(fs.existsSync(releaseStatusPath)).toBe(true);
    const content = fs.readFileSync(releaseStatusPath, 'utf-8');

    expect(content).toContain('PRODUCTION_READY=YES');
    expect(content).toContain('MIGRATION_HISTORY=VERIFIED');
    expect(content).toMatch(/Local Migrations.*21/i);
    expect(content).toMatch(/Remote Migrations.*21/i);
    expect(content).toContain('CONSULTATION_REQUESTED');
    expect(content).toContain('CONSULTING');
    expect(content).toContain('CONFIRMED');
  });

  it('3. README.md contains authoritative Booking Flow V2 wording and no active payment deployment', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf-8');

    expect(content).toContain(
      'Booking Flow V2 uses consultation-first booking with manual deposit confirmation by authorized staff. Online payment integrations are legacy and are not part of the active customer workflow.'
    );
    expect(content).not.toContain('PAYMENT_WEBHOOK_SECRET=your_hmac_secret');
  });
});
