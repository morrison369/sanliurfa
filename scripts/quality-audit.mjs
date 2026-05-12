#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));
const PORT = 15545;

async function main() {
  const ssh = new SshClient();
  const server = net.createServer(sock => {
    ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, st) => { if(err){sock.destroy();return;} sock.pipe(st);st.pipe(sock); });
  });
  await new Promise((res,rej) => {
    server.listen(PORT,'127.0.0.1', () => {
      ssh.on('ready',res).on('error',rej).connect({ host:process.env.SSH_HOST, port:parseInt(process.env.SSH_PORT||'77'), username:process.env.SSH_USER, password:process.env.SSH_PASS });
    });
  });
  const client = new pg.Client({ host:'127.0.0.1', port:PORT, user:process.env.DB_USER, password:process.env.DB_PASS, database:process.env.DB_NAME });
  await client.connect();

  // 1. Blog kategori dağılımı
  const { rows: cats } = await client.query(`
    SELECT category, COUNT(*) as count FROM app.blog_posts
    WHERE status='published' GROUP BY category ORDER BY count ASC
  `);
  console.log('=== BLOG KATEGORİ (az→çok) ===');
  cats.forEach(r => console.log(`  ${r.category}: ${r.count}`));

  // 2. Blog içerik kalitesi - ince içerik (< 2000 karakter HTML)
  const { rows: thinPosts } = await client.query(`
    SELECT title, slug, category, length(content) as clen,
      (content ILIKE '%Sık Sorulan Sorular%') as has_faq
    FROM app.blog_posts
    WHERE status='published' AND length(content) < 2500
    ORDER BY length(content) ASC LIMIT 15
  `);
  console.log(`\n=== İNCE BLOG (< 2500 karakter, ${thinPosts.length} adet) ===`);
  thinPosts.forEach(r => console.log(`  [${r.clen}c] ${r.has_faq?'FAQ✓':'FAQ✗'} ${r.category}: ${r.slug}`));

  // 3. Mekan açıklama kalitesi
  const { rows: [placeQ] } = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE length(description) < 200) as thin_desc,
      COUNT(*) FILTER (WHERE length(description) BETWEEN 200 AND 500) as medium_desc,
      COUNT(*) FILTER (WHERE length(description) > 500) as good_desc,
      COUNT(*) FILTER (WHERE phone IS NULL OR phone = '') as no_phone,
      COUNT(*) FILTER (WHERE meta_description IS NULL OR length(meta_description) < 10) as no_meta_desc
    FROM app.places WHERE status='active'
  `);
  console.log(`\n=== PLACES KALİTE ===`);
  console.log(`  Toplam: ${placeQ.total}`);
  console.log(`  İnce açıklama (<200c): ${placeQ.thin_desc}`);
  console.log(`  Orta açıklama (200-500c): ${placeQ.medium_desc}`);
  console.log(`  İyi açıklama (>500c): ${placeQ.good_desc}`);
  console.log(`  Telefonsuz: ${placeQ.no_phone}`);
  console.log(`  Meta desc eksik: ${placeQ.no_meta_desc}`);

  // 4. Event açıklama kalitesi
  const { rows: [evtQ] } = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE length(description) < 200) as thin_desc,
      COUNT(*) FILTER (WHERE length(description) BETWEEN 200 AND 400) as medium_desc,
      COUNT(*) FILTER (WHERE length(description) > 400) as good_desc
    FROM app.events WHERE status='published'
  `);
  console.log(`\n=== EVENTS KALİTE ===`);
  console.log(`  Toplam: ${evtQ.total}`);
  console.log(`  İnce açıklama (<200c): ${evtQ.thin_desc}`);
  console.log(`  Orta açıklama (200-400c): ${evtQ.medium_desc}`);
  console.log(`  İyi açıklama (>400c): ${evtQ.good_desc}`);

  // 5. Tarihi yer kalitesi
  const { rows: [histQ] } = await client.query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE visiting_hours IS NULL) as no_hours,
      COUNT(*) FILTER (WHERE entrance_fee IS NULL) as no_fee,
      COUNT(*) FILTER (WHERE significance IS NULL OR length(significance) < 100) as thin_sig
    FROM app.historical_sites WHERE status='active'
  `);
  console.log(`\n=== TARİHİ YER KALİTE ===`);
  console.log(`  Toplam: ${histQ.total}`);
  console.log(`  Ziyaret saati eksik: ${histQ.no_hours}`);
  console.log(`  Giriş ücreti eksik: ${histQ.no_fee}`);
  console.log(`  İnce significance: ${histQ.thin_sig}`);

  // 6. Recipe kalitesi
  const { rows: [recQ] } = await client.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE length(description) < 100) as thin_desc,
      COUNT(*) FILTER (WHERE instructions IS NULL OR cardinality(instructions) = 0) as thin_instr
    FROM app.recipes WHERE status='published'
  `);
  console.log(`\n=== RECIPES KALİTE ===`);
  console.log(`  Toplam: ${recQ.total}, İnce: ${recQ.thin_desc}, Talimat eksik: ${recQ.thin_instr}`);

  // 7. Places meta_description örnekleri (eksik olanlar)
  const { rows: noMetaPlaces } = await client.query(`
    SELECT name, category, slug FROM app.places
    WHERE status='active' AND (meta_description IS NULL OR length(meta_description) < 10)
    ORDER BY category, name LIMIT 10
  `);
  if (noMetaPlaces.length > 0) {
    console.log(`\n=== META DESC EKSİK MEKANLAR (ilk 10) ===`);
    noMetaPlaces.forEach(r => console.log(`  [${r.category}] ${r.name} — ${r.slug}`));
  }

  await client.end(); server.close(); ssh.end();
}
main().catch(e => { console.error(e); process.exit(1); });
