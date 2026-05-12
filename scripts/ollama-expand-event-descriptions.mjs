#!/usr/bin/env node
/**
 * Açıklaması ince (< 200 karakter) etkinlikler için Ollama ile zengin açıklama üretir.
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
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;
const LOCAL_TUNNEL_PORT = 15548;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT||'77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🎪 Etkinlik açıklamaları genişletiliyor (< 200 karakter)...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: events } = await client.query(`
    SELECT id, title, category, location, description
    FROM app.events
    WHERE status = 'published'
      AND (description IS NULL OR length(description) < 200)
    ORDER BY start_date ASC
  `);

  console.log(`📋 ${events.length} etkinlik işlenecek\n`);
  let ok = 0, fail = 0;

  for (const evt of events) {
    const existing = evt.description || '';
    process.stdout.write(`  → [${existing.length}c] ${evt.title.slice(0, 45)}... `);

    const locationHint = evt.location ? `Mekan: ${evt.location}.` : '';
    const existingHint = existing.length > 10 ? `Mevcut bilgi: "${existing.slice(0, 100)}"` : '';

    const prompt = `Şanlıurfa'da düzenlenen "${evt.title}" (${evt.category}) etkinliği için Türkçe açıklama yaz.
${locationHint} ${existingHint}

KURALLAR:
- 200-350 karakter (1-2 kısa cümle)
- Etkinliğin ne olduğunu, ne zaman/nerede düzenlendiğini ve neden önemli olduğunu belirt
- Şanlıurfa'ya özgü kültürel bağlam ekle
- Sadece açıklamayı yaz, başlık veya etiket ekleme`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      desc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (desc.length < 80) {
        console.log(`✗ çok kısa (${desc.length}c)`);
        fail++;
        await sleep(2000);
        continue;
      }

      if (desc.length > 450) {
        const lastDot = desc.lastIndexOf('.', 450);
        desc = (lastDot > 150 ? desc.slice(0, lastDot + 1) : desc.slice(0, 450)).trim();
      }

      await client.query(
        `UPDATE app.events SET description = $1 WHERE id = $2`,
        [desc, evt.id]
      );

      console.log(`✓ (${desc.length}c)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(2000);
  }

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='published') as total,
      COUNT(*) FILTER (WHERE status='published' AND (description IS NULL OR length(description) < 200)) as still_thin,
      COUNT(*) FILTER (WHERE status='published' AND length(description) >= 200) as good
    FROM app.events
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n✅ ${ok} açıklama güncellendi, ${fail} hata`);
  console.log(`📊 Toplam: ${stats.total} | İnce (<200c): ${stats.still_thin} | İyi (≥200c): ${stats.good}`);
}

main().catch(e => { console.error(e); process.exit(1); });
