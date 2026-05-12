-- Thumbnail URL'si olmayan mekanlara /uploads/places/{slug}.jpg ata
UPDATE app.places
SET thumbnail_url = '/uploads/places/' || slug || '.jpg'
WHERE status = 'active'
  AND (thumbnail_url IS NULL OR thumbnail_url = '')
  AND slug IS NOT NULL
  AND slug != '';

-- Kontrol
SELECT COUNT(*) as hala_thumbnail_yok FROM app.places WHERE status = 'active' AND (thumbnail_url IS NULL OR thumbnail_url = '');
