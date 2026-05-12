-- Yeni etkinliklerin slug'larını listele
SELECT slug, title FROM app.events WHERE status = 'active' AND start_date >= CURRENT_DATE ORDER BY start_date;

-- Kategorisiz mekanların adları
SELECT id::text, name, address FROM app.places WHERE status = 'active' AND category_id IS NULL ORDER BY name LIMIT 30;

-- Mevcut kategorilerin listesi (id, slug, name)
SELECT id, slug, name FROM app.categories WHERE is_active = true AND parent_id IS NULL ORDER BY name LIMIT 30;
