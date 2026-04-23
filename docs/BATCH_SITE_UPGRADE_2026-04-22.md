# Toplu Uygulama Notu (2026-04-22)

Bu doküman, sanliurfa.com için tek pakette tamamlanan altyapı ve içerik yönetimi iyileştirmelerini özetler.

## Tamamlananlar

1. Ana sayfa artık veritabanı destekli `public_site_settings` kaydı üzerinden yönetilir.
1. `Hero` metinleri, arama önerileri, CTA butonları ve hero özellik kartları admin panelinden güncellenebilir.
1. `Header` menü yapısı (dropdown dahil) admin ayarı üzerinden yönetilir.
1. `Footer` iletişim alanı, bülten metni, sosyal medya notu ve link kolonları admin ayarı üzerinden yönetilir.
1. Varsayılan SEO açıklaması, OG görseli, title suffix ve odak anahtar kelimeler admin ayarı üzerinden yönetilir.
1. Ana sayfaya `Şehir Servisleri` bölümü eklendi:
1. Nöbetçi Eczaneler
1. Otobüs Saatleri
1. Uçak Saatleri
1. Şehir servis detay sayfaları aynı admin ayarındaki başlık, açıklama, kaynak ve durum metinlerinden beslenir.
1. `/sehir-servisleri` ve alt sayfaları eklendi.
1. Admin tarafına `/admin/site-settings` ekranı eklendi.
1. API tarafına `/api/admin/site-settings` (`GET`, `PUT`) eklendi.
1. Global site ayarı için `128_public_site_settings_hardening` migrasyonu eklendi; aynı global key için tek kayıt ve hızlı lookup garanti edilir.
1. Footer'daki sahte telefon ve sahte görsel rozetler kaldırıldı; telefon sadece admin panelden gerçek değer girilirse gösterilir.
1. Canonical yönlendirme üretimde tek alan adına sabitlendi:
1. Hedef: `https://sanliurfa.com`
1. `www` ve `http` istekleri 301 ile canonical adrese yönlenir.
1. CORS politikası üretimde canonical origin odaklı hale getirildi.
1. Redis bağlantı yokken tekrarlı log gürültüsü azaltıldı; fallback davranışı korunur.
1. Eksik temel statik görseller üretildi: OG görselleri, hero görseli, placeholder görseller, tarihi yer ve gastronomi görselleri artık kırık link üretmez.
1. Şehir servisleri sayfalarına `ItemList`, `Service`, `FAQPage` ve `BreadcrumbList` JSON-LD şemaları eklendi.
1. AI arama/GEO görünürlüğü için Türkçe `llms.txt` eklendi ve `robots.txt` AI crawler izinleriyle güncellendi.
1. PWA/favikon dosyaları üretildi: favicon, Apple touch icon, maskable iconlar, shortcut iconları, screenshot görselleri ve logo artık kırık referans üretmez.
1. Manifest shortcut rotaları mevcut Türkçe rotalara bağlandı: `/arama` ve `/profil/favoriler`.
1. Ana sayfa JSON-LD grafiği Organization, WebSite ve WebPage düğümleriyle güçlendirildi.
1. WebSite `SearchAction` hedefi gerçek Türkçe arama rotasına sabitlendi: `/arama?q={search_term_string}`.
1. Dinamik `robots.txt` route'u public robots politikasıyla eşitlendi; sitemap hedefi `sitemap-index.xml` oldu ve eski `/search` kuralı kaldırıldı.

## Yönetim Akışı

1. Admin giriş yap.
1. `Admin Panel > Site Ayarları` ekranını aç (`/admin/site-settings`).
1. Hero, header menü ve şehir servis kartlarını güncelle.
1. Footer ve SEO varsayılanlarını güncelle.
1. Kaydet.
1. Ana sayfa, menü, footer ve şehir servis sayfalarında yansımasını kontrol et.

## Teknik Notlar

1. Ayar anahtarı: `public_site_settings`
1. Tablo: `admin_dashboard_settings` (`is_global=true`)
1. Varsayılan/fallback ayarlar: `src/lib/site-settings.ts`
1. SEO render bileşeni: `src/components/SEO.astro`
1. Footer render bileşeni: `src/components/Footer.astro`
1. Site yalnızca Türkçe kullanım kuralına göre tasarlanmıştır.
1. Temel görsel dosyaları `public/images` altında tutulur; sağlayıcı API ile çekilen gerçek görseller ise slug bazlı olarak `public/uploads/photos/provider/...` yoluna kaydedilir.
1. Şehir servisleri rich snippet verisi `src/lib/city-service-schema.ts` üzerinden üretilir.
1. PWA statik dosyaları `public/` ve `public/icons/` altında tutulur; manifest Türkçe ve canonical alan adı stratejisiyle uyumludur.
1. Genel WebSite schema helper'ı `src/lib/rich-snippets.ts` içindedir ve arama hedefi `/arama` rotasını kullanır.

## URL ve Sitemap Tutarlılığı

1. Eski kullanıcı rotaları kalıcı yönlendirmeye bağlandı: `/search` -> `/arama`, `/favorites` -> `/profil/favoriler`.
2. `sitemap-index.xml` Astro route'u eklendi ve robots/HTML discovery ile aynı hedefe bağlandı.
3. Kök `sitemap.xml` ve `/api/sitemap/dynamic` tek kaynak olarak `src/lib/sitemap.ts` üreticisini kullanır.
4. Sitemap kapsamı ana sayfa, mekanlar, arama, tarihi yerler, gastronomi, şehir servisleri, etkinlikler ve blog içeriklerini kapsar.
5. Tarihi yerler ve gastronomi içerikleri için `status` kolonlarını garanti eden `129_content_status_hardening` migration'ı eklendi.
6. Eski `/mekanlar` iç link izi sadakat sayfasında `/places` rotasına düzeltildi.
7. SEO helper içindeki robots çıktısı public robots politikası ve `sitemap-index.xml` hedefiyle eşitlendi.

## Eski URL Redirect Kapatma

1. `/mekanlar` kalıcı olarak `/places` rotasına yönlendirilir; mevcut query parametreleri korunur.
2. `/hakkimizda` kalıcı olarak `/hakkinda` rotasına yönlendirilir.
3. `/profile` kalıcı olarak `/profil` rotasına yönlendirilir.
4. `/notifications` ayrı İngilizce sayfa olarak çalışmaz; kalıcı olarak `/bildirimler` rotasına yönlendirilir.
5. Public link taramasında eski kullanıcı rotalarına doğrudan link kalmadı; eski rotalar yalnızca redirect dosyası olarak tutulur.

## Türkçe Karakterli URL Kalıntıları

