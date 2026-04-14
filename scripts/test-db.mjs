import dotenv from 'dotenv';
dotenv.config();

const { p: pool } = await import('../dist/server/chunks/postgres_xBeDjZv2.mjs');

try {
  const r = await pool.query('SELECT NOW() as time, current_database() as db');
  console.log('✅ PostgreSQL bağlantısı OK');
  console.log('   Sunucu saati:', r.rows[0].time);
  console.log('   Veritabanı:', r.rows[0].db);
  process.exit(0);
} catch (e) {
  console.error('❌ Bağlantı hatası:', e.message);
  process.exit(1);
}
