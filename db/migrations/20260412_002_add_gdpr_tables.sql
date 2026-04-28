-- GDPR compliance tables
-- Created: 2026-04-12

-- Data export requests (GDPR Article 20)
CREATE TABLE IF NOT EXISTS data_export_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  data JSONB,
  expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_data_export_user ON data_export_requests(user_id);
CREATE INDEX idx_data_export_status ON data_export_requests(status);

-- Consent records
CREATE TABLE IF NOT EXISTS consent_records (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('cookies', 'marketing', 'analytics', 'third_party')),
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_at TIMESTAMP WITH TIME ZONE,
  revoked_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, type)
);

CREATE INDEX idx_consent_user ON consent_records(user_id);
CREATE INDEX idx_consent_type ON consent_records(type);

-- Data deletion log (GDPR Article 17)
CREATE TABLE IF NOT EXISTS data_deletion_log (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  deleted_by VARCHAR(50) NOT NULL,
  reason TEXT,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verification_hash VARCHAR(64) -- Hash of deleted data for verification
);

CREATE INDEX idx_deletion_log_user ON data_deletion_log(user_id);

-- Privacy policy acceptance tracking
CREATE TABLE IF NOT EXISTS privacy_policy_acceptances (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  version VARCHAR(20) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_privacy_policy_user ON privacy_policy_acceptances(user_id);

-- Add missing columns to users table for soft delete
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_deleted') THEN
    ALTER TABLE users ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'deleted_at') THEN
    ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Add is_anonymous column to reviews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'reviews' AND column_name = 'is_anonymous') THEN
    ALTER TABLE reviews ADD COLUMN is_anonymous BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add author_name column to blog_comments for anonymous display
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'blog_comments' AND column_name = 'author_name') THEN
    ALTER TABLE blog_comments ADD COLUMN author_name VARCHAR(100);
  END IF;
END $$;