1. Dosya sistemi ve public URL yapısı için kanonik ASCII rotalar kullanılır; içerik dili Türkçe kalır.
2. `/kullanıcı/...` bağlantıları `/kullanici/...` rotasına taşındı.
3. `/kullanıcılar` sayfası `/kullanicilar` rotasına taşındı.
4. `/işletme/pazarlama` sayfası `/isletme/pazarlama` rotasına taşındı.
5. `/veri-ambarı` sayfası `/veri-ambari` rotasına taşındı.
6. Eski Türkçe karakterli URL istekleri middleware seviyesinde 301 ile ASCII kanonik rotalara yönlendirilir.
7. Şehir servisleri, etkinlikler, kullanıcı keşfi ve temel SEO dosyaları middleware public path listesine eklendi; bu sayfalar yanlışlıkla login'e düşmez.

## Public Route Middleware Kapatması

1. Yasal sayfalar anonim erişime açıldı: `/gizlilik-politikasi`, `/kullanim-kosullari`, `/kvkk`.
2. Auth yardımcı akışları anonim erişime açıldı: `/sifremi-unuttum`, `/sifre-sifirla`, `/verify-email`.
3. Public keşif sayfaları middleware listesine eklendi: `/oneriler`, `/liderlik-tablosu`, `/fiyatlandirma`.
4. Eski redirect rotaları middleware tarafından login'e düşmeden 301 dönecek şekilde public listede tutulur: `/search`, `/favorites`, `/mekanlar`, `/hakkimizda`, `/profile`, `/notifications`.
5. Korumalı sayfalar public yapılmadı: `/abonelik`, `/akis`, `/icerik`, `/webhooks`, `/profil`, `/ayarlar`, `/mesajlar`, `/admin`.

## Sitemap Tek Kaynak Kapatması

1. Statik `@astrojs/sitemap` entegrasyonu devreden çıkarıldı; build sırasında `sitemap-index.xml` dosyasının dinamik route'u gölgelemesi engellendi.
2. Kanonik sitemap üretimi Astro SSR route'larında kaldı: `/sitemap-index.xml`, `/sitemap.xml`, `/api/sitemap/dynamic`.
3. Sitemap içerik kaynağı tek dosyada tutulur: `src/lib/sitemap.ts`.
4. Dinamik DB içerikleri, admin panelinden yönetilen içerik stratejisiyle uyumlu kalır; statik entegrasyonun ürettiği eksik `sitemap-0.xml` çıktısı kullanılmaz.

## Marka Adı Normalizasyonu

1. Görünen domain adı `sanliurfa.com` olarak sabitlendi.
2. Odak anahtar kelime ve içerik dili Türkçe kalır: `Şanlıurfa`.
3. Mevcut admin ayarı `footer.brandName` içinde eski `Şanlıurfa.com` değeri varsa migration ile `sanliurfa.com` değerine taşınır.

## Middleware Redirect Sertleştirme

1. Eski public URL yönlendirmeleri middleware seviyesine taşındı: `/search`, `/favorites`, `/mekanlar`, `/hakkimizda`, `/profile`, `/notifications`.
2. Yönlendirmeler auth kontrolünden önce çalışır; eski URL istekleri yanlışlıkla login ekranına düşmez.
3. Query string korunur; örnek: `/search?q=gobeklitepe` -> `/arama?q=gobeklitepe`.

## Eksik Public Sayfa Kapatması

1. Footer varsayılanlarında linklenen `/sss` sayfası eklendi.
2. Footer varsayılanlarında linklenen `/cerez-politikasi` sayfası eklendi.
3. SSS sayfası `FAQPage` JSON-LD ile rich result uyumlu hale getirildi.
4. Çerez bildirimi artık genel gizlilik sayfası yerine doğrudan `/cerez-politikasi` sayfasına bağlanır.
5. Yeni public sayfalar middleware public path listesine ve sitemap statik listeye eklendi.

## Türkçe Dil Kilidi

1. Kullanıcı dil tercihi veritabanında kalıcı olarak `tr` değerine kilitlendi.
2. Tenant varsayılan dili `tenant_settings.default_language` için de `tr` CHECK constraint eklendi.
3. `updateUserSettings` her ayar güncellemesinde `language_preference` değerini tekrar `tr` olarak yazar.
4. Eski i18n endpointleri dil seçici gibi çalışmaz; eski istemciler için sadece `tr` döndürür.

## PWA Paylaşım Hedefi Kapatması

1. Manifest içinde tanımlı `/api/share` endpoint'i eklendi.
2. PWA share target POST verisi aynı-domain URL içeriyorsa güvenli şekilde ilgili sayfaya yönlendirilir.
3. Dış domain veya düz metin paylaşımı gelirse kullanıcı `/arama?q=...` rotasına taşınır.
4. Boş veya hatalı paylaşım istekleri ana sayfaya yönlendirilir.

## Public Link ve Asset Tutarlılığı

1. `/kullanici` taban rotası `/kullanicilar` sayfasına 301 yönlendirme olarak eklendi.
2. Eski profil alt linkleri eklendi ve kanonik sayfalara yönlendirildi: `/profil/bildirimler`, `/profil/puanlar`, `/profil/rozetler`.
3. PWA helper içindeki örnek screenshot ve icon yolları mevcut dosyalara bağlandı.
4. Eksik `/fonts/roboto-regular.woff2` preload helper referansı kaldırıldı.
5. Media variant mock çıktısı kırık `/variants/...` URL'i yerine mevcut placeholder görsele bağlandı.

## Sosyal Mekan Linkleri ve Türkçe UI Kapatması

1. Takip edilen mekanlar API çıktısına `slug` eklendi; kullanıcı panelindeki mekan kartları artık kanonik `/places/{slug}` rotasına gider.
2. Hashtag mekan ve yorum bağlantılarındaki eski `/mekan/...` kalıntıları `/places/...` rotasına taşındı.
3. Önerilen mekan kartları `slug` varsa `/places/{slug}`, yoksa id fallback ile çalışacak şekilde güncellendi.
4. Public karşılığı olmayan `/mekan/{id}/followers` linki kırık sayfaya gitmeyecek şekilde pasif sayaca çevrildi.
5. Admin doğrulama, performans, sadakat, OLAP, rozet ve yorum analizi bileşenlerinde görünen belirgin İngilizce hata/metin kalıntıları Türkçeleştirildi.

## Admin Panel Türkçe Metin Sertleştirmesi

1. Webhook yönetimi, webhook analitikleri, rapor yönetimi ve kota panellerindeki kullanıcıya görünen İngilizce hata metinleri Türkçeleştirildi.
2. Ödül kataloğu ve sadakat işlem geçmişindeki İngilizce hata/fallback metinleri Türkçe karşılıklarla değiştirildi.
3. Ziyaretçi grafiği, liderlik tablosu ve trend/tavsiye bileşenlerinde kalan görünen İngilizce metinler Türkçeleştirildi.
4. Bu çalışma sadece görünen UI/API fallback metinlerini kapsar; teknik event adları (`message.sent`, `place.updated` gibi) webhook kontratı olduğu için korunur.

