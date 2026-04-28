# MVP Bitirme Modu

Bu proje artık varsayılan olarak MVP bitirme modunda ilerler.

## Amaç

Şanlıurfa.com'u altyapı döngülerine takılmadan, kullanıcıya görünen şehir rehberi ve topluluk platformu olarak tamamlamak.

## Çalışma Kuralı

- Öncelik her zaman görünen site, admin paneli ve kullanıcı akışlarıdır.
- Zorunlu runtime hatası dışında port, Redis, test, CI ve deploy altyapısında yeni iş açılmaz.
- Test yazımı ve büyük gate çalıştırmaları, kullanıcı açıkça istemedikçe ertelenir.
- Her turda somut kullanıcı değeri üreten sayfa, içerik, admin yönetimi veya sosyal akış tamamlanır.
- Yeni özellik eklenirse Astro framework yapısına uyumlu olmalı ve mevcut DB-first kuralını bozmamalıdır.
- Kritik landing içerikleri admin/database yönetimine uygun fallback ile ilerler; hardcoded değerler sadece fallback olabilir.

## Öncelik Sırası

1. Ana sayfa ve header: profesyonel landing, hızlı servisler, arama, mekan/ilçe/günlük yaşam kısayolları.
2. Mekan sistemi: liste, kategori, detay, yorum, puan, fotoğraf ve işletme başvurusu.
3. Admin panel: hero, menü, görsel, mekan, kategori, blog ve SEO alanlarının yönetimi.
4. Sosyal MVP: profil, takip/arkadaş, mesajlaşma, eşleşme/swipe temel akışı.
5. SEO/AEO/GEO yüzeyi: sitemap, canonical, llms.txt, hızlı cevaplar ve schema tutarlılığı.

## Yapılmayacaklar

- Gereksiz yeni altyapı katmanı eklenmez.
- Çok dilli destek eklenmez.
- Sahte sosyal medya hesabı gösterilmez.
- Global servisler veya başka projelerin process/portları değiştirilmez.
- Basit site işini geciktirecek kapsam genişletmeleri bu moda dahil edilmez.

## Operasyon Notu

Redis ve dev server izolasyonu tamamlanmıştır. Bundan sonra bu katmana yalnızca kullanıcıya görünen siteyi engelleyen zorunlu hata varsa dönülür.

## Admin-First Kilitli Alanlar

- Ana sayfa MVP hızlı başlangıç kartları, başlık/CTA metinleri, section sıra/görünürlük ve stil tokenları admin/database üzerinden yönetilir.
- Ana sayfa canlı durum kartları, servis hızlı link kartları, topluluk paneli ve trend fallback sorguları `/admin/site-content` içinde form editörleriyle yönetilir.
- Ana sayfa hero hızlı linkleri ve öne çıkan rehber linkleri `/admin/site-content` içinde form editörleriyle yönetilir.
- Ana sayfa SEO alanı ve hero meta/istatistik/kart metinleri `/admin/site-content` içinde form editörleriyle yönetilir.
- Ana sayfa structured data ayarları `/admin/site-content` içinde form editörüyle yönetilir.
- Ana sayfa tüm section metinleri ve style tokenları `/admin/site-content` içinde form editörleriyle yönetilir; JSON editör yalnızca fallback ve ileri düzenleme içindir.
- Header marka/metin etiketleri ve sosyal profil görünürlüğü `/admin/site-content` içinde form editörleriyle yönetilir; gerçek hesap yoksa sosyal kanallar kapalı kalır.
- Header utility linkleri, mega menü ana/alt linkleri ve mobil menü linkleri `/admin/site-content` içinde form editörleriyle yönetilir.
- Footer linkleri, marka/intro metinleri ve alt satır legal linkleri `/admin/site-content` içinde form editörleriyle yönetilir.
- `/admin/site-content` uzun form ekranında hızlı geçiş menüsü ve otomatik form anchorları kullanılır; form dışı özel yönetim kartları için manuel anchor korunur.
- Landing şablon kütüphanesi, ana sayfa hero, ana CTA ve anti-spam gibi özel yönetim kartları da hızlı geçişe dahil edilir.
- Admin hızlı geçiş menüsü Türkçe karakter uyumlu arama/filtre alanı içerir.
- Admin form kartları ve hızlı geçiş chipleri otomatik kategori etiketi gösterir: Ana Sayfa, Header, Footer, Sosyal, Operasyon, Landing veya Moderasyon.
- Admin hızlı geçiş menüsü kategori filtreleriyle Ana Sayfa/Header/Footer/Sosyal/Operasyon/Landing/Moderasyon alanlarını tek tıkla süzer.
- Admin hızlı geçiş filtreleri ve JSON fallback açık/kapalı tercihi tarayıcıda hatırlanır; sonuç sayacı ve filtre temizleme kontrolü gösterilir.
- Admin hızlı geçiş listesi tüm form editörlerini ve manuel anchor verilen özel kartları kapsar; kategori filtrelerinde toplam form sayısı gösterilir.
- Admin hızlı geçiş bütünlüğü `npm run smoke:admin:quick-nav` ile kontrol edilir; yeni form editörü eklenirse hızlı geçiş listesi de güncellenmelidir.
- JSON editörleri varsayılan olarak kapalı fallback alanlarıdır; günlük içerik yönetimi form editörlerinden yapılır.
- Bu alanlarda JSON editör fallback olarak kalır; yeni işlerde önce form editörü ve database ayarı korunur.

## Şehir İçerik Ajanları Kilidi

- Ürün/mağaza karşılaştırma bu MVP kapsamında değildir; ajanlar Şanlıurfa şehir içerikleri için çalışır.
- Kalıcı kaynak dokümanı: `docs/SEHIR_ICERIK_AJANLARI.md`.
- Public kabul dokümanı: `docs/MVP_PUBLIC_ACCEPTANCE.md`.
- Admin ekranı: `/admin/content-agents`.
- API: `GET|POST /api/admin/city-content-agents`.
- Ajanlar otomatik yayın yapmaz; tüm çıktı `city_content_drafts` kuyruğuna `pending` olarak düşer.
- Yayın için admin onayı zorunludur; `approved` olmayan içerik public sayfaya kaynak olamaz.
- Görsel ajanı Pexels öncelikli, Unsplash yedekli çalışır.
- SEO/AEO/GEO/AIO ajanı odak kelimeyi `Şanlıurfa` olarak kullanır ve Türkçe dışı içerik üretmez.
- Bu kilit `npm run smoke:city-content-agents`, `npm run smoke:city-content:acceptance` ve `npm run seo:geo:gate` ile korunur.
- Public şehir bitiş kontrolü için varsayılan tek komut `npm run public:city:gate` olmalıdır; bu komut dev server açmaz.
- Build dahil kapanış kontrolü gerektiğinde `npm run public:city:gate:build` kullanılmalıdır; bu da dev server açmaz.
- `npm run ops:next:bulk` public şehir gate'ini ilk adımda çalıştırır; public site kırıkken geniş operasyon zinciri başlatılmaz.
- GitHub Actions kullanılmaz; ilgili public/site dosyaları değişince `npm run public:city:gate:build` yerelde çalıştırılır.
