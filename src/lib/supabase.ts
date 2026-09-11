// ==============================================================================
// Maison MIPA Memories - Supabase Client Initialization
// ==============================================================================
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const rawSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

/**
 * Returns true if Supabase URL and Anon Key are validly set in environment.
 */
export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.startsWith('https://') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 20 &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder-mipa')
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

const isTestOrDemo = isDemoModeEnabled() || import.meta.env.MODE === 'test';

// Fail-closed production policy:
// In production without demo mode, never fallback to placeholder-mipa.supabase.co.
// The system fails explicitly with clear error indication if unconfigured.
const resolvedUrl = isSupabaseConfigured()
  ? supabaseUrl
  : isTestOrDemo
    ? 'https://placeholder-mipa.supabase.co'
    : 'https://unconfigured-production.invalid';

const resolvedAnonKey = isSupabaseConfigured()
  ? supabaseAnonKey
  : isTestOrDemo
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-mipa-anon-key'
    : 'unconfigured-production-anon-key';

if (!isSupabaseConfigured() && !isTestOrDemo && import.meta.env.PROD) {
  console.error(
    'CRITICAL CONFIGURATION ERROR: Supabase production credentials are missing. ' +
    'Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  );
}

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