## API Türkçe Response Sertleştirmesi

1. 2FA kurulum, doğrulama, durum ve kapatma endpoint'lerindeki kullanıcıya dönen hata/başarı mesajları Türkçeleştirildi.
2. Sosyal takip, sosyal akış ve trend endpoint'lerinde auth, validation ve internal fallback mesajları Türkçeleştirildi.
3. Abonelik, checkout ve iptal endpoint'lerinde paket, ödeme oturumu ve aktif abonelik hata mesajları Türkçeleştirildi.
4. Sadakat, ödül, işlem geçmişi, başarımlar, kota, ziyaret ve özellik erişimi endpoint'lerinde response mesajları Türkçeleştirildi.
5. Kullanıcıya görünmeyen ama kod hijyenini bozan auth yorumları da Türkçe-only standardına taşındı.

## API Türkçe Response Genişletme

1. Başarımlar ve rozet tanımı endpoint'lerinde kalan İngilizce auth, validation ve internal response mesajları Türkçeleştirildi.
2. İşletme metrikleri endpoint'lerinde tarih, metrik doğrulama, kayıt ve listeleme hata mesajları Türkçeleştirildi.
3. Güvenlik oturumları ve güvenlik olayları endpoint'lerinde oturum, session ID, bulunamadı ve internal response mesajları Türkçeleştirildi.
4. Mekan beğeni, paylaşım, takipçi, takip, ziyaret, doğrulama, rozet ve yorum analitiği endpoint'lerinde kullanıcıya dönen İngilizce mesajlar Türkçeleştirildi.
5. Rapor listeleme, oluşturma, çalıştırma ve dışa aktarma endpoint'lerinde response mesajları Türkçeleştirildi.
6. Yorum oluşturma, bildirme, faydalı oy, tepki ve işletme yanıtı endpoint'lerinde response mesajları Türkçeleştirildi.

## API Standart Mesaj Türkçeleştirme

1. `src/pages/api` genelinde tekrar eden auth, forbidden, invalid, not found ve internal server response kalıpları Türkçeye taşındı.
2. İçerik, analiz, billing, collab, mesaj, bildirim, e-posta, kampanya ve webhook endpoint'lerinde özel `Failed to ...` response mesajları Türkçeleştirildi.
3. Webhook, e-posta, kampanya, tenant, dashboard, export template ve içerik başarı mesajları Türkçe-only standardına alındı.
4. Doğrulama e-postası, e-posta doğrulama, revizyon geri yükleme ve kullanıcı paket değiştirme başarı mesajları Türkçeleştirildi.
5. Logger içindeki teknik İngilizce metinler response kontratı olmadığı için bu batch'te davranış değişikliği kapsamına alınmadı.

## UI Türkçe Metin Kapatması

1. Analitik dashboard sekme başlıkları, KPI yönetimi ve pano başlıkları Türkçeleştirildi.
2. Admin analitik sayfasındaki performans, platform analitiği ve sistem metrikleri başlıkları Türkçeleştirildi.
3. SEO analiz bileşenindeki İngilizce ve Korece görünen metinler Türkçe-only standardına taşındı.
4. Tenant, abonelik, 2FA, puan geçmişi, kullanıcı önerileri, kullanıcı profili ve webhook teslimat bileşenlerindeki İngilizce fallback hata mesajları Türkçeleştirildi.
5. Kullanıcı kartları ve istatistiklerinde görünen `Level` etiketi `Seviye` olarak değiştirildi.
6. Geliştirme hata sınırı ve denetim kayıtları başlıklarında kalan İngilizce kullanıcı arayüzü metinleri Türkçeleştirildi.

## Medya ve Performans Yardımcıları Sertleştirmesi

1. Frontend performans yardımcılarındaki paket boyutu önerileri Türkçe-only standardına taşındı.
2. Medya varyant yardımcısının sahte query-string görsel üretmesi kaldırıldı; kırık URL yerine mevcut `/images/placeholder.jpg` fallback'i kullanılır.
3. S3/Supabase dosya depolama hata mesajları Türkçeleştirildi ve CWP shared hosting için yerel depolama kullanımı açık şekilde belirtildi.

## Konsol ve Yardımcı Mesaj Türkçeleştirmesi

1. İçerik, kampanya, bildirim, sadakat, güvenlik, fotoğraf, arama ve sosyal bileşenlerde kalan İngilizce `console.error` metinleri Türkçe-only standardına taşındı.
2. Pazarlama kampanyası test e-postası response metnindeki `adress` yazım hatası `adres` olarak düzeltildi.
3. Bu batch kullanıcı akışını değiştirmez; sadece gözlemlenebilir hata mesajı tutarlılığı ve Türkçe metin standardını kapatır.

## Pazarlama Terminoloji ve Türkçe Karakter Düzeltmesi

1. `featured listing` alanında hatalı kullanılan `Yeminli Liste` terminolojisi `Öne Çıkan Listeleme` olarak düzeltildi.
2. İşletme pazarlama sayfasındaki başlık, açıklama ve bilgi kartları aynı terminolojiyle tutarlı hale getirildi.
3. Trend mekan başlığı ve kullanıcıya görünen pazarlama metinlerinde Türkçe karakter kullanımı kalıcı hale getirildi.
4. Bundan sonraki Türkçe kalite çalışmasında teknik hata logları öncelik değildir; öncelik kullanıcıya görünen içerikler, sayfa metinleri, başlıklar, menüler ve yazım kurallarıdır.

## Görünen İçerik Yazım Kalitesi

1. Abonelik ve faturalama e-posta şablonlarında kullanıcıya gidebilecek yazım hataları düzeltildi: `Abonelikmi`, `abone oldum`, `Işlem`, `İndirge` ve `kullanabilecesiniz` metinleri doğru Türkçe karşılıklarına taşındı.
2. Sosyal özellik sekmesindeki `Trendiyor` ve `kullannım` yazım hataları düzeltildi.
3. SEO anahtar kelime önerilerinde `Urfada`, `Şanlı Urfa`, ilgisiz şehir referansı ve eksik Türkçe ek kullanımları Şanlıurfa odaklı hale getirildi.
4. `Hakkımızda` sayfasında görünen `Mekan` kullanımları yazım standardı için `Mekân` olarak düzeltildi.

## Görünen İçerik Türkçe Terim Standardı

1. Site menüsü, admin menüsü, arama alanları, yer kartları ve SEO açıklamalarında `Mekân`/`mekân` yazımı standartlaştırıldı.
2. Admin kampanya ekranında kullanıcıya görünen `Email`, `Onboarding`, `Inaktif` gibi metinler Türkçe karşılıklarıyla düzeltildi.
3. Denetim kayıtları ve blog analitik ekranındaki yönetim başlıkları Türkçe kullanım standardına çekildi.
4. Bu turda API alan adları, route/path yapısı ve teknik log dili değiştirilmedi; sadece kullanıcıya görünen içerik hedeflendi.

