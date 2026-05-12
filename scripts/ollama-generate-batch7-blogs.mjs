#!/usr/bin/env node
/**
 * Batch 7 — 19 yeni blog yazısı (ince kategorileri güçlendir).
 * Kategoriler: seyahat(+4), arkeoloji(+4), sehir-rehberi(+4), saglik-ve-spa(+4), konaklama(+3)
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
const LOCAL_TUNNEL_PORT = 15490;

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
  // === SEYAHAT (+4) ===
  ["Şanlıurfa'ya Tek Başına Gitmek: Solo Seyahat Rehberi 2026", 'seyahat',
    'Solo seyahat ipuçları, güvenlik, konaklama seçenekleri, yerel ulaşım, tanışma fırsatları, Balıklıgöl ve Göbeklitepe'],
  ["Şanlıurfa'dan Komşu İllere Gün Turu: Gaziantep, Mardin, Diyarbakır Rotası", 'seyahat',
    'Gaziantep 2 saat, Mardin 1.5 saat, Diyarbakır 2.5 saat; gün turu güzergahları, ulaşım, ne görülür'],
  ["Şanlıurfa'da Fotoğraf Rotaları: En Güzel Çekim Noktaları ve Işık Saatleri", 'seyahat',
    'Balıklıgöl gün batımı, Göbeklitepe sabah ışığı, Harran kümbet evler, eski çarşı, altın saat, dronla çekim'],
  ["Şanlıurfa'da Bütçe Seyahati: Düşük Maliyetle Maksimum Keşif Rehberi", 'seyahat',
    'Ucuz konaklama, ücretsiz müzeler, uygun fiyatlı yemek, otobüs rotaları, pazar alışverişi, 3 gün 500 TL bütçe'],

  // === ARKEOLOJİ (+4) ===
  ["Göbeklitepe Ziyaret Rehberi: Tam Kılavuz — Ulaşım, Bilet ve Gizem", 'arkeoloji',
    'Göbeklitepe bilet fiyatları 2026, ulaşım rehberi, rehberli tur, sabah erken gitme önerisi, arkeolojik önemi'],
  ["Şanlıurfa Kalesi ve Surları: M.Ö. 2. Yüzyıldan Osmanlı\'ya Tarihin Gözetleme Kulesi", 'arkeoloji',
    'Şanlıurfa kalesi tarihi, Osrhoene krallığı, sütunlar efsanesi, Hz. İbrahim mancınığı, panoramik manzara'],
  ["Neolitik Devrimin Merkezi Şanlıurfa: Dünya Tarihini Değiştiren Kazılar", 'arkeoloji',
    'Neolitik devrim nedir, tarım ve kentleşmenin başlangıcı, Göbeklitepe + Karahantepe + Taş Tepeler projesi'],
  ["Balıklıgöl\'ün 4000 Yıllık Sırrı: Efsaneden Arkeolojiye Hz. İbrahim ve Nemrut", 'arkeoloji',
    'Balıklıgöl tarihi, Nemrut efsanesi, Hz. İbrahim ateşe atılma efsanesi, Ayn Zeliha gölü, dini önemi'],

  // === ŞEHİR REHBERİ (+4) ===
  ["Şanlıurfa'da Çocuklarla Yapılacaklar: Aile Aktiviteleri ve Mekanları", 'sehir-rehberi',
    'Çocuk dostu mekanlar, Balıklıgöl balık besleme, Arkeoloji Müzesi, Atatürk Parkı, piknik alanları, aquapark'],
  ["Şanlıurfa Gece Rehberi: Sıra Gecelerinden Balıklıgöl\'de Gece Yürüyüşüne", 'sehir-rehberi',
    'Sıra gecesi nedir nasıl katılınır, gece açık kafeler, Balıklıgöl gece manzarası, güvenlik, restoranlar'],
  ["Şanlıurfa'da Müzeler: Ziyaret Rehberi, Saatler ve Öneriler", 'sehir-rehberi',
    'Şanlıurfa Arkeoloji Müzesi, Göbeklitepe müzesi, Haleplibahçe mozaikleri, bilet fiyatları, açılış kapanış saatleri 2026'],
  ["Şanlıurfa'da Alışveriş: Kapalı Çarşıdan AVM\'ye Nerede Ne Alınır?", 'sehir-rehberi',
    'Kapalı çarşı isot ve bakır, hediyelik eşya, AVM listesi, yöresel ürünler nereden alınır, pazarlık kültürü'],

  // === SAĞLIK VE SPA (+4) ===
  ["Hilvan ve Bozova Kaplıcaları Karşılaştırması: Şanlıurfa Termal Rehberi", 'saglik-ve-spa',
    'Hilvan kaplıca tesisleri, Bozova termal, su sıcaklıkları, fiyatlar 2026, nasıl gidilir, aile uygun mu'],
  ["Şanlıurfa'da Manevi Şifa: Ruhsal Yenilenme ve Meditasyon Mekanları", 'saglik-ve-spa',
    'Hz. İbrahim mağarası, Balıklıgöl sessiz saatler, Mevlid Halil Camii, Deyrulzafaran manastırı yakın, meditasyon'],
  ["Şanlıurfa'da Organik ve Yerel Gıda: Sağlıklı Beslenme Mekanları ve Pazarlar", 'saglik-ve-spa',
    'Organik pazar yerleri, köy ürünleri satış noktaları, semt pazarları, isot ve şıllık sağlık faydaları, doğal ürünler'],
  ["Şanlıurfa'da Aktif Turizm: Hiking, Bisiklet ve Doğa Yürüyüşü Rotaları", 'saglik-ve-spa',
    'Tektek Dağları hiking rotaları, Atatürk Barajı çevresi bisiklet, Halfeti kayak, mesafe ve zorluk dereceleri'],

  // === KONAKLAMA (+3) ===
  ["Şanlıurfa'da Hostel ve Bütçe Konaklama: Sırt Çantalı Gezgin Rehberi", 'konaklama',
    'Şanlıurfa hostel seçenekleri, ucuz pansiyon, oda-kahvaltı evleri, Balıklıgöl yakını, gecelik fiyatlar 2026'],
  ["Şanlıurfa'da Uzun Dönem Kiralık: Aylık Apart Otel ve Rezidans Rehberi", 'konaklama',
    'Ay bazı kiralık, apart otel, mobilyalı daire, öğrenci ve çalışan için konaklama, mahalle seçimi, fiyat aralığı'],
  ["Halfeti\'de Konaklama: Fırat Kıyısında Butik Otel ve Konuk Evi Seçenekleri", 'konaklama',
    'Halfeti otel listesi 2026, Fırat manzaralı odalar, tekne turuna yakın, Rumkale yakını, gecelik fiyatlar'],
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
  console.log(`\n📰 Batch 7 — ${BLOGS.length} blog yazısı üretiliyor...\n`);

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
  const targetCats = ['seyahat', 'arkeoloji', 'sehir-rehberi', 'saglik-ve-spa', 'konaklama'];
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
      COUNT(*) FILTER (WHERE category='seyahat') as seyahat,
      COUNT(*) FILTER (WHERE category='arkeoloji') as arkeoloji,
      COUNT(*) FILTER (WHERE category='sehir-rehberi') as sehir,
      COUNT(*) FILTER (WHERE category='saglik-ve-spa') as saglik,
      COUNT(*) FILTER (WHERE category='konaklama') as konaklama
    FROM blog_posts WHERE status='published'
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Batch 7: ${ok} yeni | ${skip} mevcut | ${fail} hata`);
  console.log(`📊 Toplam blog: ${stats.total}`);
  console.log(`   seyahat:${stats.seyahat} arkeoloji:${stats.arkeoloji} sehir-rehberi:${stats.sehir} saglik-ve-spa:${stats.saglik} konaklama:${stats.konaklama}`);
}

main().catch(e => { console.error(e); process.exit(1); });
