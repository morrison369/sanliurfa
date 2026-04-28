-- Admin, Backup, and Migration Tables

-- Backup configurations
CREATE TABLE IF NOT EXISTS backup_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('full', 'incremental', 'partial')),
    schedule VARCHAR(100),
    retention INTEGER NOT NULL DEFAULT 30,
    destination VARCHAR(50) NOT NULL,
    destination_config JSONB NOT NULL DEFAULT '{}',
    tables TEXT[],
    compress BOOLEAN DEFAULT true,
    encrypt BOOLEAN DEFAULT false,
    encryption_key TEXT,
    last_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup history
CREATE TABLE IF NOT EXISTS backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID REFERENCES backup_configs(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    size BIGINT,
    checksum VARCHAR(64),
    path TEXT,
    error TEXT,
    duration INTEGER, -- seconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backups_config ON backups(config_id);
CREATE INDEX idx_backups_status ON backups(status);
CREATE INDEX idx_backups_started ON backups(started_at);

-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255),
    checksum VARCHAR(64),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    duration INTEGER -- milliseconds
);

-- Dashboards
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    layout JSONB NOT NULL DEFAULT '{"columns": 12, "rowHeight": 100}',
    widgets JSONB NOT NULL DEFAULT '[]',
    is_default BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboards_user ON dashboards(user_id);
CREATE INDEX idx_dashboards_tenant ON dashboards(tenant_id);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('table', 'chart', 'combined')),
    query TEXT NOT NULL,
    parameters JSONB,
    schedule VARCHAR(100),
    last_run TIMESTAMPTZ,
    last_result JSONB,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);
CREATE INDEX idx_reports_created_by ON reports(created_by);

-- Import/Export jobs
CREATE TABLE IF NOT EXISTS data_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    format VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    errors JSONB,
    file_path TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_status ON data_import_jobs(status);

-- System health checks
CREATE TABLE IF NOT EXISTS system_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
    message TEXT,
    details JSONB,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_health_checks_type ON system_health_checks(check_type);
CREATE INDEX idx_health_checks_checked ON system_health_checks(checked_at);

-- Add tenant_id to existing tables for multi-tenancy
ALTER TABLE places ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create indexes for tenant queries
CREATE INDEX IF NOT EXISTS idx_places_tenant ON places(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant ON blog_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_events_tenant ON events(tenant_id);

-- Function to archive old data
CREATE OR REPLACE FUNCTION archive_old_data(
    source_table TEXT,
    archive_table TEXT,
    date_column TEXT,
    older_than_days INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Create archive table if not exists
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I (LIKE %I INCLUDING ALL)', 
                   archive_table, source_table);
    
    -- Move old data to archive
    EXECUTE format('
        WITH moved_rows AS (
            DELETE FROM %I 
            WHERE %I < NOW() - INTERVAL ''%s days''
            RETURNING *
        )
        INSERT INTO %I SELECT * FROM moved_rows
    ', source_table, date_column, older_than_days, archive_table);
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;
