/**
 * Türkçe URL slug + path normalizasyon helper'ları.
 *
 * Birden fazla yerde inline `slugify` implementasyonu vardı (lib/utils.ts,
 * lib/seo-utils.ts, lib/blog.ts, lib/city-content-agents.ts, lib/file/file-storage.ts,
 * components/public/CategoryHub.astro). Bu modül canonical implementation —
 * yeni kod buradan import etmeli.
 *
 * Diakritik karakterler URL'lerde kabul edilmez (RFC 3986). Türkçe karakterler
 * ASCII'ye çevrilir: ğ→g, ü→u, ş→s, ı→i, ö→o, ç→c (büyük harf dahil).
 */

const TR_DIACRITIC_MAP: Record<string, string> = {
  'ğ': 'g', 'Ğ': 'g',
  'ü': 'u', 'Ü': 'u',
  'ş': 's', 'Ş': 's',
  'ı': 'i', 'I': 'i',
  'İ': 'i',
  'ö': 'o', 'Ö': 'o',
  'ç': 'c', 'Ç': 'c',
  // i/I farklılığı: dotted ASCII I → 'i' (Türkçe locale beklentisi)
};

/**
 * Türkçe diakritikleri ASCII'ye çevir, küçük harfe normalize et.
 * URL slug'ı oluşturmaz — sadece karakter normalizasyonu.
 *
 *   normalizeTurkish('Şanlıurfa Kalesi') → 'sanliurfa kalesi'
 *   normalizeTurkish('GÖBEKLİTEPE') → 'gobeklitepe'
 */
export function normalizeTurkish(str: string): string {
  if (!str) return '';
  return str
    .split('')
    .map((c) => TR_DIACRITIC_MAP[c] ?? c)
    .join('')
    .toLowerCase();
}

/**
 * URL slug üret: Türkçe normalize + boşluk→tire + özel karakter temizle.
 *
 *   slugify('Şanlıurfa Kalesi 2026') → 'sanliurfa-kalesi-2026'
 *   slugify('Hilvan / Termal Su') → 'hilvan-termal-su'
 *
 * @param maxLength SEO için max 100 char (default), istisnai durumda uzatılabilir
 */
export function slugify(str: string, maxLength: number = 100): string {
  if (!str) return '';
  return normalizeTurkish(str)
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')   // sadece harf+rakam+space+hyphen kalsın
    .replace(/\s+/g, '-')            // boşluk → tire
    .replace(/-+/g, '-')             // çoklu tire → tek
    .replace(/^-+|-+$/g, '')          // baş/son tire
    .substring(0, maxLength);
}

/**
 * Dosya adı için slug — dot uzantısını korur.
 *
 *   slugifyFileName('Şanlıurfa Kalesi.JPG') → 'sanliurfa-kalesi.jpg'
 */
export function slugifyFileName(name: string): string {
  if (!name) return 'file';
  const lastDot = name.lastIndexOf('.');
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot + 1) : '';
  const slugBase = slugify(base, 80) || 'file';
  const safeExt = normalizeTurkish(ext).replace(/[^a-z0-9]/g, '').substring(0, 10);
  return safeExt ? `${slugBase}.${safeExt}` : slugBase;
}

/**
 * URL path'inde Türkçe karakter var mı kontrol et (middleware redirect için).
 *
 *   hasTurkishDiacritic('/işletme/test') → true
 *   hasTurkishDiacritic('/isletme/test') → false
 */
export function hasTurkishDiacritic(str: string): boolean {
  return /[ğüşıöçĞÜŞİÖÇ]/.test(str);
}

/**
 * URL path'indeki Türkçe karakterleri ASCII'ye çevir — full-path normalize.
 *
 *   normalizeTurkishPath('/işletme/şanlıurfa-kalesi') → '/isletme/sanliurfa-kalesi'
 */
export function normalizeTurkishPath(path: string): string {
  return normalizeTurkish(path);
}
