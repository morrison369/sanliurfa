# UI Contracts (Şanlıurfa.com)

## Zorunlu Bileşenler
- `Header.astro`
- `Footer.astro`
- `Image.astro`
- `Icon.astro`
- `CityGuideLanding.astro`
- `CategoryHub.astro`

## Zorunlu Kurallar
- Sayfa başına tek `h1`.
- `h2` ile semantik blok ayrımı.
- Inline `onmouseover/onmouseout` kullanılmaz.
- Public ana tema sıcak light Şanlıurfa paletidir; eski koyu hero public sayfalarda kullanılmaz.
- CTA'lar rounded-full veya 12-16px radius aralığında, net kontrastlı ve kısa etiketli olur.
- Tema yönlendiren eski ikincil CTA sınıfı veya token kullanılmaz.
- Emoji placeholder, demo ikon kartı veya alakasız stok hissi veren fallback public ana yüzeyde kullanılmaz.
- Hero ve kart görselleri `src/lib/public-image-resolvers.ts`, `src/lib/seo-image.ts` veya `src/data/image-map.ts` sözleşmesinden geçer.
- Arama, harita, nöbetçi eczane, topluluk ve eşleşme yüzeyleri mobile-first kontrol edilir.

## Kritik Route Sözleşmeleri
- `/` landing: premium şehir hero + arama + hızlı erişim + kategori + rota + ilçe + bugün + topluluk/eşleşme + rehber + CTA.
- `/mekanlar` liste: hero + kategori grid + öne çıkan kartlar.
- `/gezilecek-yerler` liste: hero + alt kategori + öne çıkan tarihi kartlar.
- `/isletme` liste: hero + kategori + öne çıkan işletme + FAQ.
- `/arama`: kanonik arama yüzeyi; `/ara` sadece 301 redirect.
- `/saglik/nobetci-eczaneler`: sıcak light hero + veri tazeliği + ilçe filtresi + kart listesi.
- `/harita`: mobil liste modalı düzgün açılır/kapanır, görsel fallback kullanır.
- `/topluluk` ve `/eslesme`: sosyal/tinder MVP yüzeyi public linklerden koparılamaz.
- Detay sayfaları: breadcrumb + hero + içerik + ilgili içerik.
