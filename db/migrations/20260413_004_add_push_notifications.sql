-- Push Notifications
-- Created: 2026-04-13

-- Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Push notification logs
CREATE TABLE IF NOT EXISTS push_notification_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50),
  subscription_id INTEGER REFERENCES push_subscriptions(id),
  title TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'failed', 'delivered', 'clicked')),
  error TEXT
);

CREATE INDEX idx_push_logs_user ON push_notification_logs(user_id);
CREATE INDEX idx_push_logs_sent ON push_notification_logs(sent_at);

-- Scheduled notifications
CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  notification JSONB NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  error TEXT
);

CREATE INDEX idx_scheduled_notifications_status ON scheduled_notifications(status, scheduled_at);

-- Add push preferences to users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'push_enabled') THEN
    ALTER TABLE users ADD COLUMN push_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'push_preferences') THEN
    ALTER TABLE users ADD COLUMN push_preferences JSONB DEFAULT '{}';
  END IF;
END $$;
