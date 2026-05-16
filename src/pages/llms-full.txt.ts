/**
 * GEO/AIO: AI Agent Full Content Export
 *
 * llms-full.txt — llms.txt'in genişletilmiş hali. AI agent'lar (ChatGPT,
 * Perplexity, Claude) için tam metinli içerik. Markdown formatında çıktı.
 *
 * Spec: https://llmstxt.org/
 *
 * İçerik:
 *   - Site overview
 *   - Tüm published blog posts (excerpt + URL + tarih)
 *   - Tüm published recipes (özet + URL)
 *   - Tüm published historical sites
 *   - Top mekanlar (rating > 4.5)
 *   - Tüm aktif etkinlikler
 *
 * Cache: 1h browser, 24h shared cache (buyuk dosya, sik degismez).
 */
import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';
import { getPublicAppUrl } from '../lib/public-app-url';
import { logger } from '../lib/logging';

export const GET: APIRoute = async () => {
  const baseUrl = getPublicAppUrl();
  const lines: string[] = [];

  lines.push('# Sanliurfa.com — Şanlıurfa Şehir Rehberi (Full Content)');
  lines.push('');
  lines.push('> AI Agents için kapsamlı içerik export. Şanlıurfa hakkında soruları yanıtlamak için kaynak.');
  lines.push('> Spec: https://llmstxt.org/');
  lines.push('');
  lines.push(`> Updated: ${new Date().toISOString()}`);
  lines.push('');

  try {
    // Blog posts
    const blogs = await query<{ slug: string; title: string; excerpt: string; published_at: string; category: string }>(
      `SELECT slug, title, COALESCE(excerpt, '') AS excerpt, published_at::text, COALESCE(category, '') AS category
       FROM blog_posts WHERE status = 'published' AND published_at <= NOW()
       ORDER BY published_at DESC`,
    ).catch(() => ({ rows: [] }));

    if (blogs.rows.length > 0) {
      lines.push('## Blog Yazıları');
      lines.push('');
      for (const b of blogs.rows) {
        lines.push(`### [${b.title}](${baseUrl}/blog/${b.slug})`);
        if (b.category) lines.push(`Kategori: ${b.category}`);
        if (b.published_at) lines.push(`Tarih: ${b.published_at.slice(0, 10)}`);
        if (b.excerpt) lines.push('');
        if (b.excerpt) lines.push(b.excerpt.slice(0, 400));
        lines.push('');
      }
    }

    // Recipes
    const recipes = await query<{ slug: string; name: string; description: string }>(
      `SELECT slug, name, COALESCE(description, '') AS description
       FROM recipes WHERE status = 'published'
       ORDER BY name`,
    ).catch(() => ({ rows: [] }));

    if (recipes.rows.length > 0) {
      lines.push('## Yemek Tarifleri');
      lines.push('');
      for (const r of recipes.rows) {
        lines.push(`- [${r.name}](${baseUrl}/yemek-tarifleri/${r.slug}) — ${r.description.slice(0, 200)}`);
      }
      lines.push('');
    }

    // Historical sites
    const sites = await query<{ slug: string; name: string; description: string }>(
      `SELECT slug, name, COALESCE(description, '') AS description
       FROM historical_sites WHERE status = 'published'
       ORDER BY name`,
    ).catch(() => ({ rows: [] }));

    if (sites.rows.length > 0) {
      lines.push('## Tarihi Yerler');
      lines.push('');
      for (const s of sites.rows) {
        lines.push(`### [${s.name}](${baseUrl}/tarihi-yerler/${s.slug})`);
        if (s.description) lines.push('');
        if (s.description) lines.push(s.description.slice(0, 500));
        lines.push('');
      }
    }

    // Top rated places
    const places = await query<{ slug: string; name: string; description: string; rating: string }>(
      `SELECT slug, name, COALESCE(description, '') AS description, COALESCE(rating::text, '0') AS rating
       FROM places WHERE status = 'active' AND rating >= 4.5
       ORDER BY rating DESC, review_count DESC NULLS LAST
       LIMIT 100`,
    ).catch(() => ({ rows: [] }));

    if (places.rows.length > 0) {
      lines.push('## Öne Çıkan Mekanlar (4.5+ puan)');
      lines.push('');
      for (const p of places.rows) {
        const rating = parseFloat(p.rating);
        lines.push(`- [${p.name}](${baseUrl}/isletme/${p.slug}) (${rating.toFixed(1)}★) — ${p.description.slice(0, 150)}`);
      }
      lines.push('');
    }

    // Upcoming events
    const events = await query<{ slug: string; title: string; description: string; start_date: string; location: string }>(
      `SELECT slug, title, COALESCE(description, '') AS description, start_date::text, COALESCE(location, '') AS location
       FROM events
       WHERE status = 'published'
         AND start_date >= NOW()
         AND start_date <= NOW() + INTERVAL '180 days'
       ORDER BY start_date ASC`,
    ).catch(() => ({ rows: [] }));

    if (events.rows.length > 0) {
      lines.push('## Yaklaşan Etkinlikler');
      lines.push('');
      for (const e of events.rows) {
        const date = e.start_date.slice(0, 10);
        lines.push(`### [${e.title}](${baseUrl}/etkinlikler/${e.slug})`);
        lines.push(`Tarih: ${date}${e.location ? ` · Mekan: ${e.location}` : ''}`);
        if (e.description) lines.push('');
        if (e.description) lines.push(e.description.slice(0, 300));
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('Bu içerik AI agent'.replace(/'/g, '') + 'lar için optimize edilmiştir. Tam içerik:');
    lines.push(`- Sitemap: ${baseUrl}/sitemap.xml`);
    lines.push(`- llms.txt: ${baseUrl}/llms.txt`);
    lines.push(`- robots.txt: ${baseUrl}/robots.txt`);
    lines.push('');
  } catch (err) {
    logger.error('llms-full.txt generation failed', err instanceof Error ? err : new Error(String(err)));
    lines.push('# Error generating full content');
  }

  return new Response(lines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      'X-Robots-Tag': 'index, follow',
    },
  });
};
