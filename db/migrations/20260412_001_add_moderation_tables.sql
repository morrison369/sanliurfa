-- Moderation system tables
-- Created: 2026-04-12

-- Moderation queue for reported/flagged content
CREATE TABLE IF NOT EXISTS moderation_queue (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('place', 'review', 'comment', 'user')),
  content_id VARCHAR(50) NOT NULL,
  content TEXT,
  reason TEXT NOT NULL,
  reporter_id VARCHAR(50),
  moderator_id VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moderated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX idx_moderation_queue_type ON moderation_queue(type);
CREATE INDEX idx_moderation_queue_created ON moderation_queue(created_at);

-- Content reports from users
CREATE TABLE IF NOT EXISTS content_reports (
  id SERIAL PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('place', 'review', 'comment', 'user')),
  content_id VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  reporter_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_content_reports_status ON content_reports(status);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);

-- Moderation rules for auto-moderation
CREATE TABLE IF NOT EXISTS moderation_rules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  pattern TEXT NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('flag', 'block', 'auto_reject')),
  severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default rules
INSERT INTO moderation_rules (name, pattern, action, severity) VALUES
  ('Spam Keywords', '(viagra|cialis|casino|porno|sex)', 'auto_reject', 'high'),
  ('Spam Links', '(http[s]?:\/\/).{0,10}(click|win|prize|free)', 'flag', 'medium'),
  ('Credit Card Pattern', '\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b', 'block', 'high')
ON CONFLICT DO NOTHING;
