# Google Publisher Center Setup

Son guncelleme: 2026-05-14

## Resmi Durum

Google Publisher Center yayin, organizasyon, kullanici yetkisi ve yayin ayarlari Google hesabiyla web arayuzunden yapilir. Google Cloud CLI, Cloud API'lerini ve kimlik dogrulamayi yonetir; Publisher Center yayin ayarlarini otomatik kuran resmi bir `gcloud` komutu yoktur.

Resmi kaynaklara gore Publisher Center'da temel kurulum alanlari sunlardir:

- Basic publication information
- Headquarters/location
- Website property URL verification
- Publication contact details
- Organization settings
- User permissions

Google News yuzeyleri icin Google'in seffaflik politikasi acik tarih, byline, yazar, yayin, yayinci, sirket/ag bilgisi ve iletisim bilgisini ister.

## Panelde Girilecek Degerler

Publication name: `Sanliurfa.com`

Display name: `Sanliurfa.com - Şanlıurfa Şehir Rehberi`

Language: `Turkish / tr`

Country: `Türkiye / TR`

Website property URL: `https://sanliurfa.com/`

Primary RSS feed: `https://sanliurfa.com/rss.xml`

Sitemap: `https://sanliurfa.com/sitemap.xml`

Logo: `https://sanliurfa.com/logo.png`

Contact: `iletisim@sanliurfa.com`

Business contact: `isletme@sanliurfa.com`

Privacy/KVKK contact: `kvkk@sanliurfa.com`

Headquarters/address: `Eyyübiye, Şanlıurfa, Türkiye`

## Onerilen Sections

- `Son Yazılar`: Feed, `https://sanliurfa.com/rss.xml`
- `Blog`: Web location, `https://sanliurfa.com/blog`
- `Gezilecek Yerler`: Web location, `https://sanliurfa.com/gezilecek-yerler`
- `Yeme İçme`: Web location, `https://sanliurfa.com/yeme-icme`
- `Etkinlikler`: Web location, `https://sanliurfa.com/etkinlikler`

## Canli Hazirlik Endpointleri

- `https://sanliurfa.com/publisher-center.json`
- `https://sanliurfa.com/rss.xml`
- `https://sanliurfa.com/robots.txt`
- `https://sanliurfa.com/sitemap.xml`
- `https://sanliurfa.com/kunye`
- `https://sanliurfa.com/yazarlar`
- `https://sanliurfa.com/yayin-politikasi`
- `https://sanliurfa.com/iletisim`

## Tamamlanan Site Entegrasyonu

- Tüm public sayfalarda author, publisher, date, article published/modified meta etiketleri var.
- Tüm public sayfalarda `WebPage` JSON-LD icinde `datePublished`, `dateModified`, author ve publisher var.
- Site genelinde `NewsMediaOrganization` JSON-LD yayina alindi.
- Künye, yazarlar, yayin politikasi ve iletisim sayfalari footer ve seffaflik blogundan linkleniyor.
- RSS feed `application/rss+xml` olarak yayinlaniyor ve Publisher Center icin logo, editor, webmaster, kategori ve son yayin tarihi iceriyor.
