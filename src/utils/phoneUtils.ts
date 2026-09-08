// ==============================================================================
// Maison MIPA Memories - Vietnamese Phone Number Normalization & Validation
// Standard: Vietnam Ministry of Information & Communications (E.164 Standard)
// Prefix groups:
// Viettel: 086, 096, 097, 098, 032, 033, 034, 035, 036, 037, 038, 039
// Mobifone: 089, 090, 093, 070, 076, 077, 078, 079
// Vinaphone: 088, 091, 094, 081, 082, 083, 084, 085
// Vietnamobile: 092, 056, 058
// Gmobile: 099, 059
// Itelecom: 087
// Wintel: 055
// ==============================================================================

// Valid 2-digit prefixes following the country code (or following national leading 0)
const VN_MOBILE_PREFIX_REGEX = /^(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

/**
 * Validates and normalizes Vietnamese mobile phone number into E.164 standard (+84...)
 * Rejects numbers with invalid characters, invalid length, or invalid carrier prefix.
 */
export const tryNormalizeVietnamPhone = (rawPhone: string): PhoneValidationResult => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, error: 'Số điện thoại không được để trống.' };
  }

  const trimmed = rawPhone.trim();

  // Check for forbidden characters (letters or suspicious punctuation)
  if (/[a-zA-Z]/.test(trimmed) || /[^0-9+\s().-]/.test(trimmed)) {
    return { isValid: false, error: 'Số điện thoại chứa ký tự không hợp lệ.' };
  }

  // Remove valid separating punctuation (spaces, dashes, parentheses, periods)
  const cleaned = trimmed.replace(/[\s().-]/g, '');

  let nationalDigits = '';

  if (cleaned.startsWith('+84')) {
    nationalDigits = cleaned.substring(3);
  } else if (cleaned.startsWith('84') && cleaned.length === 11) {
    nationalDigits = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    nationalDigits = cleaned.substring(1);
  } else {
    return { isValid: false, error: 'Số điện thoại Việt Nam phải bắt đầu bằng 0, 84 hoặc +84.' };
  }

  // National digits must be exactly 9 digits (total 10 digits in national 0xxxxxxxxx format)
  if (nationalDigits.length < 9) {
    return { isValid: false, error: 'Số điện thoại quá ngắn.' };
  }
  if (nationalDigits.length > 9) {
    return { isValid: false, error: 'Số điện thoại quá dài.' };
  }

  // Validate carrier prefix
  if (!VN_MOBILE_PREFIX_REGEX.test(nationalDigits)) {
    return { isValid: false, error: 'Đầu số nhà mạng di động Việt Nam không hợp lệ.' };
  }

  return {
    isValid: true,
    normalized: `+84${nationalDigits}`,
  };
};

/**
 * Normalizes phone number to E.164 format.
 * Throws an Error if the phone number is invalid.
 */
export const normalizeVietnamPhone = (rawPhone: string): string => {
  const res = tryNormalizeVietnamPhone(rawPhone);
  if (!res.isValid || !res.normalized) {
    const err = new Error(res.error || 'INVALID_PHONE');
    err.name = 'InvalidPhoneError';
    throw err;
  }
  return res.normalized;
};

/**
 * Returns true if valid Vietnamese mobile phone number.
 */
export const isValidVietnamPhone = (rawPhone: string): boolean => {
  return tryNormalizeVietnamPhone(rawPhone).isValid;
};
