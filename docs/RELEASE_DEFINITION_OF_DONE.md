# Release Definition of Done (DoD)

Bu doküman `sanliurfa.com` yayın kapanış kriterini kilitler. Aşağıdaki başlıklar eksiksiz sağlanmadan release tamamlanmış sayılmaz.

## 1) Temel Ürün Akışları
- Ana sayfa (`/`) canlı veri ile açılır, blok sırası admin ayarından gelir.
- Kategori ve liste sayfaları çalışır (`/places`, `/tarihi-yerler`, `/etkinlikler`, `/blog`).
- Detay sayfaları çalışır (`/places/[slug]`, `/tarihi-yerler/[slug]`, `/etkinlikler/[slug]`, `/blog/[slug]`).
- Auth akışı çalışır (`/giris`, `/kayit`, oturum açma/kapama).
- Sosyal çekirdek akışlar çalışır (takip, mesaj, eşleşme/swap API katmanı).

## 2) Admin-Driven İçerik Yönetimi
- Ana sayfa hero + section sırası `site settings` üstünden yönetilir.
- Şehir servisleri (nöbetçi eczane, otobüs, uçak) admin ayarıyla gösterilir.
- SEO alanları (title, description, canonical, schema) içerik bazlı güncellenebilir.
- İçerik kalite KPI yüzeyi admin API üzerinden izlenebilir (`/api/admin/system/content-quality`).

## 3) SEO/AEO/GEO Kriterleri
- Her kritik sayfada canonical tanımlıdır.
- Rich snippet grafiği içerikle uyumludur (Organization, WebSite, Breadcrumb, içerik tipine uygun schema).
- Sitemap, robots, RSS ve llms/public discovery kontratları geçer.
- Türkçe odaklı içerik politikası ihlal edilmez (çoklu dil/hreflang yok).

## 4) Görsel ve İçerik Kalitesi
- İçerik görselleri slug uyumlu adlandırılır.
- Görsellerde boş/bozuk dosya ve yasak isim paterni bulunmaz.
- Türkçe metinlerde UTF-8 bozulması ve karakter hatası bulunmaz.
- Mekan aktif yayınında kalite eşiği zorunludur (kısa açıklama, telefon, koordinat, minimum 3 görsel).

## 5) Runtime ve Güvenlik
- Port kilidi: dev/preview/prod `4321`.
- Redis erişilemediğinde uygulama kontrollü degrade olur, log gürültüsü sınırlıdır.
- Secret’lar sadece environment üstünden okunur; kod içinde literal secret yoktur.

## 6) Zorunlu Gate Komutları
- `npm run security:release-definition-contract`
- `npm run security:seo-template-contract`
- `npm run security:turkish-content-quality-contract`
- `npm run security:image-slug-contract`
- `npm run security:homepage-data-contract`
- `npm run security:place-quality-contract`
- `npm run security:social-capability-contract`
- `npm run security:admin-homepage-contract`
- `npm run security:secrets-rotation-contract`
- `npm run security:public-readiness`
- `npm run build`

Tek komut:

```bash
npm run release:ship
```
