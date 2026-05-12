#!/usr/bin/env node
/**
 * 200-500 karakter arası mekan description'larını 500c+ yapar.
 * app.places.description kolonunu günceller.
 * Kullanım: node scripts/ollama-expand-place-desc-v2.mjs [batch_size]
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_TR } from './ollama-lib.mjs';

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

const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;
const LOCAL_TUNNEL_PORT = 15520;
const BATCH_SIZE = parseInt(process.argv[2] || '50');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream);
        stream.pipe(sock);
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
          keepaliveCountMax: 60,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log(`\n🏪 Mekan açıklamaları genişletiliyor (200-500c → 500c+, batch: ${BATCH_SIZE})...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1',
    port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: places } = await client.query(`
    SELECT p.id, p.name, p.address, p.description,
           c.name AS category_name, d.name AS district_name
    FROM app.places p
    LEFT JOIN app.categories c ON c.id = p.category_id
    LEFT JOIN app.districts d ON d.id = p.district_id
    WHERE p.status = 'active'
      AND p.description IS NOT NULL
      AND length(p.description) >= 200
      AND length(p.description) < 500
    ORDER BY length(p.description) ASC
    LIMIT $1
  `, [BATCH_SIZE]);

  console.log(`📋 ${places.length} mekan işlenecek (200-500c arası)\n`);
  let ok = 0, fail = 0;

  for (const place of places) {
    const existing = place.description || '';
    process.stdout.write(`  → [${existing.length}c] ${place.name.slice(0, 40)}... `);

    const catHint = place.category_name ? `Kategori: ${place.category_name}.` : '';
    const distHint = place.district_name ? `İlçe: ${place.district_name}.` : '';

    const prompt = `Şanlıurfa'daki "${place.name}" mekanının mevcut açıklamasını genişlet.

Mevcut açıklama: "${existing}"

${catHint} ${distHint}

KURALLAR:
- 500-700 karakter hedefle (2-3 kısa cümle)
- Mevcut bilgiyi koruyarak daha fazla detay ekle
- Mekanın özellikleri, atmosferi, ziyaretçi deneyimi ve neden tercih edildiği
- Şanlıurfa kültürüyle bağlantı kur
- Sadece açıklamayı yaz, başlık veya etiket ekleme
- Türkçe yaz`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      desc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (desc.length < 300) {
        console.log(`✗ çok kısa (${desc.length}c)`);
        fail++;
        await sleep(1500);
        continue;
      }

      if (desc.length > 800) {
        const lastDot = desc.lastIndexOf('.', 800);
        desc = (lastDot > 400 ? desc.slice(0, lastDot + 1) : desc.slice(0, 800)).trim();
      }

      await client.query(
        `UPDATE app.places SET description = $1 WHERE id = $2`,
        [desc, place.id]
      );

      console.log(`✓ ${desc.length}c`);
      ok++;
      await sleep(1200);
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 50)}`);
      fail++;
      await sleep(3000);
    }
  }

  // Final istatistik
  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND length(description) < 200) AS thin,
      COUNT(*) FILTER (WHERE status='active' AND length(description) >= 200 AND length(description) < 500) AS orta,
      COUNT(*) FILTER (WHERE status='active' AND length(description) >= 500) AS iyi
    FROM app.places
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} mekan genişletildi | ${fail} başarısız`);
  console.log(`📊 Toplam: ${stats.total} | İnce(<200c): ${stats.thin} | Orta(200-500c): ${stats.orta} | İyi(500c+): ${stats.iyi}`);
}

main().catch(e => { console.error(e); process.exit(1); });
