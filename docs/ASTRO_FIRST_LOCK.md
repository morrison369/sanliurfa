# Astro-First Implementation Lock

Bu proje Astro SSR-first çalışır. Yeni özelliklerde öncelik sırası kilitlidir:

1. Astro core özelliği.
2. Resmi `@astrojs/*` entegrasyonu.
3. Repoda kurulu Astro uyumlu paket.
4. Zorunluysa en küçük server-rendered Astro kodu.

## Kesin Kurallar

- Astro'da veya kurulu Astro uyumlu pakette olan özellik yeniden yazılmaz.
- Astro 2026 resmi özellik ve entegrasyon karar matrisi `docs/ASTRO_2026_FRAMEWORK_AUDIT.md` dosyasıdır; yeni paket/adapter eklemeden önce bu dosya kontrol edilir.
- Vercel kullanılmaz; `@astrojs/vercel`, Vercel deploy, Vercel analytics ve Vercel runtime hedefi eklenmez.
- Markdown tabanlı zengin içerik gerekiyorsa resmi `@astrojs/mdx` entegrasyonu kullanılır; MDX desteği `astro.config.mjs` içinde aktif kalır.
- Dev, preview ve production Node runtime tek porttur: `127.0.0.1:4321` / `PORT=4321`.
- Port 4321 doluysa yeni port açılmaz; sadece bu repoya ait 4321 listener'ı durdurulur.
- Local Redis bağlantısı mevcut Windows `Redis` servisi üzerinden `127.0.0.1:6379` ve `REDIS_KEY_PREFIX=sanliurfa:` ile yapılır; başka projelere ait Redis servisleri durdurulmaz, flush edilmez ve yeniden yapılandırılmaz.
- Çoklu dil, `/tr`, `/en`, hreflang veya İngilizce varsayılan eklenmez.
- Türkçe karakterler UTF-8 ile korunur. Kaynak dosyalarda, API cevaplarında, XML/CSV çıktılarında ve PostgreSQL istemci bağlantılarında UTF-8 dışı encoding kullanılmaz.
- Dil seçici, `Accept-Language` yönlendirmesi veya kullanıcıdan değiştirilebilir dil tercihi eklenmez. Eski i18n endpointleri sadece `tr` döndürür.
- JSON-LD rich snippet çıktısı Astro head/layout akışında server-render edilir.
- Structured data script çıktısı için `astro-seo-schema` kullanılır.
- Rich snippet verisi sayfa içeriğiyle aynı olmalıdır; sahte puan, sahte fiyat, sahte sosyal hesap yazılmaz.
- Sahte public entegrasyon render edilmez. Analytics sadece geçerli `PUBLIC_GOOGLE_ANALYTICS_ID` varsa Astro layout içinde çıkar.
- Gerçek sosyal hesap veya çalışan OAuth sağlayıcı yoksa sosyal medya linki ve sosyal giriş butonu gösterilmez.
- Tailwind CSS CDN kullanılmaz. Tüm Tailwind sınıfları `src/styles/global.css`, `tailwind.config.js` ve Astro build pipeline üzerinden gelir.
- React sadece gerçek etkileşim gereken ada bileşenlerinde kullanılır; statik SEO içerikleri Astro server-rendered HTML olarak kalır.
- `client:load` yalnızca ilk ekranda hemen etkileşim isteyen formlar, mesajlaşma ve kritik paneller içindir. İkincil liste, öneri, rozet, akış ve analitik bileşenlerinde önce `client:idle` veya `client:visible` tercih edilir.

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
