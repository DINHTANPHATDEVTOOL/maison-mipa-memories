#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories - Automated Production Schema & RPC Verifier
// Honest verification of tables, column contracts, RPC endpoints, and migration status.
// Never false-passes unexpected network, JWT, or database errors.
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

export const REQUIRED_TABLES = [
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
  'booking_deliveries',
  'google_drive_integrations',
  'google_drive_oauth_states',
  // Shoot-to-delivery
  'booking_proof_images',
  'booking_photo_selections',
  // CRM & BI
  'customer_crm_profiles',
  'crm_tags',
  'crm_customer_tags',
  'crm_interactions',
  'crm_follow_up_tasks',
  'booking_status_history',
  'booking_financial_transactions',
  // Workforce & Ops
  'staff_skills',
  'employee_skills',
  'staff_working_hours',
  'staff_leave_requests',
  'staff_shifts',
  'booking_crew_requirements',
  // Resource Planning
  'resource_categories',
  'studio_resources',
  'booking_resource_reservations',
  'booking_resource_handoffs',
  'resource_maintenance',
  'resource_incidents',
];

export const CONTRACT_CHECKS = [
  { table: 'addons', columns: 'duration_minutes', label: 'addons.duration_minutes' },
  {
    table: 'promotions',
    columns: 'discount_percent, discount_amount, min_order, max_discount, usage_count, usage_limit, start_at, end_at, applicable_service_id',
    label: 'promotions (discount_percent, discount_amount, min_order, max_discount, usage_count, usage_limit, start_at, end_at, applicable_service_id)',
  },
  { table: 'packages', columns: 'concepts_count', label: 'packages.concepts_count' },
  { table: 'studio_rooms', columns: 'active', label: 'studio_rooms.active' },
  {
    table: 'bookings',
    columns: 'deposit_amount, deposit_confirmed_at, deposit_confirmed_by, deposit_note',
    label: 'bookings.deposit_fields (deposit_amount, deposit_confirmed_at, deposit_confirmed_by, deposit_note)',
  },
  {
    table: 'audit_logs',
    columns: 'actor_id, actor_role',
    label: 'audit_logs.actor_columns (actor_id, actor_role)',
  },
  {
    table: 'staff_skills',
    columns: 'active',
    label: 'staff_skills.active',
  },
  {
    table: 'staff_working_hours',
    columns: 'timezone',
    label: 'staff_working_hours.timezone',
  },
  {
    table: 'resource_categories',
    columns: 'active, is_consumable',
    label: 'resource_categories (active, is_consumable)',
  },
  {
    table: 'studio_resources',
    columns: 'next_maintenance_date, props_metadata',
    label: 'studio_resources (next_maintenance_date, props_metadata)',
  },
  {
    table: 'booking_assignments',
    columns: 'notes, slot_index',
    label: 'booking_assignments (notes, slot_index)',
  },
];