## Yönetim ve Kullanıcı Arayüzü Türkçe Tutarlılığı

1. Yönetim sayfalarında görünen `Admin Panel`/`Admin` başlıkları `Yönetim Paneli` standardına çekildi.
2. Kampanya, blog bülteni, webhook analitikleri, kullanıcı takip durumu ve ödül puanı alanlarında doğal olmayan Türkçe ifadeler düzeltildi.
3. Varsayılan Layout ve SEO açıklamalarında `mekânlar` küçük harf kullanımı tutarlı hale getirildi.
4. Bu turda teknik event adları, route yapısı, role değerleri ve log dili değiştirilmedi.

## İki Faktörlü Doğrulama ve Öneri Metinleri

1. Kullanıcıya görünen `2FA` kısaltmaları `iki faktörlü doğrulama` ifadesiyle Türkçeleştirildi.
2. Doğrulama talebi başarı mesajında `Admin` yerine `yönetim ekibi` kullanıldı.
3. Öneri bileşenlerinde `Tavsiye` yerine `Öneri` standardı getirildi ve ham teknik içerik türleri kullanıcı dostu etiketlere çevrildi.
4. SSS giriş metnindeki cümle içi `mekân` yazımı küçük harf standardına çekildi.
5. Bu turda route, API alan adı, teknik değişken adı ve log dili değiştirilmedi; kapsam sadece kullanıcıya görünen Türkçe içerik kalitesidir.

## Görünen Metin Kapitalizasyon ve Admin İçerik Standardı

1. Kullanıcıya görünen örnek `User123` metni Şanlıurfa odaklı doğal bir kullanıcı ifadesiyle değiştirildi.
2. `Geri Dön`, `E-Posta`, `Doğrulama Kodu`, `Yanıt Ver` gibi başlık dışı etiketler Türkçe cümle yazımı standardına çekildi.
3. Kampanya ve kupon ekranlarındaki `Kampanya Adı`, `HTML İçerik`, `Kontrol Ediliyor`, `PROMOKOD` gibi doğal olmayan veya gereksiz büyük harfli metinler düzeltildi.
4. Webhook sayfalarında teknik terim korundu; ancak başlık, açıklama ve bilgi kartları Türkçe yönetim bağlamına alındı.
5. RSS başlığı ve site ayarları ekranındaki `placeholder` ifadesi Türkçe karşılıklarla güncellendi.

## Demo Metinleri ve Yönetim Paneli Görünür İçerik Temizliği

1. İşletme panelindeki sahte metrik etkisi veren örnek sayılar kaldırıldı; boş durumlar kullanıcıyı işletme ve reklam kampanyası eklemeye yönlendiren gerçekçi metinlere taşındı.
2. Kampanya yönetiminde `Test Gönder`, `admin hesabı`, `Hemen Gönder` gibi profesyonel olmayan veya gereksiz büyük harfli görünen metinler düzeltildi.
3. Site ayarları ekranında `Hero`, `Header`, `Footer`, `CTA` gibi İngilizce yönetim terimleri görünür metinde Türkçe karşılıklarla değiştirildi.
4. Webhook rehberindeki açıklamalar Türkçe yönetim diliyle netleştirildi; teknik terim olarak `webhook` korundu.
5. Aktivite, bildirim, metrik ve analitik başlıklarında cümle içi büyük harf kullanımı azaltıldı.

## Kullanıcı Eylemleri ve Form Metinleri Türkçe Standardı

1. Takip, mesaj gönderme, iptal etme, hesap silme ve webhook oluşturma butonlarında gereksiz büyük harf kullanımı azaltıldı.
2. `Admin İşlemleri`, `İnaktif`, `Son Tetikleme` gibi kullanıcıya görünen yönetim terimleri Türkçe ve doğal karşılıklarla değiştirildi.
3. Koleksiyon, öne çıkan listeleme, mekân ve etkinlik yönetim formlarında başlık/etiket yazımı cümle içi Türkçe standardına çekildi.
4. E-posta alanlarında `kullanici@sanliurfa.com` yerine daha doğal `adiniz@sanliurfa.com` örnek adresi kullanıldı.
5. Boş durum metinleri `boş/kuyruk boş` kalıbından daha açıklayıcı ve kullanıcıya yön veren metinlere taşındı.

## Placeholder ve Örnek İçerik Kalitesi

1. Genel `Başlık`, `Açıklama`, `İçerik`, `Kategori` placeholderları kullanıcıya ne gireceğini anlatan daha açıklayıcı metinlerle değiştirildi.
2. Arama, yorum, koleksiyon ve webhook örnekleri Şanlıurfa odağına veya gerçek entegrasyon bağlamına uygun hale getirildi.
3. Blog, etkinlik ve tarihi yer görsel URL örneklerinde `ornek-*` yerine slug mantığına uygun `gobeklitepe` ve `urfa-gastronomi-festivali` adları kullanıldı.
4. Şifre sıfırlama ve işletme pazarlama sayfalarında başlık/buton metinleri cümle içi Türkçe yazım standardına çekildi.
5. Öne çıkan listeleme ve kampanya boş durumları daha açıklayıcı, aksiyona yönlendiren metinlere taşındı.

## Depolama ve Redis Tekilleştirme

1. CWP shared hosting hedefi için dosya yükleme katmanı yerel depolamaya kilitlendi; `s3` veya `supabase` değeri verilirse uygulama dosyayı güvenli şekilde yerel depolamaya düşürür.
2. Dosya silme işlemi artık yalnızca tanımlı yükleme dizini içinde çalışır; mutlak URL, `/uploads/...` yolu ve path traversal denemeleri güvenli şekilde normalize edilir.
3. Ayrı Redis istemcisi tek cache katmanına bağlandı; Redis bağlantısı, rate limit ve session cache işlemlerinde çakışan client/log davranışı üretmez.
4. Bu toplu işlemde dev server açılmadı; port politikası `127.0.0.1:4321` olarak korunur.

## Bitirme Modu: Ana Sayfa, Mekan Akışı ve Şehir Servisleri

1. Ana sayfadaki öne çıkan mekan kartları artık detay sayfalarına bağlanır; kartlar sadece görsel vitrin olarak kalmaz.
2. Mekan liste ve detay sayfaları, veritabanı boş veya erişilemez olduğunda Şanlıurfa odaklı kürasyon verisiyle çalışır. DB verisi varsa öncelik veritabanındadır.
3. Kürasyon verisi Göbeklitepe, Balıklıgöl, Urfa Kebabı, çiğ köfte, isot ve şıllık tatlısı gibi Şanlıurfa odaklı içeriklerden oluşur; görseller mevcut local assetlerden gelir.
4. Nöbetçi eczane, otobüs saatleri ve uçak saatleri detay sayfaları profesyonel servis modülü görünümüne taşındı. Canlı veri entegrasyonu geldiğinde aynı yapı DB/API ile doldurulabilir.
5. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Arama, Keşfet ve Tarihi Yerler

