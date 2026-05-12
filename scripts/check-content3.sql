SELECT COUNT(*) AS places_no_image FROM places WHERE image_url IS NULL AND status='active';

-- Kısa açıklamalı mekanlar
SELECT slug, name, LENGTH(description) AS desc_len FROM places 
WHERE (description IS NULL OR LENGTH(description) < 50) AND status='active'
ORDER BY desc_len LIMIT 15;
