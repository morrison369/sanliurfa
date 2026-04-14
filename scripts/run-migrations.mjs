import dotenv from 'dotenv';
dotenv.config();

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sanliurfa';

const { p: pool } = await import('../dist/server/chunks/postgres_xBeDjZv2.mjs');

// Migrations table check/create
try {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(100) NOT NULL UNIQUE,
      description TEXT NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ migrations tablosu kontrol edildi/oluşturuldu');

  // Mevcut migrasyonları kontrol et
  const result = await pool.query('SELECT version, executed_at FROM migrations ORDER BY executed_at');
  console.log(`\n📋 ${result.rows.length} migrasyon çalıştırılmış:`);
  result.rows.slice(-10).forEach(r => {
    console.log(`   - ${r.version} (${new Date(r.executed_at).toLocaleDateString('tr-TR')})`);
  });

  if (result.rows.length > 10) {
    console.log(`   ... ve ${result.rows.length - 10} adet daha`);
  }

  process.exit(0);
} catch (e) {
  console.error('❌ Hata:', e.message);
  process.exit(1);
}
