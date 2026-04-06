-- User Badges System
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  color VARCHAR(7) DEFAULT '#a18072',
  criteria_type VARCHAR(50) NOT NULL, -- 'points', 'reviews', 'places', 'login_streak', 'special'
  criteria_value INTEGER NOT NULL DEFAULT 0,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User-Badges Many-to-Many
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- User Activity Log
CREATE TABLE IF NOT EXISTS user_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- 'review_added', 'place_added', 'login', 'level_up', 'badge_earned'
  reference_type VARCHAR(50), -- 'review', 'place', 'badge'
  reference_id uuid,
  points_earned INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Levels
CREATE TABLE IF NOT EXISTS user_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER NOT NULL,
  icon VARCHAR(255),
  color VARCHAR(7) DEFAULT '#a18072',
  benefits TEXT[]
);

-- Notifications System
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'review_approved', 'review_rejected', 'level_up', 'badge_earned', 'place_approved', 'mention', 'system'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB, -- Additional data like review_id, badge_id, etc.
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content Versions (for moderation workflow)
CREATE TABLE IF NOT EXISTS content_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'place', 'blog_post', 'event', 'historical_site'
  content_id uuid NOT NULL,
  version_number INTEGER NOT NULL,
  data JSONB NOT NULL, -- Full content snapshot
  changed_by uuid REFERENCES auth.users(id),
  change_summary TEXT,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(content_type, content_id, version_number)
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Notification Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_review_approved BOOLEAN DEFAULT true,
  email_review_rejected BOOLEAN DEFAULT true,
  email_level_up BOOLEAN DEFAULT true,
  email_badge_earned BOOLEAN DEFAULT true,
  email_place_approved BOOLEAN DEFAULT true,
  email_newsletter BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  push_types TEXT[] DEFAULT ARRAY['review_approved', 'level_up', 'badge_earned'],
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default badges
INSERT INTO badges (name, description, icon, color, criteria_type, criteria_value) VALUES
('Yeni Üye', 'Platforma katıldınız', '👋', '#10b981', 'points', 0),
('İlk Yorum', 'İlk yorumunuzu yaptınız', '💬', '#3b82f6', 'reviews', 1),
('Aktif Katılımcı', '5 yorum yaptınız', '🌟', '#8b5cf6', 'reviews', 5),
('Deneyimli Eleştirmen', '20 yorum yaptınız', '🏆', '#f59e0b', 'reviews', 20),
('Mekan Kaşifi', 'İlk mekan eklediniz', '📍', '#ef4444', 'places', 1),
('Göbeklitepe Kaşifi', '10 mekan eklediniz', '🗺️', '#a18072', 'places', 50),
('Günlük Ziyaretçi', '7 gün üst üste giriş yaptınız', '🔥', '#f97316', 'login_streak', 7),
('Sadık Üye', '30 gün üst üste giriş yaptınız', '💎', '#ec4899', 'login_streak', 30),
('Puan Ustası', '1000 puan topladınız', '🎯', '#14b8a6', 'points', 1000),
('Şanlıurfa Elçisi', '5000 puan topladınız', '👑', '#fbbf24', 'points', 5000);

-- Insert default levels
INSERT INTO user_levels (level, name, min_points, max_points, icon, color, benefits) VALUES
(1, 'Yeni Keşifçi', 0, 100, '🌱', '#10b981', ARRAY['Temel özelliklere erişim']),
(2, 'Gezgin', 100, 300, '🚶', '#3b82f6', ARRAY['Profil rozeti', 'Özel avatar çerçevesi']),
(3, 'Kaşif', 300, 600, '🔍', '#8b5cf6', ARRAY['Öncelikli yorum onayı', 'Özel tema']),
(4, 'Maceracı', 600, 1000, '🎒', '#f59e0b', ARRAY['Yer işareti özelliği', 'Detaylı istatistikler']),
(5, 'Bilge', 1000, 2000, '📚', '#ef4444', ARRAY['Moderatör adayı', 'Özel içerik erişimi']),
(6, 'Usta', 2000, 5000, '🏅', '#a18072', ARRAY['Yer doğrulama yetkisi', 'Özel rozet']),
(7, 'Efsane', 5000, 10000, '👑', '#fbbf24', ARRAY['VIP destek', 'Beta özelliklere erken erişim']),
(8, 'Şanlıurfa Efsanesi', 10000, 999999, '⭐', '#f59e0b', ARRAY['Tüm özellikler', 'Özel etkinlik davetleri']);

