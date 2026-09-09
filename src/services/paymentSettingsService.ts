// ==============================================================================
// Maison MIPA Memories - Authoritative Payment & Bank Settings Service
// Connects to PostgreSQL payment_settings table.
// Guard: Blocks fake/placeholder bank accounts in production.
// ==============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface BusinessBankConfig {
  id?: string;
  bankCode: string;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
  qrTemplate: string;
  active: boolean;
  isDefault: boolean;
}

// Known invalid placeholders that must be blocked in production
export const PLACEHOLDER_ACCOUNT_NUMBERS = ['888866669999', '1234567890', '0000000000'];

/**
 * Validates whether a bank configuration is genuine and non-placeholder.
 */
export const isValidProductionBankConfig = (config: BusinessBankConfig | null): config is BusinessBankConfig => {
  if (!config) return false;
  if (!config.bankCode || !config.accountNumber || !config.accountName) return false;
  if (PLACEHOLDER_ACCOUNT_NUMBERS.includes(config.accountNumber.trim())) return false;
  if (config.accountName.trim().toUpperCase() === 'MAISON MIPA MEMORIES' && config.accountNumber === '888866669999') {
    return false;
  }
  return config.active;
};

// Default fallback bank config for tests / explicit demo mode only
export const DEMO_BANK_CONFIG: BusinessBankConfig = {
  bankCode: 'VCB',
  bankBin: '970436',
  bankName: 'Vietcombank (Ngân hàng TMCP Ngoại Thương Việt Nam)',
  accountNumber: '1012345678',
  accountName: 'CONG TY MAISON MIPA',
  branch: 'Chi nhánh TP.HCM',
  qrTemplate: 'compact2',
  active: true,
  isDefault: true,
};

let cachedBankConfig: BusinessBankConfig | null = null;

/**
 * Fetch active bank configuration from backend database.
 */
export const getActivePaymentSettings = async (): Promise<BusinessBankConfig | null> => {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('active', true)
        .eq('is_default', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching payment_settings:', error.message);
        return null;
      }

      if (data) {
        cachedBankConfig = {
          id: data.id,
          bankCode: data.bank_code,
          bankBin: data.bank_bin,
          bankName: data.bank_name,
          accountNumber: data.account_number,
          accountName: data.account_name,
          branch: data.branch || undefined,
          qrTemplate: data.qr_template || 'compact2',
          active: data.active,
          isDefault: data.is_default,
        };
        return cachedBankConfig;
      }

      return null;
    } catch (err) {
      console.error('Unexpected error fetching payment settings:', err);
      return null;
    }
  }

  // When Supabase is not configured (e.g. mock test environment)
  return DEMO_BANK_CONFIG;
};

/**
 * Save bank configuration via secure Admin RPC with audit logging.
 */
export const adminSavePaymentSettings = async (params: {
  bankCode: string;
  bankBin: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
  qrTemplate?: string;
}): Promise<BusinessBankConfig> => {
  if (isSupabaseConfigured()) {
    const { data, error } = await supabase.rpc('admin_save_payment_settings', {
      p_bank_code: params.bankCode,
      p_bank_bin: params.bankBin,
      p_bank_name: params.bankName,
      p_account_number: params.accountNumber,
      p_account_name: params.accountName,
      p_branch: params.branch || null,
      p_qr_template: params.qrTemplate || 'compact2',
    });

    if (error) {
      throw new Error(error.message || 'Không thể lưu thông tin tài khoản ngân hàng.');
    }

    const saved = data as any;
    cachedBankConfig = {
      id: saved.id,
      bankCode: saved.bank_code,
      bankBin: saved.bank_bin,
      bankName: saved.bank_name,
      accountNumber: saved.account_number,
      accountName: saved.account_name,
      branch: saved.branch || undefined,
      qrTemplate: saved.qr_template || 'compact2',
      active: saved.active,
      isDefault: saved.is_default,
    };
    return cachedBankConfig;
  }

  // Offline / Demo
  const updated: BusinessBankConfig = {
    ...params,
    qrTemplate: params.qrTemplate || 'compact2',
    active: true,
    isDefault: true,
  };
  cachedBankConfig = updated;
  return updated;
};

/**
 * Build VietQR URL from valid bank configuration, authoritative amount, and transfer reference.
 * Formula: https://img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<REF>&accountName=<NAME>
 */
export const buildAuthoritativeVietQrUrl = (
  bankConfig: BusinessBankConfig,
  amount: number,
  transferReference: string
): string => {
  if (!isValidProductionBankConfig(bankConfig)) {
    throw new Error('Cấu hình tài khoản ngân hàng không hợp lệ.');
  }

  const safeBin = encodeURIComponent(bankConfig.bankBin || bankConfig.bankCode);
  const safeAcc = encodeURIComponent(bankConfig.accountNumber.trim());
  const safeTemplate = encodeURIComponent(bankConfig.qrTemplate || 'compact2');
  const safeAmount = Math.round(Math.max(0, amount));
  const safeRef = encodeURIComponent(transferReference.trim());
  const safeName = encodeURIComponent(bankConfig.accountName.trim());

  return `https://img.vietqr.io/image/${safeBin}-${safeAcc}-${safeTemplate}.png?amount=${safeAmount}&addInfo=${safeRef}&accountName=${safeName}`;
};
