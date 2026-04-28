import { describe, it, expect } from 'vitest';
import { t, formatDate, formatCurrency, getLocale, detectLanguage, getAvailableLanguages, TEXTS, LOCALE } from '../i18n';

describe('Turkish Localization', () => {
  it('should have Turkish as the only locale', () => {
    expect(LOCALE).toBe('tr');
  });

  it('should translate Turkish text', () => {
    const result = t('nav.home');
    expect(result).toBe('Anasayfa');
  });

  it('should return key if translation not found', () => {
    const result = t('nonexistent.key');
    expect(result).toBe('nonexistent.key');
  });

  it('should format date in Turkish', () => {
    const date = new Date('2024-01-15');
    const result = formatDate(date);
    expect(result).toContain('Ocak');
    expect(result).toContain('2024');
  });

  it('should format currency in Turkish Lira', () => {
    const result = formatCurrency(100);
    expect(result).toContain('₺');
    expect(result).toContain('100');
  });

  it('should return only Turkish locale info', () => {
    const locale = getLocale();
    expect(locale.code).toBe('tr');
    expect(locale.name).toBe('Türkçe');
  });

  it('should detect only Turkish language', () => {
    const result = detectLanguage();
    expect(result).toBe('tr');
  });

  it('should return only Turkish in available languages', () => {
    const languages = getAvailableLanguages();
    expect(languages.length).toBe(1);
    expect(languages[0].code).toBe('tr');
    expect(languages[0].name).toBe('Türkçe');
  });

  it('should have all required text categories', () => {
    expect(TEXTS.nav).toBeDefined();
    expect(TEXTS.common).toBeDefined();
    expect(TEXTS.auth).toBeDefined();
    expect(TEXTS.places).toBeDefined();
    expect(TEXTS.reviews).toBeDefined();
    expect(TEXTS.profile).toBeDefined();
    expect(TEXTS.premium).toBeDefined();
    expect(TEXTS.notifications).toBeDefined();
    expect(TEXTS.dashboard).toBeDefined();
    expect(TEXTS.errors).toBeDefined();
  });

  it('should have Turkish specific characters', () => {
    const result = t('errors.notFound');
    // Check for Turkish specific characters
    expect(result).toMatch(/[çğıöşüÇĞİÖŞÜ]/);
  });
});
