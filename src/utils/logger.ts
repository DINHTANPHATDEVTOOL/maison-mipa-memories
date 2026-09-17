// ==============================================================================
// Maison MIPA Memories — Structured Client Logger
// Replaces scattered console calls with safe, sanitized logging.
// In production: suppresses noisy debug logs and redacts all secrets/PII.
// ==============================================================================

import { redactSensitiveData } from './privacyFilter';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isProduction = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production';

  private formatMessage(level: LogLevel, context: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${context}]: ${message}`;
  }

  debug(context: string, message: string, data?: any): void {
    if (this.isProduction) return; // Suppress verbose debug in production
    const safeData = data !== undefined ? redactSensitiveData(data) : undefined;
    if (safeData !== undefined) {
      console.debug(this.formatMessage('debug', context, message), safeData);
    } else {
      console.debug(this.formatMessage('debug', context, message));
    }
  }

  info(context: string, message: string, data?: any): void {
    const safeData = data !== undefined ? redactSensitiveData(data) : undefined;
    if (safeData !== undefined) {
      console.info(this.formatMessage('info', context, message), safeData);
    } else {
      console.info(this.formatMessage('info', context, message));
    }
  }

  warn(context: string, message: string, data?: any): void {
    const safeData = data !== undefined ? redactSensitiveData(data) : undefined;
    if (safeData !== undefined) {
      console.warn(this.formatMessage('warn', context, message), safeData);
    } else {
      console.warn(this.formatMessage('warn', context, message));
    }
  }

  error(context: string, message: string, errorOrData?: any): void {
    const safeData = errorOrData !== undefined ? redactSensitiveData(errorOrData) : undefined;
    if (safeData !== undefined) {
      console.error(this.formatMessage('error', context, message), safeData);
    } else {
      console.error(this.formatMessage('error', context, message));
    }
  }
}

export const logger = new Logger();