1. Arama API'si, veritabanı araması boş döndüğünde Şanlıurfa kürasyon verisini kullanır; API hatasında da kullanıcıya boş sayfa yerine sonuç döndürür.
2. Arama bileşeni, API erişilemezse veya sonuç yoksa Göbeklitepe, Balıklıgöl, Urfa Kebabı gibi yerel önerileri gösterir.
3. Keşfet sayfası giriş zorunluluğundan çıkarıldı; kamuya açık Şanlıurfa keşif merkezi olarak SEO uyumlu başlık, açıklama ve hızlı bağlantılar aldı.
4. Trend mekan bileşeni, keşif verisi yoksa yerel kürasyon verisiyle çalışır.
5. Tarihi yerler ana sayfa, liste ve detay akışı veritabanı boşken Göbeklitepe, Balıklıgöl ve Harran içerikleriyle kırılmadan çalışır.
6. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Gastronomi ve Blog Akışları

1. Gastronomi içerikleri ortak Şanlıurfa yemek veri kaynağına taşındı; liste, ana sayfa vitrini ve detay sayfaları aynı veriyi kullanır.
2. `/gastronomi/[slug]` artık her slug için Urfa Kebabı göstermiyor; Urfa kebabı, çiğ köfte, isot ve şıllık tatlısı kendi detay içeriğiyle açılır.
3. Gastronomi restoran bölümü veritabanı boşken Şanlıurfa odaklı yerel kürasyon verisini kullanır.
4. Blog ana sayfası, blog detay sayfası ve ana sayfa son yazılar vitrini DB boşken Şanlıurfa gezi rehberi, gastronomi ve tarihi yerler içerikleriyle çalışır.
5. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Etkinlikler ve Kamu Keşif Vitrini

1. Etkinlik liste ve detay sayfaları, veritabanı boş veya erişilemez olduğunda Şanlıurfa odaklı yerel etkinlik verisiyle çalışır.
2. Göbeklitepe kültür rotası, Balıklıgöl fotoğraf yürüyüşü, Şanlıurfa gastronomi günü ve Harran tarih buluşması için slug uyumlu içerik kaynağı eklendi.
3. Etkinlik listesine kategori filtresi eklendi; detay sayfasındaki kategori linkleri artık gerçek filtre uygular.
4. Ana sayfaya yaklaşan etkinlikler vitrini eklendi; DB verisi varsa onu, yoksa yerel Şanlıurfa etkinliklerini gösterir.
5. Keşfet sayfasındaki hızlı bağlantılar tarihi yerler ve etkinliklerle tamamlandı.
6. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Topluluk, Sıralamalar ve Koleksiyonlar

1. Kullanıcı arama ve liderlik API'leri, veritabanı boş veya erişilemez olduğunda Şanlıurfa odaklı yerel topluluk verisi döndürür.
2. Kullanıcı keşif bileşeni ilk açılışta boş ekran yerine Şanlıurfa tarih, gastronomi ve gezi katkıcılarını gösterir.
3. Sıralamalar bileşeni API hatasında veya boş veride puan, seviye, aktivite ve yenilik sıralaması için yerel fallback kullanır.
4. Kullanıcı keşif ve sıralamalar sayfaları SEO uyumlu Şanlıurfa odaklı hero metinleriyle yenilendi.
5. Koleksiyonlar sayfası girişsiz kullanıcıyı doğrudan login'e atmak yerine kamuya açık Şanlıurfa rota koleksiyonları ve kayıt çağrısı gösterir; giriş yapan kullanıcıda mevcut koleksiyon yönetimi korunur.
6. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Mesaj, Bildirim, Aktivite ve Profil Akışları

1. Mesajlar, bildirimler ve aktiviteler sayfaları girişsiz kullanıcıyı doğrudan yönlendirmek yerine özellik vitrini, kayıt ve giriş çağrısı gösterir.
2. Giriş yapan kullanıcılar için mevcut mesaj kutusu, bildirim merkezi ve aktivite geçmişi davranışı korunur.
3. Mesaj kutusunda konuşma yoksa kullanıcı keşfine yönlendiren açıklayıcı boş durum eklendi.
4. Bildirim ve aktivite bileşenlerinde boş durumlar Şanlıurfa keşif, mekân ve koleksiyon aksiyonlarına bağlandı.
5. Profil sayfası veritabanı sorgusu hata verdiğinde oturum bilgisinden güvenli fallback kullanır; yorum/favori istatistikleri alınamazsa sayfa düşmez.
6. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Sosyal Eşleşme ve Katkı Akışları

1. Sosyal sayfa girişsiz kullanıcıda doğrudan yönlendirme yerine özellik vitrini gösterir; giriş yapan kullanıcıda aktivite akışı, kullanıcı önerileri ve hashtag keşfi korunur.
2. Fotoğraflı eşleşme için `/sosyal/eslesme` ürün yüzeyi eklendi; dört fotoğraflı profil, sağa/sola karar ve eşleşmeden mesaja geçiş kurgusu dokümante edilmiş şekilde görünür hale getirildi.
3. Profil favoriler ve yorumlar sayfaları veritabanı sorgusu hata verdiğinde sayfayı düşürmez; boş durumla kullanıcıyı mekân keşfine yönlendirir.
4. Mekân ekleme formunda Şanlıurfa odaklı açıklama ve placeholderlar güçlendirildi; tarihi yer, eczane ve ulaşım noktası kategorileri eklendi.
5. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Üyelik, İşletme ve Sadakat Yüzeyleri

1. Abonelik, sadakat, işletme pazarlama, işletme analitikleri ve işletme paneli girişsiz kullanıcıyı sert yönlendirme yerine ürün vitriniyle karşılar.
2. Giriş yapan kullanıcılar için mevcut abonelik, ödeme geçmişi, sadakat, pazarlama, analitik ve işletme paneli bileşenleri korunur.
3. Abonelik ve ödeme geçmişi bileşenleri API/DB geçici olarak erişilemezse kırmızı hata ekranına düşmez; kullanıcıya ücretsiz temel erişim ve plan yönlendirmesi gösterir.
4. Fiyatlandırma sayfası Şanlıurfa odaklı, Türkçe ve ödeme açılana kadar ücretsiz kullanım kuralını anlatan profesyonel plana taşındı.
5. İşletme panelindeki sahte yorum/demo veri kaldırıldı; boş durumlar işletme ekleme, analitik ve pazarlama aksiyonlarına bağlandı.
6. İşletme analitiklerinde mekân seçilmemiş veya API erişilemez durumlar kullanıcıyı panelden koparmayan yönlendirici kartlara taşındı.
7. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Sadakat Alt Akışları, Kota ve Geliştirici Yüzeyleri

