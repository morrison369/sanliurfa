/**
 * Dinamik XML Sitemap Endpoint'i
 * 
 * Veritabanindaki mekanlar, blog yazilari ve kategorileri
 * otomatik olarak sitemap'e ekler. Statik sitemap ile birlestirilir.
 * 
 * Bu endpoint SSR modunda calisir ve her istekte guncel verileri
 * veritabanindan ceker. Redis cache ile performans optimize edilmistir.
 */

import type { APIRoute } from 'astro';

const SITE_URL = import.meta.env.SITE_URL || 'https://sanliurfa.com';

/**
 * Sitemap entry interface
 */
interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

/**
 * Cache'den veri al
 */
async function getCachedData(key: string): Promise<string | null> {
  try {
    const { getCache } = await import('../lib/cache');
    const cache = getCache();
    const cached = await cache.get(key);
    return cached;
  } catch {
    return null;
  }
}

/**
 * Cache'e veri kaydet
 */
async function setCachedData(key: string, value: string, ttl: number = 3600): Promise<void> {
  try {
    const { getCache } = await import('../lib/cache');
    const cache = getCache();
    await cache.setex(key, ttl, value);
  } catch {
    // Cache hatasi loglanir ama istek basarisiz olmaz
  }
}

/**
 * Veritabanindan mekanlari getir
 */
async function fetchPlaces(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  try {
    const { getPool } = await import('../lib/postgres');
    const pool = getPool();

    const result = await pool.query(`
      SELECT 
        slug, 
        category, 
        updated_at, 
        created_at,
        status
      FROM places 
      WHERE status = 'active'
      ORDER BY updated_at DESC
    `);

    for (const row of result.rows) {
      const lastmod = row.updated_at || row.created_at;
      const lastmodISO = lastmod ? new Date(lastmod).toISOString() : new Date().toISOString();

      entries.push({
        url: `/places/${row.slug}`,
        lastmod: lastmodISO,
        changefreq: 'weekly',
        priority: 0.9,
      });
    }
  } catch (error) {
    console.error('Mekanlari veritabanindan cekme hatasi:', error);
  }

  return entries;
}

/**
 * Veritabanindan blog yazilarini getir
 */
