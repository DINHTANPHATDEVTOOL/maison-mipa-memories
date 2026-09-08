// ==============================================================================
// Maison MIPA Memories - Supabase Client Initialization
// ==============================================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Returns true if Supabase URL and Anon Key are validly set in environment.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20 &&
    !supabaseUrl.includes('your-project-id')
  );
};

/**
 * Returns true if Demo Mode is explicitly enabled via environment variable
 * or running under test mode for automated test suites.
 * Default is FALSE in production.
 */
export const isDemoModeEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_DEMO_MODE === 'true' || import.meta.env.MODE === 'test';
};

// Fallback dummy URL and Anon Key for unconfigured development/test environments
// to prevent runtime crash during initialization
const resolvedUrl = isSupabaseConfigured()
  ? supabaseUrl
  : 'https://placeholder-mipa.supabase.co';

const resolvedAnonKey = isSupabaseConfigured()
  ? supabaseAnonKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-mipa-anon-key';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  resolvedUrl,
  resolvedAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
