#!/usr/bin/env node
/**
 * Batch 8 — 8 yeni blog yazısı (ince kategorileri 10'a tamamla).
 * Kategoriler: kultur-tarih(+2), kultur(+2), aile-ve-cocuk(+2), alisveris(+2)
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
const LOCAL_TUNNEL_PORT = 15500;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [title, category_slug, context]
const BLOGS = [
  // === KÜLTÜR-TARİH (+2) ===
  ["Şanlıurfa'nın Osmanlı Dönemi Mimarisi: Hanlar, Hamamlar ve Camiler", 'kultur-tarih',
    'Osmanlı dönemi eserleri, Gümrük Hanı, Hüseyin Paşa Hamamı, Rızvaniye Camii, tarihi doku, restorasyon çalışmaları'],
  ["Şanlıurfa Mühürü: Arasta ve Bedesten Geleneği — Ticaretin 3000 Yıllık Kalbi", 'kultur-tarih',
    'Arasta çarşısı tarihi, bedesten nedir, Osmanlı ticaret yapıları, kapalı çarşı kültürü, bugünkü durumu'],

  // === KÜLTÜR (+2) ===
  ["Şanlıurfa Müziği: Türkü, Saz ve Sıra Gecesi Kültürü", 'kultur',
    'Urfa müzik geleneği, kaval ve saz, Şanlıurfa türküleri, sıra gecesi müzik ritüeli, yerel sanatçılar, makamlar'],
  ["Şanlıurfa'da Geleneksel Giyim: Şalvar, Potur ve Yöresel Kostümler", 'kultur',
    'Yöresel kıyafetler, erkek şalvar potur gömlek, kadın gelinliği ve üstlük, özel gün kıyafetleri, köy-şehir farkı'],

  // === AİLE VE ÇOCUK (+2) ===
  ["Şanlıurfa'da Çocuklarla Piknik: En Güzel Yeşil Alanlar ve Park Rehberi", 'aile-ve-cocuk',
    'Atatürk Parkı, Balıklıgöl çevresi, Botanik Bahçesi, çocuk oyun alanları, piknik masaları, gölge ve güvenlik'],
  ["Şanlıurfa Çocuk Müzesi ve Eğitici Mekanlar: Öğrenirken Eğlenmek", 'aile-ve-cocuk',
    'Arkeoloji Müzesi çocuk gözüyle, Göbeklitepe eğitici ziyaret, gençlik merkezleri, atölye çalışmaları, bilim merkezi'],

  // === ALIŞVERİŞ (+2) ===
  ["Şanlıurfa'da Yöresel Ürünler: Nereden, Ne Fiyata, Nasıl Alınır?", 'alisveris',
    'Sürme isot fiyatları, bakır ürünler, telkari gümüş, pişmaniye, cevizli sucuk, soğuk sarmısak, güvenilir dükkanlar'],
  ["Şanlıurfa Hediyelik Eşya Rehberi: Ailenize ve Dostlarınıza Ne Götürürsünüz?", 'alisveris',
    'Şanlıurfa hediye fikirleri, isot seti, bakır tepsi, kilim, tahta oyma, fiyat aralıkları, ambalaj ve taşıma ipuçları'],
];

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream);
        stream.pipe(sock);
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
          keepaliveCountMax: 60,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log(`\n📰 Batch 8 — ${BLOGS.length} blog yazısı üretiliyor...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1',
    port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: [author] } = await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  const targetCats = ['kultur-tarih', 'kultur', 'aile-ve-cocuk', 'alisveris'];
  const { rows: catRows } = await client.query(
    "SELECT id, slug FROM categories WHERE slug = ANY($1)", [targetCats]
  );
  const catMap = Object.fromEntries(catRows.map(r => [r.slug, r.id]));

  let ok = 0, skip = 0, fail = 0;

  for (const [title, catSlug, context] of BLOGS) {
    const slug = slugify(title);
    process.stdout.write(`  → ${title.slice(0, 58)}... `);

    const { rows: exists } = await client.query(
      "SELECT id FROM blog_posts WHERE slug = $1", [slug]
    );
    if (exists.length > 0) {
      console.log('⊘ zaten var');
      skip++;
      continue;
    }

    try {
      const [content, excerpt] = await Promise.all([
        ollamaChat([
          { role: 'system', content: SYSTEM_TR },
          { role: 'user', content: `Şanlıurfa şehir rehberi için Türkçe blog yaz.\nBaşlık: "${title}"\nKonu: ${context}\n\nFormat: HTML (h2, p, ul, li), 700-950 kelime, pratik bilgiler, yerel ipuçları, 2026 yılına ait güncel bilgi içersin. Başlığı tekrarlama.` },
        ]),
        ollamaChat([
          { role: 'system', content: SYSTEM_TR },
          { role: 'user', content: `"${title}" başlıklı blog için 1-2 cümle Türkçe özet yaz. Sadece metin.` },
        ]),
      ]);

      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(w => w.length > 0).length;
      const readTime = Math.max(3, Math.round(wordCount / 200));
      const catId = catMap[catSlug] || null;
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - Math.floor(Math.random() * 60));

      await client.query(`
        INSERT INTO blog_posts
          (title, slug, content, content_html, excerpt, author_id, status, published_at,
           category, category_slug, category_id, reading_time, read_time_minutes,
           author_name, is_featured, view_count, like_count, comment_count)
        VALUES ($1,$2,$3,$3,$4,$5,'published',$6,$7,$8,$9,$10,$10,$11,false,
                floor(random()*200+10)::int, floor(random()*15+1)::int, 0)
      `, [title, slug, content, excerpt.slice(0, 300), author?.id, publishDate,
          catSlug, catSlug, catId, readTime, 'Şanlıurfa Rehberi']);

      console.log(`✓ (${wordCount} kelime)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(2500);
  }

  const { rows: [stats] } = await client.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE category='kultur-tarih') as kultur_tarih,
      COUNT(*) FILTER (WHERE category='kultur') as kultur,
      COUNT(*) FILTER (WHERE category='aile-ve-cocuk') as aile,
      COUNT(*) FILTER (WHERE category='alisveris') as alisveris
    FROM blog_posts WHERE status='published'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Batch 8: ${ok} yeni | ${skip} mevcut | ${fail} hata`);
  console.log(`📊 Toplam blog: ${stats.total}`);
  console.log(`   kultur-tarih:${stats.kultur_tarih} kultur:${stats.kultur} aile-ve-cocuk:${stats.aile} alisveris:${stats.alisveris}`);
}

main().catch(e => { console.error(e); process.exit(1); });
