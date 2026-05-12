SELECT id, slug, name FROM categories
WHERE parent_id IS NOT NULL AND is_active = true
AND (slug LIKE '%kahvehane%' OR slug LIKE '%market%' OR slug LIKE '%berber%' OR slug LIKE '%kuafor%' OR slug LIKE '%tarim%' OR slug LIKE '%eczane%' OR slug LIKE '%saglik%')
ORDER BY slug LIMIT 20;
