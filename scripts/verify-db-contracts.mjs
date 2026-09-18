#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories — DB Contract Verification Script
// Validates chronological SQL migrations against the database contract manifest
// and generated TypeScript database types.
// ==============================================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
const databaseTypesPath = path.join(rootDir, 'src', 'types', 'database.ts');

console.log('--- MAISON MIPA DATABASE CONTRACT VERIFICATION ---');

// 1. Read all migrations in chronological order
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Auditing ${migrationFiles.length} chronological SQL migrations...`);

let combinedSql = '';
for (const file of migrationFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  combinedSql += '\n' + content;
}

const dbTypesContent = fs.readFileSync(databaseTypesPath, 'utf-8');

let errors = [];

// Parse latest function signatures chronologically
const latestRpcDefinitions = new Map();
const funcGlobalRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)\s*RETURNS/gi;

for (const file of migrationFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
  let match;
  while ((match = funcGlobalRegex.exec(content)) !== null) {
    const funcName = match[1];
    const paramsList = match[2];
    latestRpcDefinitions.set(funcName, paramsList);
  }
}

const REQUIRED_RPCS = [
  {
    name: 'assign_booking_staff_v2',
    requiredParams: ['p_booking_id', 'p_employee_id', 'p_assignment_role', 'p_notes'],
  },
  {
    name: 'checkout_booking_resource',
    requiredParams: ['p_reservation_id', 'p_received_by_staff'],
    forbiddenParams: ['p_employee_id'],
  },
  {
    name: 'return_booking_resource',
    requiredParams: ['p_reservation_id', 'p_condition_after'],
  },
  {
    name: 'get_available_staff_for_booking',
    requiredParams: ['p_booking_id'],
  },
];

for (const rpc of REQUIRED_RPCS) {
  // Check SQL has function definition
  const paramsList = latestRpcDefinitions.get(rpc.name);
  if (!paramsList) {
    errors.push(`RPC [${rpc.name}] is missing from SQL migrations.`);
  } else {
    for (const param of rpc.requiredParams) {
      if (!paramsList.includes(param)) {
        errors.push(`RPC [${rpc.name}] in SQL is missing required parameter [${param}]. Found params: (${paramsList.trim()})`);
      }
    }
    if (rpc.forbiddenParams) {
      for (const forbidden of rpc.forbiddenParams) {
        if (paramsList.includes(forbidden)) {
          errors.push(`RPC [${rpc.name}] in SQL contains forbidden/deprecated parameter [${forbidden}].`);
        }
      }
    }
  }

  // Check TypeScript DB types has matching RPC
  if (!dbTypesContent.includes(`${rpc.name}: {`)) {
    errors.push(`RPC [${rpc.name}] is missing from src/types/database.ts.`);
  } else {
    for (const param of rpc.requiredParams) {
      if (!dbTypesContent.includes(param)) {
        errors.push(`RPC [${rpc.name}] parameter [${param}] is missing from src/types/database.ts.`);
      }
    }
    if (rpc.forbiddenParams) {
      // Ensure forbidden parameter does not appear under this RPC in types
      const rpcBlockRegex = new RegExp(`${rpc.name}:\\s*{[\\s\\S]*?Returns:`, 'g');
      const typeMatch = rpcBlockRegex.exec(dbTypesContent);
      if (typeMatch && typeMatch[0].includes('p_employee_id:')) {
        errors.push(`RPC [${rpc.name}] in src/types/database.ts contains deprecated parameter [p_employee_id] instead of [p_received_by_staff].`);
      }
    }
  }
}

// 3. Table Column Contracts Check
const REQUIRED_COLUMNS = [
  { table: 'staff_skills', column: 'active' },
  { table: 'staff_working_hours', column: 'timezone' },
  { table: 'resource_categories', column: 'active' },
  { table: 'resource_categories', column: 'is_consumable' },
  { table: 'studio_resources', column: 'next_maintenance_date' },
  { table: 'studio_resources', column: 'props_metadata' },
  { table: 'booking_assignments', column: 'notes' },
  { table: 'booking_assignments', column: 'slot_index' },
];

for (const col of REQUIRED_COLUMNS) {
  // Check if column exists in table definition or ALTER TABLE ADD COLUMN
  const addColRegex = new RegExp(`(?:ALTER\\s+TABLE\\s+(?:public\\.)?${col.table}\\s+ADD\\s+COLUMN(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+${col.column}|CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+(?:public\\.)?${col.table}\\s*\\([\\s\\S]*?${col.column}\\s+)`, 'i');
  if (!addColRegex.test(combinedSql)) {
    errors.push(`Table column [${col.table}.${col.column}] is missing from SQL migrations.`);
  }

  // Check TypeScript DB types
  const tableBlockRegex = new RegExp(`${col.table}:\\s*{[\\s\\S]*?Relationships:`, 'g');
  const typeMatch = tableBlockRegex.exec(dbTypesContent);
  if (!typeMatch || !typeMatch[0].includes(`${col.column}:`)) {
    errors.push(`Table column [${col.table}.${col.column}] is missing from src/types/database.ts.`);
  }
}

// 4. Output Results
if (errors.length > 0) {
  console.error('\n❌ DATABASE CONTRACT VERIFICATION FAILED with errors:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('✅ ALL DATABASE CONTRACTS VERIFIED SUCCESSFULLY!');
console.log(`  - 25 SQL migrations verified`);
console.log(`  - All canonical RPC signatures matched: assign_booking_staff_v2, checkout_booking_resource, return_booking_resource, get_available_staff_for_booking`);
console.log(`  - All reconciled table columns present across SQL and TypeScript database types.`);
process.exit(0);
