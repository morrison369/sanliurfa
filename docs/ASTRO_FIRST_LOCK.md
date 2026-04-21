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
- Türkçe karakterler UTF-8 ile korunur. Kaynak dosyalarda, API cevaplarında, XML/CSV çıktılarında ve PostgreSQL istemci bağlantılarında UTF-8 dışı encoding kullanılmaz.
- Dil seçici, `Accept-Language` yönlendirmesi veya kullanıcıdan değiştirilebilir dil tercihi eklenmez. Eski i18n endpointleri sadece `tr` döndürür.
- JSON-LD rich snippet çıktısı Astro head/layout akışında server-render edilir.
- Structured data script çıktısı için `astro-seo-schema` kullanılır.
- Rich snippet verisi sayfa içeriğiyle aynı olmalıdır; sahte puan, sahte fiyat, sahte sosyal hesap yazılmaz.
- Sahte public entegrasyon render edilmez. Analytics sadece geçerli `PUBLIC_GOOGLE_ANALYTICS_ID` varsa Astro layout içinde çıkar.

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
