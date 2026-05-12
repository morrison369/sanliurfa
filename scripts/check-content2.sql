-- Eksik veriler detayı
SELECT 'places_no_image' AS sorun, slug, name FROM places WHERE image_url IS NULL AND status='active' LIMIT 20;
