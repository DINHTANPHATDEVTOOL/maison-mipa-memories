// ==============================================================================
// Maison MIPA Memories - Supabase Edge Functions Deno Ambient Types
// Provides Deno namespace and URL module imports resolution for IDE language servers
// ==============================================================================

declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    toObject(): Record<string, string>;
  }

  export const env: Env;
}

declare module 'https://*' {
  const anyType: any;
  export default anyType;
  export const serve: any;
  export const createClient: any;
}
