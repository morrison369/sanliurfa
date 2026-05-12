-- Mekan kalite kontrolü
SELECT 'places_no_thumbnail' as metric, COUNT(*) as val FROM app.places WHERE status = 'active' AND (thumbnail_url IS NULL OR thumbnail_url = '');
SELECT 'places_no_description' as metric, COUNT(*) as val FROM app.places WHERE status = 'active' AND (description IS NULL OR description = '' OR LENGTH(description) < 30);
SELECT 'places_no_phone' as metric, COUNT(*) as val FROM app.places WHERE status = 'active' AND (phone IS NULL OR phone = '');
SELECT 'places_no_category' as metric, COUNT(*) as val FROM app.places WHERE status = 'active' AND (category_id IS NULL);

-- Etkinlik kalite
SELECT 'events_no_image' as metric, COUNT(*) as val FROM app.events WHERE status = 'active' AND (image_url IS NULL OR image_url = '');
SELECT 'events_upcoming' as metric, COUNT(*) as val FROM app.events WHERE status = 'active' AND start_date >= CURRENT_DATE;

-- Blog kalite
SELECT 'blog_no_featured_image' as metric, COUNT(*) as val FROM app.blog_posts WHERE status = 'published' AND (featured_image IS NULL OR featured_image = '');
SELECT 'blog_no_meta_desc' as metric, COUNT(*) as val FROM app.blog_posts WHERE status = 'published' AND (meta_description IS NULL OR meta_description = '');
SELECT 'blog_total' as metric, COUNT(*) as val FROM app.blog_posts WHERE status = 'published';

-- Kategori kalite
SELECT 'categories_no_desc' as metric, COUNT(*) as val FROM app.categories WHERE is_active = true AND (description IS NULL OR description = '' OR LENGTH(description) < 20);

-- Yorum durumu
SELECT 'reviews_total' as metric, COUNT(*) as val FROM app.reviews;
SELECT 'places_no_reviews' as metric, COUNT(*) as val FROM app.places p WHERE status = 'active' AND NOT EXISTS (SELECT 1 FROM app.reviews r WHERE r.place_id = p.id);
