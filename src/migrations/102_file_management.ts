/**
 * Migration 102: File Management
 * File uploads, storage, and media processing
 */

import { Pool } from 'pg';

export const migration_102_file_management = async (pool: Pool) => {
  try {
    // File storage registry
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_storage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_key VARCHAR(500) UNIQUE NOT NULL,
        original_filename VARCHAR(500) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100),
        storage_path VARCHAR(1000),
        storage_provider VARCHAR(50),
        upload_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_public BOOLEAN DEFAULT false,
        download_count INT DEFAULT 0,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_storage_user
      ON file_storage(upload_by_user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_storage_key
      ON file_storage(file_key)
    `);

    // File associations (what uses which files)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_associations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
        associated_type VARCHAR(50) NOT NULL,
        associated_id UUID NOT NULL,
        association_context VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(file_id, associated_type, associated_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_associations
      ON file_associations(associated_type, associated_id)
    `);

    // Image variants (thumbnails, optimized versions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS image_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        original_file_id UUID NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
        variant_type VARCHAR(50),
        variant_width INT,
        variant_height INT,
        variant_file_id UUID REFERENCES file_storage(id) ON DELETE SET NULL,
        storage_path VARCHAR(1000),
        file_size INT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(original_file_id, variant_type)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_image_variants_original
      ON image_variants(original_file_id)
    `);

    // Media processing jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_processing_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
        job_type VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        processing_params JSONB,
        output_file_id UUID REFERENCES file_storage(id) ON DELETE SET NULL,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_media_jobs_status
      ON media_processing_jobs(status, created_at DESC)
    `);

    // File access logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_access_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES file_storage(id) ON DELETE CASCADE,
        accessed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        access_type VARCHAR(50),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_file_access_logs
      ON file_access_logs(file_id, created_at DESC)
    `);

    console.log('✓ Migration 102 completed: File management tables created');
  } catch (error) {
    console.error('Migration 102 failed:', error);
    throw error;
  }
};

export const rollback_102 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS file_access_logs CASCADE');
    await pool.query('DROP TABLE IF EXISTS media_processing_jobs CASCADE');
    await pool.query('DROP TABLE IF EXISTS image_variants CASCADE');
    await pool.query('DROP TABLE IF EXISTS file_associations CASCADE');
    await pool.query('DROP TABLE IF EXISTS file_storage CASCADE');
    console.log('✓ Migration 102 rolled back');
  } catch (error) {
    console.error('Rollback 102 failed:', error);
    throw error;
  }
};
