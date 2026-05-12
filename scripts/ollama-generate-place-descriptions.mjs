#!/usr/bin/env node
/**
 * Açıklaması olmayan mekanlar için Ollama ile Türkçe açıklama üret.
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

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15463;

const DRY = process.argv.includes('--dry-run');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);

// Anlamlı içerik üretilemeyecek kayıtları atla
const SKIP_SLUGS = new Set(['google-haritalar']);

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

function buildPrompt(place) {
  const catInfo = place.category ? `Kategori: ${place.category}.` : '';
  const distInfo = place.district ? `İlçe: ${place.district}.` : '';
  const addrInfo = place.address ? `Adres: ${place.address}.` : '';

  return `"${place.name}" işletmesi için kısa Türkçe tanıtım metni yaz. ${catInfo} ${distInfo} ${addrInfo}
Yaz: 2-3 paragraf HTML açıklama (<p> etiketleri kullan). Ziyaretçilere işletmeyi tanıt, sunduğu hizmetleri ve özelliklerini anlat.
Şanlıurfa'daki konumunu ve yerel önemi varsa belirt. Sadece HTML içeriği yaz, başka açıklama ekleme.`;
}

async function main() {
  console.log('\n🏪  Mekan açıklamaları üretiliyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  const { rows: places } = await client.query(`
    SELECT p.id, p.name, p.slug, p.address,
           c.name AS category,
           d.name AS district
    FROM places p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN districts d ON d.id = p.district_id
    WHERE p.status = 'active'
      AND (p.description IS NULL OR length(p.description) < 50)
    ORDER BY c.name NULLS LAST, p.name
  `);

  console.log(`📋 ${places.length} mekan bulundu\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const place of places) {
    if (SKIP_SLUGS.has(place.slug)) {
      console.log(`  ⊘ ${place.name} — atlandı (anlamsız kayıt)`);
      skip++;
      continue;
    }

    process.stdout.write(`  → ${place.name.slice(0, 55)} ... `);

    try {
      const prompt = buildPrompt(place);
      const description = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      if (DRY) {
        console.log(`\n    [DRY] ${description.slice(0, 80)}...`);
      } else {
        await client.query(
          'UPDATE places SET description = $1 WHERE id = $2',
          [description, place.id]
        );
        console.log(`✓ (${description.length} karakter)`);
      }
      ok++;
      await sleep(1500);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(1000);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} yeni, ${skip} atlandı, ${fail} hata${DRY ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
