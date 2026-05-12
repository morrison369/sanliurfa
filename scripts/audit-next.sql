-- Mevcut kullanıcılar
SELECT COUNT(*) as kullanici FROM app.users;
SELECT id::text, username FROM app.users ORDER BY created_at LIMIT 8;

-- Blog kategorileri
SELECT category, COUNT(*) as adet FROM app.blog_posts WHERE status = 'published' GROUP BY category ORDER BY adet DESC LIMIT 10;

-- En az yorumlu kategoriler
SELECT c.name, COUNT(DISTINCT p.id) as mekan, COUNT(r.id) as yorum,
  ROUND(COUNT(r.id)::numeric / NULLIF(COUNT(DISTINCT p.id), 0), 1) as ort
FROM app.places p
JOIN app.categories c ON c.id = p.category_id
LEFT JOIN app.reviews r ON r.place_id = p.id
WHERE p.status = 'active' AND c.parent_id IS NULL
GROUP BY c.name ORDER BY ort LIMIT 12;

-- Yorumsuz mekanlardan ilk 20'si (kategori ile)
SELECT p.id::text, p.name, p.slug, c.name as kategori FROM app.places p
LEFT JOIN app.categories c ON c.id = p.category_id
WHERE p.status = 'active' AND NOT EXISTS (SELECT 1 FROM app.reviews r WHERE r.place_id = p.id)
ORDER BY c.name, p.name LIMIT 20;
