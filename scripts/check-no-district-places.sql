SELECT p.slug, p.name, p.address, p.latitude, p.longitude
FROM places p
WHERE p.district_id IS NULL AND p.status='active'
ORDER BY p.name
LIMIT 80;
