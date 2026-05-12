SELECT p.id::text, p.name, p.slug, c.name as kategori
FROM app.places p
LEFT JOIN app.categories c ON c.id = p.category_id
WHERE p.status = 'active' AND NOT EXISTS (SELECT 1 FROM app.reviews r WHERE r.place_id = p.id)
ORDER BY c.name, p.name;
