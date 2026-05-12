-- Genel durum özeti
SELECT 'places' AS tablo, COUNT(*) AS sayi FROM places WHERE status='active'
UNION ALL
SELECT 'reviews', COUNT(*) FROM reviews WHERE status='active'
UNION ALL
SELECT 'blog_posts', COUNT(*) FROM blog_posts WHERE status='published'
UNION ALL
SELECT 'events', COUNT(*) FROM events WHERE status='published'
UNION ALL
SELECT 'categories_with_places', COUNT(DISTINCT c.parent_id)
FROM categories c
JOIN places p ON p.category_id = c.id AND p.status='active'
WHERE c.parent_id IS NOT NULL;

-- Çok az yorumu olan mekanlar (1 yorum)
SELECT COUNT(*) AS tek_yorumlu_mekan FROM places WHERE review_count = 1 AND status='active';

-- Hiç yorumu olmayan mekanlar
SELECT COUNT(*) AS yorumsuz_mekan FROM places WHERE review_count = 0 AND status='active';

-- Etkinlikler tarih dağılımı
SELECT DATE_TRUNC('month', start_date)::date AS ay, COUNT(*) AS etkinlik
FROM events WHERE status='published'
GROUP BY ay ORDER BY ay;

-- Blog yazıları count
SELECT DATE_TRUNC('month', published_at)::date AS ay, COUNT(*) AS yazi
FROM blog_posts WHERE status='published'
GROUP BY ay ORDER BY ay;
