#!/usr/bin/env node
/**
 * 11 "active" etkinliğin açıklamasını 400c+'ya genişletir ve status='published' yapar.
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
const LOCAL_TUNNEL_PORT = 15567;

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
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🎉 Active etkinlik genişletme + published yapma...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: events } = await client.query(`
    SELECT id, title, description, location, start_date::date AS date
    FROM app.events
    WHERE status = 'active'
    ORDER BY start_date
  `);

  console.log(`📋 ${events.length} etkinlik işlenecek\n`);
  let ok = 0, fail = 0;

  for (const ev of events) {
    const existing = ev.description || '';
    process.stdout.write(`  → [${existing.length}c] ${ev.title.slice(0, 50)}... `);

    const prompt = `Şanlıurfa'daki "${ev.title}" etkinliği için kapsamlı açıklama yaz.

Mevcut kısa açıklama: "${existing}"
Tarih: ${ev.date}
${ev.location ? `Yer: ${ev.location}` : ''}

KURALLAR:
- 400-600 karakter hedefle (3-5 cümle)
- Etkinliğin içeriğini, amacını ve neden katılınması gerektiğini anlat
- Şanlıurfa kültürü/tarihi bağlamını ver
- Türkçe, akıcı, bilgilendirici
- Sadece açıklamayı yaz, başlık veya liste ekleme`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      desc = desc.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      if (desc.length < 300) {
        console.log(`✗ çok kısa (${desc.length}c)`);
        fail++;
        await sleep(1000);
        continue;
      }

      if (desc.length > 700) desc = desc.slice(0, 650).trim() + '...';

      await client.query(
        `UPDATE app.events SET description = $1, status = 'published' WHERE id = $2`,
        [desc, ev.id]
      );

      console.log(`✓ ${desc.length}c → published`);
      ok++;
      await sleep(1500);
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 50)}`);
      fail++;
      await sleep(2000);
    }
  }

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='published') AS total_pub,
      COUNT(*) FILTER (WHERE status='published' AND length(description)<400) AS thin,
      COUNT(*) FILTER (WHERE status='published' AND length(description)>=400) AS iyi,
      COUNT(*) FILTER (WHERE status='published' AND start_date<NOW()) AS gecmis,
      COUNT(*) FILTER (WHERE status='published' AND start_date>=NOW()) AS gelecek
    FROM app.events
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} etkinlik genişletildi+published | ${fail} başarısız`);
  console.log(`📊 Toplam published: ${stats.total_pub} | İnce(<400c): ${stats.thin} | İyi(400c+): ${stats.iyi}`);
  console.log(`   Geçmiş: ${stats.gecmis} | Gelecek: ${stats.gelecek}`);
}

main().catch(e => { console.error(e); process.exit(1); });
