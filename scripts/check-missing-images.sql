SELECT p.slug, p.name, c.name AS category
FROM places p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.image_url IS NULL AND p.status='active'
ORDER BY c.name, p.name;
