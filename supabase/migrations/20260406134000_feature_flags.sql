-- Feature flags table

CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT false,
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  targeting_rules JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Only admins can manage feature flags
CREATE POLICY "Only admins can manage feature flags"
  ON feature_flags FOR ALL
  USING (auth.uid() IN (
    SELECT id FROM users WHERE is_admin = true
  ));

-- Everyone can read feature flags (needed for checking)
CREATE POLICY "Everyone can read feature flags"
  ON feature_flags FOR SELECT
  USING (true);

-- Insert default flags
INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage) VALUES
  ('new_design', 'Yeni Tasarım', 'Modernized UI design', false, 0),
  ('advanced_search', 'Gelişmiş Arama', 'Elasticsearch integration', false, 0),
  ('social_features', 'Sosyal Özellikler', 'Following, comments, likes', true, 100),
  ('dark_mode', 'Karanlık Mod', 'Dark theme support', true, 100),
  ('pwa_offline', 'Çevrimdışı Modu', 'PWA offline capabilities', true, 100)
ON CONFLICT (key) DO NOTHING;
