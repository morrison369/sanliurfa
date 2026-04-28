import type { Migration } from '../lib/migrations/migration-system';

const migration: Migration = {
  version: '128',
  name: 'reservation_system',
  description: 'Add reservation system for restaurants and cafes',
  
  up: async (client) => {
    // Rezervasyonlar tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS reservations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        customer_name VARCHAR(100) NOT NULL,
        customer_email VARCHAR(255),
        customer_phone VARCHAR(20) NOT NULL,
        reservation_date DATE NOT NULL,
        reservation_time TIME NOT NULL,
        party_size INTEGER NOT NULL CHECK (party_size > 0 AND party_size <= 50),
        special_requests TEXT,
        occasion VARCHAR(50),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' 
          CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
        table_number VARCHAR(20),
        notes TEXT,
        confirmation_code VARCHAR(10) UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
        confirmation_sent BOOLEAN DEFAULT false,
        reminder_sent BOOLEAN DEFAULT false,
        status_updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      ALTER TABLE reservations
      ADD COLUMN IF NOT EXISTS place_id UUID,
      ADD COLUMN IF NOT EXISTS reservation_date DATE,
      ADD COLUMN IF NOT EXISTS reservation_time TIME,
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20),
      ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(10),
      ADD COLUMN IF NOT EXISTS party_size INTEGER;
    `);

    // İndeksler
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reservations_place_id ON reservations(place_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(reservation_date);
      CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
      CREATE INDEX IF NOT EXISTS idx_reservations_customer_phone ON reservations(customer_phone);
      CREATE INDEX IF NOT EXISTS idx_reservations_confirmation_code ON reservations(confirmation_code);
    `);

    // Places tablosuna rezervasyon alma özelliği ekle
    await client.query(`
      ALTER TABLE places 
      ADD COLUMN IF NOT EXISTS accepts_reservations BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS reservation_duration_minutes INTEGER DEFAULT 120,
      ADD COLUMN IF NOT EXISTS max_party_size INTEGER DEFAULT 20,
      ADD COLUMN IF NOT EXISTS min_party_size INTEGER DEFAULT 1;
    `);

    // Rezervasyon saatleri tablosu (işletme bazlı)
    await client.query(`
      CREATE TABLE IF NOT EXISTS place_reservation_hours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
        day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        interval_minutes INTEGER DEFAULT 30,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(place_id, day_of_week, start_time)
      );
    `);

    // Rezervasyon ayarları tablosu
    await client.query(`
      CREATE TABLE IF NOT EXISTS place_reservation_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        place_id UUID NOT NULL UNIQUE REFERENCES places(id) ON DELETE CASCADE,
        advance_booking_days INTEGER DEFAULT 30,
        min_booking_hours INTEGER DEFAULT 2,
        max_booking_days INTEGER DEFAULT 90,
        allow_same_day BOOLEAN DEFAULT true,
        cut_off_time TIME DEFAULT '20:00',
        auto_confirm BOOLEAN DEFAULT false,
        deposit_required BOOLEAN DEFAULT false,
        deposit_amount DECIMAL(10,2),
        cancellation_policy TEXT,
        special_occasion_options TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Rezervasyon bildirim ayarları
    await client.query(`
      DO $$
      BEGIN
        IF to_regclass('public.email_preferences') IS NOT NULL THEN
          ALTER TABLE email_preferences
          ADD COLUMN IF NOT EXISTS reservation_notifications BOOLEAN DEFAULT true,
          ADD COLUMN IF NOT EXISTS daily_reservation_summary BOOLEAN DEFAULT true;
        END IF;
      END $$;
    `);

    // Rezervasyon istatistikleri görünümü
    await client.query(`
      CREATE OR REPLACE VIEW reservation_stats AS
      SELECT 
        place_id,
        DATE_TRUNC('month', reservation_date) as month,
        COUNT(*) as total_reservations,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_count,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
        COUNT(*) FILTER (WHERE status = 'no_show') as no_show_count,
        AVG(party_size) as avg_party_size,
        MAX(party_size) as max_party_size
      FROM reservations
      WHERE reservation_date >= NOW() - INTERVAL '1 year'
      GROUP BY place_id, DATE_TRUNC('month', reservation_date);
    `);
  },

  down: async (client) => {
    await client.query(`DROP VIEW IF EXISTS reservation_stats;`);
    await client.query(`DROP TABLE IF EXISTS place_reservation_settings;`);
    await client.query(`DROP TABLE IF EXISTS place_reservation_hours;`);
    await client.query(`DROP TABLE IF EXISTS reservations;`);
    
    await client.query(`
      ALTER TABLE places 
      DROP COLUMN IF EXISTS accepts_reservations,
      DROP COLUMN IF EXISTS reservation_duration_minutes,
      DROP COLUMN IF EXISTS max_party_size,
      DROP COLUMN IF EXISTS min_party_size;
    `);

    await client.query(`
      ALTER TABLE email_preferences
      DROP COLUMN IF EXISTS reservation_notifications,
      DROP COLUMN IF EXISTS daily_reservation_summary;
    `);
  }
};

export default migration;

