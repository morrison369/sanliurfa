#!/usr/bin/env node
/**
 * Batch 9 — 13 yeni gastronomi blog yazısı (27 → 40).
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
const LOCAL_TUNNEL_PORT = 15501;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [title, context]
const BLOGS = [
  ["Şanlıurfa Börek Kültürü: Su Böreği, El Açması ve Urfa Usulü Börekler",
    'Şanlıurfa börek çeşitleri, su böreği yapımı, el açması hamur teknikleri, börekçiler, evde börek kültürü, bayram sofrası'],
  ["Urfa Şıllık Tatlısı: Tarihi, Tarifi ve En İyi Tatlıcılar",
    'Şıllık tatlısı nedir, tarihsel kökeni, ince hamur ve ceviz dolgusu, şerbet sırları, Şanlıurfa tatlıcıları, ev yapımı ipuçları'],
  ["Mırra: Şanlıurfa'nın Acı Kahvesinin Derin Kültürü",
    'Mırra kahvesi nedir, ibrik ve hazırlık ritüeli, fincan geleneği, sosyal ritüel olarak mırra, Urfa kahvehane kültürü'],
  ["Şanlıurfa Baharat Pazarı: İsot, Sumak ve Yöresel Baharatlar Rehberi",
    'İsot çeşitleri (sürme, pul), sumak nerede satılır, çemen otu, kişniş, tahin, Kapalı Çarşı baharat dükkânları, fiyat bilgisi'],
  ["Urfa Pide Kültürü: Fırın Pideleri, Etli Ekmek ve En İyi Pideciler",
    'Şanlıurfa pide çeşitleri, etli ekmek nedir, üzerine ne konur, mangal pide, sac pidesi, Urfa pidecileri ve adresleri'],
  ["Şanlıurfa'da Baklava ve Şerbet Dünyası: Tatlı Kültürüne Yolculuk",
    'Antep ve Urfa baklava farkı, kadayıf tatlıları, tel kadayıf, şerbetli tatlılar, Urfa tatlı geleneği, bayramlık tatlı seçenekleri'],
  ["Urfa'nın Peynir ve Süt Ürünleri Kültürü: Tereyağı, Yoğurt ve Lor",
    'Urfa beyaz peyniri, çiğ süt ürünleri, köy tereyağı, yayık yoğurdu, lor peyniri, pazar yeri alışverişi, köy mamulleri'],
  ["Şanlıurfa Pazar Yerleri: Taze Sebze, Meyve ve Yerel Üretim Rehberi",
    'Şanlıurfa pazar günleri ve yerleri, mevsim meyveleri, nar ve karpuz sezonu, biber ve patlıcan hasatları, çiftçi pazarı'],
  ["Ramazan Sofrası Şanlıurfa'da: İftar Gelenekleri ve Özel Yemekler",
    'Urfa Ramazan sofrası, iftar çorbası seçenekleri, sahur sofra kültürü, özel Ramazan yemekleri, davul geleneği, cami önü iftarı'],
  ["Urfa Tatlı Kültürü: Künefe'den Katmer'e Tüm Tatlılar",
    'Şanlıurfa tatlı çeşitleri, künefe hangi mevsim daha iyi, katmer yapımı sırları, tahin pekmez kahvaltısı, helva çeşitleri'],
  ["Şanlıurfa Sabahları: Tereyağlı Pide, Kaymak ve Geleneksel Sofra",
    'Urfa sabah sofrasının bileşenleri, kaymak ve bal, tereyağlı pide, köy yumurtası, çay kültürü, kahvaltı mekanları'],
  ["Urfa'da Dürüm ve Sandviç Kültürü: Hızlı Ama Lezzetli Sokak Yemekleri",
    'Urfa dürüm ne içerir, lahmacun dürümü, kebap dürümü, ekme arası çeşitleri, sokak yemek yerleri, öğle arası lezzetleri'],
  ["Şanlıurfa'da Şarap Üzümü ve Bağ Kültürü: Harran Ovasının Meyvesi",
    'Harran ovası bağcılık tarihi, üzüm çeşitleri, pekmez yapımı, kurutma kültürü, Eylül bağ bozumu geleneği, üzümden tarhana'],
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
  console.log(`\n📰 Batch 9 (Gastronomi) — ${BLOGS.length} blog yazısı üretiliyor...\n`);

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

  let ok = 0, skip = 0, fail = 0;

  for (const [title, context] of BLOGS) {
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
          { role: 'user', content: `Şanlıurfa şehir rehberi için gastronomi blog yazısı yaz.\nBaşlık: "${title}"\nKonu: ${context}\n\nFormat: HTML (h2, p, ul, li), 700-950 kelime, pratik bilgiler, yerel ipuçları, 2026 bilgisi. Başlığı tekrarlama.` },
        ]),
        ollamaChat([
          { role: 'system', content: SYSTEM_TR },
          { role: 'user', content: `"${title}" başlıklı gastronomi blogu için 1-2 cümle Türkçe özet yaz. Sadece metin döndür.` },
        ]),
      ]);

      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(w => w.length > 0).length;
      const readTime = Math.max(3, Math.round(wordCount / 200));
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - Math.floor(Math.random() * 90));

      await client.query(`
        INSERT INTO blog_posts
          (title, slug, content, content_html, excerpt, author_id, status, published_at,
           category, category_slug, reading_time, read_time_minutes,
           author_name, is_featured, view_count, like_count, comment_count)
        VALUES ($1,$2,$3,$3,$4,$5,'published',$6,'gastronomi','gastronomi',$7,$7,$8,false,
                floor(random()*150+10)::int, floor(random()*12+1)::int, 0)
        ON CONFLICT (slug) DO NOTHING
      `, [title, slug, content, excerpt.slice(0, 300), author?.id, publishDate, readTime, 'Şanlıurfa Rehberi']);

      console.log(`✓ (${wordCount} kelime)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(2000);
  }

  const { rows: [stats] } = await client.query(`
    SELECT COUNT(*) as total,
      COUNT(*) FILTER (WHERE category='gastronomi') as gastronomi
    FROM blog_posts WHERE status='published'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Batch 9: ${ok} yeni | ${skip} mevcut | ${fail} hata`);
  console.log(`📊 Toplam blog: ${stats.total} | Gastronomi: ${stats.gastronomi}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
