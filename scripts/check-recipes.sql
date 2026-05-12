SELECT slug, title, LEFT(content, 80) AS preview FROM recipes WHERE status='published' ORDER BY created_at;
