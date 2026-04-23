/**
 * Robots.txt for SEO crawlability
 * Guides search engine crawlers on what to index
 */

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const baseUrl = process.env.PUBLIC_SITE_URL || "https://sanliurfa.com";

  const robotsTxt = `# robots.txt for sanliurfa.com
# Generated dynamically for search engine and AI crawlers

User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /profil/
Disallow: /giris
Disallow: /kayit
Disallow: /abonelik
Disallow: /akis
Disallow: /aktivitelerim
Disallow: /ayarlar
Disallow: /bildirimler
Disallow: /bildirim-tercihleri
Disallow: /canli-analitik
Disallow: /icerik
Disallow: /isletme
Disallow: /koleksiyonlar
Disallow: /kullanici
Disallow: /loyalty
Disallow: /mesajlar
Disallow: /notifications
Disallow: /profil
Disallow: /profile
Disallow: /raporlar
Disallow: /sosyal
Disallow: /veri-ambari
Disallow: /webhooks
Disallow: /*?*sort=
Disallow: /*?*page=
Disallow: /*?*filter=
Crawl-delay: 1

# Sitemap
Sitemap: ${baseUrl}/sitemap-index.xml
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/blog/sitemap.xml

# Public AI discovery
# See: ${baseUrl}/llms.txt
# See: ${baseUrl}/ai.txt

# AI search crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /
`;

  return new Response(robotsTxt, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400", // 24 hours
    },
  });
};
