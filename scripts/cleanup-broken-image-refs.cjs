#!/usr/bin/env node
/**
 * Broken cover_image / image_url ref'leri NULL'a çevirir.
 *
 * Bağlam: 2026-05-13 audit'inde tespit edildi — 591 DB row /uploads/{type}/{slug}.webp
 * URL'i tutuyor ama dosya prod'da YOK. Image.astro onerror fallback'i /images/placeholder.jpg'ye
 * yönlendiriyor, fakat 404 round-trip + console error gereksiz.
 *
 * Pre-condition: 2026-05-13 WebP migration tamamlandı (.jpg → .webp DB refs).
 * Pre-existing broken refs (.jpg ile de yok) tespit edildi → NULL temizliği.
 *
 * NOT: Pexels backfill ayrıca yapılacak. Bu script sadece temizlik. Tüm image
 * column'lar nullable=YES (verified).
 *
 * Kullanım (prod): node scripts/cleanup-broken-image-refs.cjs [--dry-run]
 */
const fs = require('fs');
const path = require('path');

const envPath = '/home/sanliur/public_html/.env';
const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
for (const line of lines) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const idx = t.indexOf('=');
  if (idx < 0) continue;
  const k = t.slice(0, idx).trim();
  let v = t.slice(idx + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const DRY_RUN = process.argv.includes('--dry-run');
const UPLOADS = '/home/sanliur/public_html/public/uploads';
const { Client } = require('pg');

(async () => {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const targets = [
    { tbl: 'blog_posts', col: 'cover_image' },
    { tbl: 'places', col: 'image_url' },
    { tbl: 'places', col: 'thumbnail_url' },
    { tbl: 'events', col: 'image_url' },
    { tbl: 'recipes', col: 'cover_image' },
    { tbl: 'historical_sites', col: 'cover_image' },
  ];

  let grandTotal = 0;
  let grandBroken = 0;

  for (const { tbl, col } of targets) {
    const r = await c.query(`SELECT id, ${col} AS url FROM ${tbl} WHERE ${col} LIKE '/uploads/%'`);
    let broken = 0;
    const brokenIds = [];
    for (const row of r.rows) {
      const filepath = UPLOADS + row.url.substring('/uploads'.length);
      if (!fs.existsSync(filepath)) {
        broken++;
        brokenIds.push(row.id);
      }
    }
    grandTotal += r.rows.length;
    grandBroken += broken;
    console.log(`${tbl}.${col}: ${r.rows.length} /uploads refs, ${broken} broken`);

    if (broken > 0 && !DRY_RUN) {
      const u = await c.query(
        `UPDATE ${tbl} SET ${col} = NULL WHERE id = ANY($1::uuid[])`,
        [brokenIds],
      );
      console.log(`  ✓ ${u.rowCount} row NULL'a çevrildi`);
    } else if (DRY_RUN && broken > 0) {
      console.log(`  [dry-run] ${broken} row NULL'a çevrilecek`);
    }
  }

  console.log(`\nTOTAL: ${grandTotal} refs, ${grandBroken} broken (${(grandBroken/grandTotal*100).toFixed(1)}%)`);
  if (DRY_RUN) console.log('Dry-run modu — DB değişmedi. Uygulamak için --dry-run çıkar.');

  await c.end();
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