-- Insert default email templates
INSERT INTO email_templates (name, subject, body_html, body_text, variables) VALUES
('welcome', 'Şanlıurfa.com\'a Hoş Geldiniz!', 
'<h1>Hoş Geldiniz!</h1><p>Merhaba {{name}}, Şanlıurfa.com ailesine katıldığınız için teşekkür ederiz.</p>', 
'Merhaba {{name}}, Şanlıurfa.com ailesine katıldığınız için teşekkür ederiz.',
'["name"]'),
('review_approved', 'Yorumunuz Onaylandı',
'<h1>Tebrikler!</h1><p>{{place_name}} için yaptığınız yorum onaylandı. +{{points}} puan kazandınız!</p>',
'Tebrikler! {{place_name}} için yaptığınız yorum onaylandı.',
'["place_name", "points"]'),
('level_up', 'Seviye Atladınız! 🎉',
'<h1>Tebrikler!</h1><p>{{level_name}} seviyesine ulaştınız! Yeni özellikleri keşfedin.</p>',
'Tebrikler! {{level_name}} seviyesine ulaştınız!',
'["level_name", "level_number"]'),
('badge_earned', 'Yeni Rozet Kazandınız! 🏆',
'<h1>Yeni Rozet!</h1><p>{{badge_name}} rozeti kazandınız!</p><p>{{badge_description}}</p>',
'Tebrikler! {{badge_name}} rozeti kazandınız!',
'["badge_name", "badge_description"]');

-- RLS Policies
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;

-- User badges: readable by everyone, writable by system
CREATE POLICY "User badges are viewable by everyone" ON user_badges
  FOR SELECT USING (true);

-- User activities: readable by owner and admins
CREATE POLICY "User activities readable by owner" ON user_activities
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Notifications: readable by owner
CREATE POLICY "Notifications readable by owner" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Notifications updatable by owner" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Notification preferences: manageable by owner
CREATE POLICY "Notification preferences manageable by owner" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Content versions: readable by admins and content owner
CREATE POLICY "Content versions readable by admins" ON content_versions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) OR changed_by = auth.uid());

-- Functions for user level calculation
CREATE OR REPLACE FUNCTION calculate_user_level(user_uuid uuid)
RETURNS INTEGER AS $$
DECLARE
  user_points INTEGER;
  user_level INTEGER;
BEGIN
  SELECT points INTO user_points FROM profiles WHERE id = user_uuid;
  
  SELECT level INTO user_level FROM user_levels
  WHERE min_points <= user_points AND max_points > user_points
  ORDER BY level DESC LIMIT 1;
  
  RETURN COALESCE(user_level, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges()
RETURNS TRIGGER AS $$
DECLARE
  badge_record RECORD;
  user_stat INTEGER;
  login_streak INTEGER;
BEGIN
  -- Check each badge criteria
  FOR badge_record IN SELECT * FROM badges
  LOOP
    -- Skip if user already has this badge
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = NEW.user_id AND badge_id = badge_record.id) THEN
      CONTINUE;
    END IF;
    
    -- Check criteria
    CASE badge_record.criteria_type
      WHEN 'points' THEN
        SELECT points INTO user_stat FROM profiles WHERE id = NEW.user_id;
        IF user_stat >= badge_record.criteria_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_record.id);
        END IF;
        
      WHEN 'reviews' THEN
        SELECT COUNT(*) INTO user_stat FROM reviews WHERE user_id = NEW.user_id AND is_approved = true;
        IF user_stat >= badge_record.criteria_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_record.id);
        END IF;
        
      WHEN 'places' THEN
        SELECT COUNT(*) INTO user_stat FROM places WHERE created_by = NEW.user_id AND status = 'active';
        IF user_stat >= badge_record.criteria_value THEN
          INSERT INTO user_badges (user_id, badge_id) VALUES (NEW.user_id, badge_record.id);
        END IF;
    END CASE;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for badge checking on points change
CREATE TRIGGER check_badges_on_activity
  AFTER INSERT ON user_activities
  FOR EACH ROW
  EXECUTE FUNCTION check_and_award_badges();
