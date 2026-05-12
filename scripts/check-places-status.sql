-- Mevcut mekanların thumbnail_url formatı
SELECT name, slug, thumbnail_url FROM places WHERE status='active' AND thumbnail_url IS NOT NULL LIMIT 10;
