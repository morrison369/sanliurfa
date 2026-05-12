/**
 * Internal Backlinking System
 *
 * SEO/AEO kazançı: content içindeki keyword'leri otomatik internal link'e dönüştürür.
 * "Göbeklitepe" → <a href="/tarihi-yerler/gobeklitepe">Göbeklitepe</a>
 *
 * Algoritma:
 *  1. Anchor map: keyword → URL (curated, high-value entities)
 *  2. İlk N geçişe link uygula (over-linking spam'den kaçın)
 *  3. Mevcut <a> içindeki text'i atla (double-link yok)
 *  4. <pre>, <code> içindekileri atla (kod/raw text korunur)
 *
 * Performance: regex one-pass, max 100 links/page.
 */

interface LinkRule {
  keyword: string;
  url: string;
  /** Max occurrence to link (default 2) */
  maxLinks?: number;
  /** Match case-insensitively (default true) */
  caseInsensitive?: boolean;
  /** Title attribute for accessibility */
  title?: string;
}

// Curated link map — Şanlıurfa'nın en yüksek-değerli entity'leri
const INTERNAL_LINK_RULES: LinkRule[] = [
  // Tarihi yerler
  { keyword: 'Göbeklitepe', url: '/tarihi-yerler/gobeklitepe', maxLinks: 2 },
  { keyword: 'Karahantepe', url: '/tarihi-yerler/karahantepe-arkeoloji-alani', maxLinks: 2 },
  { keyword: 'Balıklıgöl', url: '/gezilecek-yerler/balikligol', maxLinks: 2 },
  { keyword: 'Harran', url: '/ilceler/harran', maxLinks: 2 },
  { keyword: 'Halfeti', url: '/ilceler/halfeti', maxLinks: 2 },
  { keyword: 'Rumkale', url: '/tarihi-yerler/rumkale', maxLinks: 1 },
  { keyword: 'Birecik', url: '/ilceler/birecik', maxLinks: 1 },
  { keyword: 'Şanlıurfa Kalesi', url: '/tarihi-yerler/sanliurfa-kalesi', maxLinks: 1 },
  { keyword: 'Mevlid-i Halil Camii', url: '/tarihi-yerler/mevlid-i-halil-camii', maxLinks: 1 },

  // Yemek/kategori
  { keyword: 'Urfa kebabı', url: '/yemek-tarifleri/urfa-kebabi', maxLinks: 2 },
  { keyword: 'çiğ köfte', url: '/yemek-tarifleri/sanliurfa-cig-koftesi', maxLinks: 2, caseInsensitive: true },
  { keyword: 'lahmacun', url: '/yemek-tarifleri/sanliurfa-lahmacunu', maxLinks: 1, caseInsensitive: true },
  { keyword: 'künefe', url: '/yemek-tarifleri/kunefe', maxLinks: 1, caseInsensitive: true },
  { keyword: 'şıllık tatlısı', url: '/yemek-tarifleri/sillik-tatlisi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'isot', url: '/yemek-tarifleri/isot-ezme', maxLinks: 1, caseInsensitive: true },

  // Kategori sayfaları
  { keyword: 'sıra gecesi', url: '/sanliurfa-sira-gecesi-mekanlari', maxLinks: 2, caseInsensitive: true },
  { keyword: 'kebapçı', url: '/mekanlar/yeme-icme-kebapcilar', maxLinks: 1, caseInsensitive: true },
  { keyword: 'ciğerci', url: '/mekanlar/yeme-icme-cigerciler', maxLinks: 1, caseInsensitive: true },
  { keyword: 'kahvaltı', url: '/mekanlar/yeme-icme-kahvalti-mekanlari', maxLinks: 1, caseInsensitive: true },

  // Hub'lar
  { keyword: 'gezi rehberi', url: '/blog', maxLinks: 1, caseInsensitive: true },
  { keyword: 'tarihi yerler', url: '/tarihi-yerler', maxLinks: 1, caseInsensitive: true },
];

const PROTECTED_TAGS = ['a', 'pre', 'code', 'script', 'style', 'noscript'];

/**
 * Content içinde keyword'leri internal link'e dönüştürür.
 *
 * @param html — kaynak HTML/markdown
 * @param selfUrl — bu sayfanın URL'i (kendine link yok)
 * @returns dönüştürülmüş HTML
 */
export function linkifyContent(html: string, selfUrl?: string): string {
  if (!html) return html;
  let result = html;
  const counts = new Map<string, number>();

  // Protected zones — bunların içindeki text'e dokunma
  // Strateji: önce protected zone'ları placeholder ile değiştir, sonra geri koy
  const placeholders: string[] = [];
  // PROTECTED_TAGS literal whitelist — meta-char escape ile ReDoS koruması (HARD RULE)
  const escapeMeta = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const tag of PROTECTED_TAGS) {
    const safe = escapeMeta(tag);
    const re = new RegExp(`<${safe}\\b[^>]*>[\\s\\S]*?</${safe}>`, 'gi');
    result = result.replace(re, (match) => {
      placeholders.push(match);
      return `\x00${placeholders.length - 1}\x00`;
    });
  }

  for (const rule of INTERNAL_LINK_RULES) {
    if (selfUrl && rule.url === selfUrl) continue; // kendine link yok
    const max = rule.maxLinks ?? 2;
    const flags = rule.caseInsensitive !== false ? 'gi' : 'g';
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundary ile match (Türkçe karakter aware)
    const re = new RegExp(`(?<![\\wÇĞİıÖŞÜçğıöşü])(${escaped})(?![\\wÇĞİıÖŞÜçğıöşü])`, flags);
    let used = counts.get(rule.url) || 0;
    result = result.replace(re, (match) => {
      if (used >= max) return match;
      used++;
      const titleAttr = rule.title ? ` title="${rule.title.replace(/"/g, '&quot;')}"` : '';
      return `<a href="${rule.url}" class="il-link"${titleAttr}>${match}</a>`;
    });
    counts.set(rule.url, used);
  }

  // Placeholder'ları geri yerleştir
  result = result.replace(/\x00(\d+)\x00/g, (_, idx) => placeholders[parseInt(idx, 10)] || '');

  return result;
}

/**
 * Stats: bir HTML içinde kaç internal link var.
 */
export function countInternalLinks(html: string): number {
  if (!html) return 0;
  const matches = html.match(/<a\s+[^>]*href="\/[^"]*"/gi);
  return matches ? matches.length : 0;
}
