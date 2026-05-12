import type { APIRoute } from 'astro';
import { query } from '../lib/postgres';
import { getPublicAppUrl } from '../lib/public-app-url';
import { getCachedPublicRouteData } from '../lib/public-route-cache';
import { logger } from '../lib/logging';

// Statik gezi rehberi landing sayfaları — yeni .astro dosyası eklenince buraya da ekle
const GEZI_REHBERLERI = [
  { title: 'Şanlıurfa Gezi Rehberi 2026', slug: 'sanliurfa-gezi-rehberi', desc: 'Ulaşım, konaklama, gezilecek yerler ve 2 günlük rota rehberi' },
  { title: 'Göbeklitepe Gezi Rehberi', slug: 'gobeklitepe-gezi-rehberi', desc: 'Bilet, ziyaret saatleri, ulaşım ve UNESCO Dünya Mirası bilgisi' },
  { title: 'Balıklıgöl Ziyaret Rehberi', slug: 'balikligol-gezi-rehberi', desc: "Hz. İbrahim'in kutsal gölü, çevre gezisi ve pratik bilgiler" },
  { title: 'Halfeti Gezi Rehberi', slug: 'halfeti-gezi-rehberi', desc: 'Tekne turu ücreti, siyah güller, Rum Kale ve konaklama' },
  { title: 'Harran Gezi Rehberi', slug: 'harran-gezi-rehberi', desc: 'Kümbet evler, Harran Kalesi, ulaşım ve pratik bilgiler' },
  { title: 'Siverek Gezi Rehberi', slug: 'siverek-gezi-rehberi', desc: 'Takoran Kanyon Vadisi, Siverek Kalesi ve doğa yürüyüşü' },
  { title: 'Birecik Gezi Rehberi', slug: 'birecik-gezi-rehberi', desc: 'Kelaynak kuşu üreme istasyonu, Birecik Kalesi ve Fırat tekne turu' },
  { title: 'Viranşehir Gezi Rehberi', slug: 'viransehir-gezi-rehberi', desc: 'Antik Constantina kenti kalıntıları, tarihi çarşı ve Roma izleri' },
  { title: 'Suruç Gezi Rehberi', slug: 'suruc-gezi-rehberi', desc: 'Fırat Vadisi, tarihi camiler ve Halfeti güzergahı üzerinde antik ilçe' },
  { title: 'Bozova Gezi Rehberi', slug: 'bozova-gezi-rehberi', desc: 'Atatürk Barajı kıyısı, balıkçılık, tekne gezileri ve doğa yürüyüşü' },
  { title: 'Akçakale Gezi Rehberi', slug: 'akcakale-gezi-rehberi', desc: 'Suriye sınır kapısı, Harran Ovası manzarası ve mercimek hasatı' },
  { title: 'Hilvan Gezi Rehberi', slug: 'hilvan-gezi-rehberi', desc: 'Şifalı kaplıcalar, termal turizm ve huzurlu köy atmosferi' },
  { title: 'Ceylanpınar Gezi Rehberi', slug: 'ceylanpinar-gezi-rehberi', desc: 'TİGEM devlet çiftliği, at yetiştiriciliği ve sınır kasabası kültürü' },
];

