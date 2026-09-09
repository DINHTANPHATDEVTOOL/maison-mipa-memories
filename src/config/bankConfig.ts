// ==============================================================================
// Maison MIPA Memories - Centralized Bank & Payment Configuration
// Issue #17: Replaced hardcoded fake MB account with authoritative backend settings.
// Production Guard: Blocks fake/placeholder bank accounts.
// ==============================================================================

import {
  type BusinessBankConfig,
  DEMO_BANK_CONFIG,
  isValidProductionBankConfig,
  buildAuthoritativeVietQrUrl,
} from '../services/paymentSettingsService';

export interface BankConfig {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
  qrTemplate: string;
}

// Fallback configuration for tests only
export const BANK_CONFIG: BankConfig = {
  bankCode: DEMO_BANK_CONFIG.bankCode,
  bankName: DEMO_BANK_CONFIG.bankName,
  accountNumber: DEMO_BANK_CONFIG.accountNumber,
  accountName: DEMO_BANK_CONFIG.accountName,
  branch: DEMO_BANK_CONFIG.branch,
  qrTemplate: DEMO_BANK_CONFIG.qrTemplate,
};

/**
 * Generate standard VietQR quick-link URL
 */
export const generateVietQrUrl = (
  amount: number,
  transferReference: string,
  customConfig?: BusinessBankConfig | null
): string => {
  const cfg = customConfig !== undefined ? customConfig : (DEMO_BANK_CONFIG as BusinessBankConfig);
  if (!isValidProductionBankConfig(cfg)) {
    return '';
  }
  return buildAuthoritativeVietQrUrl(cfg, amount, transferReference);
};
