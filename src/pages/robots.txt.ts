/**
 * Robots.txt for SEO crawlability
 * Guides search engine crawlers on what to index
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const baseUrl = process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';

  const robotsTxt = `# Robots.txt - Şanlıurfa.com
# Generated dynamically for search engine crawlers

# Default crawler rules
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
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
Disallow: /işletme
Disallow: /koleksiyonlar
Disallow: /kullanici
Disallow: /loyalty
Disallow: /mesajlar
Disallow: /notifications
Disallow: /profil
Disallow: /profile
Disallow: /raporlar
Disallow: /sosyal
Disallow: /veri-ambarı
Disallow: /webhooks
Disallow: /_astro/
Disallow: /search
Disallow: /*?*sort=
Disallow: /*?*page=
Disallow: /*?*filter=
Disallow: /*.json
Disallow: /*.css
Disallow: /*.js
Crawl-delay: 1

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (in seconds) to be respectful
Crawl-delay: 1

# Request rate (pages per second) - optional
Request-rate: 1/1
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400', // 24 hours
    },
  });
};
