/**
 * Sitemap helpers — paylaşılan XML builder + type definitions.
 *
 * Bölümlü (index-based) sitemap mimarisi:
 *   /sitemap.xml              → SitemapIndex (alt sitemap'lere referans)
 *   /sitemap-core.xml         → temel/hub/landing sayfalar (statik)
 *   /sitemap-blog.xml         → blog yazıları + news extension
 *   /sitemap-places.xml       → mekanlar + image extension
 *   /sitemap-categories.xml   → kategori sayfaları (mekanlar/{kategori})
 *   /sitemap-ilceler.xml      → ilçe + mahalle + ilçe×kategori
 *   /sitemap-events.xml       → etkinlikler (180 gün)
 *   /sitemap-recipes.xml      → yemek tarifleri + image
 *   /sitemap-historical.xml   → tarihi yerler + image
 *   /sitemap-guides.xml       → gezi rehberleri (master + 10 ilçe)
 */
import { logger } from '../logging';

const DEFAULT_SITEMAP_SOURCE_TIMEOUT_MS = 1200;

function resolveSitemapSourceTimeoutMs(timeoutMs?: number): number {
  if (typeof timeoutMs === 'number' && Number.isFinite(timeoutMs) && timeoutMs >= 100) {
    return timeoutMs;
  }

  const envTimeout = Number(process.env.SITEMAP_SOURCE_TIMEOUT_MS || DEFAULT_SITEMAP_SOURCE_TIMEOUT_MS);
  if (Number.isFinite(envTimeout) && envTimeout >= 100) {
    return envTimeout;
  }

  return DEFAULT_SITEMAP_SOURCE_TIMEOUT_MS;
}

export type ChangeFreq =
  | 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: ChangeFreq;
  priority: number;
  imageUrl?: string | undefined;
  imageTitle?: string | undefined;
  imageCaption?: string | undefined;
  /** Google News extension — sadece son 48 saatte yayınlanan blog post için */
  newsPublication?: { name: string; language: 'tr' } | undefined;
  newsPublicationDate?: string | undefined;
  newsTitle?: string | undefined;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toIsoLastmod(value: Date | string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return fallback;
    return d.toISOString();
  } catch {
    return fallback;
  }
}

export function resolveImageUrl(rawUrl: string | null | undefined, baseUrl: string): string | undefined {
  if (!rawUrl || !rawUrl.trim()) return undefined;
  return rawUrl.startsWith('http') ? rawUrl : `${baseUrl}${rawUrl}`;
}

/**
 * Tek URL entry'sini XML <url> bloğu olarak render eder.
 * Image extension + News extension destekli.
 */
function renderEntry(entry: SitemapEntry, baseUrl: string): string {
  const imageBlock = entry.imageUrl
    ? `\n    <image:image>\n      <image:loc>${escapeXml(entry.imageUrl)}</image:loc>${entry.imageTitle ? `\n      <image:title>${escapeXml(entry.imageTitle)}</image:title>` : ''}${entry.imageCaption ? `\n      <image:caption>${escapeXml(entry.imageCaption.substring(0, 240))}</image:caption>` : ''}\n    </image:image>`
    : '';
  const newsBlock = entry.newsPublication && entry.newsTitle && entry.newsPublicationDate
    ? `\n    <news:news>\n      <news:publication>\n        <news:name>${escapeXml(entry.newsPublication.name)}</news:name>\n        <news:language>${entry.newsPublication.language}</news:language>\n      </news:publication>\n      <news:publication_date>${entry.newsPublicationDate}</news:publication_date>\n      <news:title>${escapeXml(entry.newsTitle)}</news:title>\n    </news:news>`
    : '';
  return `  <url>
    <loc>${baseUrl}${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority.toFixed(2)}</priority>${imageBlock}${newsBlock}
  </url>`;
}

/**
 * Bir alt-sitemap (urlset) XML belgesi oluşturur.
 * @param entries URL listesi
 * @param baseUrl https://sanliurfa.com
 * @param opts.news true ise news namespace ekler
 */
export function buildUrlsetXml(
  entries: SitemapEntry[],
  baseUrl: string,
  opts: { news?: boolean } = {},
): string {
  // URL bazlı dedupe
  const unique = Array.from(new Map(entries.map((e) => [e.url, e])).values());
  const ns = [
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    opts.news ? 'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"' : '',
  ].filter(Boolean).join('\n        ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${ns}>
${unique.map((e) => renderEntry(e, baseUrl)).join('\n')}
</urlset>`;
}

/**
 * SitemapIndex (üst seviye) XML belgesi oluşturur.
 * /sitemap.xml endpoint'i bunu döner; Google buradan alt sitemap'leri keşfeder.
 */
export interface IndexedSitemap {
  /** Sub-sitemap path, ör. '/sitemap-blog.xml' */
  path: string;
  /** ISO datetime — son güncelleme */
  lastmod: string;
}

export async function withSitemapSourceFallback<T>(
  source: Promise<T> | (() => Promise<T>),
  fallback: T,
  opts: { label: string; timeoutMs?: number },
): Promise<T> {
  const timeoutMs = resolveSitemapSourceTimeoutMs(opts.timeoutMs);
  const start = Date.now();
  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  return new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      logger.warn('Sitemap source timeout, fallback applied', {
        label: opts.label,
        timeoutMs,
        elapsedMs: Date.now() - start,
      });
      resolve(fallback);
    }, timeoutMs);

    const promise = typeof source === 'function' ? source() : source;
    void promise
      .then((result) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        logger.warn('Sitemap source failed, fallback applied', {
          label: opts.label,
          error: error instanceof Error ? error.message : String(error),
          elapsedMs: Date.now() - start,
        });
        resolve(fallback);
      });
  });
}

export function buildSitemapIndexXml(items: IndexedSitemap[], baseUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map((s) => `  <sitemap>
    <loc>${baseUrl}${s.path}</loc>
    <lastmod>${s.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

/**
 * Cache header standardı — tüm sitemap endpoint'lerinde aynı.
 */
export const SITEMAP_CACHE_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=86400',
} as const;
