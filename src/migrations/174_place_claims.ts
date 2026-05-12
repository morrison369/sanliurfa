import { pool } from '../lib/postgres';

export async function up(): Promise<void> {
 await pool.query(`
  CREATE TABLE IF NOT EXISTS place_claims (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
   status VARCHAR(20) NOT NULL DEFAULT 'pending',
   contact_name VARCHAR(200),
   contact_phone VARCHAR(50),
   contact_email VARCHAR(200),
   message TEXT,
   admin_note TEXT,
   reviewed_by UUID REFERENCES users(id),
   reviewed_at TIMESTAMP WITH TIME ZONE,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
   UNIQUE(place_id, user_id)
  );
  CREATE INDEX IF NOT EXISTS idx_place_claims_place_id ON place_claims(place_id);
  CREATE INDEX IF NOT EXISTS idx_place_claims_status ON place_claims(status);
  CREATE INDEX IF NOT EXISTS idx_place_claims_user_id ON place_claims(user_id);
 `);
}

export async function down(): Promise<void> {
 await pool.query('DROP TABLE IF EXISTS place_claims CASCADE;');
}
