#!/usr/bin/env node
/**
 * Ollama API ile keyword-hedefli blog yazıları üret ve DB'ye kaydet.
 * Kullanım: node scripts/ollama-generate-blog-posts.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import crypto from 'node:crypto';
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

const ollamaCfg   = getOllamaConfig();
const MODEL       = ollamaCfg.MODEL;
const AUTHOR_ID   = '7a2816aa-d85a-481e-aa41-c89380f47d8f';
const SSH_HOST    = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT    = parseInt(process.env.SSH_PORT || '77');
const SSH_USER    = process.env.SSH_USER || 'sanliur';
const SSH_PASS    = process.env.SSH_PASS || '';
const DB_USER     = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME     = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS     = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15434;

const DRY = process.argv.includes('--dry-run');

if (ollamaCfg.IS_CLOUD && !ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS)      { console.error('SSH_PASS eksik (.env.scripts)'); process.exit(1); }

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

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);

// Blog yazısı üretilecek keyword listesi
const BLOG_TOPICS = [
  {
    title: 'Siverek Gezi Rehberi: Tarihi ve Doğal Güzellikler',
    keywords: ['Siverek gezilecek yerler', 'Siverek tarihi', 'Siverek gezi'],
    district: 'Siverek',
    category: 'gezi-rehberi',
    tags: ['siverek', 'gezi-rehberi', 'sanliurfa-ilceleri'],
  },
  {
    title: 'Birecik Gezi Rehberi: Fırat Kıyısında Eşsiz Bir İlçe',
    keywords: ['Birecik gezilecek yerler', 'Birecik Fırat', 'Birecik tekne'],
    district: 'Birecik',
    category: 'gezi-rehberi',
    tags: ['birecik', 'firat', 'gezi-rehberi'],
  },
  {
    title: 'Viranşehir Gezi Rehberi: Tarih ve Kültür',
    keywords: ['Viranşehir gezilecek yerler', 'Viranşehir tarihi', 'Constantina antik kenti'],
    district: 'Viranşehir',
    category: 'gezi-rehberi',
    tags: ['viransehir', 'antik-sehir', 'gezi-rehberi'],
  },
  {
    title: 'Suruç Gezi Rehberi: Tarihi Dokunuşlar ve Yerel Lezzetler',
    keywords: ['Suruç gezilecek yerler', 'Suruç tarihi camiler'],
    district: 'Suruç',
    category: 'gezi-rehberi',
    tags: ['suruc', 'gezi-rehberi', 'sanliurfa-ilceleri'],
  },
  {
    title: "Halfeti'de Konaklama: En İyi Butik Oteller ve Konuk Evleri",
    keywords: ['Halfeti konaklama', 'Halfeti otel', 'Halfeti butik'],
    district: 'Halfeti',
    category: 'konaklama',
    tags: ['halfeti', 'konaklama', 'butik-otel'],
  },
  {
    title: "Şanlıurfa'da Kahvaltı Nerede Yapılır: En İyi 10 Kahvaltı Mekanı",
    keywords: ['Şanlıurfa kahvaltı', 'Urfa kahvaltı yerleri', 'Balıklıgöl kahvaltı'],
    district: null,
    category: 'yeme-icme',
    tags: ['kahvalti', 'yeme-icme', 'sanliurfa-mekanlar'],
  },
  {
    title: "Şanlıurfa Baklavacılar Rehberi: En İyi Baklava ve Tatlı Mekanları",
    keywords: ['Şanlıurfa baklava', 'Urfa tatlıları', 'Şanlıurfa pastane'],
    district: null,
    category: 'yeme-icme',
    tags: ['baklava', 'tatli', 'pastane'],
  },
  {
    title: "Urfa Ciğer Kebabı: En İyi Ciğerciler ve Sipariş Rehberi",
    keywords: ['Urfa ciğer kebabı', 'Şanlıurfa ciğerciler', 'Urfa ciğer nerede yenir'],
    district: null,
    category: 'gastronomi',
    tags: ['ciger-kebabi', 'gastronomi', 'urfa-mutfagi'],
  },
  {
    title: "Karaköprü Rehberi: Şanlıurfa'nın Modern İlçesinde Neler Yapılır",
    keywords: ['Karaköprü mekanlar', 'Karaköprü kafeler', 'Karaköprü restoranlar'],
    district: 'Karaköprü',
    category: 'gezi-rehberi',
    tags: ['karakopru', 'sanliurfa-ilceleri', 'mekanlar'],
  },
  {
    title: "Haliliye İlçe Rehberi: Şanlıurfa Merkezi'nin Kalbi",
    keywords: ['Haliliye mekanlar', 'Haliliye restoranlar', 'Haliliye tarihi'],
    district: 'Haliliye',
    category: 'gezi-rehberi',
    tags: ['haliliye', 'sanliurfa-merkez', 'gezi-rehberi'],
  },
  {
    title: "Harran'da Konaklama: Kümbet Evler ve Antik Atmosferde Gece",
    keywords: ['Harran konaklama', 'Harran kumbet ev', 'Harran gece kalma'],
    district: 'Harran',
    category: 'konaklama',
    tags: ['harran', 'kumbet-evler', 'konaklama'],
  },
  {
    title: "Şanlıurfa Sıra Gecesi: Gelenek, Müzik ve Lezzet Rehberi",
    keywords: ['Şanlıurfa sıra gecesi', 'Urfa sıra gecesi mekanları', 'Urfa sıra gecesi nerede'],
    district: null,
    category: 'kultur-ve-etkinlik',
    tags: ['sira-gecesi', 'gelenek', 'muzik'],
  },
  {
    title: "Göbeklitepe Ziyaret Rehberi: Biletler, Saatler ve Pratik Bilgiler 2026",
    keywords: ['Göbeklitepe bilet fiyatları 2026', 'Göbeklitepe ziyaret saatleri', 'Göbeklitepe ulaşım'],
    district: 'Haliliye',
    category: 'gezi-rehberi',
    tags: ['gobeklitepe', 'arkeoloji', 'ziyaret-rehberi'],
  },
  {
    title: "Şanlıurfa'da Çocuklarla Gezilecek Yerler: Aile Dostu Aktiviteler",
    keywords: ['Şanlıurfa çocuk aktiviteleri', 'Urfa aile gezisi', 'Şanlıurfa çocuklarla'],
    district: null,
    category: 'aile-ve-cocuk',
    tags: ['aile', 'cocuk', 'aktiviteler'],
  },
  {
    title: "Balıklıgöl ve Çevresindeki En İyi Kafeler: Güzel Manzaralı Oturma Noktaları",
    keywords: ['Balıklıgöl kafe', 'Dergah çevresi kafe', 'Şanlıurfa merkez kafe'],
    district: 'Eyyübiye',
    category: 'yeme-icme',
    tags: ['balikligol', 'kafe', 'manzara'],
  },
];

const SYSTEM = SYSTEM_TR;

async function generateBlogPost(topic) {
  const keywordStr = topic.keywords.join(', ');
  const districtInfo = topic.district ? ` Mekan Şanlıurfa'nın ${topic.district} ilçesindedir.` : " Şanlıurfa genelini kapsar.";

  const prompt = `"${topic.title}" başlıklı kapsamlı bir blog yazısı yaz.
Anahtar kelimeler: ${keywordStr}
${districtInfo}
Uzunluk: yaklaşık 600-800 kelime
Format: Sadece HTML etiketleri kullan (h2, h3, p, ul, li). Başka etiket kullanma.
Sonunda <h2>Sonuç</h2> ve <h2>Sık Sorulan Sorular</h2> bölümü ekle (2 soru-cevap, <strong>S:</strong> ve <strong>C:</strong> formatında).
Yalnızca HTML içeriğini yaz, başka açıklama ekleme.`;

  const content = await ollamaChat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: prompt },
  ]);

  // Extract excerpt from first <p>
  const firstP = content.match(/<p>(.*?)<\/p>/s);
  const excerpt = firstP
    ? firstP[1].replace(/<[^>]+>/g, '').slice(0, 200)
    : topic.title;

  return { content, excerpt };
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

  console.log(`\n📝 ${BLOG_TOPICS.length} blog yazısı üretilecek (model: ${MODEL})\n`);

  let ok = 0, skip = 0, fail = 0;

  for (const topic of BLOG_TOPICS) {
    const slug = slugify(topic.title);
    process.stdout.write(`  → "${topic.title.slice(0, 50)}..." `);

    // Skip if already exists
    const existing = await client.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      console.log('⊘ zaten var');
      skip++;
      continue;
    }

    try {
      const { content, excerpt } = await generateBlogPost(topic);
      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;

      if (DRY) {
        console.log(`\n    [DRY] ${wordCount} kelime — ${excerpt.slice(0, 60)}...`);
      } else {
        // Random recent date (last 30 days)
        const daysAgo = Math.floor(Math.random() * 30);
        const pubDate = new Date(Date.now() - daysAgo * 86400000);
        pubDate.setHours(Math.floor(Math.random() * 12) + 8, 0, 0, 0);

        await client.query(
          `INSERT INTO blog_posts
            (slug, title, content, excerpt, status, category,
             author_id, published_at, tags, reading_time, featured_image)
           VALUES ($1,$2,$3,$4,'published',$5,$6,$7,$8,$9,$10)
           ON CONFLICT (slug) DO NOTHING`,
          [
            slug,
            topic.title,
            content,
            excerpt,
            topic.category,
            AUTHOR_ID,
            pubDate.toISOString(),
            topic.tags,
            Math.ceil(wordCount / 200),
            `/uploads/blogs/${slug}.jpg`,
          ]
        );
        console.log(`✓ (${wordCount} kelime)`);
      }
      ok++;
      await sleep(2000);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
      await sleep(1000);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} yeni, ${skip} zaten var, ${fail} hata${DRY ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
