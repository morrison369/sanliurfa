#!/usr/bin/env node
/**
 * meta_title eksik blog yazılarına Ollama ile SEO başlığı ekler.
 * Hedef: 50-60 karakter, Türkçe, anahtar kelime içeren, tıklanabilir.
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
const LOCAL_TUNNEL_PORT = 15524;

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
  console.log('\n🏷️  meta_title eksik blog yazılarına SEO başlığı ekleniyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: posts } = await client.query(`
    SELECT id, title, category, excerpt
    FROM app.blog_posts
    WHERE status = 'published'
      AND (meta_title IS NULL OR length(meta_title) < 10)
    ORDER BY published_at DESC
  `);

  console.log(`📋 ${posts.length} blog yazısına meta_title eklenecek\n`);
  let ok = 0, fail = 0;

  for (const post of posts) {
    process.stdout.write(`  → ${post.title.slice(0, 55)} ... `);

    const catHint = post.category ? `Kategori: ${post.category}.` : '';
    const excerptHint = post.excerpt ? ` Özet: ${post.excerpt.slice(0, 100)}` : '';

    const prompt = `Blog yazısı için SEO meta başlığı yaz.
Yazı başlığı: "${post.title}"
${catHint}${excerptHint}

KURALLAR:
- Tam olarak 50-60 karakter arası (boşluklar dahil)
- Türkçe, merak uyandıran, tıklamaya teşvik eden
- Mümkünse "Şanlıurfa" veya önemli anahtar kelimeyi içer
- Nokta veya özel karakter ile BİTME
- Sadece başlık metnini yaz, açıklama ekleme, tırnak işareti kullanma`;

    try {
      let metaTitle = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      // Temizle: satır sonları, tırnak, fazla boşluk
      metaTitle = metaTitle.replace(/[\r\n"']/g, ' ').replace(/\s+/g, ' ').trim();

      // 60 karakteri aşarsa kırp (kelime sınırında)
      if (metaTitle.length > 60) {
        const truncated = metaTitle.slice(0, 57);
        const lastSpace = truncated.lastIndexOf(' ');
        metaTitle = (lastSpace > 40 ? truncated.slice(0, lastSpace) : truncated.slice(0, 57)).trim();
      }

      // Çok kısaysa ham başlığı kullan (ilk 60 karakter)
      if (metaTitle.length < 20) {
        metaTitle = post.title.slice(0, 60).trim();
      }

      await client.query(
        `UPDATE app.blog_posts SET meta_title = $1, seo_title = $1 WHERE id = $2`,
        [metaTitle, post.id]
      );

      console.log(`✓ (${metaTitle.length} k)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }

    await sleep(2000);
  }

  // Kontrol
  const { rows: [check] } = await client.query(`
    SELECT COUNT(*) as hala_basliksiz
    FROM app.blog_posts
    WHERE status = 'published'
      AND (meta_title IS NULL OR length(meta_title) < 10)
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Tamamlandı: ${ok} meta_title eklendi, ${fail} hata`);
  console.log(`📊 Hâlâ başlıksız: ${check.hala_basliksiz}`);
}

main().catch(e => { console.error(e); process.exit(1); });
