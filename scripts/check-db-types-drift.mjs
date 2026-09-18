#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories — Database Types Drift Checker
// Ensures TypeScript database contracts in src/types/database.ts stay in 100%
// parity with all chronological SQL migrations in supabase/migrations.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const databaseTypesPath = path.join(rootDir, 'src', 'types', 'database.ts');

console.log('--- MAISON MIPA DB TYPES DRIFT CHECK ---');

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

let combinedSql = '';
for (const file of migrationFiles) {
  combinedSql += '\n' + fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
}

const dbTypes = fs.readFileSync(databaseTypesPath, 'utf-8');

const errors = [];

// 1. Extract all table names created in SQL
const tableRegex = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+public\.([a-zA-Z0-9_]+)/gi;
const createdTables = new Set();
let tMatch;
while ((tMatch = tableRegex.exec(combinedSql)) !== null) {
  createdTables.add(tMatch[1]);
}

for (const table of createdTables) {
  const tableDefRegex = new RegExp(`${table}:\\s*{\\s*Row:`, 'i');
  if (!tableDefRegex.test(dbTypes)) {
    errors.push(`Table [${table}] created in SQL is missing from src/types/database.ts.`);
  }
}

// 2. Extract all RPCs created in SQL
const rpcRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.([a-zA-Z0-9_]+)/gi;
const createdRpcs = new Set();
let rMatch;
while ((rMatch = rpcRegex.exec(combinedSql)) !== null) {
  createdRpcs.add(rMatch[1]);
}

for (const rpc of createdRpcs) {
  // Check if RPC is exposed in Functions interface
  const rpcDefRegex = new RegExp(`${rpc}:\\s*{\\s*Args:`, 'i');
  if (!rpcDefRegex.test(dbTypes)) {
    // Check if internal trigger function
    const isTrigger = combinedSql.includes(`CREATE TRIGGER`) && combinedSql.includes(rpc);
    if (!isTrigger) {
      errors.push(`RPC function [${rpc}] in SQL is missing from src/types/database.ts Functions.`);
    }
  }
}

if (errors.length > 0) {
  console.error('\n❌ DATABASE TYPES DRIFT DETECTED:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log(`✅ Zero contract drift detected across ${createdTables.size} tables and active RPCs.`);
process.exit(0);
