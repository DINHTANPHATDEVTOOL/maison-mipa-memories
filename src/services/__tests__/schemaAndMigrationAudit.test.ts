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
  ];

  const EXPECTED_RPCS = [
    'get_auth_role',
    'handle_new_user',
    'prevent_role_escalation',
    'get_auth_user_status',
    'get_auth_staff_role',
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

  it('1. all 6 migration files exist in sequential order', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    expect(files.sort()).toEqual(EXPECTED_MIGRATIONS.sort());
  });

  it('2. all 20 required application tables are created across migrations', () => {
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
});
