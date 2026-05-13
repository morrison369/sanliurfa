import type { APIRoute } from 'astro';
import { getSiteBranding } from '../lib/site-branding';

export const GET: APIRoute = async () => {
  const { baseUrl, siteName } = await getSiteBranding();
  const isProduction = process.env.NODE_ENV === 'production';

  // Disallow paths
  const disallowedPaths = [
    '/admin',
    '/api/',
    '/giris',
    '/kayit',
    '/sifre-sifirla',
    '/hesabim',
    '/mesajlar',
    '/profil',
    '/ayarlar',
    '/bildirimler',
    '/akis',
    '/aktivitelerim',
    '/koleksiyonlar',
    '/favoriler',
    '/vendor/',
    '/_astro/',
    '/private/',
  ];

  const robots = isProduction
    ? `# Robots.txt for ${siteName}
User-agent: *
Allow: /
${disallowedPaths.map(path => `Disallow: ${path}`).join('\n')}

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/sitemap-dynamic.xml

# Crawl-delay
Crawl-delay: 1

# Allow specific bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: YandexBot
Allow: /

User-agent: Applebot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: ClaudeBot
Allow: /

# Block bad bots
User-agent: MJ12bot
Disallow: /

User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /
`
    : `# Development - Block all crawlers
User-agent: *
Disallow: /
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
