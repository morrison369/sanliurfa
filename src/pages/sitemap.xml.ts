import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';
import { getSiteBranding } from '../lib/site-branding';

interface SitemapEntry {
  url: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

export const GET: APIRoute = async () => {
  const { baseUrl } = await getSiteBranding();
  const entries: SitemapEntry[] = [];
  const now = new Date().toISOString();

  // Statik sayfalar
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' as const },
    { url: '/mekanlar', priority: 0.9, changefreq: 'daily' as const },
    { url: '/gezilecek-yerler', priority: 0.9, changefreq: 'weekly' as const },
    { url: '/ilceler', priority: 0.9, changefreq: 'weekly' as const },
    { url: '/yeme-icme', priority: 0.9, changefreq: 'weekly' as const },
    { url: '/blog', priority: 0.9, changefreq: 'daily' as const },
    { url: '/etkinlikler', priority: 0.8, changefreq: 'daily' as const },
    { url: '/topluluk', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/eslesme', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/isletme-kayit', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/kesfet', priority: 0.7, changefreq: 'daily' as const },
    { url: '/harita', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/gastronomi', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/yemek-tarifleri', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/tarihi-yerler', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/saglik/nobetci-eczaneler', priority: 0.8, changefreq: 'daily' as const },
    { url: '/saglik', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/egitim', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/ulasim', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/alisveris', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/hizmetler', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/emlak', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/konaklama', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/ulasim/otobus-saatleri', priority: 0.8, changefreq: 'daily' as const },
    { url: '/ulasim/ucak-saatleri', priority: 0.8, changefreq: 'daily' as const },
    { url: '/en-iyi-kebapcilar', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/en-iyi-cigerciler', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/sanliurfa-kahvalti-mekanlari', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/sanliurfada-ne-yenir', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/sanliurfa-sira-gecesi-mekanlari', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/sanliurfa-gece-acik-mekanlar', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/bugun-sanliurfada-ne-yapilir', priority: 0.8, changefreq: 'daily' as const },
    { url: '/isletme/gobeklitepe', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/isletme/balikligol', priority: 0.8, changefreq: 'weekly' as const },
    { url: '/isletme/harran', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/isletme/halfeti', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/isletme/urfa-kalesi', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/isletme/ayna-carsi', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/isletme/kapali-carsi', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/mahalleler', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/liderlik-tablosu', priority: 0.6, changefreq: 'daily' as const },
    { url: '/siralamalar', priority: 0.6, changefreq: 'daily' as const },
    { url: '/oneriler', priority: 0.7, changefreq: 'daily' as const },
    { url: '/trend', priority: 0.7, changefreq: 'daily' as const },
    { url: '/arama/gelismis', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/isletme', priority: 0.8, changefreq: 'daily' as const },
    { url: '/kullanicilar', priority: 0.5, changefreq: 'daily' as const },
    // İlçeler (eksik olanlar)
    { url: '/ilceler/bozova', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/ilceler/ceylanpinar', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/ilceler/akcakale', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/ilceler/suruc', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/ilceler/hilvan', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/hakkinda', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/hakkimizda', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/iletisim', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/sss', priority: 0.5, changefreq: 'monthly' as const },
    { url: '/fiyatlandirma', priority: 0.3, changefreq: 'monthly' as const },
    { url: '/icerik-rehberi', priority: 0.3, changefreq: 'monthly' as const },
    { url: '/cerez-politikasi', priority: 0.2, changefreq: 'yearly' as const },
    { url: '/gizlilik-politikasi', priority: 0.2, changefreq: 'yearly' as const },
    { url: '/kullanim-kosullari', priority: 0.2, changefreq: 'yearly' as const },
    { url: '/kvkk', priority: 0.2, changefreq: 'yearly' as const },
    // Yeme-içme alt kategorileri
    { url: '/yeme-icme/kebapcilar', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/yeme-icme/cigerciler', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/yeme-icme/lahmacuncular', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/yeme-icme/kahvalti', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/yeme-icme/kafeler', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/yeme-icme/tatlicilar', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/yeme-icme/cig-kofteciler', priority: 0.6, changefreq: 'weekly' as const },
    // Mahalleler ilçe index sayfaları
    { url: '/mahalleler/eyyubiye', priority: 0.5, changefreq: 'monthly' as const },
    { url: '/mahalleler/haliliye', priority: 0.5, changefreq: 'monthly' as const },
    { url: '/mahalleler/karakopru', priority: 0.5, changefreq: 'monthly' as const },
    { url: '/mahalleler/siverek', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/mahalleler/viransehir', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/mahalleler/birecik', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/mahalleler/halfeti', priority: 0.4, changefreq: 'monthly' as const },
    { url: '/mahalleler/harran', priority: 0.4, changefreq: 'monthly' as const },
    // Hizmetler alt-kategorileri
    { url: '/hizmetler/kuaforler', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/hizmetler/berberler', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/hizmetler/temizlik-firmalari', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/hizmetler/nakliyat', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/hizmetler/cilingir', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/hizmetler/elektrikci', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/hizmetler/tesisatci', priority: 0.7, changefreq: 'weekly' as const },
    // Sağlık alt-kategorileri
    { url: '/saglik/devlet-hastaneleri', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/saglik/ozel-hastaneler', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/saglik/dis-klinikleri', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/saglik/eczaneler', priority: 0.7, changefreq: 'daily' as const },
    { url: '/saglik/veterinerler', priority: 0.6, changefreq: 'weekly' as const },
    // Eğitim alt-kategorileri
    { url: '/egitim/anaokullari', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/egitim/okullar', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/egitim/universiteler', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/egitim/dershaneler', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/egitim/kurslar', priority: 0.6, changefreq: 'weekly' as const },
    // Emlak alt-kategorileri
    { url: '/emlak/satilik-daire', priority: 0.7, changefreq: 'daily' as const },
    { url: '/emlak/kiralik-daire', priority: 0.7, changefreq: 'daily' as const },
    { url: '/emlak/emlak-ofisleri', priority: 0.6, changefreq: 'weekly' as const },
    // Alışveriş alt-kategorileri
    { url: '/alisveris/avmler', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/alisveris/hediyelik-esya', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/alisveris/yoresel-urunler', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/alisveris/kuyumcular', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/alisveris/giyim-magazalari', priority: 0.6, changefreq: 'weekly' as const },
    // Konaklama alt-kategorileri
    { url: '/konaklama/oteller', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/konaklama/butik-oteller', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/konaklama/pansiyonlar', priority: 0.6, changefreq: 'weekly' as const },
    // Ulaşım alt-kategorileri
    { url: '/ulasim/otogar', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/ulasim/havalimani', priority: 0.7, changefreq: 'weekly' as const },
    { url: '/ulasim/taksi-duraklari', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/ulasim/arac-kiralama', priority: 0.6, changefreq: 'weekly' as const },
    { url: '/ulasim/otobus-hatlari', priority: 0.6, changefreq: 'weekly' as const },
  ];

  for (const page of staticPages) {
    entries.push({ url: page.url, lastmod: now, changefreq: page.changefreq, priority: page.priority });
  }

  try {
    // Kategori sayfaları
    const categories = await query("SELECT slug FROM categories WHERE is_active = true AND parent_id IS NOT NULL");
    for (const cat of categories.rows) {
      entries.push({ url: `/mekanlar/${cat.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.7 });
      entries.push({ url: `/kategori/${cat.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.6 });
    }

    // İlçe sayfaları
    const districts = await query("SELECT slug FROM districts");
    for (const d of districts.rows) {
      entries.push({ url: `/ilceler/${d.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.7 });
    }

    // Mekan detay sayfaları için tek kanonik URL: /isletme/
    const places = await query("SELECT slug, updated_at FROM places WHERE status = 'active' ORDER BY rating DESC LIMIT 500");
    for (const p of places.rows) {
      entries.push({ url: `/isletme/${p.slug}`, lastmod: p.updated_at || now, changefreq: 'weekly', priority: 0.7 });
    }

    // Tarihi yerler — her iki URL rotası için
    const sites = await query("SELECT slug, updated_at FROM historical_sites WHERE status = 'active'");
    for (const s of sites.rows) {
      entries.push({ url: `/gezilecek-yerler/${s.slug}`, lastmod: s.updated_at || now, changefreq: 'monthly', priority: 0.6 });
      entries.push({ url: `/tarihi-yerler/${s.slug}`, lastmod: s.updated_at || now, changefreq: 'monthly', priority: 0.7 });
    }

    // Blog yazıları
    const posts = await query("SELECT slug, published_at FROM blog_posts WHERE status = 'published' ORDER BY published_at DESC LIMIT 100");
    for (const p of posts.rows) {
      entries.push({ url: `/blog/${p.slug}`, lastmod: p.published_at || now, changefreq: 'monthly', priority: 0.6 });
    }

    // SEO landing sayfaları
    const seoPages = await query("SELECT slug FROM seo_pages WHERE is_active = true");
    for (const sp of seoPages.rows) {
      entries.push({ url: `/${sp.slug}`, lastmod: now, changefreq: 'weekly', priority: 0.8 });
    }

    // Etkinlikler
    const events = await query(
      "SELECT slug, updated_at FROM events WHERE status = 'published' AND start_date >= NOW() ORDER BY start_date ASC"
    );
    for (const e of events.rows) {
      entries.push({ url: `/etkinlikler/${e.slug}`, lastmod: e.updated_at || now, changefreq: 'daily', priority: 0.8 });
    }

    // Yemek tarifleri
    const recipes = await query(
      "SELECT slug, updated_at FROM recipes WHERE status = 'published' ORDER BY is_featured DESC, rating DESC NULLS LAST"
    );
    for (const r of recipes.rows) {
      entries.push({ url: `/yemek-tarifleri/${r.slug}`, lastmod: r.updated_at || now, changefreq: 'monthly', priority: 0.7 });
    }

    // Mahalleler
    const neighborhoods = await query(
      "SELECT n.slug AS mahalle_slug, d.slug AS district_slug FROM neighborhoods n JOIN districts d ON d.id = n.district_id ORDER BY d.name, n.name"
    );
    for (const n of neighborhoods.rows) {
      entries.push({ url: `/mahalleler/${n.district_slug}/${n.mahalle_slug}`, lastmod: now, changefreq: 'monthly', priority: 0.5 });
    }
  } catch (e) {
    console.error('Sitemap DB error (using static only):', e);
  }

  const uniqueEntries = Array.from(new Map(entries.map((entry) => [entry.url, entry])).values());

  // XML oluştur
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${uniqueEntries.map(e => `  <url>
    <loc>${baseUrl}${e.url}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
