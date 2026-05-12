SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name='blog_posts' 
AND column_name IN ('cover_image','image_url','thumbnail_url','featured_image')
ORDER BY column_name;
