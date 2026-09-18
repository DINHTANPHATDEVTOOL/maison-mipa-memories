#!/usr/bin/env node
// ==============================================================================
// Maison MIPA Memories — DB Contract Verification Script V4
// Single-sources from src/contracts/databaseContract.json.
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
const contractManifestPath = path.join(rootDir, 'src', 'contracts', 'databaseContract.json');

console.log('--- MAISON MIPA DATABASE CONTRACT VERIFICATION V4 ---');

// 1. Read Single Source of Truth Manifest
if (!fs.existsSync(contractManifestPath)) {
  console.error(`❌ Contract manifest not found at: ${contractManifestPath}`);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(contractManifestPath, 'utf-8'));
console.log(`Loaded canonical contract manifest version: ${manifest.version}`);
console.log(`Targeting ${manifest.tables.length} tables and ${manifest.rpcs.length} RPCs.`);

// 2. Read all migrations in chronological order
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

// 3. Verify RPC Contracts against Manifest
for (const rpc of manifest.rpcs) {
  const paramsList = latestRpcDefinitions.get(rpc.name);
  if (!paramsList) {
    errors.push(`RPC [${rpc.name}] from contract manifest is missing from SQL migrations.`);
  } else {
    for (const arg of rpc.expectedArgs) {
      if (!paramsList.includes(arg.name)) {
        errors.push(`RPC [${rpc.name}] in SQL is missing expected parameter [${arg.name}]. Found params: (${paramsList.trim()})`);
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
    errors.push(`RPC [${rpc.name}] is missing from src/types/database.ts Functions interface.`);
  } else {
    for (const arg of rpc.expectedArgs) {
      if (!dbTypesContent.includes(arg.name)) {
        errors.push(`RPC [${rpc.name}] parameter [${arg.name}] is missing from src/types/database.ts.`);
      }
    }
    if (rpc.forbiddenParams) {
      const rpcBlockRegex = new RegExp(`${rpc.name}:\\s*{[\\s\\S]*?Returns:`, 'i');
      const typeMatch = rpcBlockRegex.exec(dbTypesContent);
      for (const forbidden of rpc.forbiddenParams) {
        if (typeMatch && typeMatch[0].includes(`${forbidden}:`)) {
          errors.push(`RPC [${rpc.name}] in src/types/database.ts contains forbidden parameter [${forbidden}].`);
        }
      }
    }
  }
}

// 4. Verify Table Column Contracts against Manifest
for (const tableContract of manifest.tables) {
  const tableName = tableContract.name;
  const tableBlockRegex = new RegExp(`['"]?${tableName}['"]?:\\s*{[\\s\\S]*?Relationships:`, 'i');
  const tableMatch = tableBlockRegex.exec(dbTypesContent);
  const tableBlock = tableMatch ? tableMatch[0] : '';

  if (!tableBlock) {
    errors.push(`Table [${tableName}] is missing from src/types/database.ts.`);
  }

  for (const col of tableContract.requiredColumns) {
    // Check if column exists in table definition or ALTER TABLE ADD COLUMN in SQL
    const addColRegex = new RegExp(`(?:ALTER\\s+TABLE\\s+(?:public\\.)?${tableName}\\s+ADD\\s+COLUMN(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+${col}|CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+(?:public\\.)?${tableName}\\s*\\([\\s\\S]*?${col}\\s+)`, 'i');
    if (!addColRegex.test(combinedSql)) {
      errors.push(`Table column [${tableName}.${col}] is missing from SQL migrations.`);
    }

    // Check TypeScript DB types
    if (tableBlock && !tableBlock.includes(`${col}:`) && !tableBlock.includes(`${col}?:`)) {
      errors.push(`Table column [${tableName}.${col}] is missing from src/types/database.ts.`);
    }
  }
}

// 5. Verify Foreign Key Embedded Relations
const relationChecks = [
  { table: 'staff_leave_requests', fkColumn: 'employee_id', targetTable: 'profiles' },
  { table: 'booking_assignments', fkColumn: 'employee_id', targetTable: 'profiles' },
  { table: 'booking_resource_reservations', fkColumn: 'resource_id', targetTable: 'studio_resources' },
  { table: 'booking_resource_handoffs', fkColumn: 'reservation_id', targetTable: 'booking_resource_reservations' },
];

for (const rel of relationChecks) {
  const fkPattern = new RegExp(`${rel.fkColumn}\\s+UUID[\\s\\S]*?REFERENCES\\s+(?:public\\.)?${rel.targetTable}\\(id\\)`, 'i');
  if (!fkPattern.test(combinedSql)) {
    errors.push(`Foreign key relationship on table [${rel.table}.${rel.fkColumn} -> ${rel.targetTable}(id)] missing from SQL.`);
  }
}

// 6. Output Results
if (errors.length > 0) {
  console.error('\n❌ DATABASE CONTRACT VERIFICATION FAILED with errors:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('✅ ALL DATABASE CONTRACTS VERIFIED SUCCESSFULLY FROM SINGLE MANIFEST!');
console.log(`  - Migrations verified: ${migrationFiles.length} SQL migrations`);
console.log(`  - Manifest version: ${manifest.version}`);
console.log(`  - Tables audited: ${manifest.tables.length}`);
console.log(`  - Canonical RPCs validated: ${manifest.rpcs.map(r => r.name).join(', ')}`);
console.log(`  - Embedded relations verified: staff_leave_requests, booking_assignments, resources`);
process.exit(0);