async function fetchBlogPosts(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  try {
    const { getPool } = await import('../lib/postgres');
    const pool = getPool();

    const result = await pool.query(`
      SELECT 
        slug, 
        category, 
        updated_at, 
        created_at,
        published_at,
        status
      FROM blog_posts 
      WHERE status = 'published'
      ORDER BY published_at DESC
    `);

    for (const row of result.rows) {
      const lastmod = row.updated_at || row.published_at || row.created_at;
      const lastmodISO = lastmod ? new Date(lastmod).toISOString() : new Date().toISOString();

      entries.push({
        url: `/blog/${row.slug}`,
        lastmod: lastmodISO,
        changefreq: 'monthly',
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error('Blog yazilarini veritabanindan cekme hatasi:', error);
  }

  return entries;
}

/**
 * Kategorileri getir
 */
async function fetchCategories(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  // Varsayilan kategoriler
  const defaultCategories = [
    { slug: 'restoran', priority: 0.8 },
    { slug: 'otel', priority: 0.8 },
    { slug: 'tarihi-yerler', priority: 0.8 },
    { slug: 'cafe', priority: 0.8 },
    { slug: 'eglence', priority: 0.7 },
    { slug: 'alisveris', priority: 0.7 },
    { slug: 'dogal-yerler', priority: 0.7 },
    { slug: 'camiler', priority: 0.7 },
    { slug: 'muzeler', priority: 0.7 },
    { slug: 'magaralar', priority: 0.6 },
  ];

  try {
    const { getPool } = await import('../lib/postgres');
    const pool = getPool();

    // Veritabanindan kategorileri cek
    const result = await pool.query(`
      SELECT DISTINCT category, COUNT(*) as place_count
      FROM places 
      WHERE status = 'active'
      GROUP BY category
      ORDER BY place_count DESC
    `);

    for (const row of result.rows) {
      const count = parseInt(row.place_count, 10);
      entries.push({
        url: `/kategori/${row.category}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        // Mekani sayisina gore priority belirle
        priority: count > 10 ? 0.85 : count > 5 ? 0.8 : 0.7,
      });
    }

    // Varsayilan kategorileri de ekle (eger veritabaninda yoksa)
    const dbCategories = new Set(result.rows.map((r: { category: string }) => r.category));
    for (const cat of defaultCategories) {
      if (!dbCategories.has(cat.slug)) {
        entries.push({
          url: `/kategori/${cat.slug}`,
          lastmod: new Date().toISOString(),
          changefreq: 'weekly',
          priority: cat.priority,
        });
      }
    }
  } catch (error) {
    console.error('Kategorileri veritabanindan cekme hatasi:', error);
    // Hata durumunda varsayilan kategorileri kullan
    for (const cat of defaultCategories) {
      entries.push({
        url: `/kategori/${cat.slug}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: cat.priority,
      });
    }
  }

  return entries;
}

/**
 * Etkinlikleri getir
 */
async function fetchEvents(): Promise<SitemapEntry[]> {
  const entries: SitemapEntry[] = [];

  try {
    const { getPool } = await import('../lib/postgres');
    const pool = getPool();

    const result = await pool.query(`
      SELECT 
        slug, 
        updated_at, 
        created_at,
        event_date,
        status
      FROM events 
      WHERE status = 'published'
        AND event_date >= NOW()
      ORDER BY event_date ASC
    `);

    for (const row of result.rows) {
      const lastmod = row.updated_at || row.created_at;
      const lastmodISO = lastmod ? new Date(lastmod).toISOString() : new Date().toISOString();

      entries.push({
        url: `/etkinlikler/${row.slug}`,
        lastmod: lastmodISO,
        changefreq: 'daily', // Yaklasan etkinlikler icin guzel
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error('Etkinlikleri veritabanindan cekme hatasi:', error);
  }

  return entries;
}

/**
 * Statik sitemap entry'leri
 */
function getStaticEntries(): SitemapEntry[] {
  const now = new Date().toISOString();

  return [
    { url: '/', lastmod: now, changefreq: 'daily', priority: 1.0 },
    { url: '/places', lastmod: now, changefreq: 'daily', priority: 0.9 },
    { url: '/blog', lastmod: now, changefreq: 'daily', priority: 0.9 },
    { url: '/etkinlikler', lastmod: now, changefreq: 'daily', priority: 0.8 },
    { url: '/hakkinda', lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { url: '/iletisim', lastmod: now, changefreq: 'monthly', priority: 0.5 },
    { url: '/gizlilik-politikasi', lastmod: now, changefreq: 'yearly', priority: 0.3 },
    { url: '/kullanim-kosullari', lastmod: now, changefreq: 'yearly', priority: 0.3 },
    { url: '/kvkk', lastmod: now, changefreq: 'yearly', priority: 0.3 },
  ];
}

/**
 * Sitemap XML'i olustur
 */
function generateSitemapXML(entries: SitemapEntry[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.map(entry => `  <url>
    <loc>${SITE_URL}${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
}

/**
 * Sitemap index olustur (buyuk siteler icin)
 */
function generateSitemapIndex(sitemaps: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
}

export const GET: APIRoute = async ({ url }) => {
  try {
    // Cache anahtari
    const cacheKey = 'sitemap:dynamic';

    // Cache kontrolu
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600', // 1 saat cache
          'X-Sitemap-Source': 'cache',
        },
      });
    }

    // Query parametrelerini kontrol et
    const searchParams = new URL(url).searchParams;
    const section = searchParams.get('section');

    let allEntries: SitemapEntry[] = [];

    // Statik entry'leri her zaman ekle (section yoksa)
    if (!section) {
      allEntries = allEntries.concat(getStaticEntries());
    }

    // Dinamik entry'leri getir
    if (!section || section === 'places') {
      const places = await fetchPlaces();
      allEntries = allEntries.concat(places);
    }

    if (!section || section === 'blog') {
      const blogPosts = await fetchBlogPosts();
      allEntries = allEntries.concat(blogPosts);
    }

    if (!section || section === 'categories') {
      const categories = await fetchCategories();
      allEntries = allEntries.concat(categories);
    }

    if (!section || section === 'events') {
      const events = await fetchEvents();
      allEntries = allEntries.concat(events);
    }

    // XML olustur
    const sitemapXml = generateSitemapXML(allEntries);

    // Cache'e kaydet (1 saat TTL)
    await setCachedData(cacheKey, sitemapXml, 3600);

    return new Response(sitemapXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=7200', // 1 saat browser, 2 saat CDN
        'X-Sitemap-Source': 'database',
        'X-Sitemap-Entries': allEntries.length.toString(),
      },
    });

  } catch (error) {
    console.error('Sitemap olusturma hatasi:', error);

    // Hata durumunda statik sitemap dondur
    const staticEntries = getStaticEntries();
    const fallbackXml = generateSitemapXML(staticEntries);

    return new Response(fallbackXml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 dakika (hata durumunda kisalt)
        'X-Sitemap-Source': 'fallback',
      },
      status: 200, // 200 dondur, cunku icerik var
    });
  }
};