1. Sadakat ödülleri, işlem geçmişi ve kullanıcı sadakat sayfaları girişsiz kullanıcıda sert yönlendirme yerine özellik vitrini gösterir.
2. Kota sayfası girişsiz kullanıcıya kullanım, plan ve ücretsiz temel erişim bilgisini anlatır; giriş yapan kullanıcıda mevcut kota bileşeni korunur.
3. Ödül kataloğu API/DB erişilemezse Şanlıurfa odaklı yerel ödül fallback'iyle boş veya kırmızı hata ekranına düşmez.
4. Puan işlem geçmişi hata ve boş durumları kullanıcıyı yönlendiren Türkçe metinlerle güçlendirildi.
5. Sadakat panelindeki bozuk Türkçe, yabancı kelime ve para harcama odaklı metinler Şanlıurfa katkı puanı standardına taşındı.
6. İçerik yönetimi, aktivite akışı ve webhook sayfaları girişsiz kullanıcıda açıklayıcı giriş/kayıt vitrini gösterir; giriş yapan kullanıcıda mevcut paneller korunur.
7. Webhook sayfasındaki örnekler, başlıklar ve ipucu alanları Türkçe ve profesyonel yönetim diliyle temizlendi.
8. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Profil, Ayarlar ve Puan Geçmişi

1. `/profil`, `/profil/favoriler`, `/profil/yorumlar`, `/profil/ayarlar` ve `/ayarlar` girişsiz kullanıcıda sert yönlendirme yerine açıklayıcı özellik vitrini gösterir.
2. Giriş yapan kullanıcılar için mevcut profil, favori, yorum ve ayar panelleri korunur.
3. Profil ve profil ayarları veritabanı sorgusu hata verdiğinde sayfa düşmez; oturum bilgisinden güvenli fallback kullanır.
4. Profil ayarları metinleri cümle içi Türkçe standardına çekildi; hassas hesap işlemleri daha doğal dille ayrıldı.
5. Puan geçmişi bileşeni API hatası veya boş veri durumunda kırık/ham hata yerine yönlendirici Türkçe boş durum gösterir.
6. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Ayar Paneli ve Premium Kilit Tutarlılığı

1. `/ayarlar` içindeki React ayar paneli API/DB geçici hatasında boş veya ham kırmızı hata ekranı yerine tekrar deneme ve profile dönüş aksiyonları sunan dayanıklı karta taşındı.
2. Ayar panelindeki tablar, form alanları, butonlar ve odak renkleri Şanlıurfa tasarım paletiyle uyumlu hale getirildi; varsayılan mavi aksiyonlar kaldırıldı.
3. Görünür ayar metinleri Türkçe cümle içi yazım standardına çekildi; avatar, kullanıcı adı, şifre ve gizlilik alanları daha doğal dile taşındı.
4. Premium özellik kilidi bozuk cümle, emoji ve varsayılan mavi görünümden temizlendi; ücretsiz ilk aşama kuralı ve üyelik planı yönlendirmesi netleştirildi.
5. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Öneriler, Liderlik ve Topluluk Kartları

1. `/oneriler` sayfası DB/API boş veya erişilemez olduğunda Şanlıurfa kürasyon verisiyle çalışacak şekilde güçlendirildi.
2. Öneriler sayfasındaki emoji başlık, zayıf boş durum ve varsayılan kart görünümü profesyonel Şanlıurfa keşif vitriniyle değiştirildi.
3. Eski `/liderlik-tablosu` sayfası Şanlıurfa topluluk katkısı odaklı hero metni ve SEO açıklamasıyla yenilendi.
4. Koleksiyon yönetimi formundaki emoji ikon alanı metin etikete çevrildi; mavi aksiyonlar Urfa paletine alındı ve boş durum Şanlıurfa rota kullanımına bağlandı.
5. Aktivite akışı bileşenindeki emoji rozetleri, mavi/purple varsayılan renkleri ve ham kırmızı hata bloğu temizlendi; metin etiketli, daha okunur bir akış standardı uygulandı.
6. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: Mekân Detay, Liste ve Koleksiyon Detayı

1. Mekân liste ve detay sayfalarında genel placeholder görsel yerine Şanlıurfa odaklı yerel fallback görsel kullanıldı.
2. Mekân detayındaki doğrulanmış rozet, yol tarifi, yorum çağrısı ve boş değerlendirme metinleri Türkçe cümle standardına ve Urfa paletine taşındı.
3. Yakındaki mekânlar alanı placeholder kırılmasına karşı güçlendirildi; başlık ve buton metinleri daha doğal Türkçeye çekildi.
4. Koleksiyon detay sayfası SEO başlığı ve açıklaması aldı; rota koleksiyonları Şanlıurfa mekan/yemek/tarih odağıyla tanımlandı.
5. Koleksiyon detay bileşenindeki emoji istatistikler, mavi aksiyonlar ve kırmızı ham hata bloğu temizlendi; boş durum kullanıcıyı Şanlıurfa rotası oluşturmaya yönlendirecek hale getirildi.
6. Yorum bileşenindeki emoji oy butonları, mavi odaklar ve ham hata görünümü temizlendi; yorum boş durumu Şanlıurfa deneyimi paylaşımına bağlandı.
7. Bu işlemde dev server açılmadı; port politikası değiştirilmedi.

## Bitirme Modu: 4321 Dev ve Prod Port Kilidi

1. `package.json` dev, preview ve stop komutları `127.0.0.1:4321` üzerinde tutuldu.
2. `astro.config.mjs` Vite dev ve preview ayarlarında `strictPort: true` ile 4321 dışına fallback engeli korunur.
3. `ecosystem.config.js` production PM2 ortamı `PORT=4321` olarak sabitlendi; eski `6000` portu kaldırıldı.
4. `AGENTS.md` ve `docs/ASTRO_FIRST_LOCK.md` içine dev, preview ve production runtime için tek port kuralı işlendi.
5. Bundan sonra port 4321 doluysa yeni port açılmaz; sadece bu repoya ait 4321 listener durdurulur.
6. Local `.env.local` gitignored çalışma dosyasıdır; dev runtime için `PORT=4321`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `SESSION_SECRET` ve local upload ayarları burada tutulur.
7. `/api/health`, `DATABASE_URL` eksikse import aşamasında 500'e düşmez; veritabanını `down` işaretleyip JSON health cevabı üretir.
8. `scripts/dev-start-4321.ps1`, Astro başlamadan önce `.env` ve `.env.local` değerlerini sürece yükler; `npm run dev` ile açılan server proje env'i olmadan başlamaz.

## Bitirme Modu: Windows Redis İzolasyonu

