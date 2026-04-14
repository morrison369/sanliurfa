/**
 * Migration 017: Turkish Language Default
 * Adds language preference column (always 'tr' - no multi-language support)
 * 
 * NOT: Bu proje SADECE Türkçe destekler. Çok dilli destek YASAKTIR.
 * @see AGENTS.md - Yasaklar bölümü
 */

export const migration_017_internationalization = {
  name: '017_internationalization',
  async up(pool: any) {
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS language_preference VARCHAR(10) DEFAULT 'tr'
    `);

    // Tüm mevcut kullanıcıları Türkçe'ye ayarla
    await pool.query(`
      UPDATE users 
      SET language_preference = 'tr' 
      WHERE language_preference IS NULL OR language_preference != 'tr'
    `);

    console.log('✓ Migration 017: Turkish language default set (single language only)');
  },

  async down(pool: any) {
    await pool.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS language_preference
    `);
    console.log('✓ Migration 017 rolled back');
  }
};
