SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts' ORDER BY ordinal_position LIMIT 20;
SELECT id FROM users ORDER BY created_at LIMIT 1;
