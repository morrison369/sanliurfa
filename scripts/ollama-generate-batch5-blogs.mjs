#!/usr/bin/env node
/**
 * Batch 5 — 15 yeni blog yazısı üret (ilçe rehberleri + özel konular).
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

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15472;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [title, category_slug, query_context]
const BLOGS = [
  ['Viranşehir Gezi Rehberi: Şanlıurfa\'nın Tarihi İlçesinde Ne Yapılır?', 'gezi-rehberi', 'Viranşehir, eski adı Suruç, tarihi yerler, yemek, konaklama'],
  ['Ceylanpınar\'da Gezilecek Yerler: Sınır Şehrinin Keşfedilmemiş Güzellikleri', 'gezi-rehberi', 'Ceylanpınar, Suriye sınırı, milli park, tarih'],
  ['Akçakale Gezi Rehberi: Suriye Sınırındaki Şehirde 1 Günlük Tur', 'gezi-rehberi', 'Akçakale, sınır kapısı, tarihi yerler, yerel kültür'],
  ['Birecik\'te Gezilecek Yerler: Kelaynak Kuşu ve Fırat Kıyısında Bir Gün', 'gezi-rehberi', 'Birecik, kelaynak kuşu, Fırat nehri, kale'],
  ['Şanlıurfa Kalesi: Tarihi Kale ve Mağaraların Tam Rehberi', 'kultur-ve-etkinlik', 'Şanlıurfa kalesi, surlar, mağaralar, Hz. İbrahim, tarih'],
  ['Şanlıurfa\'da Pilavcılar ve Pilav Çeşitleri: Yerel Pirinç Kültürü Rehberi', 'gastronomi', 'Şanlıurfa pilav, pilavcılar, büryan pilavı, yerel lezzetler'],
  ['Şanlıurfa Müzeleri Tam Rehberi: Hangi Müzeye Gitmelisiniz?', 'kultur-ve-etkinlik', 'Şanlıurfa müzesi, mozaik müze, arkeoloji, Göbeklitepe müze'],
  ['Şanlıurfa\'da Instagram Fotoğraf Çekimi: En İyi Lokasyonlar ve Saatler', 'gezi-rehberi', 'Şanlıurfa fotoğraf, Instagram, balıklıgöl, gün batımı, çarşı'],
  ['Bozova İlçesi: Fırat Kıyısında Sakin Bir Tatil Alternatiifi', 'gezi-rehberi', 'Bozova, Fırat nehri, baraj gölü, piknik, doğa'],
  ['Şanlıurfa\'da Lahmacun Rehberi: En İyi Lahmacun Nerede Yenir?', 'gastronomi', 'Şanlıurfa lahmacun, urfa usulü lahmacun, fırın lahmacun'],
  ['Şanlıurfa\'da Çocuklarla Gezi: Aileler İçin En İyi 8 Aktivite', 'aile-ve-cocuk', 'Şanlıurfa çocuk aktivite, aile gezisi, eğlence, park'],
  ['Halilürrahman Gölü Ziyaret Rehberi: Kutsal Gölün Tam Anlatımı', 'gezi-rehberi', 'Halilürrahman gölü, Hz. İbrahim, balıklıgöl, dini turizm'],
  ['Şanlıurfa\'da Alışveriş Merkezleri ve Çarşı Rehberi: Nerede Ne Alınır?', 'alisveris', 'Şanlıurfa AVM, Kapalı Çarşı, Gümrükhan, bakırcılar çarşısı'],
  ['Şanlıurfa\'dan Diyarbakır\'a Günübirlik Tur: Rota ve Pratik Bilgiler', 'gezi-rehberi', 'Diyarbakır günübirlik, tur, mesafe, gezilecek yerler'],
  ['Şanlıurfa\'nın Tarihi Hanlları ve Kervansarayları: Osmanlı Dönemi Mirası', 'kultur-ve-etkinlik', 'Şanlıurfa han, kervansaray, gümrükhan, tarihi yapılar Osmanlı'],
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

async function generateBlog(title, context) {
  const prompt = `Şanlıurfa şehir rehberi sitesi için Türkçe blog yazısı yaz.

Başlık: "${title}"
Konu: ${context}

Format:
- HTML formatında (<h2>, <p>, <ul>, <li> kullanabilirsin)
- 700-1000 kelime
- Pratik bilgiler, adresler, ipuçları içer
- Ziyaretçi dostu, sıcak ve bilgilendirici üslup
- Sadece HTML içeriği yaz`;

  const excerptPrompt = `Bu blog yazısı için 1-2 cümle Türkçe özet yaz (excerpt).
Başlık: "${title}"
Konu: ${context}
Sadece özet metnini yaz, başka bir şey ekleme.`;

  const [content, excerpt] = await Promise.all([
    ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: prompt }]),
    ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: excerptPrompt }]),
  ]);

  return { content, excerpt: excerpt.replace(/[\r\n]/g, ' ').trim().slice(0, 300) };
}

async function main() {
  console.log(`\n📰 Batch 5 — ${BLOGS.length} blog yazısı üretiliyor...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  // Author ID
  const { rows: [author] } = await client.query(
    "SELECT id FROM users WHERE role='admin' LIMIT 1"
  );
  const authorId = author?.id;

  // Category IDs
  const { rows: catRows } = await client.query(
    "SELECT id, slug FROM categories WHERE slug = ANY($1)",
    [['gezi-rehberi', 'gastronomi', 'kultur-ve-etkinlik', 'yeme-icme', 'alisveris', 'aile-ve-cocuk']]
  );
  const catMap = Object.fromEntries(catRows.map(r => [r.slug, r.id]));

  let ok = 0, skip = 0, fail = 0;

  for (const [title, catSlug, context] of BLOGS) {
    const slug = slugify(title);
    process.stdout.write(`  → ${title.slice(0, 55)} ... `);

    // Skip if exists
    const { rows: exists } = await client.query(
      "SELECT id FROM blog_posts WHERE slug = $1", [slug]
    );
    if (exists.length > 0) {
      console.log('⊘ zaten var');
      skip++;
      continue;
    }

    try {
      const { content, excerpt } = await generateBlog(title, context);
      const wordCount = content.replace(/<[^>]+>/g, '').split(/\s+/).length;
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
      `, [
        title, slug, content, excerpt, authorId, publishDate,
        catSlug, catSlug, catId, readTime, 'Şanlıurfa Rehberi',
      ]);

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
  console.log(`\n✅ Batch 5 tamamlandı: ${ok} yeni, ${skip} zaten var, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
