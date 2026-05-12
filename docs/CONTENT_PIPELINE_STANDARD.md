# Content + Image Pipeline Standard

## Aşamalar
1. Kaynak çekimi (API/import)
2. Normalize (başlık, slug, kategori, etiket)
3. Görsel intent eşleme (başlık/kategori uyumu)
4. Moderasyon ve kalite
5. Frontend publish

## Zorunlu Alanlar
- `title`
- `slug`
- `category`
- `summary`
- `cover_image`
- `image_intent_tags`

## Görsel Kuralları
- Alakasız görsel yasak.
- Aynı görselin aynı sayfada tekrar kullanımı kısıtlı.
- Fallback görseller kategoriye göre olmalı.
- Bozuk URL veya 404 görsel release blocker.

## Frontend Ayrıştırma
- İçerik üretimi ve render katmanı ayrı yönetilir.
- UI sadece normalize edilmiş kaynaktan beslenir.