1. Local Windows Redis servisi zaten kurulu ve `127.0.0.1:6379` üzerinde çalışır; bu proje ayrı port açmaz.
2. Redis parola gerektirdiği için gerçek `REDIS_URL` sadece ignored `.env.local` içinde tutulur; tracked dosyalara gerçek parola yazılmaz.
3. Bu proje Redis keylerini `REDIS_KEY_PREFIX=sanliurfa:` ile izole eder; başka projelere ait Redis servisleri, keyleri veya veritabanları flush edilmez.
4. `npm run redis:check`, `.env.local` üzerinden PING ve `sanliurfa:` prefixli geçici yaz/oku testi yapar; secret yazdırmaz.
5. Dev server Redis env değişikliğinden sonra yalnızca bu repoya ait 4321 listener durdurularak aynı portta yeniden başlatıldı.
6. `/api/health` sonucu `healthy`: database `up`, Redis `up`, uygulama `http://127.0.0.1:4321/` üzerinde çalışıyor.

## Bitirme Modu: Sitemap Fallback ve Image SEO

1. Ana sitemap DB sorgularından biri hata verdiğinde tamamen 500'e düşmez; her içerik grubu ayrı güvenli sorgulanır.
2. DB boş veya kısmi olduğunda Şanlıurfa odaklı curated mekan, tarihi yer, gastronomi, etkinlik ve blog URL'leri sitemap'e eklenir.
3. DB dolu olsa bile kritik curated URL'ler sitemap'te garanti kalır; URL'ler tekilleştirilir.
4. Mekan kategori URL'leri sayfanın kullandığı `category` parametresiyle üretildi; eski `kategori` parametresi kaldırıldı.
5. Mekan, etkinlik, tarihi yer, gastronomi ve blog kayıtlarında görseller `image:image` sitemap girdisi olarak çıkar.
6. `/blog/sitemap.xml` DB erişilemezse boş sitemap dönmez; curated Şanlıurfa blog yazıları ve kategorileriyle dolu XML üretir.

## Bitirme Modu: AI Crawler ve llms.txt GEO Yüzeyi

1. `robots.txt` AI arama görünürlüğü için `OAI-SearchBot` iznini de içerir.
2. Dinamik robots route'u, public robots ve SEO helper robots çıktısı aynı AI crawler politikasına taşındı.
3. `llms.txt` Şanlıurfa odaklı Türkçe kapsam, öncelikli sayfalar, alıntılanabilir kısa özetler, sitemap/RSS/robots kaynakları ve AI crawler politikasını içerecek şekilde genişletildi.
4. `llms.txt` içinde sahte sosyal hesap veya dış platform iddiası kullanılmadı; kanonik alan adı `https://sanliurfa.com` olarak korundu.

## Bitirme Modu: RSS ve Public Feed Şema Uyumu

1. `/rss.xml` eski `is_published` kolonuna bağlı 500 hatasından çıkarıldı; blog yayın durumu `status = 'published'` üzerinden okunur.
2. RSS DB sorgusu başarısız veya boş dönerse curated Şanlıurfa blog yazılarıyla geçerli XML üretir.
3. Ana sayfa etkinlik bileşeni mevcut events şemasında olmayan `start_time` kolonuna bağımlı değildir.
4. Ana sayfa son blog bileşeni `bp.is_published` yerine `bp.status = 'published'` kullanır.
5. Sitemap etkinlik, tarihi yer ve gastronomi sorguları mevcut migration kolonlarıyla uyumlu hale getirildi; gereksiz DB hata logları azaltıldı.
6. Blog kategori cache'i JSON string olarak dönüp `.map` hatası üretmeyecek şekilde normalize edildi.
7. Blog liste sorgusundaki tag aggregate kullanımı `GROUP BY` ile PostgreSQL uyumlu hale getirildi.
8. Gastronomi sitemap girdileri curated Şanlıurfa yemek verisinden üretilir; migration durumu farklı local/prod DB'lerde gereksiz `foods.status` logu üretmez.

## Bitirme Modu: SEO Başlık Tekilleştirme

1. SEO bileşeni, başlık zaten `| sanliurfa.com` ile bitiyorsa ikinci kez suffix eklemez.
2. Eski `SEOHead` bileşeninde de aynı tekilleştirme uygulandı; legacy kullanımda çift site adı üretimi engellendi.

## Bitirme Modu: İlişkili İçerik ve Eksik Görsel Dayanıklılığı

1. İlişkili blog içerikleri eski `is_published` kolonu yerine mevcut blog şemasındaki `status = 'published'` filtresiyle çalışır.
2. İlişkili içerik bileşeni DB sorgusu hata verdiğinde sayfayı 500'e düşürmez; Şanlıurfa odaklı curated blog, mekan ve tarihi yer verilerine düşer.
3. Admin placeholder ve doküman örneklerinde geçen Göbeklitepe, etkinlik, profil avatarı ve genel fotoğraf yolları gerçek `public/images` dosyalarıyla tamamlandı.
4. Görsel dosyaları mevcut yerel Şanlıurfa görsellerinden üretildi; dış API çağrısı, yeni dev server veya farklı port kullanılmadı.

## Bitirme Modu: Curated ID ve DB Şema Log Temizliği

1. Curated mekan ve tarihi yer kayıtlarının UUID olmayan id değerleri artık PostgreSQL UUID kolonlarına gönderilmez; ilgili alanlar doğrudan curated fallback ile doldurulur.
2. Mekan detayındaki yorum sorgusu `reviews.is_approved` kolonunu önce şemadan kontrol eder; kolon yoksa sayfa hata logu üretmeden yorumları filtre dışı bırakır.
3. Mekan ve tarihi yer detay sayfalarında yakın içerik sorguları curated id ile DB hatası üretmez.
4. `places/gobeklitepe` ve `tarihi-yerler/gobeklitepe` smoke kontrolünde 200 döndü ve yeni DB hata logu oluşmadı.

## Bitirme Modu: Etkinlik Şema Uyumu ve Log Temizliği

1. Etkinlik detay sayfası `events.created_by` kolonuna zorunlu bağlı değildir; mevcut şemada `SELECT *` ile çalışır ve editör fallback kullanır.
2. Benzer etkinlik sorgusu curated event id değerlerini UUID kolonlarına göndermez; curated etkinliklerde doğrudan yerel Şanlıurfa verisine düşer.
3. Ana sayfa etkinlik bileşeni, sitemap event sorgusu ve legacy schema helper event/blog sorguları opsiyonel görsel/tarih kolonlarında DB hatası üretmeyecek şekilde dayanıklı hale getirildi.
4. `etkinlikler`, `etkinlikler/gobeklitepe-kultur-rotasi` ve `sitemap.xml` smoke kontrolünde 200 döndü ve yeni DB hata logu oluşmadı.

## Bitirme Modu: Public Etkinlik API Yüzeyi

