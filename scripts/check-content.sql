SELECT
  (SELECT COUNT(*) FROM places WHERE status='active') AS places,
  (SELECT COUNT(*) FROM blog_posts WHERE status='published') AS blog,
  (SELECT COUNT(*) FROM events WHERE status='published') AS events,
  (SELECT COUNT(*) FROM reviews) AS reviews,
  (SELECT COUNT(*) FROM historical_sites WHERE status='active') AS historical,
  (SELECT COUNT(*) FROM recipes WHERE status='published') AS recipes,
  (SELECT COUNT(*) FROM places WHERE image_url IS NULL AND status='active') AS places_no_img,
  (SELECT COUNT(*) FROM places WHERE description IS NULL OR LENGTH(description) < 50) AS places_short_desc,
  (SELECT COUNT(*) FROM places WHERE opening_hours IS NULL AND status='active') AS no_hours,
  (SELECT COUNT(*) FROM places WHERE phone IS NULL AND status='active') AS no_phone;
