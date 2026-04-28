import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
  describe('Slug Generation', () => {
    it('should convert Turkish characters to ASCII', () => {
      const convert = (str: string) => str
        .toLowerCase()
        .replace(/[ç]/g, 'c')
        .replace(/[ğ]/g, 'g')
        .replace(/[ı]/g, 'i')
        .replace(/[ö]/g, 'o')
        .replace(/[ş]/g, 's')
        .replace(/[ü]/g, 'u')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      expect(convert('Çiğerçi Aziz Usta')).toBe('cigerci-aziz-usta');
      expect(convert('Göbeklitepe Müzesi')).toBe('gobeklitepe-muzesi');
    });

    it('should handle multiple spaces', () => {
      const convert = (str: string) => str
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);

      expect(convert('Test   Restaurant')).toBe('test-restaurant');
    });
  });

  describe('Price Formatting', () => {
    it('should format price range correctly', () => {
      const formatPrice = (range: string) => {
        const symbols: Record<string, string> = {
          '1': '₺',
          '2': '₺₺',
          '3': '₺₺₺',
          '4': '₺₺₺₺'
        };
        return symbols[range] || '₺';
      };

      expect(formatPrice('1')).toBe('₺');
      expect(formatPrice('2')).toBe('₺₺');
      expect(formatPrice('3')).toBe('₺₺₺');
      expect(formatPrice('4')).toBe('₺₺₺₺');
    });
  });

  describe('Phone Validation', () => {
    it('should validate Turkish phone numbers', () => {
      const isValid = (phone: string) => {
        const clean = phone.replace(/\D/g, '');
        // Turkish mobile: 10 digits starting with 5, or 11 digits with leading 0
        return (clean.length === 10 && clean.startsWith('5')) || 
               (clean.length === 11 && clean.startsWith('0') && clean[1] === '5');
      };

      expect(isValid('5551234567')).toBe(true);
      expect(isValid('555 123 45 67')).toBe(true);
      expect(isValid('05551234567')).toBe(true);
      expect(isValid('1234567890')).toBe(false);
      expect(isValid('555123')).toBe(false);
    });
  });

  describe('Rating Calculation', () => {
    it('should calculate average rating', () => {
      const ratings = [5, 4, 5, 3, 4];
      const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      expect(avg).toBeCloseTo(4.2, 1);
    });

    it('should round to 1 decimal', () => {
      const ratings = [5, 5, 4, 3];
      const avg = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      expect(avg).toBe(4.3);
    });
  });
});
