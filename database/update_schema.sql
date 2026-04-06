-- Database Schema Updates for PostgreSQL Migration
-- Run this to add missing tables

-- Analytics Events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    page_url TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Levels table
CREATE TABLE IF NOT EXISTS user_levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level INTEGER UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    icon TEXT,
    min_points INTEGER NOT NULL,
    max_points INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon TEXT,
    color VARCHAR(7) DEFAULT '#F59E0B',
    requirement_type VARCHAR(50),
    requirement_value INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Badges table
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_id)
);

-- Insert default user levels
INSERT INTO user_levels (level, name, icon, min_points, max_points) VALUES
(1, 'Yeni Keşifci', '🌱', 0, 100),
(2, 'Gezgin', '🚶', 100, 300),
(3, 'Kaşif', '🔍', 300, 600),
(4, 'Maceracı', '🏃', 600, 1000),
(5, 'Şanlıurfalı', '🏆', 1000, 5000)
ON CONFLICT (level) DO NOTHING;

-- Insert default badges
INSERT INTO badges (name, description, icon, color, requirement_type, requirement_value) VALUES
('İlk Adım', 'Siteye ilk kayıt olduğunuzda kazanılır', '🌟', '#F59E0B', 'register', 1),
('İlk Yorum', 'İlk yorumunuzu yaptığınızda kazanılır', '💬', '#3B82F6', 'review', 1),
('Favori Koleksiyoncusu', 'İlk favorinizi eklediğinizde kazanılır', '❤️', '#EF4444', 'favorite', 1),
('Deneyimli Gezgin', '5 farklı mekan ziyaret ettiğinizde kazanılır', '📍', '#8B5CF6', 'visit', 5),
('Yardımsever', 'Bir yorumu beğendiğinizde kazanılır', '👍', '#10B981', 'like', 1)
ON CONFLICT DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- Verify admin user exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@sanliurfa.com') THEN
        INSERT INTO users (email, password_hash, full_name, role, email_verified)
        VALUES (
            'admin@sanliurfa.com',
            'c75c1c5d23c4a30c22b8909b2947733cc538ff62e0da4b27d8589b93c1332866',
            'Admin User',
            'admin',
            true
        );
    END IF;
END $$;

-- Print success
SELECT 'Schema update completed successfully!' as status;
