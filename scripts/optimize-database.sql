-- Database Optimization Script
-- Run these queries to optimize performance

-- Index for user activity queries
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created 
ON user_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_activity_target_created 
ON user_activity(target_id, activity_type, created_at DESC);

-- Index for place queries
CREATE INDEX IF NOT EXISTS idx_places_category_rating 
ON places(category, rating DESC);

CREATE INDEX IF NOT EXISTS idx_places_created_at 
ON places(created_at DESC);

-- Index for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_place_created 
ON reviews(place_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_user_created 
ON reviews(user_id, created_at DESC);

-- Index for comments
CREATE INDEX IF NOT EXISTS idx_comments_target 
ON comments(target_type, target_id, created_at DESC);

-- Index for favorites
CREATE INDEX IF NOT EXISTS idx_favorites_user 
ON favorites(user_id, created_at DESC);

-- Index for messages
CREATE INDEX IF NOT EXISTS idx_conversations_user 
ON conversations(participant_a, last_activity_at DESC)
WHERE participant_a IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_user2 
ON conversations(participant_b, last_activity_at DESC)
WHERE participant_b IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_direct_messages_conv_created 
ON direct_messages(conversation_id, created_at DESC);

-- Index for place photos
CREATE INDEX IF NOT EXISTS idx_place_photos_place_featured 
ON place_photos(place_id, is_featured DESC, created_at DESC);

-- Index for place collections
CREATE INDEX IF NOT EXISTS idx_place_collections_user 
ON place_collections(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_collection_items_collection_pos 
ON collection_items(collection_id, position ASC);

-- Analyze tables for query optimizer
ANALYZE users;
ANALYZE places;
ANALYZE reviews;
ANALYZE comments;
ANALYZE favorites;
ANALYZE conversations;
ANALYZE direct_messages;
ANALYZE user_activity;
ANALYZE place_photos;
ANALYZE place_collections;

-- Vacuum to reclaim space
VACUUM ANALYZE;
