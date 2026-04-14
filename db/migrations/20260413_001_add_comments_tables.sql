-- Nested Comments System
-- Created: 2026-04-13

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  user_name VARCHAR(100) NOT NULL,
  user_avatar TEXT,
  parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('place', 'blog', 'review', 'event')),
  entity_id VARCHAR(50) NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0 CHECK (depth <= 5),
  likes INTEGER NOT NULL DEFAULT 0,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'flagged')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created ON comments(created_at);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);

-- Comment reports
CREATE TABLE IF NOT EXISTS comment_reports (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comment_reports_comment ON comment_reports(comment_id);
