#!/usr/bin/env node
/**
 * description eksik olan aktif mekanlar için HTML açıklama üret.
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
const LOCAL_TUNNEL_PORT = 15512;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!process.env.SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n📝 Mekan description üretimi başlatılıyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: places } = await client.query(`
    SELECT p.id, p.name, p.slug, p.address, p.short_description,
           c.name AS category, d.name AS district
    FROM places p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN districts d ON d.id = p.district_id
    WHERE p.status = 'active'
      AND (p.description IS NULL OR length(p.description) < 80)
    ORDER BY c.name NULLS LAST, p.name
  `);

  console.log(`📋 ${places.length} mekan için description üretilecek\n`);
  let ok = 0, fail = 0;

  for (const place of places) {
    if (SKIP_SLUGS.has(place.slug)) { console.log(`  ⊘ ${place.name} — atlandı`); continue; }
    process.stdout.write(`  → ${place.name.slice(0, 50)} ... `);

    const catInfo = place.category ? `Kategori: ${place.category}.` : '';
    const distInfo = place.district ? ` ${place.district} ilçesinde.` : '';
    const addrInfo = place.address ? ` Adres: ${place.address}.` : '';
    const hint = place.short_description ? ` ${place.short_description.slice(0, 80)}` : '';

    const prompt = `"${place.name}" işletmesi için Türkçe tanıtım metni yaz. ${catInfo}${distInfo}${addrInfo}${hint}
2-3 paragraf HTML (<p> etiketi ile). Şanlıurfa'daki konumunu, sunduğu hizmetleri ve özelliklerini anlat.`;

    try {
      let desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);
      desc = desc.trim();
      if (!desc.includes('<p>')) desc = `<p>${desc}</p>`;

      await client.query('UPDATE places SET description = $1 WHERE id = $2', [desc, place.id]);
      console.log(`✓ (${desc.length}k)`);
      ok++;
      await sleep(800);
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
