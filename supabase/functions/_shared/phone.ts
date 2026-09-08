// ==============================================================================
// Maison MIPA Memories - Server-side Phone Normalization (Deno / Edge Functions)
// ==============================================================================

const VN_MOBILE_PREFIX_REGEX = /^(3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;

export interface PhoneValidationResult {
  isValid: boolean;
  normalized?: string;
  error?: string;
}

export const tryNormalizeVietnamPhone = (rawPhone: string): PhoneValidationResult => {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, error: 'Số điện thoại không được để trống.' };
  }

  const trimmed = rawPhone.trim();

  // Check for forbidden characters
  if (/[a-zA-Z]/.test(trimmed) || /[^0-9+\s().-]/.test(trimmed)) {
    return { isValid: false, error: 'Số điện thoại chứa ký tự không hợp lệ.' };
  }

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

  if (nationalDigits.length < 9) {
    return { isValid: false, error: 'Số điện thoại quá ngắn.' };
  }
  if (nationalDigits.length > 9) {
    return { isValid: false, error: 'Số điện thoại quá dài.' };
  }

  if (!VN_MOBILE_PREFIX_REGEX.test(nationalDigits)) {
    return { isValid: false, error: 'Đầu số nhà mạng di động Việt Nam không hợp lệ.' };
  }

  return {
    isValid: true,
    normalized: `+84${nationalDigits}`,
  };
};
