/**
 * Unit Tests — slugifyFileName helper
 *
 * Dosya adını slug formatına çevirir:
 * - Türkçe karakterler ASCII karşılığına
 * - Lowercase + hyphen separator
 * - Extension korunur (lowercase)
 *
 * 'Şanlıurfa Kalesi.JPG' → 'sanliurfa-kalesi.jpg'
 */

import { describe, it, expect } from 'vitest';
import { slugifyFileName } from '../file/file-storage';

describe('slugifyFileName', () => {
  describe('Türkçe karakter dönüşümü', () => {
    it('Şanlıurfa Kalesi.JPG → sanliurfa-kalesi.jpg', () => {
      expect(slugifyFileName('Şanlıurfa Kalesi.JPG')).toBe('sanliurfa-kalesi.jpg');
    });

    it('Göbeklitepe Resim 2024.PNG → gobeklitepe-resim-2024.png', () => {
      expect(slugifyFileName('Göbeklitepe Resim 2024.PNG')).toBe('gobeklitepe-resim-2024.png');
    });

    it('Çay Bahçesi.jpeg → cay-bahcesi.jpeg', () => {
      expect(slugifyFileName('Çay Bahçesi.jpeg')).toBe('cay-bahcesi.jpeg');
    });

    it('Üç Güzel Çiçek.WEBP → uc-guzel-cicek.webp', () => {
      expect(slugifyFileName('Üç Güzel Çiçek.WEBP')).toBe('uc-guzel-cicek.webp');
    });

    it('İSTANBUL.gif → istanbul.gif', () => {
      expect(slugifyFileName('İSTANBUL.gif')).toBe('istanbul.gif');
    });
  });

  describe('boşluk ve özel karakter normalizasyonu', () => {
    it('boşluklar hyphen ile değiştirilir', () => {
      expect(slugifyFileName('Hello World.png')).toBe('hello-world.png');
    });

    it('ardışık boşluk/özel karakterler tek hyphen', () => {
      expect(slugifyFileName('foo  bar---baz.jpg')).toBe('foo-bar-baz.jpg');
    });

    it('leading/trailing hyphen strip', () => {
      expect(slugifyFileName('--leading.png')).toBe('leading.png');
    });

    it('underscore ve diğer özel karakterler hyphen', () => {
      expect(slugifyFileName('file_name (1).jpg')).toBe('file-name-1.jpg');
    });
  });

  describe('extension handling', () => {
    it('uppercase extension lowercase\'e çevrilir', () => {
      expect(slugifyFileName('test.JPG')).toBe('test.jpg');
      expect(slugifyFileName('test.PNG')).toBe('test.png');
      expect(slugifyFileName('test.GIF')).toBe('test.gif');
    });

    it('mixed case extension', () => {
      expect(slugifyFileName('test.JpEg')).toBe('test.jpeg');
    });

    it('multi-dot dosya adı (sadece son . extension olarak alınır)', () => {
      // 'foo.bar.jpg' → base 'foo.bar', ext '.jpg' → 'foo-bar.jpg'
      expect(slugifyFileName('foo.bar.jpg')).toBe('foo-bar.jpg');
    });

    it('extension yok ise (extname = "")', () => {
      // 'README' base olur, ext '' → 'readme'
      expect(slugifyFileName('README')).toBe('readme');
    });
  });

  describe('edge cases', () => {
    it('zaten slug formatında dosya adı', () => {
      expect(slugifyFileName('already-slug.jpg')).toBe('already-slug.jpg');
    });

    it('rakam ve hyphen korunur', () => {
      expect(slugifyFileName('photo-2024-12-31.png')).toBe('photo-2024-12-31.png');
    });

    it('hidden file (".jpg" → "jpg") — Node.js extname dot-prefix file için "" döner', () => {
      // path.extname('.jpg') === '' (POSIX: leading dot = hidden file, no extension)
      // base = '.jpg', sanitized = 'jpg', no extension appended
      expect(slugifyFileName('.jpg')).toBe('jpg');
    });

    it('boş string', () => {
      expect(slugifyFileName('')).toBe('file');
    });

    it('sadece Türkçe karakter + extension', () => {
      expect(slugifyFileName('şğüçöı.jpg')).toBe('sgucoi.jpg');
    });

    it('tüm karakterler invalid (sadece extension kalır → fallback)', () => {
      // '...' base, '.jpg' ext olabilir; extname('....jpg') = '.jpg', base = '...'
      // sanitizeSlug('...') → '' (hyphen-only, strip leading/trailing → '')
      // fallback: 'file.jpg'
      expect(slugifyFileName('....jpg')).toBe('file.jpg');
    });
  });

  describe('use case: gerçek dünya senaryoları', () => {
    it('iPhone fotoğraf', () => {
      expect(slugifyFileName('IMG_0123.JPEG')).toBe('img-0123.jpeg');
    });

    it('Android ekran görüntüsü', () => {
      expect(slugifyFileName('Screenshot_2024-01-15-10-30-45.png')).toBe(
        'screenshot-2024-01-15-10-30-45.png'
      );
    });

    it('Türkçe + İngilizce karışık', () => {
      expect(slugifyFileName('Şanlıurfa Tour 2024.jpg')).toBe('sanliurfa-tour-2024.jpg');
    });

    it('Köprü Manzarası.WebP', () => {
      expect(slugifyFileName('Köprü Manzarası.WebP')).toBe('kopru-manzarasi.webp');
    });
  });
});
