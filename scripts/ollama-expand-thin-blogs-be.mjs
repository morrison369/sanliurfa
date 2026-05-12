#!/usr/bin/env node
/**
 * 2500 karakterin altındaki blog yazılarını Ollama ile genişletir.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_SEO } from './ollama-lib.mjs';
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
const LOCAL_TUNNEL_PORT = 15546;

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT||'77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
  });
}

function countWords(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w).length;
}

async function main() {
  console.log('\n📝 İnce blog yazıları genişletiliyor (< 2500 karakter)...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: posts } = await client.query(`
    SELECT id, title, slug, category, content, excerpt
    FROM app.blog_posts
    WHERE status = 'published' AND length(content) < 2500
    ORDER BY length(content) ASC
  `);

  console.log(`📋 ${posts.length} ince yazı bulundu\n`);
  let ok = 0, fail = 0;

  for (const post of posts) {
    process.stdout.write(`  → [${post.content?.length || 0}c] ${post.title.slice(0, 50)}... `);

    const prompt = `Aşağıdaki Şanlıurfa blog yazısını SEO uyumlu olarak genişlet ve iyileştir.

Mevcut başlık: "${post.title}"
Kategori: ${post.category}
Mevcut içerik:
${post.content}

KURALLAR:
- Mevcut içeriği koru ve üzerine ekle — sil/değiştirme
- 600-750 kelimeye ulaş
- SYSTEM_SEO kurallarına uy: H2 başlıklar, 40 kelime cevap blokları, FAQ bölümü
- Eğer "Sık Sorulan Sorular" yoksa ekle (3-5 soru)
- Şanlıurfa, yerel yerler ve somut bilgiler ekle
- Sadece HTML döndür`;

    try {
      const expanded = await ollamaChat([
        { role: 'system', content: SYSTEM_SEO },
        { role: 'user', content: prompt },
      ]);

      const words = countWords(expanded);
      if (words < 300 || expanded.length < post.content.length) {
        console.log(`✗ yetersiz (${words} kelime, ${expanded.length}c)`);
        fail++;
        await sleep(2000);
        continue;
      }

      const readTime = Math.max(3, Math.round(words / 200));

      await client.query(
        `UPDATE app.blog_posts SET content = $1, read_time_minutes = $2 WHERE id = $3`,
        [expanded, readTime, post.id]
      );

      console.log(`✓ (${words} kelime, ${expanded.length}c, ${readTime} dk)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(3000);
  }

  // Verify
  const { rows: [check] } = await client.query(`
    SELECT COUNT(*) as still_thin FROM app.blog_posts
    WHERE status='published' AND length(content) < 2500
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n✅ ${ok} genişletildi, ${fail} hata`);
  console.log(`📊 Hâlâ ince (< 2500c): ${check.still_thin}`);
}

main().catch(e => { console.error(e); process.exit(1); });
