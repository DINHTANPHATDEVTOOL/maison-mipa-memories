// ==============================================================================
// Maison MIPA Memories - Centralized Bank & Payment Configuration
// Note: Bank display credentials (Account number, name, bank code) are public
// payment instructions. Payment gateway private secrets remain server-only.
// ==============================================================================

export interface BankConfig {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch?: string;
  qrTemplate: string;
}

export const BANK_CONFIG: BankConfig = {
  bankCode: 'MB', // MB Bank (Ngân hàng TMCP Quân Đội)
  bankName: 'MB BANK (Ngân hàng Quân Đội)',
  accountNumber: '888866669999',
  accountName: 'MAISON MIPA MEMORIES',
  branch: 'Chi nhánh Hà Nội',
  qrTemplate: 'compact2',
};

/**
 * Generate standard VietQR quick-link URL
 * Standard: https://img.vietqr.io/image/<BANK_CODE>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>
 */
export const generateVietQrUrl = (amount: number, transferReference: string): string => {
  const safeRef = encodeURIComponent(transferReference.trim());
  const safeName = encodeURIComponent(BANK_CONFIG.accountName);
  return `https://img.vietqr.io/image/${BANK_CONFIG.bankCode}-${BANK_CONFIG.accountNumber}-${BANK_CONFIG.qrTemplate}.png?amount=${Math.round(amount)}&addInfo=${safeRef}&accountName=${safeName}`;
};
