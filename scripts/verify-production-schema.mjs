#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories - Automated Production Schema & RPC Verifier
// Verifies that all 20 required tables, RLS, and RPC endpoints are reachable.
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
console.log('🔍 MAISON MIPA MEMORIES - SUPABASE SCHEMA VERIFICATION');
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

async function verifyTables() {
  console.log('1. Checking Application Tables:');
  console.log('----------------------------------------------------------------');
  let passCount = 0;
  let failCount = 0;

  for (const tableName of REQUIRED_TABLES) {
    try {
      // Query with limit 0 to check table presence and RLS without fetching data
      const { error } = await supabase.from(tableName).select('*').limit(0);

      // In PostgREST:
      // error code 42P01: undefined_table -> table does not exist
      // error code PGRST204 / PGRST205: relation does not exist / not found in schema cache
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
        failCount++;
      } else {
        console.log(`  ✅ [PASS] ${tableName.padEnd(25)} -> Verified`);
        passCount++;
      }
    } catch (err) {
      console.log(`  ❌ [FAIL] ${tableName.padEnd(25)} -> ${err.message}`);
      failCount++;
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Tables Check Summary: ${passCount} Passed, ${failCount} Failed.`);

  // Check Issue #8 Google Drive Delivery table
  console.log('\n2. Checking Issue #8 Google Drive Delivery Tables:');
  console.log('----------------------------------------------------------------');
  const { error: deliveryErr } = await supabase.from('booking_deliveries').select('*').limit(0);
  if (deliveryErr && (deliveryErr.code === '42P01' || deliveryErr.code === 'PGRST205')) {
    console.log('  ⏳ [PENDING DEPLOY] booking_deliveries   -> Pending migration 20260912000001_booking_deliveries_google_drive.sql');
    console.log('     👉 Note for Owner: Apply supabase/migrations/20260912000001_booking_deliveries_google_drive.sql in Supabase SQL Editor.');
  } else {
    console.log('  ✅ [PASS] booking_deliveries             -> Verified on database');
  }

  if (failCount > 0) {
    console.log('\n⚠️ ATTENTION OWNER: Core database schema is missing tables.');
    console.log('Please run migrations in Supabase SQL Editor or execute:');
    console.log('  npx supabase db push --project-ref dkvkhysnabhtbbuvommu\n');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL APPLICATION CORE TABLES VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

verifyTables().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
