/**
 * Unit Tests — turkishToAscii helper
 *
 * Türkçe karakter → ASCII karşılığı dönüşümü.
 * Slug ve dosya adı normalizasyonunda kullanılır.
 *
 * Mapping:
 *  ş/Ş → s, ğ/Ğ → g, ü/Ü → u, ç/Ç → c, ö/Ö → o, ı/İ → i
 */

import { describe, it, expect } from 'vitest';
import { turkishToAscii } from '../security/xss';

describe('turkishToAscii', () => {
  describe('temel karakter dönüşümleri (lowercase)', () => {
    it('ş → s', () => {
      expect(turkishToAscii('şanlıurfa')).toBe('sanliurfa');
    });

    it('ğ → g', () => {
      expect(turkishToAscii('ağrı')).toBe('agri');
    });

    it('ü → u', () => {
      expect(turkishToAscii('üçüncü')).toBe('ucuncu');
    });

    it('ç → c', () => {
      expect(turkishToAscii('çiçek')).toBe('cicek');
    });

    it('ö → o', () => {
      expect(turkishToAscii('görmek')).toBe('gormek');
    });

    it('ı → i', () => {
      expect(turkishToAscii('ışık')).toBe('isik');
    });
  });

  describe('temel karakter dönüşümleri (uppercase)', () => {
    it('Ş → S', () => {
      expect(turkishToAscii('ŞANLIURFA')).toBe('SANLIURFA');
    });

    it('Ğ → G', () => {
      expect(turkishToAscii('AĞRI')).toBe('AGRI');
    });

    it('İ → I (Türk büyük İ)', () => {
      expect(turkishToAscii('İSTANBUL')).toBe('ISTANBUL');
    });
  });

  describe('karışık metin dönüşümleri', () => {
    it('Şanlıurfa Göbeklitepe → Sanliurfa Gobeklitepe', () => {
      expect(turkishToAscii('Şanlıurfa Göbeklitepe')).toBe('Sanliurfa Gobeklitepe');
    });

    it('boşluk + diğer karakterler korunur', () => {
      expect(turkishToAscii('Üç Güzel Çiçek')).toBe('Uc Guzel Cicek');
    });

    it('zaten ASCII olan metni değiştirmez', () => {
      expect(turkishToAscii('hello world')).toBe('hello world');
      expect(turkishToAscii('Test 123')).toBe('Test 123');
    });

    it('Türkçe + İngilizce karışık', () => {
      expect(turkishToAscii('Şehir Guide 2024')).toBe('Sehir Guide 2024');
    });

    it('rakam ve özel karakterler korunur', () => {
      expect(turkishToAscii('Çay-2024_v3.0')).toBe('Cay-2024_v3.0');
    });
  });

  describe('edge cases', () => {
    it('boş string', () => {
      expect(turkishToAscii('')).toBe('');
    });

    it('sadece Türkçe karakterler (lowercase)', () => {
      expect(turkishToAscii('şğüçöı')).toBe('sgucoi');
    });

    it('sadece Türkçe karakterler (uppercase)', () => {
      expect(turkishToAscii('ŞĞÜÇÖİ')).toBe('SGUCOI');
    });

    it('tekrarlayan karakterler', () => {
      expect(turkishToAscii('şşş')).toBe('sss');
    });

    it('uzun metin (1000+ kez)', () => {
      const input = 'şanlıurfa '.repeat(100);
      const expected = 'sanliurfa '.repeat(100);
      expect(turkishToAscii(input)).toBe(expected);
    });

    it('unicode normalize değil — sadece TR mapping', () => {
      // Almanca ä, ñ gibi karakterler dokunulmaz
      expect(turkishToAscii('Müller')).toBe('Muller'); // ü mapped
      expect(turkishToAscii('mañana')).toBe('mañana'); // ñ NOT mapped
    });
  });

  describe('use case: dosya adı normalizasyonu', () => {
    it('Şanlıurfa.jpg → Sanliurfa.jpg', () => {
      expect(turkishToAscii('Şanlıurfa.jpg')).toBe('Sanliurfa.jpg');
    });

    it('Göbeklitepe-Resim.png → Gobeklitepe-Resim.png', () => {
      expect(turkishToAscii('Göbeklitepe-Resim.png')).toBe('Gobeklitepe-Resim.png');
    });

    it('Çay Bahçesi 2024.jpeg → Cay Bahcesi 2024.jpeg', () => {
      expect(turkishToAscii('Çay Bahçesi 2024.jpeg')).toBe('Cay Bahcesi 2024.jpeg');
    });
  });
});
