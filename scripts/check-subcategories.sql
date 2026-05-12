SELECT c.slug, c.name, LEFT(c.description, 60) as desc_preview, COUNT(p.id) as place_count
FROM categories c
LEFT JOIN places p ON p.category_id = c.id AND p.status = 'active'
WHERE c.parent_id IS NOT NULL AND c.is_active = true
GROUP BY c.slug, c.name, c.description
HAVING COUNT(p.id) > 0
ORDER BY place_count DESC
LIMIT 40;
