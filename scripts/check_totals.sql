SELECT 'blog_posts visible' AS metric, COUNT(*) AS value
FROM blog_posts WHERE status = 'published' AND published_at <= CURRENT_DATE
UNION ALL
SELECT 'places active', COUNT(*) FROM places WHERE status = 'active'
UNION ALL
SELECT 'reviews active', COUNT(*) FROM reviews WHERE status = 'active'
UNION ALL
SELECT 'districts', COUNT(*) FROM districts
ORDER BY metric;
