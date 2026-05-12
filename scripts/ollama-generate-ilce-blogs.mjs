#!/usr/bin/env node
/**
 * Yeni 5 ilçe (Suruç, Bozova, Akçakale, Hilvan, Ceylanpınar) için
 * Ollama API ile blog yazıları üret ve prod DB'ye kaydet.
 * Kullanım: node scripts/ollama-generate-ilce-blogs.mjs [--dry-run]
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

const ollamaCfg  = getOllamaConfig();
const MODEL      = ollamaCfg.MODEL;
const AUTHOR_ID  = '7a2816aa-d85a-481e-aa41-c89380f47d8f';

// SSH + DB config (from .env.scripts)
const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15433;

const DRY = process.argv.includes('--dry-run');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS)      { console.error('SSH_PASS eksik (.env.scripts)'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(text) {
  return text.toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
}

const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);
const SYSTEM = SYSTEM_TR;

const BLOG_TOPICS = [
  {
    title: "Suruç Gezi Rehberi: Tarihi Dokunuşlar ve Yerel Lezzetler",
    keywords: ['Suruç gezilecek yerler', 'Suruç tarihi camiler', 'Suruç Halfeti güzergahı'],
    district: 'Suruç',
    category: 'gezi-rehberi',
    tags: ['suruc', 'gezi-rehberi', 'sanliurfa-ilceleri', 'firat-vadisi'],
    prompt: `"Suruç Gezi Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın 45 km batısındaki Suruç ilçesi. Fırat Vadisi kenarında, Halfeti'ye giden yol üzerinde tarihi bir ilçe.
Öne çıkan konular: Tarihi camiler (Ulu Cami), tarihi çarşı, Fırat Nehri havzası, Halfeti'yle kombine gezi imkânı, zeytinlikler, yöresel lezzetler.
Anahtar kelimeler: Suruç gezilecek yerler, Suruç tarihi camiler, Suruç Halfeti güzergahı
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Bozova Gezi Rehberi: Atatürk Barajı Kıyısında Doğa ve Huzur",
    keywords: ['Bozova gezilecek yerler', 'Atatürk Barajı Bozova', 'Bozova balıkçılık'],
    district: 'Bozova',
    category: 'gezi-rehberi',
    tags: ['bozova', 'ataturk-baraji', 'gezi-rehberi', 'balikcilik'],
    prompt: `"Bozova Gezi Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın 50 km kuzey-batısındaki Bozova ilçesi. Türkiye'nin en büyük barajı Atatürk Barajı'nın kıyısında doğa cenneti.
Öne çıkan konular: Atatürk Barajı gölü ve manzarası, sazan-levrek balıkçılığı, tekne gezileri, piknik alanları, taze göl balığı restoranları, Fırat havzası doğası.
Anahtar kelimeler: Bozova gezilecek yerler, Atatürk Barajı Bozova, Bozova balıkçılık tekne turu
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Akçakale Gezi Rehberi: Harran Ovası'nda Sınır Kasabası",
    keywords: ['Akçakale gezilecek yerler', 'Harran Ovası gezi', 'Akçakale sınır kapısı'],
    district: 'Akçakale',
    category: 'gezi-rehberi',
    tags: ['akcakale', 'harran-ovasi', 'gezi-rehberi', 'sinir-kasabasi'],
    prompt: `"Akçakale Gezi Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın 55 km güneyindeki Akçakale ilçesi. Harran Ovası'nın kalbinde, Suriye sınırında tarihi bir ticaret merkezi.
Öne çıkan konular: Suriye sınır kapısı (Tel Abyad), Harran Ovası'nın uçsuz bucaksız buğday ve mercimek tarlaları, ovada doğa manzarası, Harran ile kombine gezi, yöresel lezzetler.
Anahtar kelimeler: Akçakale gezilecek yerler, Harran Ovası gezi, Akçakale sınır kapısı, Akçakale nasıl gidilir
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Hilvan Kaplıcaları Rehberi: Şifalı Sularla Termal Deneyim",
    keywords: ['Hilvan kaplıcaları', 'Hilvan termal', 'Şanlıurfa kaplıca'],
    district: 'Hilvan',
    category: 'saglik-ve-spa',
    tags: ['hilvan', 'kaplica', 'termal', 'saglik-turizmi'],
    prompt: `"Hilvan Kaplıcaları Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın 60 km kuzey-batısındaki Hilvan ilçesi. Türkiye'nin önemli termal turizm noktalarından biri; şifalı kaplıca suları ile bilinir.
Öne çıkan konular: Kaplıca sularının özellikleri ve şifa faydaları (romatizma, eklem ağrıları, cilt sorunları), termal tesis imkânları, ziyaret saatleri ve ücretler, ulaşım, Siverek ile kombine gezi, yöresel yemekler.
Anahtar kelimeler: Hilvan kaplıcaları, Hilvan termal, Şanlıurfa kaplıca, Hilvan şifalı su
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
  {
    title: "Ceylanpınar Gezi Rehberi: TİGEM Çiftliği ve Sınır Kasabası Kültürü",
    keywords: ['Ceylanpınar gezilecek yerler', 'TİGEM Ceylanpınar', 'Ceylanpınar at yetiştiriciliği'],
    district: 'Ceylanpınar',
    category: 'gezi-rehberi',
    tags: ['ceylanpinar', 'tigem-ciftligi', 'gezi-rehberi', 'at-yetistiriciligi'],
    prompt: `"Ceylanpınar Gezi Rehberi" başlıklı kapsamlı bir blog yazısı yaz.
Konu: Şanlıurfa'nın 130 km doğusundaki Ceylanpınar ilçesi. Türkiye'nin en büyük devlet tarım işletmesi TİGEM'e ev sahipliği yapan, Suriye sınırında özgün bir sınır kasabası.
Öne çıkan konular: TİGEM Ceylanpınar Tarım İşletmesi (tahıl üretimi, at yetiştiriciliği), sınır kasabası atmosferi, uçsuz bucaksız ova manzarası, Viranşehir ile kombine gezi, yerel lezzetler ve süt ürünleri.
Anahtar kelimeler: Ceylanpınar gezilecek yerler, TİGEM Ceylanpınar çiftliği, Ceylanpınar at yetiştiriciliği, Ceylanpınar nasıl gidilir
Uzunluk: ~700 kelime. Format: Sadece HTML (h2, h3, p, ul, li). Sonunda <h2>Sonuç</h2> ve 2 soruluk <h2>Sık Sorulan Sorular</h2> ekle.`,
  },
];

async function generateBlogPost(topic) {
  const content = await ollamaChat([
    { role: 'system', content: SYSTEM },
    { role: 'user', content: topic.prompt },
  ]);
  const firstP = content.match(/<p>(.*?)<\/p>/s);
  const excerpt = firstP
    ? firstP[1].replace(/<[^>]+>/g, '').slice(0, 200)
    : topic.title;
  return { content, excerpt };
}

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
  console.log(`\n📝 ${BLOG_TOPICS.length} ilçe blog yazısı üretilecek (model: ${MODEL})\n`);
  let ok = 0, skip = 0, fail = 0;

  for (const topic of BLOG_TOPICS) {
    const slug = slugify(topic.title);
    process.stdout.write(`  → "${topic.title.slice(0, 55)}..." `);

    const existing = await client.query('SELECT id FROM blog_posts WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) { console.log('⊘ zaten var'); skip++; continue; }

    try {
      const { content, excerpt } = await generateBlogPost(topic);
      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;

      if (DRY) {
        console.log(`\n    [DRY] ${wordCount} kelime — ${excerpt.slice(0, 60)}...`);
      } else {
        const daysAgo = Math.floor(Math.random() * 14);
        const pubDate = new Date(Date.now() - daysAgo * 86400000);
        pubDate.setHours(Math.floor(Math.random() * 8) + 9, 0, 0, 0);

        await client.query(
          `INSERT INTO blog_posts
            (slug, title, content, excerpt, status, category,
             author_id, published_at, tags, reading_time, featured_image)
           VALUES ($1,$2,$3,$4,'published',$5,$6,$7,$8,$9,$10)
           ON CONFLICT (slug) DO NOTHING`,
          [
            slug, topic.title, content, excerpt, topic.category,
            AUTHOR_ID, pubDate.toISOString(), topic.tags,
            Math.ceil(wordCount / 200), `/uploads/blogs/${slug}.jpg`,
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
