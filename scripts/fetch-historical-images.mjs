#!/usr/bin/env node
/**
 * Tarihi yerler için Pexels + Unsplash görsel indirme ve production upload.
 * Önce Pexels dener, sonra Unsplash. Hem lokal public/uploads/historical/ hem
 * sunucu dist/client/uploads/historical/ klasörüne yazar.
 *
 * Kullanım:
 *   node scripts/fetch-historical-images.mjs           # tüm siteler
 *   node scripts/fetch-historical-images.mjs --force   # mevcutları da güncelle
 */
import fs from 'node:fs';
import https from 'node:https';
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

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_APP_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';
const LOCAL_TUNNEL_PORT = 15573;

const FORCE = process.argv.includes('--force');

// Slug → İngilizce arama terimi (Pexels/Unsplash için İngilizce daha iyi sonuç verir)
const HISTORICAL_SITES = [
  ['bakircilar-carsisi',         'ancient bazaar copper artisan workshop market'],
  ['balikligol',                 'sacred fish pool stone mosque reflection turkey'],
  ['bediuzzaman-said-nursi-turbesi', 'islamic mausoleum dome mosque turkey stone'],
  ['birecik-kalesi',             'medieval hilltop castle fortress stone ruins'],
  ['gobeklitepe',                'gobekli tepe ancient stone pillars archaeological site'],
  ['gumruk-hani',                'historic caravanserai stone courtyard ottoman architecture'],
  ['halfeti-sular-altinda-koy',  'submerged village river boat euphrates halfeti turkey'],
  ['halilurrahman-golu',         'sacred pool fish mosque garden park sanliurfa'],
  ['harran-antik-kenti',         'harran ancient ruins adobe mudbrick archaeological'],
  ['harran-kubbeli-evler',       'harran beehive houses mudbrick dome ancient village'],
  ['hz-ibrahim-dogum-magarasi',  'ancient cave sacred pilgrimage site stone interior'],
  ['kasri-benat-sutunlar',       'roman columns ruins ancient archaeological stone pillar'],
  ['mevlid-i-halil-camii',       'historic mosque courtyard stone minaret islamic'],
  ['rizvaniye-kulliyesi',        'mosque reflecting pool courtyard ottoman stone complex'],
  ['sanliurfa-arkeoloji-muzesi', 'archaeology museum ancient artifacts exhibits hall'],
  ['sanliurfa-kalesi',           'hilltop castle fortress ancient city panorama'],
  ['sanliurfa-mozaik-muzesi',    'roman mosaic museum ancient floor art archaeological'],
  ['sanliurfa-ulu-cami',         'grand mosque courtyard minaret stone ottoman architecture'],
  ['selahaddin-eyyubi-camii',    'historic mosque minaret stone courtyard Islamic'],
  ['sogmatar-antik-kenti',       'ancient moon temple ruins archaeological site stone'],
  // 2026-05-12 placeholder fix batch (19 sites)
  ['ayanlar-hoyugu',                                'ancient tumulus mound archaeological excavation site stone'],
  ['birecik-kelaynak-dogal-yasam-alani',            'bald ibis bird natural reserve river euphrates'],
  ['ceylanpinar-arkeoloji-alani',                   'archaeological site ancient ruins anatolia mesopotamia'],
  ['divan-i-harplerin-yeri-tarihsel-alan',          'historic memorial stone monument ottoman war archive'],
  ['halfeti-sualti-koyleri',                        'submerged village underwater euphrates halfeti boat tour'],
  ['harran-in-tarihi-kervansaraylari',              'historic caravanserai ottoman stone arched courtyard'],
  ['harran-ulu-cami-harabeleri',                    'ancient mosque ruins minaret stone harran islamic'],
  ['hz-eyup-makami',                                'islamic shrine pilgrimage sacred site mosque stone'],
  ['karacadag-volkanik-alani',                      'volcanic landscape basalt rocks anatolia plateau mountains'],
  ['karahantepe-arkeoloji-alani',                   'karahantepe neolithic stone pillars archaeological excavation'],
  ['kurban-hoyuk',                                  'ancient mound tumulus excavation archaeology turkey'],
  ['nevali-cori-arkeoloji-alani',                   'neolithic archaeological site stone t-pillar ancient'],
  ['rumkale',                                       'rumkale medieval fortress cliff river euphrates halfeti'],
  ['sanliurfa-tas-devri-muzesi-gobeklitepe-muzesi', 'stone age museum gobekli tepe artifacts exhibits hall'],
  ['seyyar-bey-camii-ve-kulliyesi',                 'historic mosque complex stone minaret ottoman architecture'],
  ['suayb-sehri-arkeolojik-alani',                  'ancient city ruins prophet stone archaeological cave'],
  ['suruc-kalesi',                                  'medieval castle ruins anatolia stone fortress'],
  ['titris-hoyuk',                                  'ancient tumulus mound bronze age archaeological excavation'],
  ['yaylak-kilisesi-kalintilari',                   'ancient church ruins stone anatolia byzantine'],
];

