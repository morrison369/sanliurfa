SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid JOIN pg_namespace n ON n.oid = t.relnamespace WHERE t.relname = 'reviews' AND n.nspname = 'app' AND c.contype = 'c';
SELECT DISTINCT status FROM app.reviews LIMIT 10;
