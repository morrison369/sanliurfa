# DB-First Site Yönetimi (Zorunlu Kural)

Bu projede **site üzerindeki tüm yönetilebilir içerikler** admin panelinden yönetilecek ve
**database kaynaklı** olacaktır.

## Zorunlu Kapsam
- Ana sayfa hero alanı (badge, başlık, açıklama, arama placeholder, hero görseli)
- Landing blokları ve CTA metinleri
- Kategori vitrinleri, öne çıkan içerik blokları
- Footer, duyuru, banner, kampanya gibi yönetim gerektiren alanlar
- Medya varlıkları (hero görselleri dahil)

## Teknik Kaynak Tablosu
- `site_settings`: JSON tabanlı global ayarlar (`homepage.hero` gibi)
- `site_content_blocks`: sayfa/blok bazlı içerik kayıtları
- `site_media_assets`: medya varlıkları ve metadata

## API ve Panel
- API: `GET/PUT /api/admin/site/settings?key=...`
- Preset API: `GET/POST /api/admin/site/settings/presets`
- Preset Preview API: `GET /api/admin/site/settings/presets/preview?presetId=...`
- Admin ekranı: `/admin/site-content`
- Social policy ekranı: `/admin/social-policies`
- Görsel pipeline DB senkronu: `npm run images:sync-db` veya `npm run images:pipeline:db`
- Aktif DB anahtarları:
  - `homepage.schema` (ana sayfa WebSite/Organization/WebPage structured data alanları)
  - `homepage.seo` (ana sayfa title/description/canonical/ogImage/keywords)
  - `homepage.hero`
  - `homepage.heroMeta` (hero layout + tipografi + arama kutusu + kart/istatistik + quick-link metin/style class etiketleri)
  - `homepage.mainCta`
  - `homepage.primaryActions`
  - `homepage.mvpQuickStart` (ana sayfa MVP hızlı başlangıç kartları: günlük ihtiyaç, keşif, topluluk)
  - `homepage.quickCategories`
  - `homepage.featuredGuides`
  - `homepage.faq`
  - `homepage.heroQuickLinks`
  - `homepage.liveStatusCards`
  - `homepage.serviceQuickLinks`
  - `homepage.communityPanel`
  - `homepage.trendingFallbackQueries`
  - `homepage.sections` (ana sayfa blok görünürlüğü + sıralama; `mvp-quick-start` bu listede yönetilir)
  - `homepage.sectionCopy` (ana sayfa section başlık/açıklama/cta metinleri; `mvpQuickStart*` alanları MVP hızlı başlangıç başlığı ve CTA'sını yönetir)
  - `homepage.sectionStyles` (mvp-quick-start, quick-actions, live-status, district-service, popular-categories, trend-density, districts, historical-sites, featured-places, recent-places, trust-signals, guides-community, main-categories, recipes, blog, faq, main-cta için container/grid/card/chip/style tokenları)
  - `header.utilityLinks`
  - `header.brand` (header üst şerit + logo metinleri)
  - `header.labels` (header buton/dropdown etiketleri)
  - `header.megaMenu` (çok seviyeli: `sub` veya `groups[].links`)
  - `header.mobileQuickLinks`
  - `header.mobileAllLinks`
  - `footer.links`
  - `footer.brand` (footer logo/intro/infonote metinleri)
  - `footer.bottom` (copyright + legal alt linkler)
  - `content.{bucket}.{slug}` (otomatik görsel kayıt anahtarı)

## Uygulama Kuralı (Kalıcı)
- Kod içine hardcoded içerik yalnızca fallback amaçlı tutulur.
- Yeni eklenen tüm yönetilebilir alanlar önce DB şemasına ve admin API'sine bağlanır.
- “Panelden yönetilecek” denilen hiçbir içerik dosya içine sabitlenmez.
- `/admin/site-content` içindeki JSON editörlerinde kritik key'ler için `Şablon Yükle` aksiyonu kullanılır (özellikle `homepage.sections`, `header.brand`, `header.labels`, `header.megaMenu`, `header.mobileQuickLinks`, `header.mobileAllLinks`).

## Operasyonel Gate'ler
- İçerik cluster kalite gate: `npm run content:cluster:quality`
- Runtime sağlık raporu: `npm run dev:isolated:health:report`
- Runtime sağlık + otomatik fix: `npm run dev:isolated:health:report:fix`
- Toplu öneri operasyonu (tam): `npm run recommendations:apply`
- Toplu öneri operasyonu (hızlı): `npm run recommendations:apply:quick`
