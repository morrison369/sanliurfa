/**
 * Migration 117: Collaborative Editing
 * Real-time collaboration, edit history, conflict resolution
 */

import type { Migration } from '../lib/migrations';

export const migration_117_collaborative_editing: Migration = {
  version: '117_collaborative_editing',
  description: 'Real-time collaboration, edit history, conflict resolution',
  up: async (pool: any) => {
  try {
    // Collaboration sessions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collaboration_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        initiated_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        max_participants INT DEFAULT 10,
        current_participants INT DEFAULT 1,
        is_active BOOLEAN DEFAULT true,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collaboration_content
      ON collaboration_sessions(content_id, started_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_collaboration_active
      ON collaboration_sessions(is_active) WHERE is_active = true
    `);

    // Collaboration participants
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collaboration_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cursor_position INT,
        selection_start INT,
        selection_end INT,
        last_activity_at TIMESTAMP DEFAULT NOW(),
        joined_at TIMESTAMP DEFAULT NOW(),
        left_at TIMESTAMP,
        is_editing BOOLEAN DEFAULT false,
        UNIQUE(session_id, user_id)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_participants_session
      ON collaboration_participants(session_id, joined_at DESC)
    `);

    // Edit operations (operational transformation)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS edit_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        operation_type VARCHAR(50),
        operation_data JSONB,
        operation_index INT,
        timestamp BIGINT,
        parent_operation_id UUID REFERENCES edit_operations(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_operations_session
      ON edit_operations(session_id, operation_index ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_operations_user
      ON edit_operations(user_id, created_at DESC)
    `);

    // Edit snapshots (for undo/redo)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS edit_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        content_snapshot TEXT,
        operation_count INT,
        taken_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_edit_snapshots_session
      ON edit_snapshots(session_id, taken_at DESC)
    `);

    // Conflict resolutions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS edit_conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        operation_1_id UUID NOT NULL REFERENCES edit_operations(id) ON DELETE CASCADE,
        operation_2_id UUID NOT NULL REFERENCES edit_operations(id) ON DELETE CASCADE,
        conflict_type VARCHAR(100),
        resolution_type VARCHAR(50),
        resolved_at TIMESTAMP,
        resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_conflicts_session
      ON edit_conflicts(session_id, created_at DESC)
    `);

    // Collaboration comments/discussions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS collaboration_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        comment_text TEXT,
        position_in_doc INT,
        resolved BOOLEAN DEFAULT false,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_comments_session
      ON collaboration_comments(session_id, created_at DESC)
    `);

    console.log('✓ Migration 117 completed: Collaborative editing tables created');
  } catch (error) {
    console.error('Migration 117 failed:', error);
    throw error;
  }
  },
  down: async (pool: any) => {
  try {
    await pool.query('DROP TABLE IF EXISTS collaboration_comments CASCADE');
    await pool.query('DROP TABLE IF EXISTS edit_conflicts CASCADE');
    await pool.query('DROP TABLE IF EXISTS edit_snapshots CASCADE');
    await pool.query('DROP TABLE IF EXISTS edit_operations CASCADE');
    await pool.query('DROP TABLE IF EXISTS collaboration_participants CASCADE');
    await pool.query('DROP TABLE IF EXISTS collaboration_sessions CASCADE');
    console.log('✓ Migration 117 rolled back');
  } catch (error) {
    console.error('Rollback 117 failed:', error);
    throw error;
  }
  }
};
