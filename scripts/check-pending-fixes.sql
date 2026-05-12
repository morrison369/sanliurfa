-- Places without district_id
SELECT COUNT(*) AS places_no_district FROM places WHERE district_id IS NULL AND status='active';

-- Places without coordinates
SELECT COUNT(*) AS places_no_coords FROM places WHERE (latitude IS NULL OR longitude IS NULL) AND status='active';

-- Blog posts without cover image
SELECT slug FROM blog_posts WHERE (featured_image IS NULL OR featured_image='') AND status='published' ORDER BY created_at;
