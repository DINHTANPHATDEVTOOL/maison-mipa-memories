// ==============================================================================
// Maison MIPA Memories — Observability & Monitoring Abstraction
// Vendor-agnostic interface (supports Sentry or no-op fallback).
// Enforces PII and secret redaction before any payload leaves the client.
// ==============================================================================

import { redactSensitiveData } from './privacyFilter';
import { logger } from './logger';

export interface Breadcrumb {
  category: string;
  message: string;
  data?: Record<string, any>;
  level?: 'info' | 'warning' | 'error';
  timestamp?: number;
}

export interface UserContext {
  id?: string;
  role?: string;
}

export interface MonitoringAdapter {
  captureException(error: unknown, context?: Record<string, any>): void;
  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
  setUser(user: UserContext | null): void;
  trackEvent(eventName: string, data?: Record<string, any>): void;
}

class NoopMonitoringAdapter implements MonitoringAdapter {
  captureException(error: unknown, context?: Record<string, any>): void {
    logger.error('Monitoring', 'Exception captured (NoopAdapter)', { error, context });
  }

  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>): void {
    logger.info('Monitoring', `Message: [${level || 'info'}] ${message}`, context);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    logger.debug('Monitoring', `Breadcrumb: [${breadcrumb.category}] ${breadcrumb.message}`, breadcrumb.data);
  }

  setUser(user: UserContext | null): void {
    logger.debug('Monitoring', 'User context updated', user ? { id: user.id, role: user.role } : null);
  }

  trackEvent(eventName: string, data?: Record<string, any>): void {
    logger.debug('Monitoring', `Event: ${eventName}`, data);
  }
}

class MonitoringService implements MonitoringAdapter {
  private adapter: MonitoringAdapter;
  private isEnabled: boolean;

  constructor() {
    // Check if external monitoring (e.g. Sentry) is available and configured
    const sentryDsn = typeof import.meta !== 'undefined' ? (import.meta as any).env?.VITE_SENTRY_DSN : undefined;
    this.isEnabled = Boolean(sentryDsn);
    this.adapter = new NoopMonitoringAdapter();
  }

  setAdapter(adapter: MonitoringAdapter): void {
    this.adapter = adapter;
    this.isEnabled = true;
  }

  isMonitoringEnabled(): boolean {
    return this.isEnabled && !(this.adapter instanceof NoopMonitoringAdapter);
  }

  captureException(error: unknown, context?: Record<string, any>): void {
    const safeContext = context ? redactSensitiveData(context) : undefined;
    this.adapter.captureException(error, safeContext);
  }

  captureMessage(message: string, level?: 'info' | 'warning' | 'error', context?: Record<string, any>): void {
    const safeContext = context ? redactSensitiveData(context) : undefined;
    this.adapter.captureMessage(message, level, safeContext);
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    const safeBreadcrumb: Breadcrumb = {
      ...breadcrumb,
      data: breadcrumb.data ? redactSensitiveData(breadcrumb.data) : undefined,
      timestamp: breadcrumb.timestamp || Date.now(),
    };
    this.adapter.addBreadcrumb(safeBreadcrumb);
  }

  setUser(user: UserContext | null): void {
    if (!user) {
      this.adapter.setUser(null);
      return;
    }
    // Strict privacy guarantee: only internal id and role are passed. Never email, phone, or name.
    this.adapter.setUser({
      id: user.id,
      role: user.role,
    });
  }

  trackEvent(eventName: string, data?: Record<string, any>): void {
    const safeData = data ? redactSensitiveData(data) : undefined;
    this.adapter.trackEvent(eventName, safeData);
  }
}

export const monitoring = new MonitoringService();
