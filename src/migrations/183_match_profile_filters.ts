/**
 * Migration 183: user_match_profiles filtre kolonları
 *
 * Audit Priority #4 (Tinder): 2 swipe = neredeyse hiç aktivite.
 * Sebep: Match suggestion'lar random, ortak ilgi/şehir hint yok.
 *
 * Bu migration scoring için 4 kolon ekler:
 *   - interests TEXT[] (kullanıcı ilgi alanları)
 *   - age_range_min/max (yaş aralığı tercihi)
 *   - preferred_district (Şanlıurfa ilçesi)
 *   - looking_for (arkadaşlık / sosyal / etkinlik)
 *
 * Pattern: optional kolonlar, mevcut 15 profile boş kalır (UI'da doldurma istenir).
 */

export const migration = {
  description: 'user_match_profiles: interests/age/district/looking_for kolonları',

  async up(pool: any) {
    await pool.query(`
      ALTER TABLE user_match_profiles
        ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS age_range_min INT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS age_range_max INT DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS preferred_district VARCHAR(100) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS looking_for VARCHAR(50) DEFAULT NULL,
        ADD COLUMN IF NOT EXISTS profile_completeness INT DEFAULT 0;
    `);

    // GIN index for interests array search (overlap operator)
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_match_profiles_interests
        ON user_match_profiles USING GIN (interests)
        WHERE interests IS NOT NULL;
    `);

    // Compound index for district filter
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_match_profiles_district_active
        ON user_match_profiles (preferred_district, is_discoverable)
        WHERE is_discoverable = true AND preferred_district IS NOT NULL;
    `);

    // Helper function: profile completeness 0-100
    await pool.query(`
      CREATE OR REPLACE FUNCTION calc_match_profile_completeness(p user_match_profiles) RETURNS INT AS $$
      BEGIN
        RETURN (
          (CASE WHEN p.bio IS NOT NULL AND LENGTH(p.bio) > 20 THEN 20 ELSE 0 END) +
          (CASE WHEN array_length(p.photos, 1) >= 1 THEN 15 ELSE 0 END) +
          (CASE WHEN array_length(p.photos, 1) >= 3 THEN 15 ELSE 0 END) +
          (CASE WHEN array_length(p.interests, 1) >= 3 THEN 20 ELSE 0 END) +
          (CASE WHEN p.age_range_min IS NOT NULL AND p.age_range_max IS NOT NULL THEN 10 ELSE 0 END) +
          (CASE WHEN p.preferred_district IS NOT NULL THEN 10 ELSE 0 END) +
          (CASE WHEN p.looking_for IS NOT NULL THEN 10 ELSE 0 END)
        );
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Backfill: existing 15 profile için completeness
    await pool.query(`
      UPDATE user_match_profiles
      SET profile_completeness = calc_match_profile_completeness(user_match_profiles);
    `);
  },

  async down(pool: any) {
    await pool.query(`DROP FUNCTION IF EXISTS calc_match_profile_completeness(user_match_profiles);`);
    await pool.query(`DROP INDEX IF EXISTS idx_user_match_profiles_district_active;`);
    await pool.query(`DROP INDEX IF EXISTS idx_user_match_profiles_interests;`);
    await pool.query(`
      ALTER TABLE user_match_profiles
        DROP COLUMN IF EXISTS profile_completeness,
        DROP COLUMN IF EXISTS looking_for,
        DROP COLUMN IF EXISTS preferred_district,
        DROP COLUMN IF EXISTS age_range_max,
        DROP COLUMN IF EXISTS age_range_min,
        DROP COLUMN IF EXISTS interests;
    `);
  },
};

export default migration;
