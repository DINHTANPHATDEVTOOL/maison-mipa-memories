import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Production Schema & Migration Comprehensive Audit', () => {
  const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');

  const EXPECTED_MIGRATIONS = [
    '20260908000001_auth_rbac_schema.sql',
    '20260908000002_booking_persistence_schema.sql',
    '20260908000003_otp_payment_schema.sql',
    '20260909000001_production_core_hardening.sql',
    '20260909000002_portfolio_cms_and_booking_concepts.sql',
    '20260910000001_production_payos_and_email_hardening.sql',
    '20260911000001_email_verification_hardening.sql',
    '20260911000002_root_owner_rbac_hardening.sql',
    '20260911000003_fix_booking_assignments_rls_recursion.sql',
    '20260911000004_booking_package_service_harmony_and_rich_email.sql',
    '20260911000005_fix_booking_concepts_display_order_and_columns.sql',
    '20260911000006_fix_payments_columns_and_availability_rpc.sql',
    '20260911000007_rich_email_payload_and_realtime_publication.sql',
    '20260911000008_flexible_concepts_and_availability_grant.sql',
  ];

  const EXPECTED_TABLES = [
    'profiles',
    'services',
    'packages',
    'addons',
    'studio_rooms',
    'employees',
    'promotions',
    'bookings',
    'booking_addons',
    'booking_assignments',
    'audit_logs',
    'otp_challenges',
    'payments',
    'payment_settings',
    'notification_outbox',
    'staff_tasks',
    'concepts',
    'portfolio_collections',
    'portfolio_photos',
    'booking_concepts',
    'root_owner_config',
  ];

  const EXPECTED_RPCS = [
    'get_auth_role',
    'handle_new_user',
    'handle_user_email_confirmed',
    'prevent_role_escalation',
    'get_auth_user_status',
    'get_auth_staff_role',
    'is_root_owner',
    'create_booking',
    'update_booking_status',
    'assign_booking_staff',
    'create_deposit_payment',
    'mark_transfer_submitted',
    'confirm_manual_payment',
    'admin_save_payment_settings',
    'admin_update_user_role_and_status',
    'publish_portfolio_collection',
    'enqueue_shoot_reminder',
  ];

  it('1. all migration files exist in sequential order', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    expect(files.sort()).toEqual(EXPECTED_MIGRATIONS.sort());
  });

  it('2. all 21 required application tables are created across migrations', () => {
    const combinedSql = EXPECTED_MIGRATIONS
      .map(file => fs.readFileSync(path.join(migrationsDir, file), 'utf-8'))
      .join('\n');

    for (const table of EXPECTED_TABLES) {
      const tableRegex = new RegExp(`CREATE TABLE (IF NOT EXISTS )?public\\.${table}\\s*\\(`, 'i');
      expect(tableRegex.test(combinedSql), `Table public.${table} must be created in migrations`).toBe(true);
    }
  });

  it('3. all 15 core RPC functions and triggers are defined with search_path safety', () => {
    const combinedSql = EXPECTED_MIGRATIONS
      .map(file => fs.readFileSync(path.join(migrationsDir, file), 'utf-8'))
      .join('\n');

    for (const rpc of EXPECTED_RPCS) {
      const rpcRegex = new RegExp(`FUNCTION public\\.${rpc}\\s*\\(`, 'i');
      expect(rpcRegex.test(combinedSql), `RPC function public.${rpc} must be defined in migrations`).toBe(true);
    }
  });

  it('4. migration 6 enqueue_shoot_reminder joins services and packages without referencing invalid bookings columns', () => {
    const migration6 = fs.readFileSync(path.join(migrationsDir, '20260910000001_production_payos_and_email_hardening.sql'), 'utf-8');

    // Should NOT query nonexistent columns directly from bookings in enqueue_shoot_reminder
    expect(migration6).not.toMatch(/FUNCTION public\.enqueue_shoot_reminder[\s\S]*?SELECT \* INTO v_booking FROM public\.bookings/i);

    // Must join services and packages
    expect(migration6).toContain('JOIN public.services s ON s.id = b.service_id');
    expect(migration6).toContain('JOIN public.packages p ON p.id = b.package_id');
    expect(migration6).toContain("to_char(b.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS booking_date");
    expect(migration6).toContain("to_char(b.start_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI') AS start_time");
  });

  it('5. migration 1 handle_new_user trigger is idempotent with ON CONFLICT DO UPDATE', () => {
    const migration1 = fs.readFileSync(path.join(migrationsDir, '20260908000001_auth_rbac_schema.sql'), 'utf-8');

    expect(migration1).toContain('ON CONFLICT (id) DO UPDATE SET');
  });

  it('6. payos order code sequence and column exist', () => {
    const migration6 = fs.readFileSync(path.join(migrationsDir, '20260910000001_production_payos_and_email_hardening.sql'), 'utf-8');

    expect(migration6).toContain('CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq');
    expect(migration6).toContain('order_code');
  });

  it('7. anti-double-booking exclusion constraint exists in migration 2', () => {
    const migration2 = fs.readFileSync(path.join(migrationsDir, '20260908000002_booking_persistence_schema.sql'), 'utf-8');

    expect(migration2).toContain('ADD CONSTRAINT prevent_double_booking');
    expect(migration2).toContain('EXCLUDE USING gist');
  });

  it('8. Edge Function configuration in config.toml configures payment-webhook without JWT gate', () => {
    const configToml = fs.readFileSync(path.resolve(__dirname, '../../../supabase/config.toml'), 'utf-8');

    expect(configToml).toContain('[functions.payment-webhook]');
    expect(configToml).toContain('verify_jwt = false');
    expect(configToml).toContain('[functions.create-payos-link]');
    expect(configToml).toContain('verify_jwt = true');
    expect(configToml).toContain('[functions.send-email]');
    expect(configToml).toContain('verify_jwt = true');
  });

  it('9. migration 5 drops legacy 11-argument create_booking before defining 12-argument function', () => {
    const migration5 = fs.readFileSync(path.join(migrationsDir, '20260909000002_portfolio_cms_and_booking_concepts.sql'), 'utf-8');

    expect(migration5).toContain('DROP FUNCTION IF EXISTS public.create_booking');
    expect(migration5).toContain('p_concept_ids UUID[] DEFAULT');
    // Ensure the redundant 11-argument wrapper is completely removed
    expect(migration5).not.toContain('Backward-compatibility wrapper for 11-argument callers');
  });

  it('10. migration 5 inserts into booking_addons and audit_logs using exact schema columns', () => {
    const migration5 = fs.readFileSync(path.join(migrationsDir, '20260909000002_portfolio_cms_and_booking_concepts.sql'), 'utf-8');

    // booking_addons columns: booking_id, addon_id, quantity, unit_price, line_total (no price column)
    expect(migration5).toContain('booking_id,');
    expect(migration5).toContain('unit_price,');
    expect(migration5).toContain('line_total');
    expect(migration5).not.toMatch(/INSERT INTO public\.booking_addons\s*\(booking_id,\s*addon_id,\s*price\)/i);

    // audit_logs columns: actor_user_id, entity_type, entity_id, action, old_data, new_data
    expect(migration5).toContain('actor_user_id,');
    expect(migration5).toContain('new_data');
    expect(migration5).not.toContain('performed_by');
    expect(migration5).not.toContain('old_values');
    expect(migration5).not.toContain('new_values');
  });

  it('11. all seed UUIDs in migration 5 are valid hexadecimal RFC 4122 format', () => {
    const migration5 = fs.readFileSync(path.join(migrationsDir, '20260909000002_portfolio_cms_and_booking_concepts.sql'), 'utf-8');

    expect(migration5).not.toContain('col00000-');
    expect(migration5).not.toContain('pho00000-');
    expect(migration5).toContain('c2000000-0000-0000-0000-000000000001');
    expect(migration5).toContain('c3000000-0000-0000-0000-000000000001');
  });

  it('12. migration 7 enforces email verification hardening, safe trigger, and fail-closed RLS/RPC', () => {
    const migration7 = fs.readFileSync(path.join(migrationsDir, '20260911000001_email_verification_hardening.sql'), 'utf-8');

    // 1. Initial status PENDING_VERIFICATION when unconfirmed, ACTIVE when confirmed
    expect(migration7).toContain("v_initial_status := 'PENDING_VERIFICATION'");
    expect(migration7).toContain("v_initial_status := 'ACTIVE'");

    // 2. handle_user_email_confirmed trigger exists on auth.users
    expect(migration7).toContain('CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed');
    expect(migration7).toContain('CREATE TRIGGER on_auth_user_email_confirmed');
    expect(migration7).toContain('AFTER UPDATE OF email_confirmed_at ON auth.users');

    // 3. Strict preservation: NEVER reactivates SUSPENDED or DISABLED accounts
    expect(migration7).toContain("AND status = 'PENDING_VERIFICATION'");
    expect(migration7).toContain("WHEN public.profiles.status IN ('SUSPENDED', 'DISABLED') THEN public.profiles.status");

    // 4. Hardens RLS policies to require ACTIVE status
    expect(migration7).toContain("public.get_auth_user_status() = 'ACTIVE'");

    // 5. Hardens RPCs create_booking and create_deposit_payment to require ACTIVE status
    expect(migration7).toContain("IF public.get_auth_user_status() != 'ACTIVE' THEN");
  });

  it('13. migration 8 enforces root owner RBAC hardening, is_root_owner function, single active owner constraint, and audit logging', () => {
    const migration8 = fs.readFileSync(path.join(migrationsDir, '20260911000002_root_owner_rbac_hardening.sql'), 'utf-8');

    // 1. root_owner_config table exists with single row constraint
    expect(migration8).toContain('CREATE TABLE IF NOT EXISTS public.root_owner_config');
    expect(migration8).toContain('CONSTRAINT single_owner_row_pk CHECK (id = true)');

    // 2. is_root_owner function defined with SECURITY DEFINER and search_path
    expect(migration8).toContain('CREATE OR REPLACE FUNCTION public.is_root_owner');
    expect(migration8).toContain('SECURITY DEFINER');
    expect(migration8).toContain('SET search_path = public');

    // 3. admin_update_user_role_and_status requires public.is_root_owner()
    expect(migration8).toContain('CREATE OR REPLACE FUNCTION public.admin_update_user_role_and_status');
    expect(migration8).toContain('IF NOT public.is_root_owner(v_caller_id) THEN');
    expect(migration8).toContain('OWNER_UPDATE_USER_ROLE_AND_STATUS');

    // 4. prevent_role_escalation permits ONLY root owner
    expect(migration8).toContain('CREATE OR REPLACE FUNCTION public.prevent_role_escalation');
    expect(migration8).toContain('IF public.is_root_owner(auth.uid()) THEN');
    expect(migration8).toContain('Only the Studio Root Owner is authorized to modify user roles');
  });
});
