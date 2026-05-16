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

export interface LinkRule {
  keyword: string;
  url: string;
  cluster?: 'gezi' | 'gastronomi' | 'mekan' | 'ulasim' | 'saglik' | 'topluluk' | 'kurumsal';
  /** Max occurrence to link (default 2) */
  maxLinks?: number;
  /** Match case-insensitively (default true) */
  caseInsensitive?: boolean;
  /** Title attribute for accessibility */
  title?: string;
}

export interface InternalLinkSuggestion {
  label: string;
  href: string;
  cluster: NonNullable<LinkRule['cluster']>;
  score: number;
  matchedKeywords: string[];
}

export interface LinkifyOptions {
  selfUrl?: string;
  maxTotalLinks?: number;
  rules?: LinkRule[];
}

export interface SuggestionInput {
  text: string;
  selfUrl?: string;
  category?: string | null;
  tags?: Array<string | { name?: string; slug?: string }> | null;
  limit?: number;
}

// Curated link map — Şanlıurfa'nın en yüksek değerli entity ve hub sayfaları.
export const INTERNAL_LINK_RULES: LinkRule[] = [
  // Kritik hub'lar
  { keyword: 'Şanlıurfa mekanları', url: '/mekanlar', cluster: 'mekan', maxLinks: 1 },
  { keyword: 'mekan rehberi', url: '/mekanlar', cluster: 'mekan', maxLinks: 1, caseInsensitive: true },
  { keyword: 'gezilecek yerler', url: '/gezilecek-yerler', cluster: 'gezi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'gezi rehberi', url: '/blog', cluster: 'gezi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'ilçe rehberi', url: '/ilceler', cluster: 'gezi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'nöbetçi eczane', url: '/saglik/nobetci-eczaneler', cluster: 'saglik', maxLinks: 1, caseInsensitive: true },
  { keyword: 'otobüs saatleri', url: '/ulasim/otobus-saatleri', cluster: 'ulasim', maxLinks: 1, caseInsensitive: true },
  { keyword: 'uçak saatleri', url: '/ulasim/ucak-saatleri', cluster: 'ulasim', maxLinks: 1, caseInsensitive: true },
  { keyword: 'etkinlikler', url: '/etkinlikler', cluster: 'topluluk', maxLinks: 1, caseInsensitive: true },
  { keyword: 'topluluk', url: '/topluluk', cluster: 'topluluk', maxLinks: 1, caseInsensitive: true },
  { keyword: 'işletme kaydı', url: '/isletme-kayit', cluster: 'kurumsal', maxLinks: 1, caseInsensitive: true },

  // Tarihi yerler
  { keyword: 'Göbeklitepe', url: '/tarihi-yerler/gobeklitepe', cluster: 'gezi', maxLinks: 2 },
  { keyword: 'Karahantepe', url: '/tarihi-yerler/karahantepe-arkeoloji-alani', cluster: 'gezi', maxLinks: 2 },
  { keyword: 'Balıklıgöl', url: '/gezilecek-yerler/balikligol', cluster: 'gezi', maxLinks: 2 },
  { keyword: 'Harran', url: '/ilceler/harran', cluster: 'gezi', maxLinks: 2 },
  { keyword: 'Halfeti', url: '/ilceler/halfeti', cluster: 'gezi', maxLinks: 2 },
  { keyword: 'Rumkale', url: '/tarihi-yerler/rumkale', cluster: 'gezi', maxLinks: 1 },
  { keyword: 'Birecik', url: '/ilceler/birecik', cluster: 'gezi', maxLinks: 1 },
  { keyword: 'Şanlıurfa Kalesi', url: '/tarihi-yerler/sanliurfa-kalesi', cluster: 'gezi', maxLinks: 1 },
  { keyword: 'Mevlid-i Halil Camii', url: '/tarihi-yerler/mevlid-i-halil-camii', cluster: 'gezi', maxLinks: 1 },

  // Yemek/kategori
  { keyword: 'Şanlıurfa yemek tarifleri', url: '/yemek-tarifleri', cluster: 'gastronomi', maxLinks: 1 },
  { keyword: 'Urfa kebabı', url: '/yemek-tarifleri/urfa-kebabi', cluster: 'gastronomi', maxLinks: 2 },
  { keyword: 'çiğ köfte', url: '/yemek-tarifleri/sanliurfa-cig-koftesi', cluster: 'gastronomi', maxLinks: 2, caseInsensitive: true },
  { keyword: 'lahmacun', url: '/yemek-tarifleri/sanliurfa-lahmacunu', cluster: 'gastronomi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'künefe', url: '/yemek-tarifleri/kunefe', cluster: 'gastronomi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'şıllık tatlısı', url: '/yemek-tarifleri/sillik-tatlisi', cluster: 'gastronomi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'isot', url: '/yemek-tarifleri/isot-ezme', cluster: 'gastronomi', maxLinks: 1, caseInsensitive: true },

  // Kategori sayfaları
  { keyword: 'sıra gecesi', url: '/sanliurfa-sira-gecesi-mekanlari', cluster: 'gastronomi', maxLinks: 2, caseInsensitive: true },
  { keyword: 'kebapçı', url: '/mekanlar/yeme-icme-kebapcilar', cluster: 'mekan', maxLinks: 1, caseInsensitive: true },
  { keyword: 'ciğerci', url: '/mekanlar/yeme-icme-cigerciler', cluster: 'mekan', maxLinks: 1, caseInsensitive: true },
  { keyword: 'kahvaltı', url: '/mekanlar/yeme-icme-kahvalti-mekanlari', cluster: 'mekan', maxLinks: 1, caseInsensitive: true },

  // Hub'lar
  { keyword: 'tarihi yerler', url: '/tarihi-yerler', cluster: 'gezi', maxLinks: 1, caseInsensitive: true },
  { keyword: 'gastronomi', url: '/gastronomi', cluster: 'gastronomi', maxLinks: 1, caseInsensitive: true },
];

const PROTECTED_TAGS = ['a', 'pre', 'code', 'script', 'style', 'noscript'];
const DEFAULT_MAX_TOTAL_LINKS = 12;

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function getLabel(rule: LinkRule): string {
  return rule.title || rule.keyword;
}

function getRuleCluster(rule: LinkRule): NonNullable<LinkRule['cluster']> {
  return rule.cluster || 'mekan';
}

/**
 * Content içinde keyword'leri internal link'e dönüştürür.
 *
 * @param html — kaynak HTML/markdown
 * @param selfUrl — bu sayfanın URL'i (kendine link yok)
 * @returns dönüştürülmüş HTML
 */
export function linkifyContent(html: string, selfUrlOrOptions?: string | LinkifyOptions): string {
  if (!html) return html;
  const options: LinkifyOptions =
    typeof selfUrlOrOptions === 'string' ? { selfUrl: selfUrlOrOptions } : selfUrlOrOptions || {};
  const selfUrl = options.selfUrl;
  const maxTotalLinks = options.maxTotalLinks ?? DEFAULT_MAX_TOTAL_LINKS;
  const rules = [...(options.rules || INTERNAL_LINK_RULES)].sort(
    (a, b) => b.keyword.length - a.keyword.length
  );
  let result = html;
  const counts = new Map<string, number>();
  let totalLinks = 0;

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

  for (const rule of rules) {
    if (selfUrl && rule.url === selfUrl) continue; // kendine link yok
    const max = rule.maxLinks ?? 2;
    const flags = rule.caseInsensitive !== false ? 'gi' : 'g';
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Word boundary ile match (Türkçe karakter aware)
    const re = new RegExp(`(?<![\\wÇĞİıÖŞÜçğıöşü])(${escaped})(?![\\wÇĞİıÖŞÜçğıöşü])`, flags);
    let used = counts.get(rule.url) || 0;
    result = result.replace(re, (match) => {
      if (totalLinks >= maxTotalLinks) return match;
      if (used >= max) return match;
      used++;
      totalLinks++;
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

export function getInternalLinkSuggestions(input: SuggestionInput): InternalLinkSuggestion[] {
  const text = normalizeText(
    [
      input.text,
      input.category || '',
      ...(input.tags || []).map((tag) =>
        typeof tag === 'string' ? tag : `${tag?.name || ''} ${tag?.slug || ''}`
      ),
    ].join(' ')
  );
  const limit = input.limit ?? 6;
  const suggestions = new Map<string, InternalLinkSuggestion>();

  for (const rule of INTERNAL_LINK_RULES) {
    if (input.selfUrl && rule.url === input.selfUrl) continue;
    const keyword = normalizeText(rule.keyword);
    const matched = text.includes(keyword);
    const cluster = getRuleCluster(rule);
    const categoryBoost =
      input.category && normalizeText(input.category).includes(cluster === 'gastronomi' ? 'gastronomi' : cluster)
        ? 2
        : 0;
    if (!matched && categoryBoost === 0) continue;

    const current = suggestions.get(rule.url);
    const score = (matched ? Math.max(2, Math.min(8, rule.keyword.length / 4)) : 0) + categoryBoost;
    const next: InternalLinkSuggestion = {
      label: getLabel(rule),
      href: rule.url,
      cluster,
      score: Number(score.toFixed(2)),
      matchedKeywords: current
        ? [...new Set([...current.matchedKeywords, rule.keyword])]
        : [rule.keyword],
    };
    if (!current || next.score > current.score) suggestions.set(rule.url, next);
  }

  return [...suggestions.values()]
    .sort((a, b) => b.score - a.score || a.href.localeCompare(b.href, 'tr'))
    .slice(0, limit);
}
