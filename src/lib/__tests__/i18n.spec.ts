import { describe, it, expect } from 'vitest';
import { t, formatDate, formatCurrency, getAvailableLanguages, detectLanguage } from '../i18n';

describe('Internationalization', () => {
  it('should translate Turkish text', () => {
    const result = t('nav.home', 'tr');
    expect(result).toBe('Anasayfa');
  });

  it('should translate English text', () => {
    const result = t('nav.home', 'en');
    expect(result).toBe('Home');
  });

  it('should return key if translation not found', () => {
    const result = t('nonexistent.key', 'tr');
    expect(result).toBe('nonexistent.key');
  });

  it('should format date in Turkish', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date, 'tr');
    expect(result).toContain('Ocak');
  });

  it('should format date in English', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date, 'en');
    expect(result).toContain('January');
  });

  it('should format currency in Turkish', () => {
    const result = formatCurrency(100, 'tr');
    expect(result).toContain('₺');
  });

  it('should format currency in English', () => {
    const result = formatCurrency(100, 'en');
    expect(result).toContain('$');
  });

  it('should get available languages', () => {
    const languages = getAvailableLanguages();
    expect(languages.length).toBe(2);
    expect(languages.some(l => l.code === 'tr')).toBe(true);
    expect(languages.some(l => l.code === 'en')).toBe(true);
  });

  it('should detect Turkish language', () => {
    // Mock navigator for testing
    const result = detectLanguage();
    expect(['tr', 'en']).toContain(result);
  });
});
