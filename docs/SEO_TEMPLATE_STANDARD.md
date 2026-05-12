# SEO Template Standard (TR-Only)

## Zorunlu Alanlar
- `title`
- `description`
- `canonical`
- tekil `h1`
- contexte uygun `h2/h3` yapısı
- JSON-LD (page türüne göre)

## TR-Only Kuralları
- `/en`, `/tr` route prefix yok.
- `hreflang` yok.
- Çok dilli meta stratejisi yok.

## Heading Politikası
- Sayfa başına tam 1 adet `h1`.
- Bölüm başlıkları için semantik `h2`.
- Kart/alt blok başlıkları için `h3`.
- Heading spam yasak; kullanıcı niyeti odaklı kullanım zorunlu.

## JSON-LD Minimumları
- Landing: `WebSite`, `WebPage`, `FAQPage` (varsa)
- Listing: `BreadcrumbList`, `ItemList`
- Detail: `BreadcrumbList`, uygun entity schema (`LocalBusiness`, `TouristDestination`, vb.)

## Uygulama Prensibi
- SEO helper üzerinden üretim tercih edilir.
- Elle meta yazımı sadece istisna.
