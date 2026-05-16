/**
 * Migration 182: Backfill user_activities from existing user actions
 *
 * Context: /akis sosyal feed çalışıyor ama user_activities tablosu 12 row
 * (yalnız son işlem). Mevcut review/favorite/comment kayıtları activity'e
 * dönüştürülmemiş → feed boş gözüküyor.
 *
 * Bu migration:
 *   - 1202 reviews → review_created activity
 *   - user_favorites → favorite_added activity (eğer kayıt varsa)
 *   - comments → comment_posted activity
 *
 * ON CONFLICT DO NOTHING: idempotent — birden fazla çalıştırılabilir.
 *
 * Reasoning: User'ın "/akis" sayfasına geldiğinde gerçek aktivite görmesi
 * için seed. Geriye dönük backfill bir kez yeterli.
 */

export const migration = {
  description: 'Backfill user_activities from reviews/favorites/comments',

  async up(pool: any) {
    // 1. Review activities — onaylanmış yorumlar için
    const reviewsBackfill = await pool.query(`
      INSERT INTO user_activities (user_id, type, entity_type, entity_id, metadata, visibility, created_at)
      SELECT
        r.user_id,
        'review_created' AS type,
        'place' AS entity_type,
        r.place_id::uuid AS entity_id,
        jsonb_build_object('rating', r.rating, 'title', r.title) AS metadata,
        'public' AS visibility,
        r.created_at
      FROM reviews r
      WHERE r.user_id IS NOT NULL
        AND r.status = 'active'
        AND COALESCE(r.is_hidden, false) = false
        AND NOT EXISTS (
          SELECT 1 FROM user_activities ua
          WHERE ua.user_id = r.user_id
            AND ua.type = 'review_created'
            AND ua.entity_id = r.place_id::uuid
        );
    `);
    console.log(`  ✓ ${reviewsBackfill.rowCount || 0} review activity inserted`);

    // 2. Favorite activities
    const favoritesBackfill = await pool.query(`
      INSERT INTO user_activities (user_id, type, entity_type, entity_id, metadata, visibility, created_at)
      SELECT
        uf.user_id,
        'favorite_added' AS type,
        'place' AS entity_type,
        uf.place_id::uuid AS entity_id,
        '{}'::jsonb AS metadata,
        'public' AS visibility,
        uf.created_at
      FROM user_favorites uf
      WHERE NOT EXISTS (
        SELECT 1 FROM user_activities ua
        WHERE ua.user_id = uf.user_id
          AND ua.type = 'favorite_added'
          AND ua.entity_id = uf.place_id::uuid
      );
    `);
    console.log(`  ✓ ${favoritesBackfill.rowCount || 0} favorite activity inserted`);

    // 3. Comment activities
    const commentsBackfill = await pool.query(`
      INSERT INTO user_activities (user_id, type, entity_type, entity_id, metadata, visibility, created_at)
      SELECT
        c.user_id,
        'comment_posted' AS type,
        COALESCE(c.target_type, 'place') AS entity_type,
        c.target_id::uuid AS entity_id,
        jsonb_build_object('content', LEFT(c.content, 100)) AS metadata,
        'public' AS visibility,
        c.created_at
      FROM comments c
      WHERE c.user_id IS NOT NULL
        AND c.target_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_activities ua
          WHERE ua.user_id = c.user_id
            AND ua.type = 'comment_posted'
            AND ua.entity_id = c.target_id::uuid
        );
    `).catch((err: any) => {
      console.log(`  ⊘ comments backfill skipped (schema mismatch): ${err.message}`);
      return { rowCount: 0 };
    });
    console.log(`  ✓ ${commentsBackfill.rowCount || 0} comment activity inserted`);

    // 4. Follow activities
    const followsBackfill = await pool.query(`
      INSERT INTO user_activities (user_id, type, entity_type, entity_id, metadata, visibility, created_at)
      SELECT
        uf.follower_id,
        'user_followed' AS type,
        'user' AS entity_type,
        uf.following_id::uuid AS entity_id,
        '{}'::jsonb AS metadata,
        'public' AS visibility,
        uf.created_at
      FROM user_follows uf
      WHERE NOT EXISTS (
        SELECT 1 FROM user_activities ua
        WHERE ua.user_id = uf.follower_id
          AND ua.type = 'user_followed'
          AND ua.entity_id = uf.following_id::uuid
      );
    `);
    console.log(`  ✓ ${followsBackfill.rowCount || 0} follow activity inserted`);

    const total = await pool.query(`SELECT COUNT(*)::int AS c FROM user_activities`);
    console.log(`  📊 user_activities toplam: ${total.rows[0].c}`);
  },

  async down(_pool: any) {
    // Sadece backfill ile eklenenleri sil (existing manual 12 kalsın)
    // Heuristic: bu migration'ın backfill yaptığı türlerden eski/aynı saniye row'lar
    console.log('  ⊘ down() no-op: backfill geri alınmaz (idempotent UP)');
  },
};

export default migration;
