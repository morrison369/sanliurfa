# Astro-First Implementation Lock

Bu proje Astro SSR-first çalışır. Yeni özelliklerde öncelik sırası kilitlidir:

1. Astro core özelliği.
2. Resmi `@astrojs/*` entegrasyonu.
3. Repoda kurulu Astro uyumlu paket.
4. Zorunluysa en küçük server-rendered Astro kodu.

## Kesin Kurallar

- Astro'da veya kurulu Astro uyumlu pakette olan özellik yeniden yazılmaz.
- Dev server tek porttur: `127.0.0.1:4321`.
- Çoklu dil, `/tr`, `/en`, hreflang veya İngilizce varsayılan eklenmez.
- JSON-LD rich snippet çıktısı Astro head/layout akışında server-render edilir.
- Structured data script çıktısı için `astro-seo-schema` kullanılır.
- Rich snippet verisi sayfa içeriğiyle aynı olmalıdır; sahte puan, sahte fiyat, sahte sosyal hesap yazılmaz.

## Rich Snippet Kapsamı

- Mekan detay sayfası: `LocalBusiness` alt tipi, `BreadcrumbList`, `WebSite`, `Organization`.
- Mekan liste sayfası: `ItemList`, mekan kartlarında `image`, `priceRange`, `aggregateRating`.
- Puan alanı yalnızca gerçek `rating` ve gerçek yorum sayısı varsa JSON-LD içine girer.
- Fiyat alanı mekanın `price_range` verisinden `₺`, `₺₺`, `₺₺₺`, `₺₺₺₺` olarak üretilir.
- Resimler mutlak URL olarak verilir; eksikse site placeholder görseli kullanılır.

## Değişiklik Kontrolü

Bir agent yeni paket veya custom modül eklemeden önce şu soruları cevaplamalı:

- Bu iş Astro core ile yapılabiliyor mu?
- Resmi `@astrojs/*` entegrasyonu var mı?
- Repoda bu işi yapan Astro uyumlu paket var mı?
- Custom kod gerçekten zorunlu mu ve server-rendered mi?
