#!/usr/bin/env node
/**
 * 200-400 karakter arası etkinlik açıklamalarını 400c+ yapar.
 * Kullanım: node scripts/ollama-expand-event-descriptions-v2.mjs
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
const LOCAL_TUNNEL_PORT = 15547;

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
          keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🎪 Etkinlik açıklamaları genişletiliyor (200-400 → 400c+)...\n');

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

  const { rows: events } = await client.query(`
    SELECT id, title, category, location, description, start_date
    FROM app.events
    WHERE status = 'published'
      AND description IS NOT NULL
      AND length(description) >= 200
      AND length(description) < 400
    ORDER BY start_date ASC
  `);

  console.log(`📋 ${events.length} etkinlik işlenecek (200-400c arası)\n`);
  let ok = 0, fail = 0;

  for (const evt of events) {
    const existing = evt.description || '';
    process.stdout.write(`  → [${existing.length}c] ${evt.title.slice(0, 45)}... `);

    const locationHint = evt.location ? `Mekan: ${evt.location}.` : '';
    const dateHint = evt.start_date ? `Tarih: ${new Date(evt.start_date).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}.` : '';

    const prompt = `Şanlıurfa'da düzenlenen "${evt.title}" (${evt.category}) etkinliğinin mevcut açıklamasını genişlet.

Mevcut açıklama: "${existing}"

${locationHint} ${dateHint}

KURALLAR:
- 400-600 karakter hedefle (2-3 kısa cümle)
- Mevcut bilgiyi koruyarak daha fazla detay ekle
- Etkinliğin önemi, katılımcılar, beklentiler ve Şanlıurfa kültüründeki yeri
- Şanlıurfa'ya özgü bağlam kullan
- Sadece açıklamayı yaz, başlık veya etiket ekleme
- Türkçe yaz`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      desc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (desc.length < 250) {
        console.log(`✗ çok kısa (${desc.length}c)`);
        fail++;
        await sleep(2000);
        continue;
      }

      if (desc.length > 700) {
        const lastDot = desc.lastIndexOf('.', 700);
        desc = (lastDot > 300 ? desc.slice(0, lastDot + 1) : desc.slice(0, 700)).trim();
      }

      await client.query(
        `UPDATE app.events SET description = $1 WHERE id = $2`,
        [desc, evt.id]
      );

      console.log(`✓ ${desc.length}c`);
      ok++;
      await sleep(1500);
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 50)}`);
      fail++;
      await sleep(3000);
    }
  }

  // Final istatistik
  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='published') AS total,
      COUNT(*) FILTER (WHERE status='published' AND length(description) < 200) AS thin,
      COUNT(*) FILTER (WHERE status='published' AND length(description) >= 200 AND length(description) < 400) AS orta,
      COUNT(*) FILTER (WHERE status='published' AND length(description) >= 400) AS iyi
    FROM app.events
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} etkinlik genişletildi | ${fail} başarısız`);
  console.log(`📊 Toplam: ${stats.total} | İnce(<200c): ${stats.thin} | Orta(200-400c): ${stats.orta} | İyi(400c+): ${stats.iyi}`);
}

main().catch(e => { console.error(e); process.exit(1); });
