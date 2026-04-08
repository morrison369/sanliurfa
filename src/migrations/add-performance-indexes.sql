-- Performance Optimization Indexes
-- Created: 2026-04-08
-- Purpose: Add missing indexes to critical query paths

-- 1. Loyalty transactions (used in points balance queries)
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user_created 
ON loyalty_transactions(user_id, created_at DESC);

-- 2. Place daily metrics (used in analytics queries)
CREATE INDEX IF NOT EXISTS idx_place_daily_metrics_place_date 
ON place_daily_metrics(place_id, metric_date DESC);

-- 3. Subscriptions (used in admin subscriptions list)
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status 
ON user_subscriptions(user_id, status);

-- 4. Notifications (used in notifications list)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, read, created_at DESC);

-- 5. User achievements (used in achievements queries)
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_achievement 
ON user_achievements(user_id, achievement_id);

-- 6. Followers (used in social feed)
CREATE INDEX IF NOT EXISTS idx_followers_follower_created 
ON followers(follower_id, created_at DESC);

-- 7. User activity (used in feed queries)
CREATE INDEX IF NOT EXISTS idx_user_activity_user_created 
ON user_activity(user_id, created_at DESC);

-- 8. Reviews place index (used in analytics joins)
CREATE INDEX IF NOT EXISTS idx_reviews_place_created 
ON reviews(place_id, created_at DESC);

-- Verify indexes were created
SELECT indexname FROM pg_indexes 
WHERE indexname LIKE 'idx_loyalty_transactions_user_created' 
   OR indexname LIKE 'idx_place_daily_metrics_place_date'
   OR indexname LIKE 'idx_subscriptions_user_status'
   OR indexname LIKE 'idx_notifications_user_read'
   OR indexname LIKE 'idx_user_achievements_user_achievement'
   OR indexname LIKE 'idx_followers_follower_created'
   OR indexname LIKE 'idx_user_activity_user_created'
   OR indexname LIKE 'idx_reviews_place_created';
