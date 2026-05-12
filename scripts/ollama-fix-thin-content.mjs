#!/usr/bin/env node
/**
 * İnce içerikli blog yazılarını (< 500 karakter) Ollama ile genişlet.
 * Mevcut yazıların content alanını UPDATE eder, yeni yazı eklemez.
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
const LOCAL_TUNNEL_PORT = 15520;

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
  console.log('\n📝 İnce içerikli blog yazıları Ollama ile genişletiliyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: posts } = await client.query(`
    SELECT id, title, slug, category, category_slug, excerpt
    FROM app.blog_posts
    WHERE status = 'published'
      AND length(content) < 500
    ORDER BY length(content) ASC
  `);

  console.log(`📋 ${posts.length} ince içerikli blog yazısı bulundu\n`);
  let ok = 0, fail = 0;

  for (const post of posts) {
    process.stdout.write(`  → ${post.title.slice(0, 55)} ... `);

    const catInfo = post.category ? `Kategori: ${post.category}.` : '';
    const hintInfo = post.excerpt ? ` Özet ipucu: ${post.excerpt.slice(0, 100)}` : '';

    const prompt = `Şanlıurfa şehir rehberi için kapsamlı Türkçe blog yazısı yaz.
Başlık: "${post.title}"
${catInfo}${hintInfo}
Format: HTML (h2, p, ul, li etiketleri), 700-950 kelime.
Pratik bilgiler, yerel ipuçları, ziyaretçi deneyimi ve öneriler içersin.
Giriş paragrafı dikkat çekici olsun, alt başlıklar konuyu detaylandırsın.`;

    try {
      const content = await ollamaChat([
        { role: 'system', content: SYSTEM_SEO },
        { role: 'user', content: prompt },
      ]);

      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
      const readTime = Math.max(3, Math.round(wordCount / 200));

      await client.query(
        `UPDATE app.blog_posts
         SET content = $1, content_html = $1, read_time_minutes = $2, reading_time = $2
         WHERE id = $3`,
        [content.trim(), readTime, post.id]
      );

      console.log(`✓ (${wordCount} kelime)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }

    await sleep(2500);
  }

  // Sonuç kontrolü
  const { rows: [check] } = await client.query(`
    SELECT COUNT(*) as hala_ince
    FROM app.blog_posts
    WHERE status = 'published' AND length(content) < 500
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Tamamlandı: ${ok} güncellendi, ${fail} hata`);
  console.log(`📊 Hâlâ ince içerikli: ${check.hala_ince}`);
}

main().catch(e => { console.error(e); process.exit(1); });
