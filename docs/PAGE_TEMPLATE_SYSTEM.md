# Page Template System (Zorunlu Şablon Standardı)

## Amaç
Rastgele layout üretimini engelleyip tutarlı, ölçeklenebilir ve ajans seviyesi bir arayüz standardı sağlamak.

## Template Türleri
1. `landing`: şehir ana sayfası, section-driven orkestrasyon.
2. `listing`: kategori/ilçe/mekan listeleri.
3. `detail`: işletme, gezi noktası, içerik detay sayfası.
4. `editorial`: blog/rehber içerik sayfaları.

## Zorunlu Kurallar
- Her template:
  - standard hero
  - section header sistemi
  - CTA slotları
  - schema slotları
  - fallback state
  içermelidir.
- Yeni public sayfa açılırken bu 4 şablondan biri seçilmeden implementasyon yapılmaz.
- `src/pages` altında inline one-off layout yerine template bileşeni kullanılır.
- Public frontend renkleri doğrudan eski hex kodlarıyla yazılmaz. `src/styles/global.css` içindeki `--public-*` tokenları kullanılır.
- Yeni public sayfada `<style is:inline>` eklenmez. Mevcut baseline borcu `scripts/ci/public-design-contract-gate.mjs` içinde tutulur ve genişletilemez.
- İçerik görselleri doğrudan `cover_image`, `image_url` veya harici URL ile basılmaz. Public yüzeylerde `src/lib/public-image-resolvers.ts` resolver fonksiyonları ve `src/data/image-map.ts` kullanılır.
- Yemek/tarif fallback havuzlarında şehir, tarih veya işletme-placeholder görseli kullanılamaz.

## Teknik Yerleşim
- Template bileşenleri: `src/components/templates/*`
- Section bileşenleri: `src/components/home/*` ve ilgili domain klasörleri
- Ortak UI: `src/components/sf/*`

## Denetim
- PR review’da template seçimi zorunlu kontrol maddesidir.
- Template dışı layout sapmaları drift backlog’a alınır.
- `npm run public:design:contract:gate` yeni inline style, eski koyu tema rengi ve public token eksiklerini yakalar.
- `npm run content:image:relevance:gate` resolver kullanımı ve alakasız görsel havuzlarını yakalar.

## Astro Referans Notları
- Astro dokümanına göre `<style is:inline>` ve `<script is:inline>` içerikleri işlenmez, optimize/bundle edilmez, dedupe edilmez ve stiller component scope dışında global kalır: https://docs.astro.build/en/reference/directives-reference/#isinline
- Bu yüzden public sayfalarda yeni `is:inline` kullanımı tasarım kararlılığı riski kabul edilir; mevcut borç sadece kontrollü migrasyonla azaltılır.
