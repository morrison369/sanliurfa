import type { APIRoute } from 'astro';

const BASE_URL = process.env.PUBLIC_APP_URL || 'https://sanliurfa.com';

export const GET: APIRoute = async () => {
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
    '/_astro/',
    '/private/',
  ];

  const robots = isProduction
    ? `# Robots.txt for Şanlıurfa.com
User-agent: *
Allow: /
${disallowedPaths.map(path => `Disallow: ${path}`).join('\n')}

# Sitemap
Sitemap: ${BASE_URL}/sitemap.xml

# Crawl-delay
Crawl-delay: 1

# Allow specific bots
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
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
