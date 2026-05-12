/**
 * Migration 179: historical_sites.status DEFAULT 'active' → 'published'
 *
 * Bağlam: Migration 134 historical_sites.status DEFAULT='active' tanımlamış,
 * fakat üretimde tüm 58 kayıt 'published'. Tüm SQL query'leri WHERE status='published'
 * kullanıyor (sitemap, listing, detail). Yeni bir INSERT status belirtmezse 'active'
 * default'una düşüp tüm frontend'de gizli kalırdı.
 *
 * Bu migration default'u 'published' yapar, varolan 'active' kayıt varsa onları
 * da senkronize eder (data integrity guard).
 */

export const migration = {
  description: "historical_sites.status DEFAULT 'active' → 'published' + drift-fix",

  async up(pool: any) {
    await pool.query(`
      ALTER TABLE historical_sites
        ALTER COLUMN status SET DEFAULT 'published'
    `);
    // Drift fix: legacy 'active' kayıt varsa 'published' yap
    await pool.query(`
      UPDATE historical_sites SET status = 'published' WHERE status = 'active'
    `);
  },

  async down(pool: any) {
    await pool.query(`
      ALTER TABLE historical_sites
        ALTER COLUMN status SET DEFAULT 'active'
    `);
  },
};

export default migration;
