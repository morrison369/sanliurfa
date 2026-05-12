-- Thumbnail URL'si olmayan ilk 20 aktif mekan
SELECT id::text, name, slug, thumbnail_url, images FROM app.places
WHERE status = 'active' AND (thumbnail_url IS NULL OR thumbnail_url = '')
ORDER BY name LIMIT 20;