const LOCAL_DIR = path.join(projectRoot, 'public', 'uploads', 'historical');
const REMOTE_DIR = `${REMOTE_APP_DIR}/dist/client/uploads/historical`;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function apiGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.headers.location) {
        return apiGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => (d += c));
      res.on('end', () => {
        try { resolve(JSON.parse(d)); } catch { reject(new Error('json parse fail')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('request timeout')); });
  });
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = u => {
      https.get(u, res => {
        if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(20000, function() { this.destroy(); reject(new Error('download timeout')); });
    };
    get(url);
  });
}

async function fetchPexels(query) {
  if (!PEXELS_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await apiGet(url, { Authorization: PEXELS_KEY });
  if (!res.photos?.length) return null;
  const p = res.photos[0];
  return { url: p.src.large2x || p.src.large, source: 'pexels', id: p.id };
}

async function fetchUnsplash(query) {
  if (!UNSPLASH_KEY) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await apiGet(url, { Authorization: `Client-ID ${UNSPLASH_KEY}` });
  if (!res.results?.length) return null;
  const p = res.results[0];
  return { url: p.urls.regular, source: 'unsplash', id: p.id };
}

async function getImage(query) {
  try {
    const p = await fetchPexels(query);
    if (p) return p;
  } catch { /* fallback */ }
  try {
    return await fetchUnsplash(query);
  } catch { return null; }
}

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
          host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS,
          keepaliveInterval: 10000, keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

function sftpUpload(ssh, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    ssh.sftp((err, sftp) => {
      if (err) return reject(err);
      const data = fs.readFileSync(localPath);
      const ws = sftp.createWriteStream(remotePath);
      ws.on('close', () => { sftp.end(); resolve(); });
      ws.on('error', err => { sftp.end(); reject(err); });
      ws.end(data);
    });
  });
}

async function main() {
  if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }
  if (!PEXELS_KEY && !UNSPLASH_KEY) { console.error('PEXELS_API_KEY veya UNSPLASH_ACCESS_KEY gerekli'); process.exit(1); }

  console.log(`\n🖼  Tarihi Yer Görselleri — Pexels: ${PEXELS_KEY ? '✓' : '✗'} | Unsplash: ${UNSPLASH_KEY ? '✓' : '✗'} | --force: ${FORCE}\n`);

  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const dbClient = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await dbClient.connect();

  let done = 0, skipped = 0, failed = 0;
  const updates = [];

  for (const [slug, query] of HISTORICAL_SITES) {
    const localPath = path.join(LOCAL_DIR, `${slug}.jpg`);
    const remotePath = `${REMOTE_DIR}/${slug}.jpg`;
    const dbUrl = `/uploads/historical/${slug}.jpg`;

    // Skip if local file exists and not forcing
    if (!FORCE && fs.existsSync(localPath) && fs.statSync(localPath).size > 50000) {
      // Still upload to server if needed
      try {
        await sftpUpload(ssh, localPath, remotePath);
        console.log(`  ↑ server-sync: ${slug}`);
      } catch { /* already there */ }
      skipped++;
      continue;
    }

    try {
      const img = await getImage(query);
      if (!img) {
        console.log(`  ✗ görsel bulunamadı: ${slug}`);
        failed++;
        await sleep(500);
        continue;
      }

      const buf = await downloadBinary(img.url);
      fs.writeFileSync(localPath, buf);

      await sftpUpload(ssh, localPath, remotePath);

      updates.push({ slug, dbUrl });
      console.log(`  ✓ ${slug} [${img.source} #${img.id}] (${Math.round(buf.length / 1024)}KB)`);
      done++;
    } catch (e) {
      console.log(`  ✗ ${slug}: ${e.message.slice(0, 70)}`);
      failed++;
    }

    await sleep(1200);
  }

  // DB güncelle
  if (updates.length > 0) {
    for (const { slug, dbUrl } of updates) {
      await dbClient.query(
        `UPDATE app.historical_sites SET cover_image = $1, updated_at = NOW() WHERE slug = $2`,
        [dbUrl, slug]
      );
    }
    console.log(`\n💾 ${updates.length} DB kaydı güncellendi (cover_image → /uploads/historical/{slug}.jpg)`);
  }

  await dbClient.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Tamamlandı: ${done} yeni görsel, ${skipped} atlandı, ${failed} başarısız`);
}

main().catch(e => { console.error(e); process.exit(1); });
