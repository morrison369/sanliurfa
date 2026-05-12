SELECT author_id::text, author_name, featured_image, category, category_slug FROM app.blog_posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 3;
