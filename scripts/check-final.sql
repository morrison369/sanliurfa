-- Son durum özeti
SELECT
  (SELECT COUNT(*) FROM places WHERE status='active') AS toplam_mekan,
  (SELECT COUNT(*) FROM places WHERE image_url IS NULL AND status='active') AS resimsiz_mekan,
  (SELECT COUNT(*) FROM places WHERE phone IS NULL AND status='active') AS telefonsuz_mekan,
  (SELECT COUNT(*) FROM places WHERE description IS NULL OR LENGTH(description) < 100) AS kisa_aciklamali,
  (SELECT COUNT(*) FROM blog_posts WHERE status='published') AS blog_yazisi,
  (SELECT COUNT(*) FROM blog_posts WHERE content LIKE '%blog-related-places%') AS blog_ic_linkli,
  (SELECT COUNT(*) FROM events WHERE status='published') AS etkinlik,
  (SELECT COUNT(*) FROM reviews) AS toplam_yorum,
  (SELECT COUNT(*) FROM recipes WHERE status='published') AS tarif,
  (SELECT COUNT(*) FROM historical_sites WHERE status='active') AS tarihi_yer;
