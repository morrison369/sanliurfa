#!/usr/bin/env node
/**
 * Ollama API ile boş/kısa mekan açıklamalarını üret ve SSH tünel üzerinden yaz.
 * Kullanım: node scripts/ollama-generate-descriptions.mjs [--limit=20] [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat } from './ollama-lib.mjs';
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
const MODEL     = ollamaCfg.MODEL;

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15442;

const args   = process.argv.slice(2);
const LIMIT  = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '30');
const DRY    = args.includes('--dry-run');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS)      { console.error('SSH_PASS eksik (.env.scripts)'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SYSTEM = `Sen Şanlıurfa.com için çalışan profesyonel bir Türkçe içerik yazarısın.
Şanlıurfa şehri mekanları için kısa, SEO uyumlu ve doğal Türkçe açıklamalar yazıyorsun.
Yalnızca açıklama metnini yaz, başka bir şey ekleme.`;

const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);

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
  process.stdout.write('SSH tünel açılıyor... ');
  const { ssh, server } = await openSshTunnel();
  console.log('✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  const { rows } = await client.query(`
    SELECT p.id, p.name, p.district_id,
      d.name AS district_name,
      c.name AS category_name
    FROM places p
    LEFT JOIN districts d ON d.id = p.district_id
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'active'
      AND (p.short_description IS NULL OR length(p.short_description) < 30)
    ORDER BY p.rating DESC NULLS LAST, p.review_count DESC NULLS LAST
    LIMIT $1
  `, [LIMIT]);

  console.log(`\n📝 ${rows.length} mekan için açıklama üretilecek (model: ${MODEL})\n`);

  let ok = 0, fail = 0;

  for (const place of rows) {
    const prompt = `"${place.name}" adlı ${place.category_name || 'işletme'} için 2-3 cümlelik kısa ve SEO uyumlu açıklama yaz. Mekan Şanlıurfa'nın ${place.district_name || 'merkez'} bölgesinde yer almaktadır. Yalnızca açıklama metnini yaz.`;

    process.stdout.write(`  → ${place.name.slice(0, 40)} ... `);
    try {
      const desc = await ollamaChat([
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ]);

      if (DRY) {
        console.log('\n    [DRY] ' + desc.slice(0, 100) + '...');
      } else {
        await client.query(
          'UPDATE places SET short_description = $1 WHERE id = $2',
          [desc.slice(0, 500), place.id]
        );
        console.log(`✓ (${desc.length} karakter)`);
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
  console.log(`\n✅ Tamamlandı: ${ok} başarılı, ${fail} hata${DRY ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
