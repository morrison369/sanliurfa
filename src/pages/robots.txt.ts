/**
 * Robots.txt for SEO crawlability
 * Guides search engine crawlers on what to index
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const baseUrl = process.env.PUBLIC_SITE_URL || 'https://sanliurfa.com';

  const robotsTxt = `# Robots.txt - Şanlıurfa.com
# Generated dynamically for search engine crawlers

# Allow all crawlers
User-agent: *
Allow: /

# Specific rules for Google
User-agent: Googlebot
Allow: /
Crawl-delay: 1

# Specific rules for Bing
User-agent: Bingbot
Allow: /
Crawl-delay: 1

# Disallow paths
User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /auth/
Disallow: /giris
Disallow: /kayit
Disallow: /_astro/
Disallow: /search
Disallow: /*?*sort=
Disallow: /*?*page=
Disallow: /*?*filter=
Disallow: /*.json
Disallow: /*.css
Disallow: /*.js

# Allow specific admin pages if needed
# Allow: /admin/public/

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
