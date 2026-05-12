SELECT d.name, d.slug, COUNT(p.id) AS place_count
FROM districts d
LEFT JOIN places p ON p.district_id = d.id AND p.status = 'active'
GROUP BY d.id, d.name, d.slug
ORDER BY COUNT(p.id) ASC;
