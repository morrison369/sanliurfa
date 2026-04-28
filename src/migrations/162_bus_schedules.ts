import type { Migration } from '../lib/migrations';

export const migration_162_bus_schedules: Migration = {
  version: '162_bus_schedules',
  description: 'Şanlıurfa otobüs hatları ve saatler tabloları',

  up: async (pool: any) => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_routes (
        id SERIAL PRIMARY KEY,
        route_no VARCHAR(20) NOT NULL,
        name VARCHAR(255) NOT NULL,
        start_stop VARCHAR(255) NOT NULL,
        end_stop VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_routes_no ON bus_routes(route_no);
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS bus_schedules (
        id SERIAL PRIMARY KEY,
        route_id INTEGER NOT NULL REFERENCES bus_routes(id) ON DELETE CASCADE,
        departure_time TIME NOT NULL,
        day_type VARCHAR(20) NOT NULL DEFAULT 'weekday',
        direction VARCHAR(10) NOT NULL DEFAULT 'outbound',
        notes TEXT,
        CONSTRAINT valid_day_type CHECK (day_type IN ('weekday', 'saturday', 'sunday', 'holiday'))
      );
      CREATE INDEX IF NOT EXISTS idx_bus_schedules_route ON bus_schedules(route_id, day_type, direction);
    `);

    // Şanlıurfa’nın temel hatları — başlangıç verisi
    await pool.query(`
      INSERT INTO bus_routes (route_no, name, start_stop, end_stop, notes) VALUES
        ('1', 'Topçu - Balıklıgöl', 'Topçu Meydanı', 'Balıklıgöl', 'Merkez hattı'),
        ('2', 'Karaköprü - Abide', 'Karaköprü Merkez', 'Abide Kavşağı', NULL),
        ('3', 'Haliliye Hastane - GAP Otogar', 'Haliliye Devlet Hastanesi', 'GAP Otogarı', NULL),
        ('4', 'Eyyübiye - Üniversite', 'Eyyübiye Merkez', 'Harran Üniversitesi', 'Öğrenci hattı')
      ON CONFLICT (route_no) DO NOTHING;
    `);

    // Hat 1 için örnek saatler
    await pool.query(`
      INSERT INTO bus_schedules (route_id, departure_time, day_type, direction)
      SELECT r.id, t.dep::TIME, 'weekday', 'outbound'
      FROM bus_routes r,
        (VALUES ('06:00'),('06:30'),('07:00'),('07:30'),('08:00'),('08:30'),
                ('09:00'),('10:00'),('11:00'),('12:00'),('13:00'),('14:00'),
                ('15:00'),('16:00'),('17:00'),('17:30'),('18:00'),('18:30'),
                ('19:00'),('20:00'),('21:00'),('22:00')) AS t(dep)
      WHERE r.route_no = '1'
      ON CONFLICT DO NOTHING;
    `);
  },

  down: async (pool: any) => {
    await pool.query('DROP TABLE IF EXISTS bus_schedules CASCADE');
    await pool.query('DROP TABLE IF EXISTS bus_routes CASCADE');
  },
};
