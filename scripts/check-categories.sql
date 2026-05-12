SELECT slug, name, LEFT(description, 80) as desc_preview FROM categories WHERE parent_id IS NULL AND is_active = true ORDER BY sort_order LIMIT 30;
