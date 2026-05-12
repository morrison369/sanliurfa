#!/usr/bin/env node
/**
 * FAQ bölümü olmayan blog yazılarına Ollama ile SEO/AEO/AIO uyumlu FAQ ekler.
 * FAQPage schema ile uyumlu <h2>+<h3> yapısı kullanılır.
 * AEO/AIO kuralı: FAQPage yapısı AI citation olasılığını %30-36 artırır.
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
const LOCAL_TUNNEL_PORT = 15522;

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
  console.log('\n❓ FAQ bölümü olmayan blog yazılarına FAQ ekleniyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  // FAQ olmayan yayınlanmış blog yazıları
  const { rows: posts } = await client.query(`
    SELECT id, title, slug, category, excerpt, content
    FROM app.blog_posts
    WHERE status = 'published'
      AND content NOT ILIKE '%Sık Sorulan Sorular%'
      AND content NOT ILIKE '%<h2%FAQ%'
      AND content NOT ILIKE '%<h2%Sorular%'
    ORDER BY published_at DESC
  `);

  console.log(`📋 ${posts.length} blog yazısına FAQ eklenecek\n`);
  let ok = 0, fail = 0;

  for (const post of posts) {
    process.stdout.write(`  → ${post.title.slice(0, 55)} ... `);

    const categoryHint = post.category ? `Kategori: ${post.category}.` : '';
    const excerptHint = post.excerpt ? ` Konu özeti: ${post.excerpt.slice(0, 120)}` : '';

    const prompt = `"${post.title}" blog yazısı için Türkçe FAQ (Sık Sorulan Sorular) bölümü oluştur.
${categoryHint}${excerptHint}

ZORUNLU FORMAT (tam olarak bu HTML yapısını kullan, başka hiçbir şey ekleme):
<h2>Sık Sorulan Sorular</h2>
<h3>[Soru 1?]</h3>
<p>[30-50 kelime, doğrudan cevap. AI engines tarafından alıntılanacak — somut, net, bilgi yoğun yaz.]</p>
<h3>[Soru 2?]</h3>
<p>[30-50 kelime cevap]</p>
<h3>[Soru 3?]</h3>
<p>[30-50 kelime cevap]</p>
<h3>[Soru 4?]</h3>
<p>[30-50 kelime cevap]</p>
<h3>[Soru 5?]</h3>
<p>[30-50 kelime cevap]</p>

Sorular gerçek kullanıcı arama sorgularını yansıtsın. Cevaplar somut, tarihli veya rakamlı bilgi içersin.
Sadece HTML çıktısı ver, açıklama ekleme.`;

    try {
      let faq = await ollamaChat([
        { role: 'system', content: SYSTEM_SEO },
        { role: 'user', content: prompt },
      ]);

      faq = faq.trim();

      // Yanıt <h2> ile başlamıyorsa düzelt
      if (!faq.startsWith('<h2>')) {
        const h2idx = faq.indexOf('<h2>');
        if (h2idx > 0) faq = faq.slice(h2idx);
      }

      // Mevcut içeriğe FAQ'yı ekle
      const newContent = post.content + '\n\n' + faq;

      await client.query(
        `UPDATE app.blog_posts SET content = $1, content_html = $1 WHERE id = $2`,
        [newContent, post.id]
      );

      const questionCount = (faq.match(/<h3>/gi) || []).length;
      console.log(`✓ (${questionCount} soru)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }

    await sleep(2500);
  }

  // Kontrol
  const { rows: [check] } = await client.query(`
    SELECT COUNT(*) as hala_faqsiz
    FROM app.blog_posts
    WHERE status = 'published'
      AND content NOT ILIKE '%Sık Sorulan Sorular%'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Tamamlandı: ${ok} FAQ eklendi, ${fail} hata`);
  console.log(`📊 Hâlâ FAQsız: ${check.hala_faqsiz}`);
}

main().catch(e => { console.error(e); process.exit(1); });
