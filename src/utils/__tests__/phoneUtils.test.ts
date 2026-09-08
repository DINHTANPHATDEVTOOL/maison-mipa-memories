import { describe, it, expect } from 'vitest';
import {
  tryNormalizeVietnamPhone,
  normalizeVietnamPhone,
  isValidVietnamPhone,
} from '../phoneUtils';

describe('Phone Normalization & Validation - E.164 Vietnam Standard', () => {
  describe('Valid Vietnamese Mobile Numbers', () => {
    it('normalizes standard 10-digit number starting with 0', () => {
      const result = tryNormalizeVietnamPhone('0966616546');
      expect(result.isValid).toBe(true);
      expect(result.normalized).toBe('+84966616546');
    });

    it('normalizes Viettel 03x prefixes', () => {
      expect(normalizeVietnamPhone('0381234567')).toBe('+84381234567');
      expect(normalizeVietnamPhone('0398765432')).toBe('+84398765432');
    });

    it('normalizes Mobifone 07x & 090 prefixes', () => {
      expect(normalizeVietnamPhone('0791234567')).toBe('+84791234567');
      expect(normalizeVietnamPhone('0908123456')).toBe('+84908123456');
    });

    it('normalizes Vinaphone 08x & 091 prefixes', () => {
      expect(normalizeVietnamPhone('0888888888')).toBe('+84888888888');
      expect(normalizeVietnamPhone('0912345678')).toBe('+84912345678');
    });

    it('handles formatted input with spaces, dashes, parentheses and periods', () => {
      expect(normalizeVietnamPhone('096 661 6546')).toBe('+84966616546');
      expect(normalizeVietnamPhone('(096) 661-6546')).toBe('+84966616546');
      expect(normalizeVietnamPhone('090.812.3456')).toBe('+84908123456');
    });

    it('normalizes numbers already starting with +84 or 84', () => {
      expect(normalizeVietnamPhone('+84966616546')).toBe('+84966616546');
      expect(normalizeVietnamPhone('84966616546')).toBe('+84966616546');
      expect(normalizeVietnamPhone('+84 966-616-546')).toBe('+84966616546');
    });

    it('returns true for isValidVietnamPhone on all valid formats', () => {
      expect(isValidVietnamPhone('0908123456')).toBe(true);
      expect(isValidVietnamPhone('+84966616546')).toBe(true);
      expect(isValidVietnamPhone('0868123456')).toBe(true);
    });
  });

  describe('Invalid Phone Number Rejection', () => {
    it('rejects numbers with alphabetic characters', () => {
      const res = tryNormalizeVietnamPhone('09666abcde');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('chứa ký tự không hợp lệ');
    });

    it('rejects numbers with suspicious punctuation', () => {
      expect(tryNormalizeVietnamPhone('0966616546@').isValid).toBe(false);
      expect(tryNormalizeVietnamPhone('0966#616546').isValid).toBe(false);
    });

    it('rejects numbers that are too short', () => {
      const res = tryNormalizeVietnamPhone('096612');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('quá ngắn');
    });

    it('rejects numbers that are too long', () => {
      const res = tryNormalizeVietnamPhone('096661654612345');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('quá dài');
    });

    it('rejects invalid carrier prefixes (e.g. 01, 02 landlines, 04)', () => {
      const res = tryNormalizeVietnamPhone('0123456789');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('Đầu số nhà mạng di động Việt Nam không hợp lệ');
    });

    it('rejects foreign country formats (e.g. +1 US, +44 UK)', () => {
      const res = tryNormalizeVietnamPhone('+14155552671');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('bắt đầu bằng 0, 84 hoặc +84');
    });

    it('rejects empty or whitespace-only input', () => {
      expect(tryNormalizeVietnamPhone('').isValid).toBe(false);
      expect(tryNormalizeVietnamPhone('   ').isValid).toBe(false);
    });

    it('throws InvalidPhoneError when normalizeVietnamPhone is called on invalid input', () => {
      expect(() => normalizeVietnamPhone('invalid-phone')).toThrow();
    });
  });
});
