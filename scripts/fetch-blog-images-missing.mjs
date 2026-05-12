#!/usr/bin/env node
/**
 * featured_image boş olan bloglar için:
 * 1. Önce local dosya kontrolü (farklı slug varyantları ile)
 * 2. Yoksa Pexels'dan indir + SFTP yükle
 * 3. DB'yi güncelle
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import SftpClient from 'ssh2-sftp-client';
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

const PEXELS_KEY = process.env.PEXELS_KEY;
if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }
if (!process.env.SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const LOCAL_TUNNEL_PORT = 15516;
const PUBLIC_DIR = path.join(projectRoot, 'public', 'uploads', 'blogs');
const DIST_DIR   = path.join(projectRoot, 'dist', 'client', 'uploads', 'blogs');
const REMOTE_DIR = '/home/sanliur/public_html/uploads/blogs';

// Pexels sorguları — slug bazlı
const PEXELS_QUERIES = {
  'bozova-i-lcesi-firat-kiyisinda-sakin-bir-tatil-alternatiifi': 'river dam lake turkey nature',
  'sanliurfa-da-spor-ve-aktif-yasam-kosu-yuruyus-ve-fitness-rehberi': 'running jogging park outdoor fitness',
  'sanliurfa-da-balik-restoranlari-ve-firat-lezzetleri-rehberi': 'grilled fish restaurant river food',
  'sanliurfa-kalesi-tarihi-kale-ve-magaralarin-tam-rehberi': 'ancient fortress castle hill ruins',
  'balikligol-cevresi-yuruyus-rotalari-tarihi-atmosferde-adim-adim': 'sacred fish pool turkey walking',
  'sanliurfa-nin-tarihi-hanllari-ve-kervansaraylari-osmanli-donemi-mirasi': 'historic caravanserai stone arch bazaar',
  'harran-kumbet-evleri-dunyanin-hicbir-yerinde-olmayan-mimari-mucize': 'beehive houses dome mud architecture',
  'sanliurfa-muzleri-tam-rehberi-hangi-muzeye-gitmelisiniz': 'museum ancient artifacts exhibition hall',
  'suruc-gezi-rehberi-tarih-ve-topragin-sehri-suruc-ta-yapilacaklar': 'ancient walls ruins archaeological site',
  'sanliurfa-dan-diyarbakir-a-gunubirlik-tur-rota-ve-pratik-bilgiler': 'ancient city bridge historic turkey',
  'gobeklitepe-nin-yakinindaki-koyler-orencik-te-yerel-hayat': 'rural village countryside turkey traditional',
  'siverek-i-lce-rehberi-sanliurfa-nin-en-buyuk-i-lcesinde-gezi-ve-yasam': 'turkish town market street bazaar',
  'sanliurfa-da-konak-ve-butik-oteller-tarihi-atmosferde-konaklama': 'boutique hotel stone courtyard historic',
  'sanliurfa-da-kahvalti-kulturu-en-i-yi-8-kahvalti-mekani': 'turkish breakfast spread table food',
  'birecik-te-gezilecek-yerler-kelaynak-kusu-ve-firat-kiyisinda-bir-gun': 'river bridge dam wildlife turkey',
  'ceylanpinar-da-gezilecek-yerler-sinir-sehrinin-kesfedilmemis-guzellikleri': 'border town landscape countryside turkey',
  'sanliurfa-da-carsi-kulturu-kapali-carsi-ve-bedesten-in-tarihi': 'covered bazaar market historic trading',
  'sanliurfa-da-dugun-gelenegi-kina-gecesi-mehter-ve-toy-rituelleri': 'turkish wedding celebration traditional folk',
  'halilurrahman-golu-ziyaret-rehberi-kutsal-golun-tam-anlatimi': 'sacred fish pool mosque dome turkey',
  'sanliurfa-da-lahmacun-rehberi-en-i-yi-lahmacun-nerede-yenir': 'flatbread turkish street food traditional',
  'hz-i-brahim-in-i-zinde-sanliurfa-nin-dini-ziyaret-noktalari-rehberi': 'mosque dome turkey pilgrimage sacred',
  'sanliurfa-da-cocuklarla-gezi-aileler-i-cin-en-i-yi-8-aktivite': 'family park playground children outdoor',
  'viransehir-gezi-rehberi-sanliurfa-nin-tarihi-i-lcesinde-ne-yapilir': 'ancient historic ruins town turkey',
  'karakopru-i-lce-rehberi-sanliurfa-nin-modern-yuzu': 'modern neighborhood urban residential turkey',
  'hilvan-i-lcesi-ataturk-baraji-golu-kiyisinda-doga-ve-dinginlik': 'dam lake reservoir nature peaceful',
  'sanliurfa-da-sanat-yerel-sanatcilar-galeriler-ve-el-sanatlari': 'traditional crafts artisan copper metalwork',
  'sanliurfa-da-alisveris-merkezleri-ve-carsi-rehberi-nerede-ne-alinir': 'shopping mall bazaar market modern',
  'akcakale-gezi-rehberi-suriye-sinirindaki-sehirde-1-gunluk-tur': 'desert town border landscape turkey',
  'sanliurfa-da-pilavcilar-ve-pilav-cesitleri-yerel-pirinc-kulturu-rehberi': 'rice pilaf turkish food traditional',
  'sanliurfa-da-instagram-fotograf-cekimi-en-i-yi-lokasyonlar-ve-saatler': 'golden hour photography landscape ancient',
};

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function fetchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  const data = await res.json();
  return data.photos?.[0]?.src?.large2x || data.photos?.[0]?.src?.large || null;
}

async function downloadImage(imageUrl) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Existing files map for fuzzy matching
function buildExistingFilesMap() {
  const files = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.jpg'));
  const map = new Map();
  for (const f of files) {
    const slug = f.replace(/\.jpg$/, '');
    // Normalize: remove dashes around single characters (ı→i, İ→i handling artifacts)
    const normalized = slug.replace(/-([a-z])-/g, '$1').replace(/^([a-z])-/, '$1');
    map.set(slug, f);
    map.set(normalized, f);
  }
  return map;
}

async function main() {
  console.log('\n🖼️  Blog featured_image boş olanlar için görsel işleniyor...\n');

  for (const d of [PUBLIC_DIR, DIST_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓ (DB)\n');

  const dbClient = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await dbClient.connect();

  const { rows: blogs } = await dbClient.query(`
    SELECT id, slug, title FROM blog_posts
    WHERE status='published' AND (featured_image IS NULL OR featured_image='')
    ORDER BY published_at DESC
  `);
  console.log(`📋 ${blogs.length} blog için featured_image işlenecek\n`);

  const sftp = new SftpClient();
  await sftp.connect({
    host: process.env.SSH_HOST,
    port: parseInt(process.env.SSH_PORT),
    username: process.env.SSH_USER,
    password: process.env.SSH_PASS,
  });

  const existingFiles = buildExistingFilesMap();
  let ok = 0, downloaded = 0, fail = 0;

  for (const blog of blogs) {
    const slug = blog.slug;
    const localPath = path.join(PUBLIC_DIR, `${slug}.jpg`);
    const featuredImagePath = `/uploads/blogs/${slug}.jpg`;

    process.stdout.write(`  → ${slug.slice(0, 60)}... `);

    // 1. Exact file exists?
    if (fs.existsSync(localPath)) {
      await dbClient.query('UPDATE blog_posts SET featured_image=$1 WHERE id=$2', [featuredImagePath, blog.id]);
      console.log('✓ (local → DB)');
      ok++;
      continue;
    }

    // 2. Check if a similar file exists (normalize slug comparisons)
    const normalizedSlug = slug.replace(/-([a-z])-/g, '$1').replace(/i-/g, '').replace(/-i-/g, '-');
    let foundFile = null;
    for (const [key, fname] of existingFiles) {
      if (key === slug || key.includes(slug.slice(0, 30))) {
        foundFile = fname;
        break;
      }
    }

    if (foundFile && foundFile !== `${slug}.jpg`) {
      // Copy to correct slug name
      const srcPath = path.join(PUBLIC_DIR, foundFile);
      const buf = fs.readFileSync(srcPath);
      fs.writeFileSync(localPath, buf);
      fs.writeFileSync(path.join(DIST_DIR, `${slug}.jpg`), buf);
      try { await sftp.put(localPath, `${REMOTE_DIR}/${slug}.jpg`); } catch {}
      await dbClient.query('UPDATE blog_posts SET featured_image=$1 WHERE id=$2', [featuredImagePath, blog.id]);
      console.log(`✓ (copy from ${foundFile.slice(0,40)} → DB)`);
      ok++;
      continue;
    }

    // 3. Download from Pexels
    const query = PEXELS_QUERIES[slug] || 'sanliurfa turkey ancient historic landscape';
    try {
      const imageUrl = await fetchPexels(query);
      if (!imageUrl) throw new Error('Pexels sonuç yok');
      const buf = await downloadImage(imageUrl);
      fs.writeFileSync(localPath, buf);
      fs.writeFileSync(path.join(DIST_DIR, `${slug}.jpg`), buf);
      await sftp.put(localPath, `${REMOTE_DIR}/${slug}.jpg`);
      await dbClient.query('UPDATE blog_posts SET featured_image=$1 WHERE id=$2', [featuredImagePath, blog.id]);
      console.log('✓ (Pexels → SFTP → DB)');
      downloaded++;
      await sleep(600);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(400);
    }
  }

  await sftp.end();
  await dbClient.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} local, ${downloaded} yeni Pexels, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
