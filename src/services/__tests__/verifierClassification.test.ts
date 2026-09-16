// ==============================================================================
// Maison MIPA Memories - Schema Verifier Classification Unit Tests
// ==============================================================================
import { describe, it, expect } from 'vitest';
import {
  classifyTableResult,
  classifyColumnResult,
  classifyRpcResult,
  classifyMigrations,
} from '../../../scripts/verify-production-schema.mjs';

describe('Production Schema Verifier Error Classification Tests', () => {
  // ============================================================================
  // 1. Table Verification Error Classification
  // ============================================================================
  it('1. Table check with null error is PASS', () => {
    const result = classifyTableResult(null);
    expect(result.status).toBe('PASS');
    expect(result.isPass).toBe(true);
  });

  it('2. Table check with error 42501 is VERIFIED_RESTRICTED (PASS)', () => {
    const result = classifyTableResult({ code: '42501', message: 'permission denied for table root_owner_config' });
    expect(result.status).toBe('VERIFIED_RESTRICTED');
    expect(result.isPass).toBe(true);
  });

  it('3. Table network or unexpected database error fails closed (FAIL, never PASS)', () => {
    const netErr = classifyTableResult({ code: 'FETCH_ERROR', message: 'Network request failed: timeout connecting to Supabase' });
    expect(netErr.status).toBe('FAIL');
    expect(netErr.isPass).toBe(false);

    const jwtErr = classifyTableResult({ code: 'PGRST301', message: 'JWT expired or invalid' });
    expect(jwtErr.status).toBe('FAIL');
    expect(jwtErr.isPass).toBe(false);
  });

  it('4. Table missing error is FAIL', () => {
    const result = classifyTableResult({ code: '42P01', message: 'relation "public.unknown_table" does not exist' });
    expect(result.status).toBe('FAIL');
    expect(result.isPass).toBe(false);
  });

  // ============================================================================
  // 2. Column Contract Error Classification
  // ============================================================================
  it('5. Column check with null error is PASS', () => {
    const result = classifyColumnResult(null);
    expect(result.status).toBe('PASS');
    expect(result.isPass).toBe(true);
  });

  it('6. Column permission or network error is FAIL/UNVERIFIED (never false PASS)', () => {
    const permErr = classifyColumnResult({ code: '42501', message: 'permission denied for table promotions' });
    expect(permErr.status).toBe('FAIL');
    expect(permErr.isPass).toBe(false);
    expect(permErr.message).toContain('[UNVERIFIED]');

    const netErr = classifyColumnResult({ message: 'ETIMEDOUT' });
    expect(netErr.status).toBe('FAIL');
    expect(netErr.isPass).toBe(false);
  });

  it('7. Column missing error (42703) is FAIL', () => {
    const result = classifyColumnResult({ code: '42703', message: 'column "duration_minutes" does not exist' });
    expect(result.status).toBe('FAIL');
    expect(result.isPass).toBe(false);
    expect(result.message).toContain('Column missing');
  });

  // ============================================================================
  // 3. RPC Existence Error Classification
  // ============================================================================
  it('8. RPC missing function errors (PGRST202, 42883) are MISSING (FAIL)', () => {
    const pgrst202 = classifyRpcResult({ code: 'PGRST202', message: 'Could not find the function public.fake_rpc' });
    expect(pgrst202.status).toBe('MISSING');
    expect(pgrst202.isPass).toBe(false);

    const code42883 = classifyRpcResult({ code: '42883', message: 'function does not exist' });
    expect(code42883.status).toBe('MISSING');
    expect(code42883.isPass).toBe(false);
  });

  it('9. RPC runtime errors (42501, P0002, P0003, P0004) prove existence -> EXISTS (PASS)', () => {
    const authErr = classifyRpcResult({ code: '42501', message: 'Unauthorized: User must be authenticated' });
    expect(authErr.status).toBe('EXISTS');
    expect(authErr.isPass).toBe(true);

    const invalidIdErr = classifyRpcResult({ code: 'P0002', message: 'Invalid package specified' });
    expect(invalidIdErr.status).toBe('EXISTS');
    expect(invalidIdErr.isPass).toBe(true);

    const validationErr = classifyRpcResult({ code: 'P0003', message: 'Package concept limit exceeded' });
    expect(validationErr.status).toBe('EXISTS');
    expect(validationErr.isPass).toBe(true);

    const promoErr = classifyRpcResult({ code: 'P0004', message: 'Promotion voucher code is invalid' });
    expect(promoErr.status).toBe('EXISTS');
    expect(promoErr.isPass).toBe(true);
  });

  it('10. RPC network or unknown infrastructure error is UNVERIFIED/FAIL (never false PASS)', () => {
    const netErr = classifyRpcResult({ code: 'ECONNRESET', message: 'Connection reset by peer' });
    expect(netErr.status).toBe('FAIL');
    expect(netErr.isPass).toBe(false);
    expect(netErr.message).toContain('[UNVERIFIED]');
  });

  // ============================================================================
  // 4. Migration History Classification
  // ============================================================================
  it('11. Migration history unknown is categorized as HISTORY_NOT_VERIFIED, NOT marked APPLIED or NOT_APPLIED', () => {
    const local = [
      '20260908000001_auth_rbac_schema.sql',
      '20260911000001_email_verification_hardening.sql',
    ];
    const verified = ['20260908000001_auth_rbac_schema.sql'];

    const classification = classifyMigrations(local, verified);

    expect(classification.historyVerified).toEqual(['20260908000001_auth_rbac_schema.sql']);
    expect(classification.historyNotVerified).toEqual(['20260911000001_email_verification_hardening.sql']);

    // Must NOT equate historyNotVerified to "not applied"
    expect(classification).not.toHaveProperty('notApplied');
  });
});
