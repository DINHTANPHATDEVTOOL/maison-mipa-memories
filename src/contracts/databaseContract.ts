// ==============================================================================
// Maison MIPA Memories — Database Contract Manifest V4
// Authoritative expected contracts for tables, columns, relations, and RPC signatures.
// Single source of truth loaded from databaseContract.json
// ==============================================================================

import contractManifest from './databaseContract.json';

export interface TableContract {
  name: string;
  requiredColumns: string[];
}

export interface RpcContract {
  name: string;
  expectedArgs: {
    name: string;
    type?: string;
    required: boolean;
  }[];
  forbiddenParams?: string[];
}

export interface DatabaseContractManifest {
  version: string;
  tables: TableContract[];
  rpcs: RpcContract[];
}

export const ACTIVE_DATABASE_CONTRACTS: DatabaseContractManifest = contractManifest as DatabaseContractManifest;

export const DB_TABLE_CONTRACTS: Record<string, { columns: string[] }> = Object.fromEntries(
  ACTIVE_DATABASE_CONTRACTS.tables.map((t) => [t.name, { columns: t.requiredColumns }])
);

export const DB_RPC_CONTRACTS: Record<string, { arguments: string[]; forbidden?: string[] }> = Object.fromEntries(
  ACTIVE_DATABASE_CONTRACTS.rpcs.map((r) => [
    r.name,
    {
      arguments: r.expectedArgs.map((a) => a.name),
      forbidden: r.forbiddenParams,
    },
  ])
);
