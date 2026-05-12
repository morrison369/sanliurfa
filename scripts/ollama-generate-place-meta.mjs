#!/usr/bin/env node
/**
 * Mekan meta_description üret — tüm aktif mekanlar için SEO özeti.
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

const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const DB_USER  = process.env.DB_USER;
const DB_NAME  = process.env.DB_NAME;
const DB_PASS  = process.env.DB_PASS;
const LOCAL_TUNNEL_PORT = 15492;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

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
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🔍 Mekan meta_description üretimi başlatılıyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  const { rows: places } = await client.query(`
    SELECT p.id, p.name, p.address, p.short_description,
           c.name AS category,
           d.name AS district
    FROM places p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN districts d ON d.id = p.district_id
    WHERE p.status = 'active'
      AND (p.meta_description IS NULL OR length(p.meta_description) < 30)
    ORDER BY c.name NULLS LAST, p.name
  `);

  console.log(`📋 ${places.length} mekan için meta_description üretilecek\n`);

  let ok = 0, fail = 0;

  for (const place of places) {
    process.stdout.write(`  → ${place.name.slice(0, 50)} ... `);

    const catInfo = place.category ? place.category : 'işletme';
    const distInfo = place.district ? `, ${place.district} ilçesi` : '';
    const shortHint = place.short_description ? ` ${place.short_description.slice(0, 80)}` : '';

    const prompt = `Şanlıurfa${distInfo}'nda "${place.name}" (${catInfo}) için 1-2 cümle SEO meta açıklaması yaz.${shortHint}
140-160 karakter arası Türkçe metin. "Şanlıurfa" kelimesini içer. Sadece metni yaz.`;

    try {
      let meta = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);
      meta = meta.replace(/[\r\n"]/g, ' ').trim().slice(0, 160);

      await client.query(
        'UPDATE places SET meta_description = $1 WHERE id = $2',
        [meta, place.id]
      );
      console.log(`✓ (${meta.length}k)`);
      ok++;
      await sleep(700);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(500);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} güncellendi, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
