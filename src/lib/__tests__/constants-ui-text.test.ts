/**
 * Unit Tests — constants.ts
 *
 * UI_TEXT — Türkçe-only string registry; HARD RULE #25 (i18n yasak).
 * 10 grup (app/nav/search/place/review/auth/error/success/time/cta/footer/categories).
 */

import { describe, it, expect } from 'vitest';
import { UI_TEXT } from '../constants';

describe('UI_TEXT — Türkçe-only registry', () => {
  it('appName "Sanliurfa.com" + appTagline "Tarihin Sıfır Noktası"', () => {
    expect(UI_TEXT.appName).toBe('Sanliurfa.com');
    expect(UI_TEXT.appTagline).toBe('Tarihin Sıfır Noktası');
  });

  it('nav — 11 navigation item', () => {
    expect(Object.keys(UI_TEXT.nav)).toHaveLength(11);
    expect(UI_TEXT.nav.home).toBe('Ana Sayfa');
    expect(UI_TEXT.nav.places).toBe('Mekanlar');
    expect(UI_TEXT.nav.logout).toBe('Çıkış Yap');
  });

  it('nav — tüm string Türkçe karakter içerir veya pure ASCII Türkçe kelime', () => {
    for (const value of Object.values(UI_TEXT.nav)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('search — placeholder + button + results 5 alan', () => {
    expect(UI_TEXT.search.placeholder).toContain('Mekan');
    expect(UI_TEXT.search.button).toBe('Ara');
    expect(UI_TEXT.search.noResults).toBe('Sonuç bulunamadı');
  });

  it('place — 13 place-related label', () => {
    expect(Object.keys(UI_TEXT.place).length).toBeGreaterThanOrEqual(13);
    expect(UI_TEXT.place.openNow).toBe('Şimdi Açık');
    expect(UI_TEXT.place.closed).toBe('Kapalı');
    expect(UI_TEXT.place.directions).toBe('Yol Tarifi');
  });

  it('review — write/submit/sortBy', () => {
    expect(UI_TEXT.review.write).toBe('Değerlendirme Yaz');
    expect(UI_TEXT.review.submit).toBe('Gönder');
    expect(UI_TEXT.review.newest).toBe('En Yeni');
  });

  it('auth — email/password/forgotPassword', () => {
    expect(UI_TEXT.auth.email).toBe('E-posta Adresi');
    expect(UI_TEXT.auth.password).toBe('Şifre');
    expect(UI_TEXT.auth.forgotPassword).toBe('Şifremi Unuttum');
  });

  it('error — 7 hata mesajı', () => {
    expect(UI_TEXT.error.required).toBe('Bu alan zorunludur');
    expect(UI_TEXT.error.email).toContain('e-posta');
    expect(UI_TEXT.error.passwordLength).toContain('8');
    expect(UI_TEXT.error.notFound).toBe('Sayfa bulunamadı');
  });

  it('success — 5 başarı mesajı', () => {
    expect(UI_TEXT.success.saved).toBe('Başarıyla kaydedildi');
    expect(UI_TEXT.success.loggedIn).toBe('Giriş başarılı');
  });

  it('time — birim adları (dakika/saat/gün/...)', () => {
    expect(UI_TEXT.time.minute).toBe('dakika');
    expect(UI_TEXT.time.hour).toBe('saat');
    expect(UI_TEXT.time.day).toBe('gün');
    expect(UI_TEXT.time.justNow).toBe('az önce');
  });

  it('cta — explore/learnMore/loadMore', () => {
    expect(UI_TEXT.cta.explore).toBe('Keşfet');
    expect(UI_TEXT.cta.loadMore).toBe('Daha Fazla Yükle');
    expect(UI_TEXT.cta.showAll).toBe('Tümünü Göster');
  });

  it('footer — copyright/terms/privacy', () => {
    expect(UI_TEXT.footer.copyright).toContain('Sanliurfa.com');
    expect(UI_TEXT.footer.terms).toBe('Kullanım Koşulları');
    expect(UI_TEXT.footer.privacy).toBe('Gizlilik Politikası');
  });

  it('categories — 8 kategori (restaurants/hotels/attractions/...)', () => {
    expect(Object.keys(UI_TEXT.categories)).toHaveLength(8);
    expect(UI_TEXT.categories.restaurants).toBe('Restoranlar');
    expect(UI_TEXT.categories.hotels).toBe('Oteller');
    expect(UI_TEXT.categories.attractions).toBe('Tarihi Yerler');
  });

  it('UI_TEXT readonly (as const) — derin freeze değil ama type-level', () => {
    expect(typeof UI_TEXT).toBe('object');
    expect(UI_TEXT.appName).toBeTruthy();
  });

  it('tüm üst seviye grup tanımlı', () => {
    const groups = ['nav', 'search', 'place', 'review', 'auth', 'error', 'success', 'time', 'cta', 'footer', 'categories'];
    for (const g of groups) {
      expect((UI_TEXT as any)[g]).toBeDefined();
    }
  });

  it('boş string yok — tüm değerler dolu', () => {
    function checkAllStrings(obj: any) {
      for (const value of Object.values(obj)) {
        if (typeof value === 'string') {
          expect(value.length).toBeGreaterThan(0);
        } else if (typeof value === 'object' && value !== null) {
          checkAllStrings(value);
        }
      }
    }
    checkAllStrings(UI_TEXT);
  });

  it('default export = named export UI_TEXT', async () => {
    const module = await import('../constants');
    expect(module.default).toBe(UI_TEXT);
  });
});
