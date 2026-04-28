# MVP Public Acceptance

Bu dosya, Şanlıurfa.com public site bitiş kriterlerini kilitler. Yeni işler bu kriterleri bozmayacak şekilde yapılır.

## Kritik Public Sayfalar

- `/` ana sayfa: profesyonel şehir landing, hızlı servisler, öne çıkan mekanlar ve Şanlıurfa odaklı cevap blokları içerir.
- `/mekanlar`: kategori, arama, puan, yorum ve işletme keşfi için ana rehberdir.
- `/saglik/nobetci-eczaneler`: Şanlıurfa nöbetçi eczaneler için günlük servis sayfasıdır.
- `/ulasim/otobus-saatleri`: Şanlıurfa otobüs saatleri ve şehir içi ulaşım rehberidir.
- `/ulasim/ucak-saatleri`: Şanlıurfa GAP Havalimanı uçak saatleri rehberidir.
- `/etkinlikler`: Şanlıurfa etkinlikleri, festival ve kültür duyuruları için ana sayfadır.
- `/yemek-tarifleri`: Şanlıurfa yemek tarifleri ve Urfa mutfağı içerik merkezidir.
- `/ilceler`: Şanlıurfa ilçeleri için yerel keşif merkezidir.
- `/topluluk`: üyeler, takip, arkadaşlık, mesajlaşma ve sosyal akış başlangıcıdır.
- `/eslesme`: sosyal eşleşme/swipe deneyimi için public giriş yüzeyidir.
- `/isletme-kayit`: Şanlıurfa işletmeleri için ücretsiz başvuru ve rehbere eklenme yüzeyidir.

## Kabul Kriterleri

- Her kritik sayfada odak anahtar kelime bağlamı `Şanlıurfa` olmalıdır.
- Sayfa başlığı, H1, meta açıklama ve görünen ilk ekran kullanıcının amacını doğrudan karşılamalıdır.
- Görseller slug uyumlu ve yönetilebilir olmalıdır; dış kaynak görseller Pexels öncelikli, Unsplash yedekli alınır.
- Günlük servis verileri doğrudan hardcoded ana kaynak olmaz; admin/database onaylı kayıtlar veya kontrollü fallback kullanılır.
- Ajanlar otomatik yayın yapmaz; içerikler admin onayından sonra public yüzeye taşınır.
- Sahte sosyal medya hesapları gösterilmez; gerçek hesap yoksa sosyal medya linkleri kapalı kalır.
- Site yalnızca Türkçedir; `/en`, `/tr`, dil seçici veya hreflang eklenmez.
- SEO/AEO/GEO/AIO yüzeyi `llms.txt`, `robots.txt`, sitemap ve schema tutarlılığıyla korunur.
- Kritik public sayfalarda `Hızlı Cevap`, `FAQPage` veya uygun liste/sayfa schema sinyali bulunmalıdır.
- Kritik görsel dosyaları, slug uyumlu görsel manifest bucket'ları ve alt metin sinyalleri gate içinde korunur.

## Yönetim ve Gate

- Şehir içerik ajanları: `/admin/content-agents`.
- Site içerik yönetimi: `/admin/site-content`.
- OpenAPI yüzeyi: `/api/docs/openapi.json`.
- Toplu public bitiş gate'i: `npm run public:city:gate`.
- Build dahil public kapanış gate'i: `npm run public:city:gate:build`.
- Tam toplu akış `npm run ops:next:bulk` önce `npm run public:city:gate` çalıştırır; public yüzey kırıkken ağır ajans/gate akışına geçilmez.
- GitHub Actions workflow: `.github/workflows/public-city-gate.yml`.
- GitHub üzerinde public city gate, `master`, `main` ve `develop` push/PR değişikliklerinde `npm run public:city:gate:build` komutunu çalıştırır.
- Kabul smoke: `npm run smoke:city-content:acceptance`.
- Ajan yüzey smoke: `npm run smoke:city-content-agents`.
- SEO/GEO gate: `npm run seo:geo:gate`.
