SELECT slug, name, LENGTH(description) AS len, LEFT(description, 90) AS preview
FROM places 
WHERE description IS NOT NULL AND LENGTH(description) < 120 AND status='active'
ORDER BY len
LIMIT 30;
