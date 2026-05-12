SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%review%';

SELECT DISTINCT status FROM reviews LIMIT 10;
