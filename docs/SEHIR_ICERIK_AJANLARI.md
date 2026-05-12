# Şehir İçerik Ajanları

Bu proje Şanlıurfa odaklı şehir rehberi içerikleri çeker, zenginleştirir ve admin onayından sonra yayınlar.

## Kalıcı Kurallar

- Ajanlar otomatik yayın yapmaz; tüm çıktılar taslak kuyruğuna düşer.
- Site yalnızca Türkçe kalır.
- Odak anahtar kelime `Şanlıurfa` olur.
- Resmi/izinli kaynak önceliklidir; kaynak güvenilir değilse sadece taslak ve uyarı üretilir.
- Görsel önceliği Pexels, ardından Unsplash şeklindedir.
- API key değerleri `.env` içinde tutulur, koda yazılmaz.
- Görseller slug bazlı kaydedilir: `/public/images/{bucket}/{slug}.jpg`.

## Ajanlar

| Ajan | Görev | Yayın |
| --- | --- | --- |
| `city-service-agent` | Nöbetçi eczane, otobüs saatleri, uçak saatleri ve şehir servisleri | Admin onayı |
| `culture-event-agent` | Belediye/valilik/kültür duyurularından etkinlik taslağı | Admin onayı |
| `place-enrichment-agent` | Mekan açıklaması, FAQ, ziyaret ipucu, schema önerisi | Admin onayı |
| `recipe-content-agent` | Şanlıurfa yemek tarifleri ve yerel lezzet içerikleri | Admin onayı |
| `image-import-agent` | Pexels/Unsplash görsel arama ve slug bazlı medya görevleri | Admin onayı |
| `seo-geo-agent` | SEO/AEO/GEO/AIO kısa cevap, FAQ, schema ve llms önerileri | Admin onayı |

## Admin Yüzeyi

- Sayfa: `/admin/content-agents`
- API: `GET|POST /api/admin/city-content-agents`
- Taslak durumları: `pending`, `approved`, `rejected`
- İş durumları: `queued`, `running`, `completed`, `failed`
- Ajan çalıştırma hataları `application/problem+json` formatında döner; yanlış ajan, yanlış kaynak ve bulunamayan taslak ayrı hata kodlarıyla ayrılır.
- Kaynak kartındaki `Bu kaynaktan üret` aksiyonu yalnızca ilgili kaynağı çalıştırır.

## Veritabanı

- `city_content_sources`: resmi/izinli kaynak kayıtları
- `city_content_agent_jobs`: ajan çalışma logları
- `city_content_drafts`: yayın öncesi admin onay kuyruğu

## SEO/AEO/GEO/AIO Standardı

Her kritik sayfa şu alanlara sahip olmalıdır:

- H1 veya ana başlıkta doğal `Şanlıurfa` kullanımı
- İlk 60 kelimede net cevap
- 134-167 kelimelik alıntılanabilir cevap bloğu
- Soru formatlı H2/H3 başlıkları
- FAQ
- Breadcrumb
- Uygun schema
- Canonical
- Güncelleme tarihi/freshness bilgisi
- Görsel alt metni
- En az 3 iç link

## Kritik Public Sayfalar

- `/`
- `/mekanlar`
- `/saglik/nobetci-eczaneler`
- `/ulasim/otobus-saatleri`
- `/ulasim/ucak-saatleri`
- `/yemek-tarifleri`
- `/etkinlikler`
- `/ilceler`
- `/blog`
- `/topluluk`

## Görsel Kaynakları

Ortam değişkenleri:

```env
PEXELS_API_KEY=...
UNSPLASH_ACCESS_KEY=...
UNSPLASH_SECRET_KEY=...
```

Çalıştırma:

```bash
npm run images:pipeline:db
```

Bu komut görselleri indirir, manifest üretir, kalite/moderasyon kontrolü yapar ve `site_media_assets` tablosuna aktarır.

`image-import-agent` dış API doküman sayfalarını içerik gibi kazımaz. Slug bazlı medya görevleri üretir ve import akışını `/api/admin/site/media/search` ile `/api/admin/site/media/import` üzerinden admin onayına bırakır.
