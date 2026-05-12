#!/usr/bin/env node
/**
 * Kapsamlı kalite audit — tüm içerik eksikliklerini raporlar.
 */
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Client: PgClient } = require('pg');
const { Client: SshClient } = require('ssh2');

const scriptDir = __dirname;
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_TUNNEL_PORT = 15561;

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server })).connect({
        host: process.env.SSH_HOST,
        port: parseInt(process.env.SSH_PORT || '77'),
        username: process.env.SSH_USER,
        password: process.env.SSH_PASS,
        keepaliveInterval: 10000,
      });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  const { ssh, server } = await openSshTunnel();
  const client = new PgClient({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  console.log('\n══════════════════════════════════════════════');
  console.log('  KALİTE AUDIT v2 — ' + new Date().toLocaleDateString('tr-TR'));
  console.log('══════════════════════════════════════════════\n');

  // 1. MEKANLAR
  const { rows: [p] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND (description IS NULL OR description='')) AS no_desc,
      COUNT(*) FILTER (WHERE status='active' AND length(description) < 200) AS thin_desc,
      COUNT(*) FILTER (WHERE status='active' AND length(description) BETWEEN 200 AND 499) AS orta_desc,
      COUNT(*) FILTER (WHERE status='active' AND length(description) >= 500) AS iyi_desc,
      COUNT(*) FILTER (WHERE status='active' AND (short_description IS NULL OR short_description='')) AS no_short,
      COUNT(*) FILTER (WHERE status='active' AND length(short_description) < 100) AS thin_short,
      COUNT(*) FILTER (WHERE status='active' AND length(short_description) BETWEEN 100 AND 149) AS orta_short,
      COUNT(*) FILTER (WHERE status='active' AND length(short_description) >= 150) AS iyi_short,
      COUNT(*) FILTER (WHERE status='active' AND (phone IS NULL OR phone='')) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND (address IS NULL OR address='')) AS no_address,
      COUNT(*) FILTER (WHERE status='active' AND (image_url IS NULL OR image_url='')) AS no_image,
      COUNT(*) FILTER (WHERE status='active' AND (meta_description IS NULL OR meta_description='')) AS no_meta_desc
    FROM app.places
  `);

  const pIcon = (v) => Number(v) === 0 ? '✅' : '⚠️';
  console.log('📍 MEKANLAR');
  console.log(`  Toplam aktif: ${p.total}`);
  console.log(`  Description → İnce(<200c): ${p.thin_desc} ${pIcon(p.thin_desc)} | Orta(200-499c): ${p.orta_desc} | İyi(500c+): ${p.iyi_desc}`);
  console.log(`  Short Desc  → Yok: ${p.no_short} ${pIcon(p.no_short)} | İnce(<100c): ${p.thin_short} ${pIcon(p.thin_short)} | Orta(100-149c): ${p.orta_short} | İyi(150c+): ${p.iyi_short}`);
  console.log(`  Telefon yok: ${p.no_phone} ${Number(p.no_phone) > 0 ? '⚠️' : '✅'}`);
  console.log(`  Adres yok:   ${p.no_address} ${pIcon(p.no_address)}`);
  console.log(`  Görsel yok:  ${p.no_image} ${pIcon(p.no_image)}`);
  console.log(`  Meta desc yok: ${p.no_meta_desc} ${pIcon(p.no_meta_desc)}`);

  // 2. ETKİNLİKLER
  const { rows: [e] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND length(description) < 200) AS thin,
      COUNT(*) FILTER (WHERE status='active' AND length(description) BETWEEN 200 AND 399) AS orta,
      COUNT(*) FILTER (WHERE status='active' AND length(description) >= 400) AS iyi,
      COUNT(*) FILTER (WHERE status='active' AND (image_url IS NULL OR image_url='')) AS no_image,
      COUNT(*) FILTER (WHERE status='active' AND start_date < NOW()) AS gecmis
    FROM app.events
  `);
  console.log('\n🎉 ETKİNLİKLER');
  console.log(`  Toplam aktif: ${e.total} (geçmiş tarihli: ${e.gecmis})`);
  console.log(`  Description → İnce(<200c): ${e.thin} ${pIcon(e.thin)} | Orta(200-399c): ${e.orta} | İyi(400c+): ${e.iyi}`);
  console.log(`  Görsel yok:  ${e.no_image} ${pIcon(e.no_image)}`);

  // 3. BLOG
  const { rows: [b] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='published') AS total,
      COUNT(*) FILTER (WHERE status='published' AND (tags IS NULL OR tags='{}' OR array_length(tags,1) IS NULL)) AS no_tags,
      COUNT(*) FILTER (WHERE status='published' AND (meta_title IS NULL OR meta_title='')) AS no_mt,
      COUNT(*) FILTER (WHERE status='published' AND (meta_description IS NULL OR meta_description='')) AS no_md,
      COUNT(*) FILTER (WHERE status='published' AND (featured_image IS NULL OR featured_image='')) AS no_img,
      COUNT(*) FILTER (WHERE status='published' AND length(content) < 1000) AS thin_content
    FROM blog_posts
  `);
  console.log('\n📝 BLOG');
  console.log(`  Toplam: ${b.total}`);
  console.log(`  Etiketsiz: ${b.no_tags} ${pIcon(b.no_tags)} | Meta title yok: ${b.no_mt} ${pIcon(b.no_mt)} | Meta desc yok: ${b.no_md} ${pIcon(b.no_md)}`);
  console.log(`  Görselsiz: ${b.no_img} ${pIcon(b.no_img)} | İnce içerik(<1000c): ${b.thin_content} ${pIcon(b.thin_content)}`);

  // 4. TARİHİ YERLER
  const { rows: [h] } = await client.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE visiting_hours IS NULL OR visiting_hours='') AS no_hours,
      COUNT(*) FILTER (WHERE entrance_fee IS NULL OR entrance_fee='') AS no_fee,
      COUNT(*) FILTER (WHERE significance IS NULL OR significance='') AS no_sig,
      COUNT(*) FILTER (WHERE length(description) < 200) AS thin_desc
    FROM app.historical_sites
  `);
  console.log('\n🏛️  TARİHİ YERLER');
  console.log(`  Toplam: ${h.total}`);
  console.log(`  Ziyaret saati yok: ${h.no_hours} ${pIcon(h.no_hours)} | Giriş ücreti yok: ${h.no_fee} ${pIcon(h.no_fee)}`);
  console.log(`  Significance yok: ${h.no_sig} ${pIcon(h.no_sig)} | İnce desc: ${h.thin_desc} ${pIcon(h.thin_desc)}`);

  // 5. BLOG KATEGORİ DAĞILIMI
  const { rows: cats } = await client.query(`
    SELECT category_slug, COUNT(*) AS cnt
    FROM blog_posts WHERE status='published'
    GROUP BY category_slug ORDER BY cnt ASC LIMIT 8
  `);
  console.log('\n📂 BLOG KATEGORİ (en az yazılı 8)');
  for (const c of cats) {
    const icon = Number(c.cnt) < 10 ? '⚠️' : '✅';
    console.log(`  ${icon} ${c.category_slug}: ${c.cnt}`);
  }

  // 6. YORUMLAR
  const { rows: [r] } = await client.query(`
    SELECT
      COUNT(DISTINCT p.id) FILTER (WHERE p.status='active') AS total_places,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status='active' AND r.id IS NULL) AS no_review_places,
      COUNT(r.id) AS total_reviews,
      ROUND(AVG(r.rating)::numeric, 2) AS avg_rating
    FROM app.places p
    LEFT JOIN app.reviews r ON r.place_id = p.id AND r.status='active'
  `);
  console.log('\n⭐ YORUMLAR');
  console.log(`  Toplam yorum: ${r.total_reviews} | Ortalama: ${r.avg_rating}`);
  console.log(`  Yorumsuz mekan: ${r.no_review_places} ${pIcon(r.no_review_places)}`);

  // 7. TARİFLER
  const { rows: [rec] } = await client.query(`
    SELECT COUNT(*) AS total,
      COUNT(*) FILTER (WHERE length(content) < 200) AS thin,
      COUNT(*) FILTER (WHERE image_url IS NULL OR image_url='') AS no_img
    FROM recipes WHERE status='published'
  `);
  console.log('\n🍽️  TARİFLER');
  console.log(`  Toplam: ${rec.total} | İnce(<200c): ${rec.thin} ${pIcon(rec.thin)} | Görselsiz: ${rec.no_img} ${pIcon(rec.no_img)}`);

  console.log('\n══════════════════════════════════════════════\n');

  await client.end();
  server.close();
  ssh.end();
}

main().catch(e => { console.error(e); process.exit(1); });
