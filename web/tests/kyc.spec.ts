import { test, expect } from '@playwright/test';

test.describe('Aadhar KYC Verification Architecture (Aadhar_Verification_Badge.md)', () => {

  function validateAndCleanAadhar(input: string) {
    if (!input) return { valid: false, clean: '' };
    const clean = input.replace(/\s+/g, '');
    const valid = /^\d{12}$/.test(clean);
    return { valid, clean };
  }

  function maskAadhar(cleanAadhar: string): string {
    const last4 = cleanAadhar.slice(-4);
    return `XXXX-XXXX-${last4}`;
  }

  function parsePowerApiResponse(apiData: { success: boolean; aadhaar_data?: { aadhaar_number?: string }; masked_aadhaar?: string; message?: string }) {
    if (!apiData.success) {
      return {
        success: false,
        error: apiData.message || 'Verification failed'
      };
    }
    const raw = apiData.aadhaar_data?.aadhaar_number || '';
    const masked = raw ? maskAadhar(raw) : (apiData.masked_aadhaar || 'XXXX-XXXX-XXXX');
    return {
      success: true,
      aadharVerified: true,
      maskedAadhar: masked
    };
  }

  test.describe('12-Digit Format Validation', () => {
    test('Accepts valid 12-digit numbers with or without spaces', () => {
      expect(validateAndCleanAadhar('123456789012')).toEqual({ valid: true, clean: '123456789012' });
      expect(validateAndCleanAadhar('1234 5678 9012')).toEqual({ valid: true, clean: '123456789012' });
      expect(validateAndCleanAadhar('  1234   5678  9012  ')).toEqual({ valid: true, clean: '123456789012' });
    });

    test('Rejects invalid formats (letters, symbols, wrong length)', () => {
      expect(validateAndCleanAadhar('12345678901')).toEqual({ valid: false, clean: '12345678901' }); // 11 digits
      expect(validateAndCleanAadhar('1234567890123')).toEqual({ valid: false, clean: '1234567890123' }); // 13 digits
      expect(validateAndCleanAadhar('1234abcd5678')).toEqual({ valid: false, clean: '1234abcd5678' }); // Letters
      expect(validateAndCleanAadhar('')).toEqual({ valid: false, clean: '' });
    });
  });

  test.describe('Data Masking', () => {
    test('Securely masks first 8 digits and exposes only last 4', () => {
      expect(maskAadhar('123456789012')).toBe('XXXX-XXXX-9012');
      expect(maskAadhar('999988887777')).toBe('XXXX-XXXX-7777');
    });
  });

  test.describe('PowerAPI Verified Response Processing', () => {
    test('Processes successful PowerAPI response with raw aadhar', () => {
      const response = parsePowerApiResponse({
        success: true,
        aadhaar_data: { aadhaar_number: '555566667777' }
      });

      expect(response.success).toBe(true);
      expect(response.aadharVerified).toBe(true);
      expect(response.maskedAadhar).toBe('XXXX-XXXX-7777');
    });

    test('Processes successful PowerAPI response with pre-masked aadhar', () => {
      const response = parsePowerApiResponse({
        success: true,
        masked_aadhaar: 'XXXX-XXXX-8888'
      });

      expect(response.success).toBe(true);
      expect(response.aadharVerified).toBe(true);
      expect(response.maskedAadhar).toBe('XXXX-XXXX-8888');
    });

    test('Handles rejected or failed PowerAPI response', () => {
      const response = parsePowerApiResponse({
        success: false,
        message: 'Invalid OTP entered'
      });

      expect(response.success).toBe(false);
      expect(response.error).toBe('Invalid OTP entered');
    });
  });
});
