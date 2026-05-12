#!/usr/bin/env node
/**
 * Mırra Kahve blogu retry — Session AI'da Internal Server Error alan tek yazı.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat, SYSTEM_TR } from './ollama-lib.mjs';
const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const cfg = getOllamaConfig();
const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS;
const AUTHOR_ID = '7a2816aa-d85a-481e-aa41-c89380f47d8f';

if (!cfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

function slugify(text) {
  return text.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

async function openTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', 15436, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(15436, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    });
    ssh.on('error', reject);
  });
}

const TITLE = "Şanlıurfa'da Kahve Kültürü: Mırra'dan Türk Kahvesine Rehber";
const PROMPT = `"${TITLE}" başlıklı kapsamlı bir kültür blog yazısı yaz.
Konu: Şanlıurfa'nın kendine özgü kahve geleneği, özellikle mırra (acı Arap kahvesi) kültürü.
Öne çıkan konular: Mırra nedir (dibek kahvesi, baharatlı, acı, küçük fincanda içilir), nasıl yapılır (uzun pişirme süreci, kakule, zencefil), sosyal önemi (misafirperverlik sembolü, düğünlerde), mırra etiket kuralları (fincanı sallama geleneği); Şanlıurfa'da mırra içilebilecek otantik mekanlar ve kahvehaneler; Türk kahvesi ile farklılıkları; ne zaman içilir, ev ziyaretlerinde önemi.
Anahtar kelimeler: Mırra nedir, Şanlıurfa mırra kahvesi, Urfa kahve kültürü, mırra nasıl içilir
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`;

async function main() {
  const slug = slugify(TITLE);
  console.log(`Model: ${cfg.MODEL} → fallback: ${cfg.FALLBACK} → fallback2: ${cfg.FALLBACK2}`);
  process.stdout.write(`Blog üretiliyor: "${TITLE.slice(0, 50)}..."  `);

  const content = await ollamaChat([
    { role: 'system', content: SYSTEM_TR },
    { role: 'user', content: PROMPT },
  ], cfg.MODEL, cfg);

  const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
  const firstP = content.match(/<p>(.*?)<\/p>/s);
  const excerpt = firstP ? firstP[1].replace(/<[^>]+>/g, '').slice(0, 200) : TITLE;
  console.log(`✓ (${wordCount} kelime)`);
  console.log(`Slug: ${slug}`);

  const { ssh, server } = await openTunnel();
  const client = new pg.Client({
    host: '127.0.0.1', port: 15436,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const existing = await client.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    console.log('⊘ Blog zaten var — güncelleniyor...');
    await client.query('UPDATE blog_posts SET content = $1, excerpt = $2 WHERE slug = $3',
      [content, excerpt, slug]);
    console.log('✓ Güncellendi');
  } else {
    const pubDate = new Date(Date.now() - 5 * 86400000);
    pubDate.setHours(10, 0, 0, 0);
    await client.query(
      `INSERT INTO blog_posts (slug, title, content, excerpt, status, category, author_id, published_at, tags, reading_time, featured_image)
       VALUES ($1,$2,$3,$4,'published','yeme-icme',$5,$6,$7,$8,$9)
       ON CONFLICT (slug) DO NOTHING`,
      [slug, TITLE, content, excerpt, AUTHOR_ID, pubDate.toISOString(),
       ['mirra', 'kahve', 'kultur', 'sanliurfa'], Math.ceil(wordCount / 200), `/uploads/blogs/${slug}.jpg`]
    );
    console.log('✓ DB\'ye eklendi');
  }

  await client.end();
  server.close();
  ssh.end();
  console.log('\n✅ Tamamlandı!');
}

main().catch(e => { console.error(e); process.exit(1); });