export const GET: APIRoute = async () => {
  const baseUrl = getPublicAppUrl();

  let blogPosts: Array<{ title: string; slug: string; excerpt: string | null }> = [];
  try {
    const data = await getCachedPublicRouteData('page:llms-txt:v2', async () => {
      const result = await query(`
        SELECT title, slug, excerpt
        FROM blog_posts
        WHERE status = 'published' AND published_at <= CURRENT_DATE
        ORDER BY published_at DESC
        LIMIT 60
      `);
      return { blogPosts: result.rows };
    });
    blogPosts = data.blogPosts;
  } catch (e) {
    logger.error('llms.txt blog sorgusu başarısız:', e instanceof Error ? e : new Error(String(e)));
  }

  const geziLines = GEZI_REHBERLERI
    .map(r => `- [${r.title}](${baseUrl}/${r.slug}) — ${r.desc}`)
    .join('\n');

  const blogLines = blogPosts.length > 0
    ? blogPosts.map(p => {
        const desc = p.excerpt ? ' — ' + p.excerpt.replace(/[\r\n]+/g, ' ').slice(0, 120) : '';
        return `- **${p.title}**${desc} — [Oku](${baseUrl}/blog/${p.slug})`;
      }).join('\n')
    : '- Blog içerikleri yükleniyor…';

  const body = `# Sanliurfa.com — Şanlıurfa Şehir Rehberi

> Şanlıurfa'nın en kapsamlı dijital rehberi. Mekan keşfi, nöbetçi eczane, otobüs saatleri, uçak saatleri, etkinlikler, ilçe rehberleri, yemek tarifleri ve turizm bilgileri.

## Platform Hakkında

Sanliurfa.com, Türkiye'nin Şanlıurfa iline odaklanmış bir şehir rehberi platformudur. Günlük yaşam bilgileri (nöbetçi eczane, otobüs saatleri, uçak saatleri), mekan rehberi (restoranlar, oteller, turistik yerler), etkinlik takvimi, topluluk eşleşme modülü ve yerel içerikler sunar.

## Ana İçerik Bölümleri

- [Ana Sayfa](${baseUrl}/) — Platform genel görünümü, öne çıkan mekanlar ve güncel bilgiler
- [Mekanlar](${baseUrl}/mekanlar) — Restoranlar, kafeler, oteller, turistik mekanlar ve işletmeler
- [Blog](${baseUrl}/blog) — Şanlıurfa hakkında rehber yazıları ve makaleler
- [Etkinlikler](${baseUrl}/etkinlikler) — Şanlıurfa etkinlik takvimi ve kategori sayfaları
- [Gezilecek Yerler](${baseUrl}/gezilecek-yerler) — Şanlıurfa'da gezilecek tarihi ve turistik yerler
- [Yemek Tarifleri](${baseUrl}/yemek-tarifleri) — Şanlıurfa mutfağı tarifleri
- [Gelişmiş Arama](${baseUrl}/arama/gelismis) — Filtre ve AI destekli gelişmiş mekan arama

## Sağlık

- [Sağlık](${baseUrl}/saglik) — Hastaneler, klinikler, eczaneler, veterinerler
- [Nöbetçi Eczaneler](${baseUrl}/saglik/nobetci-eczaneler) — Günlük nöbetçi eczane listesi
- [Devlet Hastaneleri](${baseUrl}/saglik/devlet-hastaneleri) — Kamu hastaneleri listesi
- [Özel Hastaneler](${baseUrl}/saglik/ozel-hastaneler) — Özel hastaneler ve klinikler

## Ulaşım

- [Ulaşım](${baseUrl}/ulasim) — Şanlıurfa ulaşım rehberi genel sayfa
- [Otobüs Saatleri](${baseUrl}/ulasim/otobus-saatleri) — Şanlıurfa şehir içi toplu taşıma saatleri
- [Otobüs Hatları](${baseUrl}/ulasim/otobus-hatlari) — Hat bazlı sefer bilgileri ve güzergahlar
- [Uçak Saatleri](${baseUrl}/ulasim/ucak-saatleri) — GAP Havalimanı uçuş saatleri, varış ve kalkış bilgileri

## Gastronomi ve Yemek Rehberi

- [Gastronomi](${baseUrl}/gastronomi) — UNESCO Gastronomi Şehri adayı Şanlıurfa'nın mutfak rehberi
- [Yeme İçme](${baseUrl}/yeme-icme) — Şanlıurfa restoran, kafe ve yeme içme rehberi
- [Yemek Tarifleri](${baseUrl}/yemek-tarifleri) — Şanlıurfa mutfağı tarifleri (Urfa Kebabı, Çiğ Köfte, Borani, Şıllık vb.)
- [Şanlıurfa'da Ne Yenir?](${baseUrl}/sanliurfada-ne-yenir) — Urfa mutfağının öne çıkan lezzetleri
- [En İyi Kebapçılar](${baseUrl}/en-iyi-kebapcilar) — Urfa kebabı ve ocakbaşı mekanları listesi
- [En İyi Cigerciler](${baseUrl}/en-iyi-cigerciler) — Tandır ciğeri mekanları
- [Kahvaltı Mekanları](${baseUrl}/sanliurfa-kahvalti-mekanlari) — Yöresel kahvaltı ve çay bahçeleri

## Turizm ve Gezilecek Yerler

- [Tarihi Yerler](${baseUrl}/tarihi-yerler) — Göbeklitepe, Harran, Balıklıgöl ve diğer tarihi miras alanları
- [Bugün Şanlıurfa'da Ne Yapılır?](${baseUrl}/bugun-sanliurfada-ne-yapilir) — Günlük etkinlik ve mekan önerileri
- [Sıra Gecesi Mekanları](${baseUrl}/sanliurfa-sira-gecesi-mekanlari) — Geleneksel sıra gecesi kültürü ve mekanlar
- [Gece Açık Mekanlar](${baseUrl}/sanliurfa-gece-acik-mekanlar) — Geç saate kadar açık kafeler ve eğlence yerleri
- [Halfeti Tekne Turu](${baseUrl}/halfeti-tekne-turu) — Güzergah, fiyat, Rumkale ve siyah gül rehberi
- [Şanlıurfa Fotoğraf Noktaları](${baseUrl}/sanliurfa-fotograf-sporlari) — Göbeklitepe, Balıklıgöl, Harran ve Halfeti fotoğraf rotaları

## Gezi Rehberleri (SEO Landing Sayfaları)

${geziLines}

## Öne Çıkan Turistik Yerler

- **Göbeklitepe** — Dünyanın en eski tapınak kompleksi (MÖ 10.000) — [Detay](${baseUrl}/isletme/gobeklitepe)
- **Karahantepe** — Göbeklitepe'nin kardeşi, M.Ö. 9.000–10.000 yıllarına ait Neolitik arkeoloji alanı — [Detay](${baseUrl}/isletme/karahantepe-arkeoloji-alani)
- **Balıklıgöl** — Hz. İbrahim'in atıldığı havuz, kutsal sazan balıkları — [Detay](${baseUrl}/isletme/balikligol)
- **Halfeti** — Fırat üzerinde sular altında şehir, tekne turları — [Detay](${baseUrl}/isletme/halfeti)
- **Harran Kümbet Evleri** — Dünyanın hâlâ yaşanan en eski konili evleri — [Detay](${baseUrl}/isletme/harran)
- **Şanlıurfa Kalesi** — Sütunlar ve şehir panoraması — [Detay](${baseUrl}/isletme/urfa-kalesi)
- **Ayna Çarşı ve Kapalı Çarşı** — Tarihi çarşı ve el sanatları — [Detay](${baseUrl}/isletme/kapali-carsi)

## İlçe Rehberleri

- [Tüm İlçeler](${baseUrl}/ilceler) — Şanlıurfa'nın 13 ilçesinin genel rehberi
- [Eyyübiye](${baseUrl}/ilceler/eyyubiye) — Balıklıgöl, tarihi çarşılar, Göbeklitepe yakını
- [Haliliye](${baseUrl}/ilceler/haliliye) — Şehir merkezi, kamu hizmetleri, alışveriş
- [Karaköprü](${baseUrl}/ilceler/karakopru) — Modern mahalleler, kafeler
- [Halfeti](${baseUrl}/ilceler/halfeti) — Saklı cennet, tekne turları, sular altı köy
- [Harran](${baseUrl}/ilceler/harran) — Kümbet evleri, Mezopotamya mirası
- [Birecik](${baseUrl}/ilceler/birecik) — Fırat Nehri, kelaynak kuşları koruma alanı
- [Siverek](${baseUrl}/ilceler/siverek) — Takoran Vadisi, doğal güzellikler
- [Viranşehir](${baseUrl}/ilceler/viransehir) — Tarih, tarım, ticaret
- [Bozova](${baseUrl}/ilceler/bozova) — Atatürk Barajı kıyısı, balıkçılık
- [Ceylanpınar](${baseUrl}/ilceler/ceylanpinar) — Sınır ilçesi, tarım arazileri
- [Akçakale](${baseUrl}/ilceler/akcakale) — Suriye sınırı, Harran Ovası
- [Suruç](${baseUrl}/ilceler/suruc) — Tarihi yerleşim, Fırat havzası
- [Hilvan](${baseUrl}/ilceler/hilvan) — Kaplıcalar, termal turizm

## Güncel Blog Yazıları

${blogLines}

## Kategori Rehberleri

- [Dini ve Kültürel Yerler](${baseUrl}/dini-ve-kulturel-yerler) — Camiler, türbeler, kiliseler ve kültürel miras mekanları
- [Aile ve Çocuk](${baseUrl}/aile-ve-cocuk) — Çocuk parkları, kreşler, aile aktivite alanları
- [Spor ve Fitness](${baseUrl}/spor-ve-fitness) — Spor salonları, halı sahalar, yüzme havuzları
- [Ev ve Yaşam](${baseUrl}/ev-ve-yasam) — Tadilat, nakliyat, çilingir, tesisatçı, elektrikçi
- [Hukuk ve Finans](${baseUrl}/hukuk-ve-finans) — Avukatlar, banka şubeleri, sigorta acenteleri
- [Otomotiv](${baseUrl}/otomotiv) — Araç servisleri, ekspertiz merkezleri, oto yıkama
- [Tarım ve Hayvancılık](${baseUrl}/tarim-ve-hayvancilik) — Veteriner klinikleri, gübre/yem bayileri, hayvan pazarları
- [Medya ve İletişim](${baseUrl}/medya-ve-iletisim) — Yerel gazeteler, radyolar, prodüksiyon firmaları
- [İş Dünyası ve Sanayi](${baseUrl}/is-dunyasi-ve-sanayi) — OSB, fabrikalar, toptancılar, ihracatçılar

## Hizmetler ve Diğer

- [Hizmetler](${baseUrl}/hizmetler) — Kuaförler, berberler, temizlik, nakliyat, çilingir, elektrikçi, tesisatçı
- [Konaklama](${baseUrl}/konaklama) — Oteller, butik oteller, pansiyonlar
- [Alışveriş](${baseUrl}/alisveris) — AVM'ler, çarşılar, yöresel ürünler, kuyumcular
- [Eğitim](${baseUrl}/egitim) — Okullar, üniversiteler, dershaneler, kurslar
- [İletişim](${baseUrl}/iletisim) — İletişim formu ve adres
- [SSS](${baseUrl}/sss) — Sık sorulan sorular

## Teknik Bilgi

Platform: Astro 6.1 SSR + React 19
Dil: Türkçe (yalnızca)
Güncelleme: Bu dosya her istekte DB'den dinamik olarak üretilir. Blog yazıları yayınlandığında otomatik yansır.
Sitemap: ${baseUrl}/sitemap.xml
robots.txt: GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended, Amazonbot, Meta-ExternalAgent, Applebot-Extended — tüm büyük AI botlara tam erişim izni.`;

  return new Response(body.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
