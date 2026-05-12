#!/usr/bin/env node
/**
 * 'rehber' kategorisine 5 yeni blog yazısı ekler.
 * Kategori 5 yazıyla minimum eşikte — 10'a çıkararak güçlendirilecek.
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
const LOCAL_TUNNEL_PORT = 15542;

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

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function countWords(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length;
}

const POSTS = [
  {
    title: "Şanlıurfa'ya İlk Kez Gidenler için Kapsamlı Gezi Rehberi",
    slug: 'sanliurfaya-ilk-kez-gidenler-rehberi',
    excerpt: "Şanlıurfa'ya ilk ziyaretinizi planlıyorsanız bu kapsamlı rehber; en önemli gezilecek yerler, yeme-içme önerileri, ulaşım bilgileri ve pratik ipuçlarıyla tam anlamıyla hazır olmanızı sağlar.",
    tags: ['rehber', 'ilk ziyaret', 'gezi planı', 'şanlıurfa', 'pratik bilgi'],
    keyword: "Şanlıurfa gezi rehberi",
    prompt: `Şanlıurfa'ya ilk kez gidecek turistler için kapsamlı bir blog yazısı yaz. Başlık: "Şanlıurfa'ya İlk Kez Gidenler için Kapsamlı Gezi Rehberi". Konu: Göbeklitepe, Harran, Balıklıgöl, yeme-içme (kebap, ciğer, katmer), konaklama seçenekleri, ulaşım (uçak/otobüs), en iyi dönemler, dikkat edilecekler. SEO odak kelime: "Şanlıurfa gezi rehberi". 600-750 kelime, SYSTEM_SEO kurallarına uygun HTML.`,
  },
  {
    title: "Şanlıurfa'da 3 Günlük Gezi Planı: Güzergah ve Öneriler",
    slug: 'sanliurfada-3-gunluk-gezi-plani',
    excerpt: "3 günde Şanlıurfa'nın tüm simgelerini görmek mümkün mü? Bu güzergah rehberiyle Göbeklitepe, Harran, Halfeti ve şehir merkezini eksiksiz keşfedin.",
    tags: ['gezi planı', '3 gün', 'güzergah', 'şanlıurfa', 'tur'],
    keyword: "Şanlıurfa 3 günlük gezi planı",
    prompt: `Şanlıurfa'da 3 günlük kapsamlı gezi planı hazırlayan bir blog yazısı yaz. Başlık: "Şanlıurfa'da 3 Günlük Gezi Planı: Güzergah ve Öneriler". Gün 1: Şehir merkezi (Balıklıgöl, Göbeklitepe Müzesi, Arkeoloji Müzesi), Gün 2: Göbeklitepe + Karahantepe, Gün 3: Harran + Halfeti tekne turu. Her gün öğle ve akşam yemeği önerileriyle birlikte. SEO odak kelime: "Şanlıurfa 3 günlük gezi planı". 600-750 kelime, SYSTEM_SEO kurallarına uygun HTML.`,
  },
  {
    title: "Şanlıurfa'da Bütçe Dostu Gezi: Ekonomik Seyahat Rehberi",
    slug: 'sanliurfada-butce-dostu-gezi-rehberi',
    excerpt: "Az bütçeyle çok deneyim arıyorsanız Şanlıurfa mükemmel bir tercih. Ücretsiz müzeler, uygun konaklama ve hesaplı lezzetlerle ekonomik seyahat planı rehberi burada.",
    tags: ['bütçe', 'ekonomik gezi', 'rehber', 'şanlıurfa', 'ucuz tatil'],
    keyword: "Şanlıurfa ekonomik gezi rehberi",
    prompt: `Şanlıurfa'da düşük bütçeyle gezmenin yollarını anlatan bir blog yazısı yaz. Başlık: "Şanlıurfa'da Bütçe Dostu Gezi: Ekonomik Seyahat Rehberi". Konu: Müze Kart ile ücretsiz müzeler, ucuz konaklama (pansiyon/apart), uygun fiyatlı yeme-içme (çarşı içi lokantalar, pide, lahmacun), ücretsiz gezilecek yerler (Balıklıgöl çevresi, tarihi çarşı), toplu taşıma ipuçları. SEO odak kelime: "Şanlıurfa ekonomik gezi rehberi". 600-750 kelime, SYSTEM_SEO kurallarına uygun HTML.`,
  },
  {
    title: "Şanlıurfa Fotoğraf Çekim Rehberi: En İyi Noktalar ve İpuçları",
    slug: 'sanliurfa-fotograf-cekimi-rehberi',
    excerpt: "Şanlıurfa'nın büyülü ışığında mükemmel kareler yakalamak için en iyi fotoğraf noktaları, doğru saatler ve teknik ipuçları bu rehberde bir arada.",
    tags: ['fotoğraf', 'rehber', 'çekim noktaları', 'şanlıurfa', 'fotoğrafçılık'],
    keyword: "Şanlıurfa fotoğraf çekim rehberi",
    prompt: `Şanlıurfa'da fotoğraf çekmek isteyen turistler için detaylı bir rehber yaz. Başlık: "Şanlıurfa Fotoğraf Çekim Rehberi: En İyi Noktalar ve İpuçları". Konu: Göbeklitepe gündoğumu çekimleri, Balıklıgöl altın saat fotoğrafçılığı, Harran petek evleri ışık-gölge oyunları, Ulu Cami minareleri, Halfeti tekne turu manzaraları, tarihi çarşı portre fotoğrafçılığı. Teknik ipuçları: doğru saatler, lens önerileri, izin gereken yerler. SEO odak kelime: "Şanlıurfa fotoğraf çekim rehberi". 600-750 kelime, SYSTEM_SEO kurallarına uygun HTML.`,
  },
  {
    title: "Şanlıurfa'da Yaz Tatili Rehberi: Sıcakla Baş Etmenin Yolları",
    slug: 'sanliurfada-yaz-tatili-rehberi',
    excerpt: "Şanlıurfa yazları sıcak ama doğru plan ve zamanlamayla harika bir tatil mümkün. Erken saatler, serinleme noktaları ve yaz programı ipuçlarıyla dolu rehber.",
    tags: ['yaz tatili', 'rehber', 'sıcak hava', 'şanlıurfa', 'yaz'],
    keyword: "Şanlıurfa yaz tatili rehberi",
    prompt: `Şanlıurfa'da yaz aylarında (Haziran-Eylül) tatil yapacaklar için pratik bir rehber yaz. Başlık: "Şanlıurfa'da Yaz Tatili Rehberi: Sıcakla Baş Etmenin Yolları". Konu: Yaz sıcağında gezme stratejisi (sabah erken/akşam geç), Halfeti teknesiyle serin Fırat deneyimi, Balıklıgöl çay bahçeleri, havuzlu oteller, serinletici yöresel içecekler (şerbet, ayran, mırra), Göbeklitepe sabah turu önerisi, klimalı müzeler. Yaz tatili için önerilen haftalık program. SEO odak kelime: "Şanlıurfa yaz tatili rehberi". 600-750 kelime, SYSTEM_SEO kurallarına uygun HTML.`,
  },
];

async function main() {
  console.log('\n📚 "rehber" kategorisine 5 yeni blog yazısı ekleniyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  // Check which slugs already exist
  const { rows: existing } = await client.query(
    `SELECT slug FROM app.blog_posts WHERE slug = ANY($1)`,
    [POSTS.map(p => p.slug)]
  );
  const existingSlugs = new Set(existing.map(r => r.slug));

  let ok = 0, skip = 0, fail = 0;

  for (const post of POSTS) {
    if (existingSlugs.has(post.slug)) {
      console.log(`  — (zaten var) ${post.slug}`);
      skip++;
      continue;
    }

    process.stdout.write(`  → ${post.title.slice(0, 55)}... `);

    try {
      const content = await ollamaChat([
        { role: 'system', content: SYSTEM_SEO },
        { role: 'user', content: post.prompt },
      ]);

      const wordCount = countWords(content);
      if (wordCount < 300) {
        console.log(`✗ çok kısa (${wordCount} kelime)`);
        fail++;
        await sleep(2000);
        continue;
      }

      // Generate meta_title and meta_description
      const metaTitle = await ollamaChat([
        { role: 'system', content: 'Kısa SEO başlığı yaz. Sadece başlığı yaz, açıklama ekleme.' },
        { role: 'user', content: `Blog başlığı: "${post.title}"\nSEO meta başlığı yaz: 50-60 karakter, "${post.keyword}" içersin, tıklanabilir.` },
      ]);
      const cleanMetaTitle = metaTitle.replace(/[\r\n"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);

      const metaDesc = await ollamaChat([
        { role: 'system', content: 'Kısa SEO açıklaması yaz. Sadece açıklamayı yaz.' },
        { role: 'user', content: `Blog başlığı: "${post.title}"\nSEO meta açıklaması: 140-160 karakter, "${post.keyword}" içersin.` },
      ]);
      const cleanMetaDesc = metaDesc.replace(/[\r\n"']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);

      // Read time (words / 200 wpm)
      const readTime = Math.max(3, Math.round(wordCount / 200));

      const mt = cleanMetaTitle || post.title.slice(0, 60);
      const md = cleanMetaDesc || post.excerpt.slice(0, 160);
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      const ADMIN_ID = '7a2816aa-d85a-481e-aa41-c89380f47d8f';

      await client.query(`
        INSERT INTO app.blog_posts (
          title, slug, content, excerpt, category, category_slug,
          status, published_at, featured_image,
          meta_title, seo_title, meta_description, seo_description,
          tags, read_time_minutes, view_count, author_id
        ) VALUES (
          $1, $2, $3, $4, 'rehber', 'rehber',
          'published', NOW() - ($5 * INTERVAL '1 day'), '/uploads/blog/sanliurfa-sehir.jpg',
          $6, $7, $8, $9,
          $10, $11, 0, $12
        )
        ON CONFLICT (slug) DO NOTHING
      `, [
        post.title, post.slug, content, post.excerpt,
        daysAgo,
        mt, mt,
        md, md,
        post.tags,
        readTime,
        ADMIN_ID,
      ]);

      console.log(`✓ (${wordCount} kelime, ${readTime} dk)`);
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }

    await sleep(3000);
  }

  // Verify category count
  const { rows: [cat] } = await client.query(`
    SELECT COUNT(*) as count FROM app.blog_posts
    WHERE status = 'published' AND category = 'rehber'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} eklendi, ${skip} zaten vardı, ${fail} hata`);
  console.log(`📊 "rehber" kategori toplam: ${cat.count}`);
}

main().catch(e => { console.error(e); process.exit(1); });