export const CORE_RPCS = [
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
  {
    name: 'update_booking_consultation',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_status: 'CONSULTING',
    },
  },
  {
    name: 'confirm_booking_deposit',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_deposit_amount: 100000,
    },
  },
  {
    name: 'update_booking_status',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_new_status: 'CONFIRMED',
    },
  },
  {
    name: 'get_booking_delivery_secure',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
    },
  },
  // Shoot-to-Delivery
  {
    name: 'check_in_booking',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000' },
  },
  {
    name: 'start_booking_shoot',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000' },
  },
  {
    name: 'complete_booking_shoot',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000' },
  },
  {
    name: 'submit_photo_selection',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_selected_proof_ids: [],
    },
  },
  {
    name: 'reopen_photo_selection',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000', p_reason: 'QA Audit' },
  },
  {
    name: 'complete_booking_editing',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000' },
  },
  {
    name: 'request_booking_revision',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000', p_revision_notes: 'QA Audit' },
  },
  {
    name: 'complete_booking',
    params: { p_booking_id: '00000000-0000-0000-0000-000000000000' },
  },
  // CRM & BI
  {
    name: 'record_booking_payment_receipt',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_transaction_type: 'DEPOSIT',
      p_direction: 'INFLOW',
      p_amount: 100000,
    },
  },
  { name: 'get_crm_customers', params: {} },
  {
    name: 'get_customer_360',
    params: { p_customer_id: '00000000-0000-0000-0000-000000000000' },
  },
  { name: 'get_crm_dashboard_summary', params: {} },
  { name: 'get_booking_funnel_metrics', params: {} },
  { name: 'get_service_performance', params: {} },
  { name: 'get_concept_performance', params: {} },
  { name: 'get_studio_utilization_metrics', params: {} },
  // Workforce & Resource Operations
  {
    name: 'assign_booking_staff_v2',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_employee_id: '00000000-0000-0000-0000-000000000000',
      p_assignment_role: 'PHOTOGRAPHER',
      p_start_at: '2026-09-18T09:00:00Z',
      p_end_at: '2026-09-18T11:00:00Z',
    },
  },
  {
    name: 'get_available_staff_for_booking',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_assignment_role: 'PHOTOGRAPHER',
    },
  },
  {
    name: 'approve_staff_leave',
    params: { p_leave_id: '00000000-0000-0000-0000-000000000000' },
  },
  {
    name: 'reject_staff_leave',
    params: { p_leave_id: '00000000-0000-0000-0000-000000000000' },
  },
  {
    name: 'reserve_booking_resource',
    params: {
      p_booking_id: '00000000-0000-0000-0000-000000000000',
      p_resource_id: '00000000-0000-0000-0000-000000000000',
    },
  },
  {
    name: 'checkout_booking_resource',
    params: {
      p_reservation_id: '00000000-0000-0000-0000-000000000000',
      p_received_by_staff: '00000000-0000-0000-0000-000000000000',
    },
  },
  {
    name: 'return_booking_resource',
    params: {
      p_reservation_id: '00000000-0000-0000-0000-000000000000',
      p_condition_after: 'GOOD',
      p_damage_notes: 'None',
      p_is_damaged: false,
      p_damage_severity: 'NONE',
      p_damage_description: 'None',
      p_notes: 'Checked return',
      p_returned_by_staff: '00000000-0000-0000-0000-000000000000',
    },
  },
  {
    name: 'get_operations_calendar_events',
    params: {
      p_start_at: '2026-09-01T00:00:00Z',
      p_end_at: '2026-09-30T23:59:59Z',
    },
  },
  {
    name: 'get_daily_operations_board',
    params: {
      p_target_date: '2026-09-18',
    },
  },
];

// Documented production verified migrations set
export const DOCUMENTED_PRODUCTION_VERIFIED = [
  '20260908000001_auth_rbac_schema.sql',
  '20260908000002_booking_persistence_schema.sql',
  '20260908000003_otp_payment_schema.sql',
  '20260909000001_production_core_hardening.sql',
  '20260909000002_portfolio_cms_and_booking_concepts.sql',
  '20260910000001_production_payos_and_email_hardening.sql',
];

/**
 * Classifies table verification result:
 * - error === null -> 'PASS'
 * - error.code === '42501' -> 'VERIFIED_RESTRICTED'
 * - any other error (network, JWT, timeout, not found) -> 'FAIL'
 */
export function classifyTableResult(error) {
  if (!error) {
    return { status: 'PASS', isPass: true, message: 'Verified' };
  }
  if (error.code === '42501') {
    return { status: 'VERIFIED_RESTRICTED', isPass: true, message: 'Verified (RLS active, permission restricted)' };
  }
  if (
    error.code === '42P01' ||
    error.code === 'PGRST204' ||
    error.code === 'PGRST205' ||
    error.message?.includes('schema cache') ||
    error.message?.includes('relation') ||
    error.message?.includes('does not exist')
  ) {
    return { status: 'FAIL', isPass: false, message: `Table not found in database: ${error.message || error.code}` };
  }
  return { status: 'FAIL', isPass: false, message: `Unexpected error (cannot verify): ${error.message || error.code}` };
}

