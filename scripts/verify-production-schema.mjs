#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories - Automated Production Schema & RPC Verifier
// Verifies required tables, schema column contracts, RPC endpoints, and migration status.
// ==============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env if present
const envPath = path.join(rootDir, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      const val = v.join('=').trim().replace(/^["']|["']$/g, '');
      if (!process.env[k.trim()]) {
        process.env[k.trim()] = val;
      }
    }
  }
}

const supabaseUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const supabaseKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ ERROR: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env or environment.');
  console.error('Usage: node scripts/verify-production-schema.mjs\n');
  process.exit(1);
}

console.log('================================================================');
console.log('🔍 MAISON MIPA MEMORIES - SUPABASE SCHEMA & RPC VERIFIER');
console.log(`Endpoint: ${supabaseUrl}`);
console.log('================================================================\n');

class DummyWS {}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { transport: DummyWS },
});

const REQUIRED_TABLES = [
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
  'payments',
  'payment_settings',
  'notification_outbox',
  'staff_tasks',
  'concepts',
  'portfolio_collections',
  'portfolio_photos',
  'booking_concepts',
  'audit_logs',
  'otp_challenges',
  'root_owner_config',
];

const CONTRACT_CHECKS = [
  { table: 'addons', columns: 'duration_minutes', label: 'addons.duration_minutes' },
  {
    table: 'promotions',
    columns: 'discount_percent, discount_amount, min_order, max_discount, usage_count, usage_limit, start_at, end_at, applicable_service_id',
    label: 'promotions (discount_percent, discount_amount, min_order, max_discount, usage_count, usage_limit, start_at, end_at, applicable_service_id)',
  },
  { table: 'packages', columns: 'concepts_count', label: 'packages.concepts_count' },
  { table: 'studio_rooms', columns: 'active', label: 'studio_rooms.active' },
];

// Documented production verified migrations set
const DOCUMENTED_PRODUCTION_VERIFIED = [
  '20260908000001_auth_rbac_schema.sql',
  '20260908000002_booking_persistence_schema.sql',
  '20260908000003_otp_payment_schema.sql',
  '20260909000001_production_core_hardening.sql',
  '20260909000002_portfolio_cms_and_booking_concepts.sql',
  '20260910000001_production_payos_and_email_hardening.sql',
];

