#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_PORT = 15624;

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n📊 İçerik Kalite Denetimi\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  // ── MEKANLAR ──
  const places = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'active') AS active,
      COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS no_img,
      COUNT(*) FILTER (WHERE thumbnail_url IS NULL OR thumbnail_url = '') AS no_thumb,
      COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') AS no_phone,
      COUNT(*) FILTER (WHERE description IS NULL OR length(description) < 200) AS thin_desc,
      COUNT(*) FILTER (WHERE short_description IS NULL OR length(short_description) < 80) AS thin_short,
      COUNT(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS no_coords,
      COUNT(*) FILTER (WHERE opening_hours IS NULL OR opening_hours = '') AS no_hours,
      COUNT(*) FILTER (WHERE website IS NULL OR website = '') AS no_website
    FROM places WHERE status = 'active'
  `);
  const p = places.rows[0];
  console.log('── MEKANLAR ──────────────────────────────');
  console.log(`  Toplam aktif    : ${p.total}`);
  console.log(`  Görselsiz       : ${p.no_img}   ${p.no_img > 0 ? '⚠️' : '✓'}`);
  console.log(`  Thumbnail'siz   : ${p.no_thumb} ${p.no_thumb > 0 ? '⚠️' : '✓'}`);
  console.log(`  Telefonsuz      : ${p.no_phone} ${p.no_phone > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce açıklama   : ${p.thin_desc} (<200c) ${p.thin_desc > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce kısa açık. : ${p.thin_short} (<80c) ${p.thin_short > 0 ? '⚠️' : '✓'}`);
  console.log(`  Koordinatsız    : ${p.no_coords} ${p.no_coords > 0 ? '⚠️' : '✓'}`);
  console.log(`  Saatsiz         : ${p.no_hours} ${p.no_hours > 0 ? '⚠️' : '✓'}`);
  console.log(`  Websitesiz      : ${p.no_website} ${p.no_website > 0 ? '-' : '✓'}`);

  // ── TARİFLER ──
  const recipes = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'published') AS published,
      COUNT(*) FILTER (WHERE cover_image IS NULL OR cover_image = '') AS no_img,
      COUNT(*) FILTER (WHERE description IS NULL OR length(description) < 200) AS thin_desc,
      COUNT(*) FILTER (WHERE ingredients IS NULL OR cardinality(ingredients) = 0) AS no_ingr,
      COUNT(*) FILTER (WHERE instructions IS NULL OR cardinality(instructions) = 0) AS no_instr
    FROM recipes WHERE status = 'published'
  `);
  const r = recipes.rows[0];
  console.log('\n── TARİFLER ──────────────────────────────');
  console.log(`  Toplam yayın    : ${r.total}`);
  console.log(`  Görselsiz       : ${r.no_img}   ${r.no_img > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce açıklama   : ${r.thin_desc} (<200c) ${r.thin_desc > 0 ? '⚠️' : '✓'}`);
  console.log(`  Malzemesiz      : ${r.no_ingr}  ${r.no_ingr > 0 ? '⚠️' : '✓'}`);
  console.log(`  Talimatssız     : ${r.no_instr} ${r.no_instr > 0 ? '⚠️' : '✓'}`);

  // ── ETKİNLİKLER ──
  const events = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS no_img,
      COUNT(*) FILTER (WHERE description IS NULL OR length(description) < 300) AS thin_desc,
      COUNT(*) FILTER (WHERE description IS NULL OR length(description) < 200) AS very_thin
    FROM events WHERE status = 'published'
  `);
  const e = events.rows[0];
  console.log('\n── ETKİNLİKLER ───────────────────────────');
  console.log(`  Toplam yayın    : ${e.total}`);
  console.log(`  Görselsiz       : ${e.no_img}   ${e.no_img > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce (<300c)    : ${e.thin_desc} ${e.thin_desc > 0 ? '⚠️' : '✓'}`);
  console.log(`  Çok ince (<200c): ${e.very_thin} ${e.very_thin > 0 ? '⚠️' : '✓'}`);

  // ── TARİHİ YERLER ──
  const sites = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'published') AS published,
      COUNT(*) FILTER (WHERE cover_image IS NULL OR cover_image = '') AS no_img,
      COUNT(*) FILTER (WHERE description IS NULL OR length(description) < 300) AS thin_desc,
      COUNT(*) FILTER (WHERE short_description IS NULL OR length(short_description) < 80) AS thin_short,
      COUNT(*) FILTER (WHERE history IS NULL OR length(history) < 200) AS thin_history,
      COUNT(*) FILTER (WHERE significance IS NULL OR length(significance) < 100) AS thin_sig
    FROM historical_sites WHERE status = 'published'
  `);
  const s = sites.rows[0];
  console.log('\n── TARİHİ YERLER ─────────────────────────');
  console.log(`  Toplam yayın    : ${s.total}`);
  console.log(`  Görselsiz       : ${s.no_img}   ${s.no_img > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce açıklama   : ${s.thin_desc} (<300c) ${s.thin_desc > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce kısa açık. : ${s.thin_short} (<80c) ${s.thin_short > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce tarihçe    : ${s.thin_history} (<200c) ${s.thin_history > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce önemi      : ${s.thin_sig} (<100c) ${s.thin_sig > 0 ? '⚠️' : '✓'}`);

  // ── BLOG ──
  const blog = await db.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'published') AS published,
      COUNT(*) FILTER (WHERE featured_image IS NULL OR featured_image = '') AS no_img,
      COUNT(*) FILTER (WHERE content IS NULL OR length(content) < 500) AS thin_content,
      COUNT(*) FILTER (WHERE meta_description IS NULL OR meta_description = '') AS no_meta,
      COUNT(*) FILTER (WHERE tags IS NULL OR cardinality(tags) = 0) AS no_tags,
      COUNT(*) FILTER (WHERE reading_time IS NULL OR reading_time = 0) AS no_readtime
    FROM blog_posts WHERE status = 'published'
  `);
  const b = blog.rows[0];
  console.log('\n── BLOG ──────────────────────────────────');
  console.log(`  Toplam yayın    : ${b.total}`);
  console.log(`  Görselsiz       : ${b.no_img}   ${b.no_img > 0 ? '⚠️' : '✓'}`);
  console.log(`  İnce içerik     : ${b.thin_content} (<500c) ${b.thin_content > 0 ? '⚠️' : '✓'}`);
  console.log(`  Meta desc yok   : ${b.no_meta} ${b.no_meta > 0 ? '⚠️' : '✓'}`);
  console.log(`  Etiketsiz       : ${b.no_tags} ${b.no_tags > 0 ? '⚠️' : '✓'}`);
  console.log(`  Read time yok   : ${b.no_readtime} ${b.no_readtime > 0 ? '⚠️' : '✓'}`);

  // ── YORUMLAR ──
  const reviews = await db.query(`
    SELECT COUNT(DISTINCT p.id) AS places_without_reviews
    FROM places p
    WHERE p.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.place_id = p.id AND r.status = 'active')
  `);
  console.log('\n── YORUMLAR ──────────────────────────────');
  console.log(`  Yorumsuz mekan  : ${reviews.rows[0].places_without_reviews} ${reviews.rows[0].places_without_reviews > 0 ? '⚠️' : '✓'}`);

  // ── ETKİNLİK DAĞILIMI ──
  const evDist = await db.query(`
    SELECT to_char(start_date, 'YYYY-MM') AS ay, COUNT(*) AS sayi
    FROM events WHERE status = 'published'
    GROUP BY ay ORDER BY ay
  `);
  console.log('\n── ETKİNLİK AYLIK DAĞILIM ────────────────');
  for (const row of evDist.rows) {
    const bar = '█'.repeat(Math.min(Number(row.sayi), 20));
    console.log(`  ${row.ay}: ${String(row.sayi).padStart(3)} ${bar}`);
  }

  await db.end();
  server.close();
  ssh.end();
  console.log('\n');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
