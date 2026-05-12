SELECT column_name FROM information_schema.columns WHERE table_name='blog_posts' AND column_name ILIKE '%cover%' OR column_name ILIKE '%image%' OR column_name ILIKE '%thumb%';
