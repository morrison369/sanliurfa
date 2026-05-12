SELECT COUNT(*) AS total_neighborhoods FROM neighborhoods;
SELECT d.name AS district, COUNT(n.id) AS neighborhood_count
FROM districts d
LEFT JOIN neighborhoods n ON n.district_id = d.id
GROUP BY d.id, d.name ORDER BY COUNT(n.id) DESC;
