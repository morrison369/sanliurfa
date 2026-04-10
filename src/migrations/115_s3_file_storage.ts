/**
 * Migration 115: S3 File Storage & CDN
 * S3 integration, file metadata, CDN cache management
 */

import type { Migration } from '../lib/migrations';

export const migration_115_s3_file_storage: Migration = {
  version: '115_s3_file_storage',
  description: 'S3 integration, file metadata, CDN cache management',
  up: async (pool: any) => {
  try {
    // S3 file registry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS s3_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_key VARCHAR(500) UNIQUE NOT NULL,
        original_filename VARCHAR(255),
        file_size_bytes INT,
        file_type VARCHAR(50),
        mime_type VARCHAR(100),
        s3_bucket VARCHAR(255),
        s3_url VARCHAR(500),
        cdn_url VARCHAR(500),
        uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT false,
        is_archived BOOLEAN DEFAULT false,
        virus_scan_status VARCHAR(50),
        virus_scan_date TIMESTAMP,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_s3_files_user
      ON s3_files(uploaded_by_user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_s3_files_type
      ON s3_files(file_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_s3_files_public
      ON s3_files(is_public) WHERE is_public = true
    `);

    // File access tracking
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        access_type VARCHAR(50),
        ip_address INET,
        user_agent VARCHAR(500),
        accessed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_file
      ON file_access_logs(file_id, accessed_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_user
      ON file_access_logs(user_id, accessed_at DESC)
    `);

    // CDN cache settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cdn_cache_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE UNIQUE,
        cache_ttl_seconds INT DEFAULT 86400,
        cache_control_header VARCHAR(255),
        gzip_enabled BOOLEAN DEFAULT true,
        min_file_size_bytes INT DEFAULT 1024,
        max_file_size_bytes INT,
        cache_key_version INT DEFAULT 1,
        is_cached BOOLEAN DEFAULT true,
        last_cache_purge TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_cdn_cache_file
      ON cdn_cache_settings(file_id)
    `);

    // File variants (thumbnails, resized images, etc.)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE,
        variant_type VARCHAR(50),
        variant_key VARCHAR(500) UNIQUE NOT NULL,
        variant_url VARCHAR(500),
        dimensions VARCHAR(50),
        file_size_bytes INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_variants_original
      ON file_variants(original_file_id, variant_type)
    `);

    console.log('✓ Migration 115 completed: S3 file storage and CDN tables created');
  } catch (error) {
    console.error('Migration 115 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS file_variants CASCADE');
    await pool.query('DROP TABLE IF EXISTS cdn_cache_settings CASCADE');
    await pool.query('DROP TABLE IF EXISTS file_access_logs CASCADE');
    await pool.query('DROP TABLE IF EXISTS s3_files CASCADE');
    console.log('✓ Migration 115 rolled back');
  } catch (error) {
    console.error('Rollback 115 failed:', error);
    throw error;
  }
  }
};