1. `/api/events` public endpoint'i eklendi; arama, kategori, limit ve offset parametreleriyle çalışır.
2. DB boş veya erişilemez olduğunda `/api/events`, `/api/events/list` ve `/api/events/search` Şanlıurfa curated etkinlikleriyle dolu JSON döndürür.
3. Etkinlik API cevapları Türkçe içerik dili header'ı ve sayfalama meta bilgisiyle döner.
4. `/api/events`, `/api/events?category=kultur-sanat`, `/api/events?q=urfa`, `/api/events/list` ve `/api/events/search?q=urfa` smoke kontrolünde 200 döndü ve yeni hata logu oluşmadı.

## Bitirme Modu: Dependency Security ve Excel Export Temizliği

1. Dependabot PR ile `fast-xml-parser` 5.7.1 seviyesine alındı.
2. Kodda kullanılmayan `resend` npm paketi kaldırıldı; e-posta gönderimi mevcut server-side Resend REST entegrasyonlarıyla devam eder.
3. Rapor Excel exportu `exceljs` yerine daha küçük write-only `write-excel-file` paketine taşındı; `uuid` audit zinciri kaldırıldı.
4. Excel smoke testi yeni XLSX üreticisinin zip içeriğini doğrulayacak şekilde güncellendi.
5. `npm audit` sonucu 0 vulnerability, Excel smoke, typecheck, build ve secret scan temizdir.

## Bitirme Modu: Astro Framework Entegrasyon Denetimi

1. Astro çekirdek paketleri ve resmi entegrasyonları kırıcı olmayan patch seviyesine güncellendi: `astro`, `@astrojs/node`, `@astrojs/react`, `@astrojs/mdx`.
2. Kurulu olan resmi `@astrojs/mdx` entegrasyonu `astro.config.mjs` içinde aktif hale getirildi; ileride blog/doküman/rehber içerikleri MDX ile yazılırsa Astro tarafında eksik entegrasyon hatası oluşmaz.
3. Statik `@astrojs/sitemap` tekrar kurulmadı veya etkinleştirilmedi; proje SSR dinamik sitemap route'larını kullandığı için resmi sitemap entegrasyonu bu yapıda eksik dinamik route üretebilir.
4. Bu işlemde dev server açılmadı, 4321 dışı port kullanılmadı ve Redis/DB çalışma düzenine dokunulmadı.

## Bitirme Modu: Astro 2026 Resmi Özellik Kilidi

1. Astro 2026 resmi entegrasyon ve framework özellikleri için karar matrisi `docs/ASTRO_2026_FRAMEWORK_AUDIT.md` dosyasına eklendi.
2. `package.json` resmi Astro paket aralıkları mevcut kurulu güncel sürümlerle eşitlendi: `astro@^6.1.9`, `@astrojs/node@^10.0.6`, `@astrojs/react@^5.0.4`, `@astrojs/mdx@^5.0.4`, `@tailwindcss/vite@^4.2.4`, `@astrojs/rss@^4.0.18`.
3. Vercel/Netlify/Cloudflare adapter'ları, Astro DB, Markdoc, Starlight, ikinci UI framework ve statik sitemap entegrasyonu bu proje için kurulmayacak olarak kilitlendi; Vercel hedefi açıkça devre dışı bırakıldı.
4. Actions ve server islands Astro core özelliği olarak not edildi; mevcut API/auth sözleşmesi bozulmadan ayrı refactor konusu yapılacak.

## Bitirme Modu: Astro 6 Zod Import Temizliği

1. `src/content.config.ts` içindeki deprecated `z from astro:content` kullanımı kaldırıldı.
2. Content collection şemaları Astro 6 resmi önerisine uygun şekilde `astro/zod` üzerinden `z` import eder.
3. Bu değişiklik content collection davranışını değiştirmez; yalnızca Astro 6 uyumluluk uyarısını kapatır.

## 2026-04-23 Toplu Paket (Sosyal + Şehir Servisleri)

1. Sosyal etkileşim policy katmanı `src/lib/social-policy.ts` ile merkezileştirildi.
2. Takip işlemlerinde artık self-follow, engel ilişkisi ve hedef kullanıcı varlık kontrolleri zorunlu.
3. Mesaj başlatma/gönderme akışlarında engel + mesaj izni (`allow_messages`) politikası tek noktadan uygulanıyor.
4. Tinder-benzeri ilk faz sosyal keşif altyapısı eklendi (tamamı ücretsiz/açık):
5. `131_social_swipe_matching` migration: `social_swipe_profiles`, `social_swipes`, `social_matches` tabloları.
6. Swipe profile API: `GET/PUT /api/social/swipe/profile` (maks 4 foto + bio).
7. Aday listesi API: `GET /api/social/swipe/candidates`.
8. Swipe aksiyonu API: `POST /api/social/swipe` (`like`/`pass`).
9. Eşleşmeler API: `GET /api/social/swipe/matches`.
10. Şehir servis ayar modeli genişletildi: `sourceUrl`, `lastUpdatedAt` alanları admin JSON ayarına dahil edildi.
11. Şehir servis detay kartlarında resmi kaynak linki ve son güncelleme tarihi gösterimi eklendi.
12. City service JSON-LD `Service` şemasında provider URL ve `dateModified` desteği eklendi.
13. `/sosyal/eslesme` sayfası statik demo kartlardan canlı API tabanlı React deneyimine geçirildi.
14. Eşleşme arayüzünde profil yönetimi (maks 4 foto), aday akışı, swipe aksiyonu ve eşleşme listesi tek ekranda birleştirildi.
15. Varsayılan header menüye Sosyal > Eşleşme bağlantıları eklendi.
16. Swipe API uçlarına kullanıcı+IP scope'lu ek rate-limit koruması eklendi (`profile`, `candidates`, `matches`, `swipe action`).
17. Swipe aday sorgusunda engel ilişkisi SQL seviyesinde filtrelenerek N+1 kontrol kaldırıldı.
18. Swipe profil foto URL doğrulaması sıkılaştırıldı (yalnızca `https` veya site içi `/` yolları).
19. Profil ekranına `Sosyal eşleşme` hızlı erişim bağlantısı eklendi.
20. Followers ve messages API uçlarına feature-level (kullanıcı+IP scope) ek rate-limit katmanı eklendi.
21. Followers API `POST` akışı social policy ile hizalandı (self-follow, blok ilişkisi, hedef varlık kontrolü).
22. Admin için yeni sosyal eşleşme izleme ekranı eklendi: `/admin/sosyal` (profil/swipe/match metrikleri + son kayıtlar).
23. Admin ana paneline `Sosyal Eşleşme` yönetim kısayolu eklendi.
24. Kullanıcı tarafına eşleşme kaldırma akışı eklendi: `POST /api/social/swipe/unmatch`.
25. Eşleşme ekranında her kart için `Eşleşmeyi kaldır` aksiyonu aktif edildi.
26. Admin tarafında eşleşme pasifleştirme API'si eklendi: `POST /api/admin/social/matches/{id}/deactivate`.
27. `/admin/sosyal` ekranına aktif eşleşme için tek tık pasifleştirme butonu eklendi.
