SELECT p.slug, p.name, p.district_id, d.name AS district
FROM places p
LEFT JOIN districts d ON p.district_id = d.id
WHERE (p.latitude IS NULL OR p.longitude IS NULL) AND p.status='active'
ORDER BY p.district_id NULLS LAST, p.name;
