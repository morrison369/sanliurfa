-- Check categories table
SELECT 'categories_count' as q, COUNT(*) FROM categories WHERE is_active=true;
-- Check 5 sample places with coords
SELECT id, name, latitude, longitude, category_id FROM places WHERE status='active' LIMIT 5;
-- Check place_categories join works
SELECT p.id, p.name, p.latitude, p.longitude, c.slug as category_slug
FROM places p
LEFT JOIN place_categories c ON c.id = p.category_id
WHERE p.status='active' LIMIT 3;
