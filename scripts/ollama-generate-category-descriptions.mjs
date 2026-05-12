#!/usr/bin/env node
/**
 * Alt kategori description üret — boş olan 271 alt kategori için.
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
const LOCAL_TUNNEL_PORT = 15504;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!process.env.SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n📂 Alt kategori açıklamaları üretiliyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: cats } = await client.query(`
    SELECT c.id, c.name, c.slug, p.name AS parent
    FROM categories c
    JOIN categories p ON p.id = c.parent_id
    WHERE c.parent_id IS NOT NULL
      AND (c.description IS NULL OR length(c.description) < 20)
    ORDER BY p.name, c.name
  `);

  console.log(`📋 ${cats.length} alt kategori için açıklama üretilecek\n`);

  let ok = 0, fail = 0;

  for (const cat of cats) {
    process.stdout.write(`  → ${cat.parent} > ${cat.name} ... `);

    const prompt = `Şanlıurfa'daki "${cat.name}" (${cat.parent} kategorisi altında) için 1-2 cümle Türkçe açıklama yaz. Bu kategori ne sunar, ziyaretçiye/müşteriye ne kazandırır? Sadece düz metin, 80-150 karakter.`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);
      desc = desc.replace(/[\r\n"]/g, ' ').trim().slice(0, 200);

      await client.query(
        'UPDATE categories SET description = $1 WHERE id = $2',
        [desc, cat.id]
      );
      console.log(`✓ (${desc.length}k)`);
      ok++;
      await sleep(600);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(400);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} güncellendi, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
