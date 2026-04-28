-- Multi-Tenant Support Tables
-- Created: 2026-04-12

CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  plan VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'basic', 'professional', 'enterprise')),
  settings JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}',
  features TEXT[] DEFAULT '{}',
  limits JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_plan ON tenants(plan);

-- Tenant members (users belonging to a tenant)
CREATE TABLE IF NOT EXISTS tenant_members (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer' CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_role ON tenant_members(role);

-- Tenant activity log
CREATE TABLE IF NOT EXISTS tenant_activity_log (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenant_activity_tenant ON tenant_activity_log(tenant_id);
CREATE INDEX idx_tenant_activity_created ON tenant_activity_log(created_at);

-- Tenant invites
CREATE TABLE IF NOT EXISTS tenant_invites (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'viewer',
  token VARCHAR(100) NOT NULL UNIQUE,
  invited_by VARCHAR(50) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenant_invites_tenant ON tenant_invites(tenant_id);
CREATE INDEX idx_tenant_invites_token ON tenant_invites(token);
CREATE INDEX idx_tenant_invites_expires ON tenant_invites(expires_at);

-- Add tenant_id to existing tables for multi-tenancy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'places' AND column_name = 'tenant_id') THEN
    ALTER TABLE places ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
    CREATE INDEX idx_places_tenant ON places(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
    ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
    CREATE INDEX idx_users_tenant ON users(tenant_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_posts' AND column_name = 'tenant_id') THEN
    ALTER TABLE blog_posts ADD COLUMN tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL;
    CREATE INDEX idx_blog_posts_tenant ON blog_posts(tenant_id);
  END IF;
END $$;
