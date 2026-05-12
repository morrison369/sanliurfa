-- Kapsamlı içerik boşluk analizi
SELECT '-- GENEL DURUM --' AS bolum, '' AS deger UNION ALL
SELECT 'historical_sites', COUNT(*)::text FROM historical_sites WHERE status='active' UNION ALL
SELECT 'neighborhoods', COUNT(*)::text FROM neighborhoods UNION ALL
SELECT 'districts', COUNT(*)::text FROM districts UNION ALL
SELECT 'featured_places', COUNT(*)::text FROM places WHERE is_featured=true AND status='active' UNION ALL
SELECT 'no_rating_places', COUNT(*)::text FROM places WHERE (avg_rating IS NULL OR avg_rating = 0) AND status='active' UNION ALL
SELECT 'blog_no_cover', COUNT(*)::text FROM blog_posts WHERE cover_image IS NULL AND status='published' UNION ALL
SELECT 'events_no_image', COUNT(*)::text FROM events WHERE image_url IS NULL AND status='published' UNION ALL
SELECT 'places_no_district', COUNT(*)::text FROM places WHERE district_id IS NULL AND status='active' UNION ALL
SELECT 'places_no_coords', COUNT(*)::text FROM places WHERE latitude IS NULL AND status='active'
ORDER BY bolum;
