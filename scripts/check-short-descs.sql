SELECT slug, name, description
FROM places 
WHERE description IS NULL OR LENGTH(description) < 100
AND status='active'
ORDER BY LENGTH(description) NULLS FIRST
LIMIT 25;
