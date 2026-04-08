/**
 * Migration 022: Points Transactions
 * Creates points_transactions table for tracking user points history
 */

export const migration_022_points_transactions = {
  name: '022_points_transactions',
  async up(pool: any) {
    // Create points_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS points_transactions (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        reference_id UUID,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_transactions_user_id
      ON points_transactions(user_id, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_transactions_type
      ON points_transactions(type, created_at DESC)
    `);

    // Create index for reference lookups
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_points_transactions_reference_id
      ON points_transactions(reference_id)
      WHERE reference_id IS NOT NULL
    `);
  },

  async down(pool: any) {
    await pool.query(`DROP TABLE IF EXISTS points_transactions CASCADE`);
  }
};
