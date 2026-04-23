# Content Quality KPI (2026-04-23)

Bu doküman ürün kapanışı için içerik kalite KPI yüzeyini tanımlar.

## Amaç
- "Site bitti mi?" sorusunu teknik değil, ölçülebilir ürün metrikleriyle kapatmak.
- Mekan ve blog içerik kalitesini admin tarafından düzenli izlemek.

## KPI Tanımları
- `activePlaceCount`: Aktif mekan adedi.
- `publishReadyPlaceCount`: Aktif durumda kalite eşiğini sağlayan mekan adedi.
- `placesWithoutImageCount`: Görselsiz aktif mekan adedi.
- `placeImageCoveragePercent`: Aktif mekanlarda görsel kapsama oranı.
- `placePublishReadinessPercent`: Aktif mekanlarda yayına hazır içerik oranı.
- `publishedBlogCount`: Yayındaki blog adedi.
- `blogWithoutImageCount`: Kapak görseli olmayan blog adedi.
- `blogImageCoveragePercent`: Blog görsel kapsama oranı.

## Admin API
- Endpoint: `GET /api/admin/system/content-quality`
- Yetki: `admin`
- Kaynak: `src/lib/homepage-data.ts` (tek kaynak veri akışı)

## Hedefler
- `placesWithoutImageCount = 0`
- `placeImageCoveragePercent = 100`
- `placePublishReadinessPercent >= 95`
- `blogWithoutImageCount = 0`
- `blogImageCoveragePercent = 100`

## Not
- Aktif yayın kalite eşiği mekan create/update API katmanında zorunludur.
- Eşik alanları: kısa açıklama, telefon, koordinat ve minimum 3 görsel.
