SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'blog_posts' ORDER BY ordinal_position OFFSET 20;
SELECT DISTINCT category_slug FROM blog_posts LIMIT 10;
SELECT DISTINCT status FROM blog_posts LIMIT 5;
