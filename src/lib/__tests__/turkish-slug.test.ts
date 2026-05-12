/**
 * Unit tests — src/lib/url/turkish-slug.ts
 * KESİN KURAL: URL slug'larda Türkçe karakter YASAK — hepsi ASCII'ye normalize.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeTurkish,
  slugify,
  slugifyFileName,
  hasTurkishDiacritic,
  normalizeTurkishPath,
} from '../url/turkish-slug';

describe('normalizeTurkish', () => {
  it('Türkçe diakritikleri ASCII\'ye çevirir', () => {
    expect(normalizeTurkish('Şanlıurfa')).toBe('sanliurfa');
    expect(normalizeTurkish('GÖBEKLİTEPE')).toBe('gobeklitepe');
    expect(normalizeTurkish('Halfeti İlçesi')).toBe('halfeti ilcesi');
  });

  it('lowercase yapar', () => {
    expect(normalizeTurkish('HARRAN')).toBe('harran');
    expect(normalizeTurkish('Birecik Kalesi')).toBe('birecik kalesi');
  });

  it('boş/null/undefined input → empty string', () => {
    expect(normalizeTurkish('')).toBe('');
    expect(normalizeTurkish(null as unknown as string)).toBe('');
    expect(normalizeTurkish(undefined as unknown as string)).toBe('');
  });

  it('ASCII karakterleri korur', () => {
    expect(normalizeTurkish('test-123')).toBe('test-123');
    expect(normalizeTurkish('ABC')).toBe('abc');
  });

  it('tüm Türkçe karakterleri çevirir', () => {
    expect(normalizeTurkish('ğüşıöçĞÜŞİÖÇ')).toBe('gusiocgusioc');
  });
});

describe('slugify', () => {
  it('Türkçe başlığı ASCII slug yapar', () => {
    expect(slugify('Şanlıurfa Kalesi 2026')).toBe('sanliurfa-kalesi-2026');
    expect(slugify('Halfeti / Tekne Turu')).toBe('halfeti-tekne-turu');
  });

  it('boşlukları tire yapar, çoklu tireyi tek yapar', () => {
    expect(slugify('a  b   c')).toBe('a-b-c');
    expect(slugify('a-b---c')).toBe('a-b-c');
  });

  it('baş/son tireleri temizler', () => {
    expect(slugify('-test-')).toBe('test');
    expect(slugify('---hello---')).toBe('hello');
  });

  it('özel karakterleri çıkarır', () => {
    expect(slugify('Test@#$%!')).toBe('test');
    expect(slugify("Şanlı'urfa")).toBe('sanliurfa');
  });

  it('maxLength uygular', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long).length).toBe(100);
    expect(slugify('test-abc', 5).length).toBeLessThanOrEqual(5);
  });

  it('boş input → empty string', () => {
    expect(slugify('')).toBe('');
  });

  it('sadece özel karakter → empty string', () => {
    expect(slugify('@#$%')).toBe('');
  });
});

describe('slugifyFileName', () => {
  it('uzantıyı korur, slugifies base', () => {
    expect(slugifyFileName('Şanlıurfa Kalesi.JPG')).toBe('sanliurfa-kalesi.jpg');
    expect(slugifyFileName('Test Resim.PNG')).toBe('test-resim.png');
  });

  it('uzantı yoksa sade slug döner', () => {
    expect(slugifyFileName('test-file')).toBe('test-file');
  });

  it('boş için "file" fallback', () => {
    expect(slugifyFileName('')).toBe('file');
  });

  it('dot-file (gizli dosya) — uzantı olarak değil, tam ad olarak işlenir', () => {
    // .jpg: lastIndexOf=0 → base='.jpg', slugify('.jpg')='jpg', ext=''
    expect(slugifyFileName('.jpg')).toBe('jpg');
  });

  it('uzantıdaki Türkçe karakteri ASCII\'ye çevirir', () => {
    expect(slugifyFileName('test.jpeğ')).toBe('test.jpeg');
  });
});

describe('hasTurkishDiacritic', () => {
  it('Türkçe karakter varsa true', () => {
    expect(hasTurkishDiacritic('/işletme/test')).toBe(true);
    expect(hasTurkishDiacritic('Şanlıurfa')).toBe(true);
    expect(hasTurkishDiacritic('Halfeti')).toBe(false);
  });

  it('ASCII-only path için false', () => {
    expect(hasTurkishDiacritic('/isletme/test')).toBe(false);
    expect(hasTurkishDiacritic('/halfeti-gezi-rehberi')).toBe(false);
  });
});

describe('normalizeTurkishPath', () => {
  it('path içindeki Türkçe karakterleri ASCII yapar', () => {
    expect(normalizeTurkishPath('/işletme/şanlıurfa-kalesi')).toBe('/isletme/sanliurfa-kalesi');
    expect(normalizeTurkishPath('/kullanıcı/abc')).toBe('/kullanici/abc');
  });
});
