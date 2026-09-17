// ==============================================================================
// Maison MIPA Memories — Runtime Production Health & Config Diagnostics
// Checks presence and availability of client services WITHOUT leaking secrets.
// ==============================================================================

import { isSupabaseConfigured, isDemoModeEnabled } from '../lib/supabase';
import { monitoring } from './monitoring';

export interface SystemHealthReport {
  supabase: 'OK' | 'NOT_CONFIGURED';
  demoMode: boolean;
  monitoring: 'ENABLED' | 'DISABLED';
  storageAvailable: boolean;
  online: boolean;
  timestamp: string;
}

/**
 * Performs client-safe diagnostic health check.
 * NEVER returns secret values or tokens.
 */
export function getSystemHealthReport(): SystemHealthReport {
  let storageOk = false;
  try {
    const testKey = '__mipa_health_test__';
    sessionStorage.setItem(testKey, '1');
    sessionStorage.removeItem(testKey);
    storageOk = true;
  } catch {
    storageOk = false;
  }

  return {
    supabase: isSupabaseConfigured() ? 'OK' : 'NOT_CONFIGURED',
    demoMode: isDemoModeEnabled(),
    monitoring: monitoring.isMonitoringEnabled() ? 'ENABLED' : 'DISABLED',
    storageAvailable: storageOk,
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    timestamp: new Date().toISOString(),
  };
}
