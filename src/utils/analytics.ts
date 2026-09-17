// ==============================================================================
// Maison MIPA Memories — Privacy-Safe Product Analytics
// Consultation-First Funnel • Zero Web Payment Tracking • Zero PII
// ==============================================================================

import { redactSensitiveData } from './privacyFilter';
import { logger } from './logger';

export type AnalyticsEventType =
  | 'page_view'
  | 'view_service'
  | 'view_package'
  | 'view_portfolio'
  | 'select_service'
  | 'select_package'
  | 'select_concept'
  | 'select_addon'
  | 'booking_started'
  | 'slot_selected'
  | 'booking_auth_required'
  | 'consultation_submitted'
  | 'consultation_started_admin'
  | 'manual_deposit_confirmed_admin'
  | 'booking_confirmed'
  | 'proof_gallery_opened'
  | 'proof_selected'
  | 'photo_selection_submitted'
  | 'delivery_opened';

const PROHIBITED_PAYMENT_KEYWORDS = ['payos', 'vietqr', 'payment_checkout', 'deposit_paid', 'stripe'];
const PROHIBITED_PII_KEYS = ['name', 'email', 'phone', 'customer_note', 'note', 'drive_url', 'drive_link', 'password'];

class AnalyticsTracker {
  private enabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const consent = localStorage.getItem('mipa_analytics_consent');
      if (consent === 'denied') {
        this.enabled = false;
      }
    }
  }

  setConsent(allowed: boolean): void {
    this.enabled = allowed;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mipa_analytics_consent', allowed ? 'granted' : 'denied');
    }
  }

  isConsentGranted(): boolean {
    return this.enabled;
  }

  track(event: AnalyticsEventType, properties?: Record<string, any>): void {
    if (!this.enabled) return;

    // Reject prohibited payment events or keywords
    const lowerEvent = event.toLowerCase();
    if (PROHIBITED_PAYMENT_KEYWORDS.some((kw) => lowerEvent.includes(kw))) {
      logger.warn('Analytics', `Blocked deprecated payment analytics event: ${event}`);
      return;
    }

    // Sanitize and filter properties
    const safeProps: Record<string, any> = {};
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        const lowerKey = key.toLowerCase();
        // Drop any PII key
        if (PROHIBITED_PII_KEYS.some((pii) => lowerKey.includes(pii))) {
          continue;
        }
        safeProps[key] = redactSensitiveData(value);
      }
    }

    logger.debug('Analytics', `[Event: ${event}]`, safeProps);
  }
}

export const analytics = new AnalyticsTracker();
