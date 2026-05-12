-- Migration 020: Critical Performance Indexes
-- 18 missing indexes from DB-INDEX-AUDIT.md — Tier 1 (5 critical) + Tier 2
-- Applied with CONCURRENTLY to avoid table locks in production
-- Estimated impact: 40-60% reduction on filtered queries

-- TIER 1: Critical (highest query frequency)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_owner_id_status
  ON places(owner_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_place_id_status
  ON reviews(place_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_entity_status
  ON comments(entity_type, entity_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified_created
  ON users(email, email_verified, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_posts_author_status_published
  ON blog_posts(author_id, is_published, published_at DESC);

-- TIER 2: High-impact supporting indexes

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_category_id_status
  ON places(category_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_district_id_status
  ON places(district_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_user_id_created
  ON reviews(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_status_created
  ON reviews(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_blog_posts_published_at
  ON blog_posts(published_at DESC)
  WHERE is_published = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent_id
  ON comments(parent_id)
  WHERE parent_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_is_featured_status
  ON places(is_featured, status)
  WHERE is_featured = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_id
  ON favorites(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_place_id
  ON favorites(place_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_user_id_created
  ON activities(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_read
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_start_date_status
  ON events(start_date, status)
  WHERE status = 'published';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_slug
  ON places(slug);
