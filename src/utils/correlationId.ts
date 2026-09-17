// ==============================================================================
// Maison MIPA Memories — Correlation ID Generator
// Generates safe, non-sensitive IDs to link client events, audit logs,
// backend operations, and monitoring telemetry without exposing secrets.
// ==============================================================================

export type CorrelationOperation =
  | 'booking_create'
  | 'consultation_update'
  | 'manual_deposit_confirm'
  | 'drive_provisioning'
  | 'proof_sync'
  | 'selection_submit'
  | 'final_delivery'
  | 'auth_action'
  | 'general';

/**
 * Generates a structured correlation ID:
 * Format: mipa_<op>_<timestamp36>_<random8>
 * Example: mipa_booking_create_lm47w2z_9f8a1c2d
 */
export function generateCorrelationId(op: CorrelationOperation | string = 'general'): string {
  const sanitizedOp = op.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 24);
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `mipa_${sanitizedOp}_${timestamp}_${randomPart}`;
}
