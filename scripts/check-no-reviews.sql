-- Yorumsuz mekanlar
SELECT p.slug, p.name, COUNT(r.id) AS yorum_sayisi
FROM places p
LEFT JOIN reviews r ON r.place_id = p.id
WHERE p.status = 'active'
GROUP BY p.id, p.slug, p.name
HAVING COUNT(r.id) = 0
ORDER BY p.name
LIMIT 30;
