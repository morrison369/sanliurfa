SELECT slug, title, LEFT(content,60) AS preview
FROM blog_posts
WHERE (cover_image IS NULL OR cover_image = '') AND status='published'
ORDER BY slug;
