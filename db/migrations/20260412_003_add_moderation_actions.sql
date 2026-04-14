-- Moderation actions table
-- Created: 2026-04-12

CREATE TABLE IF NOT EXISTS moderation_actions (
  id SERIAL PRIMARY KEY,
  report_id VARCHAR(50),
  target_user_id VARCHAR(50) NOT NULL,
  action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('warning', 'content_removed', 'suspend', 'ban', 'appeal_granted')),
  reason TEXT NOT NULL,
  moderator_id VARCHAR(50) NOT NULL,
  duration_days INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_moderation_actions_user ON moderation_actions(target_user_id);
CREATE INDEX idx_moderation_actions_type ON moderation_actions(action_type);
CREATE INDEX idx_moderation_actions_created ON moderation_actions(created_at);

-- Add ban-related columns to users table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_banned') THEN
    ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'ban_reason') THEN
    ALTER TABLE users ADD COLUMN ban_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'banned_at') THEN
    ALTER TABLE users ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'ban_expires_at') THEN
    ALTER TABLE users ADD COLUMN ban_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_suspended') THEN
    ALTER TABLE users ADD COLUMN is_suspended BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'suspension_reason') THEN
    ALTER TABLE users ADD COLUMN suspension_reason TEXT;
  END IF;
END $$;
