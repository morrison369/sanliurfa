/**
 * Migration 116: Video Processing & Transcoding
 * Video metadata, transcoding jobs, quality variants
 */

import { Pool } from 'pg';

export const migration_116_video_processing = async (pool: Pool) => {
  try {
    // Video metadata
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_metadata (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE UNIQUE,
        duration_seconds INT,
        width INT,
        height INT,
        frame_rate FLOAT,
        bitrate_kbps INT,
        codec_video VARCHAR(100),
        codec_audio VARCHAR(100),
        sample_rate_hz INT,
        has_audio BOOLEAN DEFAULT true,
        has_subtitle BOOLEAN DEFAULT false,
        total_bitrate_kbps INT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_metadata_file
      ON video_metadata(file_id)
    `);

    // Transcoding jobs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS transcoding_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE,
        job_id VARCHAR(255) UNIQUE,
        target_quality VARCHAR(50),
        target_codec VARCHAR(100),
        target_bitrate_kbps INT,
        target_resolution VARCHAR(50),
        status VARCHAR(50) DEFAULT 'queued',
        progress_percent INT DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        output_file_id UUID REFERENCES s3_files(id) ON DELETE SET NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transcoding_video
      ON transcoding_jobs(video_file_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transcoding_status
      ON transcoding_jobs(status, created_at DESC) WHERE status NOT IN ('completed', 'failed')
    `);

    // Thumbnail generation
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_thumbnails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE,
        thumbnail_url VARCHAR(500),
        thumbnail_time_seconds INT,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_thumbnails_video
      ON video_thumbnails(video_file_id, is_primary DESC)
    `);

    // Subtitle/Caption tracks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_captions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE,
        language VARCHAR(10),
        caption_file_id UUID REFERENCES s3_files(id) ON DELETE SET NULL,
        caption_type VARCHAR(50),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_captions_video
      ON video_captions(video_file_id, language)
    `);

    // Video streaming settings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS video_streaming_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_file_id UUID NOT NULL REFERENCES s3_files(id) ON DELETE CASCADE UNIQUE,
        enable_adaptive_bitrate BOOLEAN DEFAULT true,
        enable_drm BOOLEAN DEFAULT false,
        max_bitrate_kbps INT,
        min_bitrate_kbps INT,
        quality_variants TEXT[],
        hls_enabled BOOLEAN DEFAULT true,
        dash_enabled BOOLEAN DEFAULT true,
        progressive_download_enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_video_streaming_file
      ON video_streaming_settings(video_file_id)
    `);

    console.log('✓ Migration 116 completed: Video processing and transcoding tables created');
  } catch (error) {
    console.error('Migration 116 failed:', error);
    throw error;
  }
};

export const rollback_116 = async (pool: Pool) => {
  try {
    await pool.query('DROP TABLE IF EXISTS video_streaming_settings CASCADE');
    await pool.query('DROP TABLE IF EXISTS video_captions CASCADE');
    await pool.query('DROP TABLE IF EXISTS video_thumbnails CASCADE');
    await pool.query('DROP TABLE IF EXISTS transcoding_jobs CASCADE');
    await pool.query('DROP TABLE IF EXISTS video_metadata CASCADE');
    console.log('✓ Migration 116 rolled back');
  } catch (error) {
    console.error('Rollback 116 failed:', error);
    throw error;
  }
};
