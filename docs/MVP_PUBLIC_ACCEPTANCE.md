# MVP Public Acceptance

Bu dosya, Şanlıurfa.com public site bitiş kriterlerini kilitler. Yeni işler bu kriterleri bozmayacak şekilde yapılır.

## Ürün Tanımı

Sanliurfa.com; Şanlıurfa şehir rehberi, kullanıcı katkısı ve yerel sosyal/eşleşme katmanını birleştiren Türkçe platformdur.

Çekirdek kapsam:

- Şanlıurfa mekanları, gezilecek yerler, ilçeler, yemek kültürü, etkinlikler, ulaşım ve nöbetçi eczaneler.
- Üye olan kullanıcıların mekan eklemesi.
- Üye olan kullanıcıların mekanlara yorum ve puan vermesi.
- Üye olan kullanıcıların etkinlik eklemesi.
- Şanlıurfa odaklı sosyal medya katmanı: profil, takip/arkadaşlık, mesajlaşma.
- Şanlıurfa odaklı Tinder benzeri eşleşme: profil, swipe, karşılıklı eşleşme, mesajlaşmaya geçiş.

Bu proje statik blog, genel directory şablonu veya sadece admin içerik sistemi değildir.

## Kritik Public Sayfalar

- `/` ana sayfa: profesyonel şehir landing, hızlı servisler, öne çıkan mekanlar, topluluk/eşleşme girişi ve Şanlıurfa odaklı cevap blokları içerir.
- `/mekanlar`: kategori, arama, puan, yorum ve işletme keşfi için ana rehberdir.
- `/saglik/nobetci-eczaneler`: Şanlıurfa nöbetçi eczaneler için günlük servis sayfasıdır.
- `/ulasim/otobus-saatleri`: Şanlıurfa otobüs saatleri ve şehir içi ulaşım rehberidir.
- `/ulasim/ucak-saatleri`: Şanlıurfa GAP Havalimanı uçak saatleri rehberidir.
- `/etkinlikler`: Şanlıurfa etkinlikleri, festival ve kültür duyuruları için ana sayfadır.
- `/yemek-tarifleri`: Şanlıurfa yemek tarifleri ve Urfa mutfağı içerik merkezidir.
- `/ilceler`: Şanlıurfa ilçeleri için yerel keşif merkezidir.
- `/topluluk`: üyeler, takip, arkadaşlık, mesajlaşma ve sosyal akış başlangıcıdır.
- `/eslesme`: sosyal eşleşme/swipe deneyimi için public giriş yüzeyidir.
- `/mesajlar`: üye mesajlaşma yüzeyidir.
- `/mekan-ekle` veya `/isletme-kayit`: üye/işletme mekan ekleme ve başvuru yüzeyidir.
- `/etkinlik-ekle` veya ilgili etkinlik başvuru yüzeyi: üye etkinlik ekleme akışıdır.
- `/arama`: mekan, kullanıcı, koleksiyon ve şehir içeriği arama için kanonik public arama yüzeyidir; `/ara` query korunarak buraya yönlenir.
- `/isletme-kayit`: Şanlıurfa işletmeleri için ücretsiz başvuru ve rehbere eklenme yüzeyidir.
- `/otomotiv`, `/acil-durum`, `/hukuk-ve-finans`, `/ev-ve-yasam`, `/spor-ve-fitness`, `/aile-ve-cocuk`, `/tarim-ve-hayvancilik`, `/medya-ve-iletisim`, `/dini-ve-kulturel-yerler`, `/is-dunyasi-ve-sanayi`: `kategoriler.txt` ana omurgasındaki eksik hub yüzeyleridir.

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
- Public SEO paylaşım görselleri eski `hero-home.webp` veya placeholder dosyasında bırakılmaz; route bağlamına göre Balıklıgöl, Göbeklitepe, Urfa kebabı, otel, etkinlik veya blog görseline normalize edilir.
- Ana public yüzeylerde koyu/kasvetli hero, emoji placeholder ve bozuk mobil modal davranışı kabul edilmez; `npm run public:theme:surface:gate` bunu kilitler.
- Ana sayfa `/topluluk` ve `/eslesme` bağlantılarını görünür tutar; sosyal MVP public yüzeyden koparılamaz.
- Ana sayfa ve header, mekan ekleme, etkinlik ekleme, yorum/puan, topluluk ve eşleşme akışlarını kullanıcıya görünür kılar.
- Mekan detayında yorum ve puan verme akışı görünür olmalıdır.
- `kategoriler.txt` ana kategori ve ilçe omurgası `src/data/city-taxonomy.ts` içinde kodla korunur.

## Yönetim ve Gate

- Şehir içerik ajanları: `/admin/content-agents`.
- Site içerik yönetimi: `/admin/site-content`.
- OpenAPI yüzeyi: `/api/docs/openapi.json`.
- Toplu public bitiş gate'i: `npm run public:city:gate`.
- Public tema yüzeyi gate'i: `npm run public:theme:surface:gate`.
- Build dahil public kapanış gate'i: `npm run public:city:gate:build`.
- Tam toplu akış `npm run ops:next:bulk` önce `npm run public:city:gate` çalıştırır; public yüzey kırıkken ağır ajans/gate akışına geçilmez.
- GitHub Actions workflow: `.github/workflows/public-city-gate.yml`.
- GitHub üzerinde public city gate, `master`, `main` ve `develop` push/PR değişikliklerinde `npm run public:city:gate:build` komutunu çalıştırır.
- Kabul smoke: `npm run smoke:city-content:acceptance`.
- Ajan yüzey smoke: `npm run smoke:city-content-agents`.
- SEO/GEO gate: `npm run seo:geo:gate`.
