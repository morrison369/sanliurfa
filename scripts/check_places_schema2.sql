SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'places' ORDER BY ordinal_position;
SELECT id, slug FROM places WHERE slug = 'firat-et-lokantasi-hilvan' LIMIT 1;
