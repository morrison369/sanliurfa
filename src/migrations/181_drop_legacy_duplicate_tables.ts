/**
 * Migration 181: Legacy Duplicate Tables Cleanup
 *
 * Context: Bu oturumda 3 critical bug bulundu — endpoint'ler ve helper'lar
 * "yanlış tabloya" yazıyor/okuyordu:
 *   - favorites vs user_favorites (canonical)
 *   - user_activity vs user_activities (canonical, logActivity yazıyor)
 *   - followers vs user_follows (canonical, 53 row)
 *   - activity_feed vs activity_feeds (65 row var)
 *
 * Migration 180 sonrası 72+ drift düzeltildi. Bu migration legacy table'ları
 * DROP eder — sadece BOŞSA. Eğer data varsa MIGRATE et önce.
 *
 * Pre-flight check:
 *   - favorites: 0 row (verified)
 *   - user_activity: 0 row
 *   - followers: bilinmiyor (eğer 0 ise drop)
 *   - activity_feed: 0 row
 */

export const migration = {
  description: 'DROP legacy duplicate tables (favorites, user_activity, followers if empty, activity_feed)',

  async up(pool: any) {
    // Helper: tablo boşsa drop et, doluysa skip + warning
    async function dropIfEmpty(table: string) {
      try {
        const exists = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
          [table],
        );
        if (!exists.rows[0].exists) {
          console.log(`  ⊘ ${table} — yok (zaten drop edilmiş)`);
          return;
        }
        const count = await pool.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
        if (count.rows[0].c > 0) {
          console.log(`  ⚠️  ${table} — ${count.rows[0].c} row var, DROP edilmedi (data migrate önce)`);
          return;
        }
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`  ✓ ${table} — boştu, drop edildi`);
      } catch (err) {
        console.log(`  ✗ ${table} — error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log('Legacy duplicate table cleanup başlıyor...');
    await dropIfEmpty('favorites');           // user_favorites canonical
    await dropIfEmpty('user_activity');       // user_activities canonical
    await dropIfEmpty('activity_feed');       // activity_feeds canonical
    // followers — silmiyoruz, hala bazı yerlerde refer ediyor olabilir, drift check geçtiyse OK
    // await dropIfEmpty('followers');         // user_follows canonical (53 row); manual confirm gerek
    console.log('Cleanup tamamlandı.');
  },

  async down(_pool: any) {
    // Rollback yok — silinen tablolar back'i için DDL backup'tan restore gerekli.
    // Bu cleanup migration intentional irreversible; her zaman down() no-op.
    console.log('Migration 181 rollback: no-op (tables zaten boştu)');
  },
};

export default migration;
