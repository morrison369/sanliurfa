SELECT
  (SELECT COUNT(*) FROM places WHERE status='active') AS mekan,
  (SELECT COUNT(*) FROM places WHERE image_url IS NULL AND status='active') AS resimsiz,
  (SELECT COUNT(*) FROM places WHERE phone IS NULL AND status='active') AS telefonsuz,
  (SELECT COUNT(*) FROM places WHERE LENGTH(COALESCE(description,'')) < 100) AS kisa_desc,
  (SELECT COUNT(*) FROM blog_posts WHERE status='published') AS blog,
  (SELECT COUNT(*) FROM blog_posts WHERE content LIKE '%blog-related-places%') AS blog_linkli,
  (SELECT COUNT(*) FROM events WHERE status='published') AS etkinlik,
  (SELECT COUNT(*) FROM reviews) AS yorum,
  (SELECT COUNT(*) FROM recipes WHERE status='published') AS tarif,
  (SELECT COUNT(*) FROM historical_sites WHERE status='active') AS tarihi_yer,
  (SELECT COUNT(DISTINCT user_id) FROM reviews) AS reviewer_cesitliligi;
