/**
 * Migration 136: places tablosuna category_id FK ve short_description ekle
 */
import { pool } from '../lib/postgres';

export default {
  version: '136_places_category_id_short_desc',
  description: 'places: category_id (FK → categories), short_description',

  async up() {
    // category_id: categories tablosuna FK (nullable — eski kayıtlar için)
    await pool.query(`
      ALTER TABLE places
        ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_places_category_id ON places(category_id)
    `);

    // short_description: kısa tanıtım metni (max 200 karakter)
    await pool.query(`
      ALTER TABLE places
        ADD COLUMN IF NOT EXISTS short_description VARCHAR(200)
    `);
  },

  async down() {
    await pool.query(`ALTER TABLE places DROP COLUMN IF EXISTS short_description`);
    await pool.query(`ALTER TABLE places DROP COLUMN IF EXISTS category_id`);
  },
};