/**
 * Classifies schema column contract result:
 * - error === null -> 'PASS'
 * - any error -> 'FAIL' (never marks permission or network errors PASS)
 */
export function classifyColumnResult(error) {
  if (!error) {
    return { status: 'PASS', isPass: true, message: 'Verified' };
  }
  if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
    return { status: 'FAIL', isPass: false, message: `Column missing: ${error.message}` };
  }
  return { status: 'FAIL', isPass: false, message: `[UNVERIFIED] Column contract check failed: ${error.message || error.code}` };
}

/**
 * Classifies RPC execution/existence result:
 * - error === null -> 'PASS'
 * - Missing function (PGRST202, 42883, 'Could not find the function', 'schema cache') -> 'MISSING' (FAIL)
 * - Expected runtime errors that prove function exists (42501, P0002, P0003, P0004, 23502, 23503, 23P01) -> 'EXISTS' (PASS)
 * - Unknown (network, timeout, connection) -> 'FAIL' / 'UNVERIFIED'
 */
export function classifyRpcResult(error) {
  if (!error) {
    return { status: 'PASS', isPass: true, message: 'Reachable' };
  }
  if (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    error.message?.includes('Could not find the function') ||
    error.message?.includes('schema cache')
  ) {
    return { status: 'MISSING', isPass: false, message: `RPC not found in schema cache: ${error.message || error.code}` };
  }
  if (
    error.code === '42501' ||
    error.code === 'P0002' ||
    error.code === 'P0003' ||
    error.code === 'P0004' ||
    error.code === '23502' ||
    error.code === '23503' ||
    error.code === '23P01' ||
    error.message?.includes('Unauthorized') ||
    error.message?.includes('violates')
  ) {
    return { status: 'EXISTS', isPass: true, message: `Exists (Runtime response: ${error.code} - ${error.message})` };
  }
  return { status: 'FAIL', isPass: false, message: `[UNVERIFIED] RPC check unexpected error: ${error.message || error.code}` };
}

/**
 * Classifies local migration list against documented remote verification history
 */
export function classifyMigrations(localFiles, verifiedHistory) {
  const verifiedSet = new Set(verifiedHistory);
  const historyVerified = [];
  const historyNotVerified = [];

  for (const m of localFiles) {
    if (verifiedSet.has(m)) {
      historyVerified.push(m);
    } else {
      historyNotVerified.push(m);
    }
  }

  return {
    localMigrations: localFiles,
    historyVerified,
    historyNotVerified,
  };
}

class DummyWS {}

