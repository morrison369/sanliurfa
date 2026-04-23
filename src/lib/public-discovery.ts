const CANONICAL_SITE_URL = "https://sanliurfa.com";

export const PUBLIC_DISCOVERY_PATHS = [
  "/rss.xml",
  "/robots.txt",
  "/sitemap.xml",
  "/sitemap-index.xml",
  "/blog/sitemap.xml",
  "/llms.txt",
  "/ai.txt",
  "/humans.txt",
] as const;

export const PRIVATE_CRAWL_DISALLOWS = [
  "/api/",
  "/admin/",
  "/profil/",
  "/giris",
  "/kayit",
  "/abonelik",
  "/akis",
  "/aktivitelerim",
  "/ayarlar",
  "/bildirimler",
  "/bildirim-tercihleri",
  "/canli-analitik",
  "/icerik",
  "/isletme",
  "/koleksiyonlar",
  "/kullanici",
  "/loyalty",
  "/mesajlar",
  "/notifications",
  "/profil",
  "/profile",
  "/raporlar",
  "/sosyal",
  "/veri-ambari",
  "/webhooks",
  "/*?*sort=",
  "/*?*page=",
  "/*?*filter=",
] as const;

export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-User",
  "Google-Extended",
] as const;

export const SEARCH_CRAWLER_USER_AGENTS = ["Bingbot", "DuckDuckBot"] as const;

export function normalizeSiteUrl(siteUrl = CANONICAL_SITE_URL): string {
  return siteUrl.replace(/\/$/, "");
}

export function buildRobotsTxt(siteUrl = CANONICAL_SITE_URL): string {
  const baseUrl = normalizeSiteUrl(siteUrl);
  const disallowLines = PRIVATE_CRAWL_DISALLOWS.map(
    (path) => `Disallow: ${path}`,
  ).join("\n");
  const sitemapLines = [
    "/sitemap-index.xml",
    "/sitemap.xml",
    "/blog/sitemap.xml",
  ]
    .map((path) => `Sitemap: ${baseUrl}${path}`)
    .join("\n");
  const crawlerLines = [
    ...AI_CRAWLER_USER_AGENTS,
    ...SEARCH_CRAWLER_USER_AGENTS,
  ]
    .map((agent) => `User-agent: ${agent}\nAllow: /`)
    .join("\n\n");

  return `# robots.txt for sanliurfa.com
# Generated from src/lib/public-discovery.ts

User-agent: *
Allow: /
${disallowLines}
Crawl-delay: 1

# Sitemap
${sitemapLines}

# Public AI discovery
# See: ${baseUrl}/llms.txt
# See: ${baseUrl}/ai.txt
# See: ${baseUrl}/humans.txt

# AI and search crawlers
${crawlerLines}
`;
}
