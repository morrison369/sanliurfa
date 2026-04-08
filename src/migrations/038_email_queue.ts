/**
 * Migration 038: Email Queue System
 * Tracks pending and sent emails for notifications
 */

export const migration_038_email_queue = {
  name: '038_email_queue',
  async up(pool: any) {
    // Email queue table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient_email VARCHAR(255) NOT NULL,
        recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        template_type VARCHAR(100) NOT NULL,
        subject VARCHAR(255) NOT NULL,
        data JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        error_message TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes for queue processing
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_status
      ON email_queue(status, created_at ASC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_recipient
      ON email_queue(recipient_email, status)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_email_queue_user
      ON email_queue(recipient_user_id, status)
    `);

    console.log('✓ Migration 038: Email queue table created');
  },

  async down(pool: any) {
    await pool.query('DROP TABLE IF EXISTS email_queue CASCADE');
    console.log('✓ Migration 038 rolled back');
  }
};