export async function verifyAll() {
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

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    realtime: { transport: DummyWS },
  });

  let totalFails = 0;

  // 1. Check Tables
  console.log('1. Checking Application Tables:');
  console.log('----------------------------------------------------------------');
  let tablePass = 0;
  let tableFail = 0;

  for (const tableName of REQUIRED_TABLES) {
    try {
      const { error } = await supabase.from(tableName).select('*').limit(0);
      const result = classifyTableResult(error);
      if (result.isPass) {
        console.log(`  ✅ [${result.status}] ${tableName.padEnd(25)} -> ${result.message}`);
        tablePass++;
      } else {
        console.log(`  ❌ [FAIL] ${tableName.padEnd(25)} -> ${result.message}`);
        tableFail++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${tableName.padEnd(25)} -> ${err.message}`);
      tableFail++;
    }
  }
  totalFails += tableFail;
  console.log(`Tables Summary: ${tablePass}/${REQUIRED_TABLES.length} Passed, ${tableFail} Failed.\n`);

  // 2. Check Column Contracts
  console.log('2. Checking Schema Contract Columns:');
  console.log('----------------------------------------------------------------');
  let colPass = 0;
  let colFail = 0;

  for (const check of CONTRACT_CHECKS) {
    try {
      const { error } = await supabase.from(check.table).select(check.columns).limit(0);
      const result = classifyColumnResult(error);
      if (result.isPass) {
        console.log(`  ✅ [PASS] ${check.label}`);
        colPass++;
      } else {
        console.log(`  ❌ [FAIL] ${check.label} -> ${result.message}`);
        colFail++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${check.label} -> ${err.message}`);
      colFail++;
    }
  }
  totalFails += colFail;
  console.log(`Contract Columns Summary: ${colPass}/${CONTRACT_CHECKS.length} Passed, ${colFail} Failed.\n`);

  // 3. Check RPC Endpoints
  console.log('3. Checking RPC Endpoints:');
  console.log('----------------------------------------------------------------');
  let rpcPass = 0;
  let rpcFail = 0;

  for (const rpc of CORE_RPCS) {
    try {
      const { error } = await supabase.rpc(rpc.name, rpc.params);
      const result = classifyRpcResult(error);
      if (result.isPass) {
        console.log(`  ✅ [${result.status}] ${rpc.name.padEnd(25)} -> ${result.message}`);
        rpcPass++;
      } else {
        console.log(`  ❌ [FAIL] ${rpc.name.padEnd(25)} -> ${result.message}`);
        rpcFail++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${rpc.name.padEnd(25)} -> ${err.message}`);
      rpcFail++;
    }
  }
  totalFails += rpcFail;
  console.log(`Core RPCs Summary: ${rpcPass}/${CORE_RPCS.length} Exists/Reachable, ${rpcFail} Failed.\n`);

  // 4. Migration Audit
  console.log('4. Migration Audit:');
  console.log('----------------------------------------------------------------');
  const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
  const localMigrations = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    : [];

  const { historyVerified, historyNotVerified } = classifyMigrations(localMigrations, DOCUMENTED_PRODUCTION_VERIFIED);

  console.log(`LOCAL_MIGRATIONS (${localMigrations.length}):`);
  for (const m of localMigrations) {
    const isVerified = historyVerified.includes(m);
    console.log(`  ${isVerified ? '✅' : '⏳'} ${m} [${isVerified ? 'HISTORY_VERIFIED' : 'HISTORY_NOT_VERIFIED'}]`);
  }

  console.log(`\nHISTORY_VERIFIED: ${historyVerified.length} migrations`);
  console.log(`HISTORY_NOT_VERIFIED: ${historyNotVerified.length} migrations (Migration history must be confirmed with Supabase CLI \`supabase migration list\` using authenticated project access.)`);

  const externalMigrationHistory = process.env.MIGRATION_HISTORY || (process.argv.includes('--verified-history') ? 'VERIFIED' : null);
  const migrationHistoryStatus = externalMigrationHistory || 'UNVERIFIED';

  console.log('\n================================================================');
  console.log('VERIFIER SUMMARY:');
  console.log(`TABLES=${tablePass}/${REQUIRED_TABLES.length} ${tableFail === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`COLUMN_CONTRACTS=${colPass}/${CONTRACT_CHECKS.length} ${colFail === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`CORE_RPCS=${rpcPass}/${CORE_RPCS.length} ${rpcFail === 0 ? 'EXISTS' : 'FAIL'}`);
  console.log(`MIGRATION_HISTORY=${migrationHistoryStatus}`);
  console.log('================================================================\n');

  if (totalFails > 0) {
    console.log(`❌ SCHEMA RUNTIME CHECKS FAILED: ${totalFails} check(s) failed.`);
    process.exit(1);
  } else {
    console.log('SCHEMA_RUNTIME_CHECKS=PASS');
    console.log(`MIGRATION_HISTORY=${migrationHistoryStatus}\n`);
    if (migrationHistoryStatus !== 'VERIFIED') {
      console.log('Note: To verify migration history, run `supabase migration list` with authenticated project access.');
    }
    process.exit(0);
  }
}

// Execute verifyAll if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  verifyAll().catch((err) => {
    console.error('Fatal verification error:', err);
    process.exit(1);
  });
}
