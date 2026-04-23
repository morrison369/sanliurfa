export interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  images?: Array<{
    loc: string;
    title?: string;
  }>;
}

export const NOINDEX_SITEMAP_PATHS = ["/arama", "/kullanici/sadakat"] as const;

export const PUBLIC_STATIC_SITEMAP_ENTRIES: SitemapEntry[] = [
  { loc: "/", changefreq: "daily", priority: 1.0 },
  { loc: "/places", changefreq: "daily", priority: 0.9 },
  { loc: "/kullanicilar", changefreq: "weekly", priority: 0.6 },
  { loc: "/tarihi-yerler", changefreq: "weekly", priority: 0.8 },
  { loc: "/gastronomi", changefreq: "weekly", priority: 0.8 },
  {
    loc: "/sehir-servisleri",
    changefreq: "weekly",
    priority: 0.8,
  },
  {
    loc: "/sehir-servisleri/nobetci-eczaneler",
    changefreq: "daily",
    priority: 0.8,
  },
  {
    loc: "/sehir-servisleri/otobus-saatleri",
    changefreq: "weekly",
    priority: 0.7,
  },
  {
    loc: "/sehir-servisleri/ucak-saatleri",
    changefreq: "weekly",
    priority: 0.7,
  },
  { loc: "/etkinlikler", changefreq: "weekly", priority: 0.8 },
  { loc: "/blog", changefreq: "weekly", priority: 0.8 },
  { loc: "/oneriler", changefreq: "weekly", priority: 0.7 },
  {
    loc: "/liderlik-tablosu",
    changefreq: "weekly",
    priority: 0.7,
  },
  {
    loc: "/fiyatlandirma",
    changefreq: "monthly",
    priority: 0.6,
  },
  { loc: "/hakkinda", changefreq: "monthly", priority: 0.7 },
  { loc: "/iletisim", changefreq: "monthly", priority: 0.7 },
  { loc: "/sss", changefreq: "monthly", priority: 0.6 },
  {
    loc: "/gizlilik-politikasi",
    changefreq: "monthly",
    priority: 0.5,
  },
  {
    loc: "/kullanim-kosullari",
    changefreq: "monthly",
    priority: 0.5,
  },
  {
    loc: "/cerez-politikasi",
    changefreq: "monthly",
    priority: 0.5,
  },
  { loc: "/kvkk", changefreq: "monthly", priority: 0.5 },
];
