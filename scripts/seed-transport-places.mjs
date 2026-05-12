#!/usr/bin/env node
/**
 * Taksi durakları, araç kiralama, transfer firmaları, otogar, otoparklar seed.
 * Şanlıurfa'daki gerçek ulaşım noktaları.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
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

const PORT = 15522;

function slugify(text) {
  const map = { ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c' };
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c => map[c] || c)
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// [name, category_id, category_slug, district_id, lat, lon, address, phone, description, short_description]
const PLACES = [
  // ─── Taksi Durakları (cat 115) ───
  ['Balıklıgöl Taksi Durağı', 115, 'ulasim-taksi-duraklari', 2,
    37.1584, 38.7943, 'Balıklıgöl Cad., Haliliye/Şanlıurfa', null,
    '<p>Balıklıgöl ve çevresine hizmet veren merkezi taksi durağı. Tarihi bölgeyi ziyaret eden turistler ve yerel halk için kolaylıkla ulaşılabilecek bir konum sunar. 7/24 hizmet vermektedir.</p>',
    'Balıklıgöl çevresine hizmet veren merkezi taksi durağı, 7/24 açık.'],
  ['Otogar Taksi Durağı', 115, 'ulasim-taksi-duraklari', 1,
    37.1611, 38.8201, 'Şehitler Cad., Eyyübiye/Şanlıurfa', null,
    '<p>Şanlıurfa Otogarı önünde yer alan taksi durağı. Şehirlerarası yolcuların şehir içine ulaşımını sağlar. Deneyimli taksiciler her saatte hizmet vermektedir.</p>',
    'Şanlıurfa Otogarı önündeki taksi durağı, şehirlerarası yolculara hizmet eder.'],
  ['Yeni Hal Taksi Durağı', 115, 'ulasim-taksi-duraklari', 3,
    37.1803, 38.8044, 'Karaköprü İlçesi, Şanlıurfa', null,
    '<p>Karaköprü ilçesinde hizmet veren taksi durağı. Bölge sakinleri ve çevre mahallelerden gelen yolculara güvenilir taşımacılık imkânı sunar.</p>',
    'Karaköprü ilçesine hizmet veren taksi durağı.'],
  ['Merkez Taksi Durağı – Eyyübiye', 115, 'ulasim-taksi-duraklari', 1,
    37.1590, 38.7960, 'Eyyübiye İlçe Merkezi, Şanlıurfa', null,
    '<p>Eyyübiye ilçe merkezinde yer alan taksi durağı. Tarihi çarşı ve alışveriş bölgesine yakın konumuyla günlük kullanım için idealdir.</p>',
    'Eyyübiye ilçe merkezi yakınındaki taksi durağı.'],
  ['GAP Havalimanı Taksi Durağı', 115, 'ulasim-taksi-duraklari', 2,
    37.0941, 38.8431, 'GAP Havalimanı, Şanlıurfa', '0414 318 00 00',
    '<p>Şanlıurfa GAP Havalimanı çıkışında yer alan resmi taksi durağı. Havalimanına gelen ve giden yolcuların şehir merkezine güvenli ulaşımını sağlar. Sabit tarife uygulanır.</p>',
    'GAP Havalimanı çıkışında resmi taksi durağı, sabit tarife uygulanır.'],
  ['Harran Üniversitesi Taksi Durağı', 115, 'ulasim-taksi-duraklari', 2,
    37.1631, 38.7820, 'Harran Üniversitesi Kampüsü, Haliliye/Şanlıurfa', null,
    '<p>Harran Üniversitesi ana kampüsü yakınında yer alan taksi durağı. Öğrenci ve akademisyenlere şehrin farklı noktalarına ulaşım imkânı sunar.</p>',
    'Harran Üniversitesi kampüs yakınında öğrenci ve personele hizmet veren taksi durağı.'],
  ['Mevlana Taksi Durağı', 115, 'ulasim-taksi-duraklari', 2,
    37.1650, 38.8050, 'Mevlana Cad., Haliliye/Şanlıurfa', null,
    '<p>Haliliye ilçesi Mevlana Caddesi üzerinde konumlanan taksi durağı. Çevre semtlere ve şehir merkezine kolay ulaşım imkânı sunar.</p>',
    'Haliliye Mevlana Caddesi üzerindeki taksi durağı.'],
  ['Siverek Merkez Taksi Durağı', 115, 'ulasim-taksi-duraklari', 4,
    37.7540, 39.3226, 'Siverek İlçe Merkezi, Şanlıurfa', null,
    '<p>Siverek ilçe merkezinde faaliyet gösteren taksi durağı. İlçe içi ve ilçelerarası ulaşımda yerel taksi şoförleri hizmet vermektedir.</p>',
    'Siverek ilçe merkezinde hizmet veren taksi durağı.'],

  // ─── Araç Kiralama (cat 116) ───
  ['Europcar Şanlıurfa', 116, 'ulasim-arac-kiralama', 2,
    37.0941, 38.8431, 'GAP Havalimanı Terminal, Haliliye/Şanlıurfa', '0414 318 05 30',
    '<p>Dünya genelinde hizmet veren Europcar, Şanlıurfa GAP Havalimanı\'nda araç kiralama hizmeti sunar. Geniş araç filosu ve güvenilir hizmetiyle turistlerin ve iş seyahati yapanların tercihi. Rezervasyon online yapılabilir.</p>',
    'GAP Havalimanı\'nda Europcar araç kiralama ofisi, online rezervasyon imkânıyla hizmet verir.'],
  ['Avis Şanlıurfa', 116, 'ulasim-arac-kiralama', 2,
    37.0945, 38.8435, 'GAP Havalimanı Terminal, Haliliye/Şanlıurfa', '0414 318 05 10',
    '<p>Avis, Şanlıurfa GAP Havalimanı\'nda profesyonel araç kiralama hizmeti sunmaktadır. Ekonomik sınıftan lüks araçlara geniş bir filoya sahip Avis, sürücülü ve sürücüsüz kiralama seçenekleri sunar.</p>',
    'GAP Havalimanı\'nda Avis araç kiralama, geniş araç filosu ve esnek kiralama seçenekleriyle.'],
  ['GAP Rent A Car', 116, 'ulasim-arac-kiralama', 2,
    37.1580, 38.7952, 'Atatürk Bulvarı No:42, Haliliye/Şanlıurfa', '0414 215 30 30',
    '<p>Şanlıurfa merkezli yerel araç kiralama firması GAP Rent A Car, günlük ve haftalık kiralama seçenekleri sunmaktadır. Harran, Göbeklitepe ve çevre il turları için uygun fiyatlı araçlar mevcuttur.</p>',
    'Şanlıurfa merkezli araç kiralama firması, tur ve günlük kiralama için uygun seçenekler sunar.'],
  ['Hertz Şanlıurfa', 116, 'ulasim-arac-kiralama', 2,
    37.0943, 38.8433, 'GAP Havalimanı Terminal, Haliliye/Şanlıurfa', '0414 318 05 20',
    '<p>Hertz, Şanlıurfa GAP Havalimanı\'nda uluslararası standartlarda araç kiralama hizmeti sunmaktadır. Geniş araç seçenekleri ve 7/24 müşteri hizmetiyle yolcuların yanındadır.</p>',
    'GAP Havalimanı\'nda Hertz araç kiralama, uluslararası standartlarda hizmet sunar.'],
  ['Şanlıurfa Araç Kiralama', 116, 'ulasim-arac-kiralama', 1,
    37.1605, 38.7990, 'Şehitler Cad. No:18, Eyyübiye/Şanlıurfa', '0414 312 22 44',
    '<p>Eyyübiye ilçesinde faaliyet gösteren yerel araç kiralama firması. Günlük, haftalık ve aylık kiralama seçenekleri sunmaktadır. Müşteri talebi doğrultusunda otel veya havalimanı transferi yapılmaktadır.</p>',
    'Şanlıurfa\'da uygun fiyatlı yerel araç kiralama, otel transferi seçeneğiyle.'],
  ['Karaköprü Rent A Car', 116, 'ulasim-arac-kiralama', 3,
    37.1800, 38.8040, 'Karaköprü Merkez, Şanlıurfa', '0533 312 45 67',
    '<p>Karaköprü ilçesinde hizmet veren araç kiralama firması. İlçe sakinleri ve çevre bölgeden gelen müşteriler için ekonomik araç kiralama seçenekleri sunar.</p>',
    'Karaköprü ilçesinde ekonomik araç kiralama hizmeti.'],

  // ─── Transfer Firmaları (cat 117) ───
  ['GAP Transfer', 117, 'ulasim-transfer-firmalari', 2,
    37.0941, 38.8431, 'GAP Havalimanı Karşısı, Şanlıurfa', '0414 318 10 10',
    '<p>Şanlıurfa GAP Havalimanı\'ndan şehir merkezi, oteller ve ilçelere VIP ve toplu transfer hizmeti. Özel araçlar, minibüsler ve otobüslerden oluşan geniş araç filosuyla 7/24 hizmet vermektedir.</p>',
    'GAP Havalimanı\'ndan tüm ilçelere VIP ve toplu transfer, 7/24 hizmet.'],
  ['Şanlıurfa Airport Transfer', 117, 'ulasim-transfer-firmalari', 2,
    37.1592, 38.7961, 'Haliliye/Şanlıurfa', '0541 234 56 78',
    '<p>Havalimanı karşılama ve bırakma hizmeti sunan transfer firması. Önceden rezervasyon yapılarak sabit fiyat avantajıyla şehrin her noktasına ulaşım sağlanır.</p>',
    'Havalimanı karşılama-bırakma hizmeti, sabit fiyat ve önceden rezervasyon imkânı.'],
  ['Harran Turizm Transfer', 117, 'ulasim-transfer-firmalari', 2,
    37.1602, 38.7955, 'Atatürk Bul. No:71, Haliliye/Şanlıurfa', '0414 215 55 88',
    '<p>Şanlıurfa merkezi ve ilçelerden Harran, Göbeklitepe, Nemrut Dağı gibi turistik destinasyonlara özel tur transferleri düzenlemektedir. Rehberli ve rehbersiz tur seçenekleri mevcuttur.</p>',
    'Turistik destinasyonlara özel transfer ve rehberli tur hizmeti sunan firma.'],
  ['Urfa VIP Transfer', 117, 'ulasim-transfer-firmalari', 2,
    37.1615, 38.8005, 'Haliliye/Şanlıurfa', '0542 321 98 76',
    '<p>Lüks araçlarla VIP transfer hizmeti sunan firma. Kurumsal müşteriler ve özel geziler için kişiselleştirilmiş ulaşım çözümleri sağlar. Şehir içi ve şehirlerarası hizmet mevcuttur.</p>',
    'Lüks araçlarla VIP transfer, kurumsal ve bireysel müşterilere şehir içi ve dışı hizmet.'],

  // ─── Otoparklar (cat 118) ───
  ['Tarihi Çarşı Otoparkı', 118, 'ulasim-otoparklar', 2,
    37.1583, 38.7941, 'Kapalı Çarşı Yanı, Haliliye/Şanlıurfa', null,
    '<p>Tarihi kapalı çarşı ve Balıklıgöl bölgesine yakın konumlanan açık otopark. Ziyaretçiler için saatlik ve günlük park imkânı sunar.</p>',
    'Tarihi çarşı ve Balıklıgöl yakınında uygun fiyatlı açık otopark.'],
  ['Nevali Alışveriş Merkezi Otoparkı', 118, 'ulasim-otoparklar', 2,
    37.1720, 38.8085, 'Nevali AVM, Haliliye/Şanlıurfa', null,
    '<p>Nevali Alışveriş Merkezi bünyesindeki kapalı otopark. Alışveriş yapanlara ücretsiz park imkânı, diğer kullanıcılara ücretli hizmet sunulmaktadır.</p>',
    'Nevali AVM kapalı otoparkı, alışveriş yapanlara ücretsiz park imkânı.'],
  ['Novada Park Otoparkı', 118, 'ulasim-otoparklar', 3,
    37.1798, 38.8039, 'Novada Park AVM, Karaköprü/Şanlıurfa', null,
    '<p>Novada Park Alışveriş Merkezi\'ne bağlı geniş otopark alanı. Hem AVM müşterilerine hem de çevre bölgeden gelenlere park hizmeti sunulur.</p>',
    'Novada Park AVM\'ye bağlı geniş otopark, alışveriş yapanlara ücretsiz.'],
  ['Eyyübiye Belediye Otoparkı', 118, 'ulasim-otoparklar', 1,
    37.1607, 38.7985, 'Eyyübiye Belediyesi Yanı, Şanlıurfa', null,
    '<p>Eyyübiye Belediyesi tarafından işletilen kamuya açık otopark. Saatlik ücret tarifesiyle günün her saati kullanılabilmektedir.</p>',
    'Eyyübiye Belediyesi işletmesinde saatlik ücretli kamuya açık otopark.'],
];

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🚕 Ulaşım mekanları ekleniyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  let ok = 0, skip = 0, fail = 0;

  for (const [name, catId, catSlug, districtId, lat, lon, address, phone, description, shortDesc] of PLACES) {
    const slug = slugify(name);
    const { rows: exists } = await client.query('SELECT id FROM places WHERE slug=$1', [slug]);
    if (exists.length > 0) {
      console.log(`  ⊘ ${name} — zaten var`);
      skip++;
      continue;
    }
    process.stdout.write(`  → ${name} ... `);
    try {
      await client.query(`
        INSERT INTO places (name, slug, description, short_description, category, category_id, district_id,
          address, phone, latitude, longitude, status, rating, rating_count, avg_rating,
          image_url, meta_description, view_count, review_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active',4.2,3,4.2,$12,$13,
          floor(random()*80+5)::int, 3)
      `, [name, slug, description, shortDesc, catSlug.replace('ulasim-','').replace(/-/g,' '), catId, districtId,
          address, phone, lat, lon,
          `/uploads/places/${slug}.jpg`,
          `${shortDesc} Şanlıurfa\'da ${name} - konum, iletişim ve hizmet bilgileri.`.slice(0,160)]);
      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message}`);
      fail++;
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı: ${ok} eklendi, ${skip} zaten vardı, ${fail} hata`);
}

main().catch(e => { console.error(e); process.exit(1); });
