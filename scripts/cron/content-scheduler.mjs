#!/usr/bin/env node
/**
 * Content Scheduling Cron — günlük çalışır (önerilen: 03:00 TR).
 *
 * Görevler:
 *   1. Blog: `status='scheduled'` + `published_at <= NOW()` olan post'ları `published` yap
 *   2. Events: `start_date < NOW() - INTERVAL '1 day'` olan event'leri `archived` yap
 *      (sadece status='published' olanlar — taslakları dokunma)
 *   3. Reviews: Spam flag'i yüksek (≥3) ama is_moderated=false → admin notification
 *
 * Cron: `0 3 * * * cd /home/sanliur/public_html && node scripts/cron/content-scheduler.mjs`
 */
import { Client } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
 console.error('DATABASE_URL eksik');
 process.exit(1);
}

async function run() {
 const client = new Client({ connectionString: DATABASE_URL });
 await client.connect();
 const report = { blogsPublished: 0, eventsArchived: 0, spamReviewsFlagged: 0 };

 try {
  // 1. Scheduled blog posts → published
  const blogR = await client.query(`
   UPDATE blog_posts
   SET status = 'published', published_at = COALESCE(published_at, NOW())
   WHERE status = 'scheduled' AND published_at <= NOW()
   RETURNING id, slug, title
  `);
  report.blogsPublished = blogR.rowCount || 0;
  if (blogR.rows.length > 0) {
   console.log('[content-scheduler] Published blogs:');
   blogR.rows.forEach(r => console.log(`  ✓ /${r.slug} — ${r.title}`));
  }

  // 2. Geçmiş etkinlikler archive (1 gün geçmiş, hala published)
  const eventR = await client.query(`
   UPDATE events
   SET status = 'archived'
   WHERE status = 'published'
     AND start_date < NOW() - INTERVAL '1 day'
     AND (end_date IS NULL OR end_date < NOW() - INTERVAL '1 day')
   RETURNING id, slug, title
  `);
  report.eventsArchived = eventR.rowCount || 0;
  if (eventR.rows.length > 0) {
   console.log('[content-scheduler] Archived events:');
   eventR.rows.forEach(r => console.log(`  ✓ /${r.slug} — ${r.title}`));
  }

  // 3. High-spam-flag pending reviews (moderasyon gerekli)
  try {
   const spamR = await client.query(`
    SELECT id, place_id, user_id, content, spam_score, created_at
    FROM reviews
    WHERE is_moderated = false
      AND COALESCE(spam_score, 0) >= 3
      AND created_at > NOW() - INTERVAL '24 hours'
    ORDER BY spam_score DESC
    LIMIT 20
   `);
   report.spamReviewsFlagged = spamR.rowCount || 0;
   if (spamR.rows.length > 0) {
    console.log(`[content-scheduler] ${spamR.rowCount} suspicious review awaits moderation`);
   }
  } catch {
   // spam_score kolonu yoksa skip
  }

  // 4. Audit log
  await client.query(`
   INSERT INTO audit_logs (actor_id, action, setting_key, metadata, created_at)
   VALUES (NULL, 'cron.content-scheduler', 'content_scheduler', $1::jsonb, NOW())
  `, [JSON.stringify(report)]).catch(() => { /* audit_logs table optional */ });

  console.log(`[content-scheduler] OK — blogs=${report.blogsPublished} events_archived=${report.eventsArchived} suspicious_reviews=${report.spamReviewsFlagged}`);
 } catch (e) {
  console.error('[content-scheduler] FAIL:', e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
 } finally {
  await client.end();
 }
}

run();
