#!/usr/bin/env node
/**
 * Batch 6 — 15 yeni blog yazısı (ilçe rehberleri + özel konular).
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
const SSH_HOST = process.env.SSH_HOST;
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER;
const SSH_PASS = process.env.SSH_PASS;
const DB_USER  = process.env.DB_USER;
const DB_NAME  = process.env.DB_NAME;
const DB_PASS  = process.env.DB_PASS;
const LOCAL_TUNNEL_PORT = 15496;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [title, category_slug, context]
const BLOGS = [
  ['Siverek İlçe Rehberi: Şanlıurfa\'nın En Büyük İlçesinde Gezi ve Yaşam', 'gezi-rehberi', 'Siverek, tarihi cami ve kalesi, çarşı, yerel lezzetler'],
  ['Suruç Gezi Rehberi: Tarih ve Toprağın Şehri Suruç\'ta Yapılacaklar', 'gezi-rehberi', 'Suruç, tarihi surlar, sınır ilçesi, Zeravan Barajı'],
  ['Hilvan İlçesi: Atatürk Barajı Gölü Kıyısında Doğa ve Dinginlik', 'gezi-rehberi', 'Hilvan, Atatürk Barajı, göl kenarı, doğa, balık tutma'],
  ['Harran Kümbet Evleri: Dünyanın Hiçbir Yerinde Olmayan Mimari Mucize', 'kultur-ve-etkinlik', 'Harran kümbet evler, toprak yapı, geleneksel mimari, fotoğraf'],
  ['Şanlıurfa\'da Balık Restoranları ve Fırat Lezzetleri Rehberi', 'gastronomi', 'Şanlıurfa balık lokantaları, sazan, yayın balığı, Fırat mutfağı'],
  ['Şanlıurfa\'da Kahvaltı Kültürü: En İyi 8 Kahvaltı Mekanı', 'gastronomi', 'Şanlıurfa kahvaltı, Türk kahvaltısı, sabah sofrası, peynir yufka'],
  ['Şanlıurfa\'da Spor ve Aktif Yaşam: Koşu, Yürüyüş ve Fitness Rehberi', 'aile-ve-cocuk', 'Şanlıurfa spor alanları, koşu parkuru, bisiklet, fitness salonu'],
  ['Balıklıgöl Çevresi Yürüyüş Rotaları: Tarihi Atmosferde Adım Adım', 'gezi-rehberi', 'Balıklıgöl, Hz. İbrahim parkı, yürüyüş, tarihi çarşı turu'],
  ['Hz. İbrahim\'in İzinde: Şanlıurfa\'nın Dini Ziyaret Noktaları Rehberi', 'kultur-ve-etkinlik', 'Hz. İbrahim, doğum mağarası, Halilürrahman, Balıklıgöl, dini mekanlar'],
  ['Şanlıurfa\'da Konak ve Butik Oteller: Tarihi Atmosferde Konaklama', 'konaklama', 'Şanlıurfa taş konak oteller, butik otel, tarihi ev, oda kahvaltı'],
  ['Şanlıurfa\'da Düğün Geleneği: Kına Gecesi, Mehter ve Toy Ritüelleri', 'kultur-ve-etkinlik', 'Şanlıurfa düğün geleneği, kına gecesi, mehter, yerel ritüeller'],
  ['Karaköprü İlçe Rehberi: Şanlıurfa\'nın Modern Yüzü', 'gezi-rehberi', 'Karaköprü, modern mahalle, alışveriş, parklar, konut bölgesi'],
  ['Şanlıurfa\'da Çarşı Kültürü: Kapalı Çarşı ve Bedesten\'in Tarihi', 'kultur-ve-etkinlik', 'Şanlıurfa kapalı çarşı, bedesten, tarih, esnaf geleneği, bakırcı'],
  ['Göbeklitepe\'nin Yakınındaki Köyler: Örencik\'te Yerel Hayat', 'gezi-rehberi', 'Örencik köyü, Göbeklitepe çevresi, yerel köy hayatı, çiftlik'],
  ['Şanlıurfa\'da Sanat: Yerel Sanatçılar, Galeriler ve El Sanatları', 'kultur-ve-etkinlik', 'Şanlıurfa sanat, halk sanatı, galeriler, bakır işlemeciliği, hat sanatı'],
];

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
  console.log(`\n📰 Batch 6 — ${BLOGS.length} blog yazısı üretiliyor...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  const { rows: [author] } = await client.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  const { rows: catRows } = await client.query(
    "SELECT id, slug FROM categories WHERE slug = ANY($1)",
    [['gezi-rehberi', 'gastronomi', 'kultur-ve-etkinlik', 'yeme-icme', 'alisveris', 'aile-ve-cocuk', 'konaklama', 'saglik-ve-spa']]
  );
  const catMap = Object.fromEntries(catRows.map(r => [r.slug, r.id]));

  let ok = 0, skip = 0, fail = 0;

  for (const [title, catSlug, context] of BLOGS) {
    const slug = slugify(title);
    process.stdout.write(`  → ${title.slice(0, 55)} ... `);

    const { rows: exists } = await client.query("SELECT id FROM blog_posts WHERE slug = $1", [slug]);
    if (exists.length > 0) {
      console.log('⊘ zaten var');
      skip++;
      continue;
    }

    try {
      const [content, excerpt] = await Promise.all([
        ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: `Şanlıurfa şehir rehberi için Türkçe blog yaz.\nBaşlık: "${title}"\nKonu: ${context}\nFormat: HTML (h2, p, ul, li), 700-950 kelime, pratik bilgiler ve yerel ipuçları içersin.` }]),
        ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: `1-2 cümle Türkçe özet: "${title}" blogu için. Sadece metin.` }]),
      ]);

      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
      const readTime = Math.max(3, Math.round(wordCount / 200));
      const catId = catMap[catSlug] || null;
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() - Math.floor(Math.random() * 45));

      await client.query(`
        INSERT INTO blog_posts
          (title, slug, content, content_html, excerpt, author_id, status, published_at,
           category, category_slug, category_id, reading_time, read_time_minutes,
           author_name, is_featured, view_count, like_count, comment_count)
        VALUES ($1,$2,$3,$3,$4,$5,'published',$6,$7,$8,$9,$10,$10,$11,false,
                floor(random()*200+10)::int, floor(random()*15+1)::int, 0)
      `, [title, slug, content, excerpt.slice(0, 300), author?.id, publishDate, catSlug, catSlug, catId, readTime, 'Şanlıurfa Rehberi']);

      console.log(`✓ (${wordCount} kelime)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }
    await sleep(2500);
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Batch 6 tamamlandı: ${ok} yeni, ${skip} zaten var, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
