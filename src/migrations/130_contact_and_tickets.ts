import type { Migration } from '../lib/migrations/migration-system';

const migration: Migration = {
  version: 130,
  name: 'contact_and_tickets',
  description: 'Add contact form and support ticket system',
  
  up: async (client) => {
    // Support tickets tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_number VARCHAR(20) UNIQUE DEFAULT 'TKT-' || substr(md5(random()::text), 1, 8),
        
        -- Contact info
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        
        -- Ticket details
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'general' CHECK (
          type IN ('general', 'business_inquiry', 'technical_support', 'complaint', 'suggestion', 'partnership')
        ),
        
        -- Related place (optional)
        place_id UUID REFERENCES places(id) ON DELETE SET NULL,
        
        -- Status tracking
        status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'spam')),
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
        
        -- Assignment
        assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Timestamps
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ,
        
        -- Internal notes
        internal_notes TEXT
      );
    `);

    // Ticket responses tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        responder_id UUID REFERENCES users(id) ON DELETE SET NULL,
        
        -- Response
        message TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT false, -- Internal notes visible only to staff
        
        -- Attachments
        attachments TEXT[],
        
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ticket history/audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(50) NOT NULL, -- status_changed, assigned, note_added, etc.
        old_value TEXT,
        new_value TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Ticket stats view
    await client.query(`
      CREATE OR REPLACE VIEW ticket_stats AS
      SELECT 
        status,
        priority,
        type,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) as avg_resolution_hours
      FROM support_tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY status, priority, type;
    `);

    // Indexes
    await client.query(`
      CREATE INDEX idx_support_tickets_status ON support_tickets(status);
      CREATE INDEX idx_support_tickets_email ON support_tickets(email);
      CREATE INDEX idx_support_tickets_created ON support_tickets(created_at);
      CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to);
      CREATE INDEX idx_ticket_responses_ticket ON ticket_responses(ticket_id);
      CREATE INDEX idx_ticket_history_ticket ON ticket_history(ticket_id);
    `);

    // Update trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_ticket_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_ticket_timestamp ON support_tickets;
      CREATE TRIGGER update_ticket_timestamp
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW
        EXECUTE FUNCTION update_ticket_timestamp();
    `);
  },

  down: async (client) => {
    await client.query(`DROP VIEW IF EXISTS ticket_stats;`);
    await client.query(`DROP TABLE IF EXISTS ticket_history;`);
    await client.query(`DROP TABLE IF EXISTS ticket_responses;`);
    await client.query(`DROP TABLE IF EXISTS support_tickets;`);
    await client.query(`DROP FUNCTION IF EXISTS update_ticket_timestamp;`);
  }
};

export default migration;