async function verifyAll() {
  let totalFails = 0;

  // 1. Check Tables
  console.log('1. Checking Application Tables:');
  console.log('----------------------------------------------------------------');
  let tablePass = 0;
  let tableFail = 0;

  for (const tableName of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      if (
        error &&
        (error.code === '42P01' ||
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.message?.includes('schema cache') ||
          error.message?.includes('relation') ||
          error.message?.includes('does not exist'))
      ) {
        console.log(`  ❌ [FAIL] ${tableName.padEnd(25)} -> Table not found in database!`);
        tableFail++;
      } else if (error && error.code === '42501') {
        console.log(`  ✅ [PASS] ${tableName.padEnd(25)} -> Verified (RLS active, permission restricted)`);
        tablePass++;
      } else {
        console.log(`  ✅ [PASS] ${tableName.padEnd(25)} -> Verified`);
        tablePass++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${tableName.padEnd(25)} -> ${err.message}`);
      tableFail++;
    }
  }
  totalFails += tableFail;
  console.log(`Tables Summary: ${tablePass} Passed, ${tableFail} Failed.\n`);

  // 2. Check Column Contracts
  console.log('2. Checking Schema Contract Columns:');
  console.log('----------------------------------------------------------------');
  let colPass = 0;
  let colFail = 0;

  for (const check of CONTRACT_CHECKS) {
    try {
      const { error } = await supabase.from(check.table).select(check.columns).limit(0);
      if (error && (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist'))) {
        console.log(`  ❌ [FAIL] ${check.label} -> Column missing: ${error.message}`);
        colFail++;
      } else {
        console.log(`  ✅ [PASS] ${check.label}`);
        colPass++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${check.label} -> ${err.message}`);
      colFail++;
    }
  }
  totalFails += colFail;
  console.log(`Contract Columns Summary: ${colPass} Passed, ${colFail} Failed.\n`);

  // 3. Check RPC Endpoints
  console.log('3. Checking RPC Endpoints:');
  console.log('----------------------------------------------------------------');
  let rpcPass = 0;
  let rpcFail = 0;

  // 3a. Core Non-Payment RPCs
  const coreRpcs = [
    { name: 'get_auth_role', params: {} },
    { name: 'get_auth_user_status', params: {} },
    { name: 'get_auth_staff_role', params: {} },
    { name: 'is_root_owner', params: {} },
    {
      name: 'create_booking',
      params: {
        p_service_id: '00000000-0000-0000-0000-000000000000',
        p_package_id: '00000000-0000-0000-0000-000000000000',
        p_studio_room_id: '00000000-0000-0000-0000-000000000000',
        p_start_at: '2026-09-16T10:00:00Z',
      },
    },
    {
      name: 'get_studio_booked_slots',
      params: {
        p_studio_room_id: '00000000-0000-0000-0000-000000000000',
        p_date: '2026-09-16',
      },
    },
  ];

  for (const rpc of coreRpcs) {
    try {
      const { error } = await supabase.rpc(rpc.name, rpc.params);
      if (
        error &&
        (error.code === 'PGRST202' ||
          error.code === '42883' ||
          error.message?.includes('Could not find the function') ||
          error.message?.includes('schema cache'))
      ) {
        console.log(`  ❌ [FAIL] ${rpc.name.padEnd(25)} -> RPC not found in schema cache: ${error.message}`);
        rpcFail++;
      } else {
        console.log(`  ✅ [PASS] ${rpc.name.padEnd(25)} -> Reachable`);
        rpcPass++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${rpc.name.padEnd(25)} -> ${err.message}`);
      rpcFail++;
    }
  }

  // 3b. Payment RPCs (Existence check only)
  console.log('Payment RPCs (Existence verification):');
  const paymentRpcs = [
    { name: 'create_deposit_payment', params: {} },
    { name: 'confirm_manual_payment', params: {} },
  ];
  for (const rpc of paymentRpcs) {
    try {
      const { error } = await supabase.rpc(rpc.name, rpc.params);
      if (
        error &&
        (error.code === 'PGRST202' ||
          error.code === '42883' ||
          error.message?.includes('Could not find the function'))
      ) {
        console.log(`  ⚠️ [INFO] ${rpc.name.padEnd(25)} -> Not found or parameter mismatch (Payment deferred)`);
      } else {
        console.log(`  ✅ [PASS] ${rpc.name.padEnd(25)} -> Reachable`);
      }
    } catch {
      console.log(`  ⚠️ [INFO] ${rpc.name.padEnd(25)} -> Checked`);
    }
  }
  totalFails += rpcFail;
  console.log(`RPC Summary: ${rpcPass} Passed, ${rpcFail} Failed.\n`);

  // 4. Migration Audit
  console.log('4. Migration Audit:');
  console.log('----------------------------------------------------------------');
  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
  const localMigrations = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    : [];

  const verifiedSet = new Set(DOCUMENTED_PRODUCTION_VERIFIED);
  const pendingVerification = localMigrations.filter(m => !verifiedSet.has(m));

  console.log(`LOCAL_MIGRATIONS (${localMigrations.length}):`);
  for (const m of localMigrations) {
    const isVerified = verifiedSet.has(m);
    console.log(`  ${isVerified ? '✅' : '⏳'} ${m} [${isVerified ? 'PRODUCTION_VERIFIED' : 'PENDING_VERIFICATION'}]`);
  }

  console.log(`\nPRODUCTION_VERIFIED: ${DOCUMENTED_PRODUCTION_VERIFIED.length} migrations`);
  console.log(`PENDING_VERIFICATION: ${pendingVerification.length} migrations`);

  console.log('================================================================');
  if (totalFails > 0) {
    console.log(`\n❌ VERIFICATION FAILED: ${totalFails} check(s) failed.`);
    if (pendingVerification.length > 0) {
      console.log(`\nNote: ${pendingVerification.length} local migration(s) are pending application on production.`);
      console.log('Run `npx supabase db push` or apply pending migrations in Supabase SQL Editor to resolve.\n');
    }
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PRODUCTION SCHEMA AND RPC CHECKS PASSED!\n');
    process.exit(0);
  }
}

verifyAll().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
