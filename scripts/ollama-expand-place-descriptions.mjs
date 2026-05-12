#!/usr/bin/env node
/**
 * Açıklaması ince (< 200 karakter) mekanlar için Ollama ile zengin açıklama üretir.
 * Batch: 30 mekan/çalıştırma. Birden fazla çalıştırılabilir.
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
const LOCAL_TUNNEL_PORT = 15547;
const BATCH_SIZE = parseInt(process.argv[2] || '40');

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
  console.log(`\n🏢 Mekan açıklamaları genişletiliyor (batch: ${BATCH_SIZE})...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: places } = await client.query(`
    SELECT id, name, category, address, description, short_description
    FROM app.places
    WHERE status = 'active'
      AND (description IS NULL OR length(description) < 200)
    ORDER BY category, name
    LIMIT $1
  `, [BATCH_SIZE]);

  console.log(`📋 ${places.length} mekan işlenecek\n`);
  let ok = 0, fail = 0;

  for (const place of places) {
    const existing = place.description || place.short_description || '';
    process.stdout.write(`  → [${existing.length}c] ${place.name.slice(0, 45)}... `);

    const addrHint = place.address ? `Adres: ${place.address}.` : '';
    const existingHint = existing.length > 10 ? `Mevcut bilgi: "${existing.slice(0, 100)}"` : '';

    const prompt = `Şanlıurfa'daki "${place.name}" (${place.category}) mekanı için Türkçe açıklama yaz.
${addrHint} ${existingHint}

KURALLAR:
- 200-400 karakter (1-2 kısa paragraf)
- Mekanın ne olduğunu, neden ziyaret edildiğini, öne çıkan özelliklerini belirt
- Şanlıurfa veya ilgili ilçe adını doğal kullan
- Sadece açıklamayı yaz, başlık veya etiket ekleme`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      // Temizle
      desc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Uzunluk kontrolü
      if (desc.length < 80) {
        console.log(`✗ çok kısa (${desc.length}c)`);
        fail++;
        await sleep(2000);
        continue;
      }

      // Max 500c kırp
      if (desc.length > 500) {
        const lastDot = desc.lastIndexOf('.', 500);
        desc = (lastDot > 200 ? desc.slice(0, lastDot + 1) : desc.slice(0, 500)).trim();
      }

      await client.query(
        `UPDATE app.places SET description = $1 WHERE id = $2`,
        [desc, place.id]
      );

      console.log(`✓ (${desc.length}c)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(2000);
  }

  // Stats
  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') as total,
      COUNT(*) FILTER (WHERE status='active' AND length(description) < 200) as still_thin,
      COUNT(*) FILTER (WHERE status='active' AND length(description) >= 200) as good
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n✅ ${ok} açıklama güncellendi, ${fail} hata`);
  console.log(`📊 Toplam: ${stats.total} | İnce (<200c): ${stats.still_thin} | İyi (≥200c): ${stats.good}`);
}

main().catch(e => { console.error(e); process.exit(1); });
