#!/usr/bin/env node
/**
 * Removes phones with non-Şanlıurfa area codes.
 * Valid: +90414... (Şanlıurfa landline) or +905xx... (mobile, portable)
 * Invalid: Istanbul (+90212/+90216), Ankara (+90312), İzmir (+90232),
 *          Antalya (+90242), Adana (+90322/+90324), Tekirdağ (+90284),
 *          Nevşehir (+90384/+90388), Bursa (+90224), etc.
 *
 * Approach: keep +90414, +905xx, +90416, +90419, and unknown formats.
 * Remove known wrong-city landline prefixes.
 */
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

const LOCAL_TUNNEL_PORT = 15557;

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
          keepaliveInterval: 10000, keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

// Şanlıurfa area code: 0414
// Mobile numbers start with 05xx → +9050x, +9053x, +9054x, +9055x, +9056x
// Also keep: +90416, +90419 (nearby provinces if any)
// Remove: all other Turkish landline codes that are clearly wrong cities
// Also remove: any non-Turkish country code (+30 Greece, +1 USA, etc.)
const FOREIGN_COUNTRY_CODE_RE = /^\+(?!90)/; // starts with + but NOT +90

const WRONG_CITY_PATTERNS = [
  // Istanbul
  /^\+90212/, /^\+90216/, /^\+90217/, /^\+90218/, /^\+90219/,
  // Ankara
  /^\+90312/, /^\+90313/,
  // İzmir
  /^\+90232/,
  // Antalya
  /^\+90242/,
  // Adana
  /^\+90322/, /^\+90323/, /^\+90324/,
  // Tekirdağ
  /^\+90282/, /^\+90284/,
  // Nevşehir / Kayseri
  /^\+90352/, /^\+90384/, /^\+90388/,
  // Bursa
  /^\+90224/,
  // Konya
  /^\+90332/,
  // Gaziantep
  /^\+90342/,
  // Diyarbakır
  /^\+90412/,
  // Mersin
  /^\+90324/,
  // Hatay
  /^\+90326/,
  // Malatya
  /^\+90422/,
  // Elazığ
  /^\+90424/,
  // Trabzon
  /^\+90462/,
  // Samsun
  /^\+90362/,
  // Erzurum
  /^\+90442/,
  // Van
  /^\+90432/,
  // Mardin
  /^\+90482/,
  // Siirt
  /^\+90484/,
  // Batman
  /^\+90488/,
  // Batman (other)
  /^\+9048[0-9]/,
  // Bad format (too short like 023217012 → missing +90)
  /^0232/,
  /^0212/,
  /^0242/,
  /^0312/,
  /^0322/,
  /^0332/,
  /^0342/,
  /^0412/,
  /^0224/,
  /^0352/,
  /^0384/,
  /^0388/,
];

function isWrongCityPhone(phone) {
  if (!phone) return false;
  if (FOREIGN_COUNTRY_CODE_RE.test(phone)) return true; // non-Turkish country code
  return WRONG_CITY_PATTERNS.some(re => re.test(phone));
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

async function main() {
  console.log(`\n🧹 Yanlış şehir telefon temizleme${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: all } = await client.query(
    `SELECT slug, name, phone FROM app.places WHERE status='active' AND phone IS NOT NULL AND phone != '' ORDER BY name`
  );

  const wrongOnes = all.filter(r => isWrongCityPhone(r.phone));

  console.log(`📋 Toplam telefonlu: ${all.length} | Yanlış şehir: ${wrongOnes.length}\n`);

  for (const r of wrongOnes) {
    console.log(`  ❌ ${r.name} [${r.slug}] → ${r.phone}`);
    if (!DRY_RUN) {
      await client.query(
        `UPDATE app.places SET phone = NULL, updated_at = NOW() WHERE slug = $1`,
        [r.slug]
      );
    }
  }

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND (phone IS NULL OR phone = '')) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NOT NULL AND phone != '') AS has_phone
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n${DRY_RUN ? '(dry-run)' : '✅'} ${wrongOnes.length} yanlış şehir telefonu${DRY_RUN ? ' tespit edildi' : ' silindi'}`);
  console.log(`📊 Toplam: ${stats.total} | Telefonlu: ${stats.has_phone} | Telefonsuz: ${stats.no_phone}`);
}

main().catch(e => { console.error(e); process.exit(1); });
