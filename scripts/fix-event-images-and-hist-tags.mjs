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

const LOCAL_TUNNEL_PORT = 15538;

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
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({
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

const EVENT_IMAGE_FIXES = [
  { slug: 'sanliurfa-kis-kultur-festivali-2027',              img: '/uploads/events/kultur-festivali.jpg' },
  { slug: 'gobeklitepe-kis-rehberli-tur-2027',                img: '/uploads/events/gobeklitepe-bilim.jpg' },
  { slug: 'nevruz-bahar-kutlamalari-sanliurfa-2027',          img: '/uploads/events/el-sanatlari-pazari.jpg' },
  { slug: 'harran-tarihi-sehir-yuruyusu-2027',                img: '/uploads/events/harran-gezi.jpg' },
  { slug: 'sanliurfa-uluslararasi-fotograf-yarismasi-2027',   img: '/uploads/events/fotograf-sergisi.jpg' },
  { slug: 'balikligol-bahar-kultur-etkinlikleri-2027',        img: '/uploads/events/balikligol-senligi.jpg' },
  { slug: 'urfa-el-sanatlari-tekstil-fuari-2027',             img: '/uploads/events/el-sanatlari-pazari.jpg' },
  { slug: 'sanliurfa-yaz-gastronomi-festivali-2027',          img: '/uploads/events/gastronomi-haftasi.jpg' },
  { slug: 'harran-yaz-geceleri-kultur-2027',                  img: '/uploads/events/harran-antik-tiyatro-2026.jpg' },
  { slug: 'gobeklitepe-kesif-bilim-gunleri-2027',             img: '/uploads/events/gobeklitepe-bilim.jpg' },
  { slug: 'sanliurfa-kultur-rotalari-bisiklet-2027',          img: '/uploads/places/balikligol.jpg' },
  { slug: 'uluslararasi-gobeklitepe-arkeoloji-kongresi-2027', img: '/uploads/events/gobeklitepe-arkeoloji-konferansi-2026.jpg' },
  { slug: 'urfa-hasat-sofra-festivali-2027',                  img: '/uploads/events/gastronomi-haftasi.jpg' },
  { slug: 'sanliurfa-yilsonu-kultur-geceleri-2027',           img: '/uploads/events/kultur-festivali.jpg' },
  { slug: 'kis-yoresel-lezzetler-soleni-2027',                img: '/uploads/events/gastronomi-haftasi.jpg' },
];

const HIST_TAGS = [
  { slug: 'gobeklitepe',                     tags: ['arkeoloji', 'UNESCO', 'tarih', 'göbeklitepe', 'neolitik'] },
  { slug: 'harran-antik-kenti',              tags: ['arkeoloji', 'UNESCO', 'harran', 'antik', 'tarih'] },
  { slug: 'balikligol',                      tags: ['balıklıgöl', 'doğa', 'gezi', 'islamiyet', 'tarihi alan'] },
  { slug: 'halfeti',                         tags: ['halfeti', 'doğa', 'fırat', 'gezi', 'baraj'] },
  { slug: 'sanliurfa-arkeoloji-muzesi',      tags: ['müze', 'arkeoloji', 'tarih', 'koleksiyon'] },
  { slug: 'sanliurfa-mozaik-muzesi',         tags: ['müze', 'mozaik', 'Roma', 'sanat'] },
  { slug: 'halilurrahman-golu',              tags: ['balıklıgöl', 'islamiyet', 'inanç', 'gezi'] },
  { slug: 'hz-ibrahim-dogum-magarasi',       tags: ['inanç turizmi', 'islamiyet', 'mağara', 'tarihi'] },
  { slug: 'sanliurfa-ulu-cami',              tags: ['cami', 'islamiyet', 'Osmanlı', 'mimari'] },
  { slug: 'mevlid-i-halil-camii',            tags: ['cami', 'inanç', 'islamiyet', 'Osmanlı'] },
  { slug: 'bakircilar-carsisi',              tags: ['çarşı', 'el sanatları', 'bakırcılık', 'tarihi'] },
  { slug: 'bediuzzaman-said-nursi-turbesi',  tags: ['türbe', 'inanç', 'islamiyet', 'tarihi'] },
];

async function main() {
  console.log('\n🔧 Event görsel fix + tarihi yer tag ekleme...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  // Fix event images
  console.log('Event image_url düzeltme:');
  let imgOk = 0;
  for (const f of EVENT_IMAGE_FIXES) {
    const { rowCount } = await client.query(
      `UPDATE app.events SET image_url = $1 WHERE slug = $2`,
      [f.img, f.slug]
    );
    console.log(`  ${rowCount > 0 ? '✓' : '—'} ${f.slug}`);
    if (rowCount > 0) imgOk++;
  }

  // Add tags to historical_sites
  console.log('\nTarihi yer tag ekleme:');
  let tagOk = 0;
  for (const h of HIST_TAGS) {
    const { rowCount } = await client.query(
      `UPDATE app.historical_sites SET tags = $1 WHERE slug = $2`,
      [h.tags, h.slug]
    );
    console.log(`  ${rowCount > 0 ? '✓' : '—'} ${h.slug}`);
    if (rowCount > 0) tagOk++;
  }

  // Verify: check events without images
  const { rows: [noImg] } = await client.query(`
    SELECT COUNT(*) as count FROM app.events
    WHERE status='published' AND (image_url IS NULL OR image_url = '')
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${imgOk}/${EVENT_IMAGE_FIXES.length} event image güncellendi`);
  console.log(`✅ ${tagOk}/${HIST_TAGS.length} tarihi yer tag eklendi`);
  console.log(`📊 Görselsiz event: ${noImg.count}`);
}

main().catch(e => { console.error(e); process.exit(1); });
