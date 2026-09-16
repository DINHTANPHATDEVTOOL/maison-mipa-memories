declare module '*/scripts/verify-production-schema.mjs' {
  export function classifyTableResult(error: any): { status: string; isPass: boolean; message?: string };
  export function classifyColumnResult(error: any): { status: string; isPass: boolean; message?: string };
  export function classifyRpcResult(error: any): { status: string; isPass: boolean; message?: string };
  export function classifyMigrations(localMigrations: string[], historyVerifiedMigrations: string[]): {
    historyVerified: string[];
    historyNotVerified: string[];
  };
}
