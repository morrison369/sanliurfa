-- Final Schema Migration
-- Complete database schema for Şanlıurfa.com

-- Ensure all core tables exist
CREATE TABLE IF NOT EXISTS system_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application logs
CREATE TABLE IF NOT EXISTS application_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message TEXT NOT NULL,
    context JSONB,
    source VARCHAR(255),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_app_logs_level ON application_logs(level);
CREATE INDEX idx_app_logs_created ON application_logs(created_at);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    enabled BOOLEAN DEFAULT false,
    description TEXT,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
    allowed_users UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- System metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(255) NOT NULL,
    metric_value DECIMAL(15, 4) NOT NULL,
    labels JSONB,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX idx_system_metrics_recorded ON system_metrics(recorded_at);

-- Create views for common queries
CREATE OR REPLACE VIEW active_places AS
SELECT p.*, c.name as category_name
FROM places p
LEFT JOIN categories c ON p.category_id = c.id
WHERE p.status = 'active';

CREATE OR REPLACE VIEW place_stats AS
SELECT 
    p.id,
    p.name,
    COUNT(r.id) as review_count,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(f.id) as favorite_count
FROM places p
LEFT JOIN reviews r ON p.id = r.place_id AND r.status = 'approved'
LEFT JOIN favorites f ON p.id = f.place_id
GROUP BY p.id, p.name;

-- Functions
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t.tablename, t.tablename);
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t.tablename AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('
                CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at()
            ', t.tablename, t.tablename);
        END IF;
    END LOOP;
END $$;

-- Grant permissions (adjust as needed)
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_readonly;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_readwrite;

-- Insert default system config
INSERT INTO system_config (key, value, description) VALUES
('site.name', '"Şanlıurfa.com"', 'Site name'),
('site.description', '"Şanlıurfa rehberiniz"', 'Site description'),
('features.registration', 'true', 'Enable user registration'),
('features.reviews', 'true', 'Enable reviews'),
('maintenance.mode', 'false', 'Maintenance mode'),
('maintenance.message', '"Sistem bakımda"', 'Maintenance message')
ON CONFLICT (key) DO NOTHING;

-- Insert default categories
INSERT INTO categories (id, name, slug, description) VALUES
('11111111-1111-1111-1111-111111111111', 'Restoran', 'restoran', 'Yemek ve içecek mekanları'),
('22222222-2222-2222-2222-222222222222', 'Kafe', 'kafe', 'Kahve ve çay salonları'),
('33333333-3333-3333-3333-333333333333', 'Otel', 'otel', 'Konaklama yerleri'),
('44444444-4444-4444-4444-444444444444', 'Alışveriş', 'alisveris', 'Mağaza ve pazarlar'),
('55555555-5555-5555-5555-555555555555', 'Tarihi Yer', 'tarihi-yer', 'Tarihi ve turistik yerler')
ON CONFLICT (id) DO NOTHING;

-- Final optimization
VACUUM ANALYZE;
