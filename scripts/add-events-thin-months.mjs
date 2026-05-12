#!/usr/bin/env node
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

const LOCAL_TUNNEL_PORT = 15535;

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
        });
    });
    ssh.on('error', reject);
  });
}

const EVENTS = [
  // 2027-02 (3 → 5)
  {
    title: 'Şanlıurfa Kış Kültür Festivali',
    slug: 'sanliurfa-kis-kultur-festivali-2027',
    desc: "Şanlıurfa'nın tarihi mekanlarında düzenlenen kış kültür festivali; geleneksel el sanatları, yöresel yemek sunumları, sıra geceleri ve yerel müzisyenlerin katılımıyla beş gün boyunca devam ediyor. Çocuklara yönelik atölye çalışmaları ve tarihi gezi turlarıyla her yaştan ziyaretçiye hitap eden etkinlikte Şanlıurfa kültürü tüm renkleriyle sergileniyor.",
    start: '2027-02-12 10:00', end: '2027-02-16 20:00',
    loc: 'Şanlıurfa Kültür ve Sanat Merkezi',
    org: 'Şanlıurfa Büyükşehir Belediyesi',
    cat: 'Kültür', free: true,
    img: '/uploads/events/kis-kultur-festivali.jpg',
    tags: ['kültür', 'festival', 'geleneksel', 'el sanatları'],
  },
  {
    title: 'Göbeklitepe Kış Rehberli Tur Programı',
    slug: 'gobeklitepe-kis-rehberli-tur-2027',
    desc: "Kış aylarında daha sakin ve odaklı bir keşif deneyimi sunan Göbeklitepe rehberli tur programı; arkeolog eşliğinde tarih öncesi tapınak kompleksinin gizemini açıklayan 90 dakikalık özel gezilerden oluşuyor. Grup sayısının sınırlı tutulduğu bu özel program, her katılımcıya arkeologlarla birebir etkileşim imkânı tanıyor.",
    start: '2027-02-20 09:00', end: '2027-02-21 16:00',
    loc: 'Göbeklitepe Arkeoloji Alanı, Örencik',
    org: 'Şanlıurfa Kültür ve Turizm Müdürlüğü',
    cat: 'Turizm', free: false,
    img: '/uploads/events/gobeklitepe-kis-tur.jpg',
    tags: ['göbeklitepe', 'arkeoloji', 'rehberli tur', 'kış'],
  },

  // 2027-03 (3 → 5)
  {
    title: 'Nevruz Bahar Kutlamaları Şanlıurfa',
    slug: 'nevruz-bahar-kutlamalari-sanliurfa-2027',
    desc: "21 Mart Nevruz'unda Şanlıurfa'nın tarihi meydanlarında kutlanan bahar festivali; ateş yakma geleneği, halk oyunları, renkli kostümler ve yöresel bahar sofraları ile şehrin kültürel dokusunu yansıtıyor. Yerel toplulukların katılımıyla gerçekleşen şenlik, gün boyu süren etkinlikleriyle binlerce ziyaretçiyi ağırlıyor.",
    start: '2027-03-21 10:00', end: '2027-03-21 22:00',
    loc: 'Gümrük Hanı Meydanı, Şanlıurfa',
    org: 'Şanlıurfa Valiliği',
    cat: 'Festival', free: true,
    img: '/uploads/events/nevruz-kutlama.jpg',
    tags: ['nevruz', 'bahar', 'kutlama', 'halk oyunları'],
  },
  {
    title: 'Harran Tarihi Şehir Yürüyüşü',
    slug: 'harran-tarihi-sehir-yuruyusu-2027',
    desc: "UNESCO Dünya Mirası listesindeki Harran antik kenti boyunca düzenlenen rehberli yürüyüş; Harran kulesi, antik cami kalıntıları ve petek evlerin bulunduğu tarihi mahalle dokusunu kapsamlı biçimde keşfediyor. Uzman rehber eşliğinde 4 saatlik güzergah; her katılımcıya Harran uygarlığının sırlarını aktarıyor.",
    start: '2027-03-06 09:00', end: '2027-03-06 14:00',
    loc: 'Harran Antik Kenti, Harran',
    org: 'Harran Üniversitesi Turizm Kulübü',
    cat: 'Turizm', free: false,
    img: '/uploads/events/harran-yuruyus.jpg',
    tags: ['harran', 'yürüyüş', 'tarihi', 'UNESCO'],
  },

  // 2027-04 (2 → 5)
  {
    title: 'Şanlıurfa Uluslararası Fotoğraf Yarışması',
    slug: 'sanliurfa-uluslararasi-fotograf-yarismasi-2027',
    desc: "Göbeklitepe, Harran ve Balıklıgöl başta olmak üzere Şanlıurfa'nın tarihi ve doğal güzelliklerini konu alan uluslararası fotoğraf yarışması; kazanan eserler Kültür Merkezi'nde altı gün boyunca sergileniyor. Profesyonel ve amatör kategorilerde ödüllü yarışmaya tüm dünyadan fotoğrafçılar katılabiliyor.",
    start: '2027-04-05 10:00', end: '2027-04-10 18:00',
    loc: 'Şanlıurfa Kültür Merkezi Sergi Salonu',
    org: 'Şanlıurfa Fotoğrafçılar Derneği',
    cat: 'Sanat', free: true,
    img: '/uploads/events/fotograf-yarismasi-2027.jpg',
    tags: ['fotoğraf', 'sanat', 'yarışma', 'sergi'],
  },
  {
    title: 'Balıklıgöl Bahar Kültür Etkinlikleri',
    slug: 'balikligol-bahar-kultur-etkinlikleri-2027',
    desc: "Balıklıgöl ve çevresinde düzenlenen bahar kültür etkinlikleri; açık hava konserleri, geleneksel zanaat gösterileri, çocuklara yönelik atölye çalışmaları ve yöresel lezzet standlarıyla iki gün boyunca devam ediyor. Tarihi Halilürrahman Gölü kıyısındaki bu bahar şenliği her yıl on binlerce yerli ve yabancı turisti ağırlıyor.",
    start: '2027-04-19 10:00', end: '2027-04-20 21:00',
    loc: 'Balıklıgöl Kültür Parkı',
    org: 'Şanlıurfa Büyükşehir Belediyesi',
    cat: 'Festival', free: true,
    img: '/uploads/events/balikligol-bahar.jpg',
    tags: ['balıklıgöl', 'bahar', 'festival', 'aile'],
  },
  {
    title: 'Urfa El Sanatları ve Tekstil Fuarı',
    slug: 'urfa-el-sanatlari-tekstil-fuari-2027',
    desc: "Şanlıurfa'nın geleneksel bakırcılık, kilim dokumacılığı, kuyumculuk ve nakış sanatlarını bir araya getiren el sanatları fuarı; yüzden fazla ustanın katılımıyla üç gün süren etkinlikte ustaya özel satış ve sipariş imkânı sunuluyor. Kapalı çarşı ve Gümrük Hanı'nın tarihi atmosferinde gerçekleşen fuarda yerel zanaat kültürü yaşatılıyor.",
    start: '2027-04-25 09:00', end: '2027-04-27 19:00',
    loc: 'Şanlıurfa Kapalı Çarşı, Gümrük Hanı',
    org: 'ŞANTESOB',
    cat: 'Kültür', free: true,
    img: '/uploads/events/el-sanatlari-fuari-2027.jpg',
    tags: ['el sanatları', 'tekstil', 'zanaat', 'çarşı'],
  },

  // 2027-08 (3 → 5)
  {
    title: 'Şanlıurfa Yaz Gastronomi Festivali',
    slug: 'sanliurfa-yaz-gastronomi-festivali-2027',
    desc: "Urfa kebabı, ciğer, katmer, lahmacun ve büryan başta olmak üzere Şanlıurfa mutfağının zenginliğini tanıtan yaz gastronomi festivali; ünlü aşçı gösterileri, lezzet yarışmaları ve yöresel ürün pazarıyla üç gün boyunca sürüyor. Gastronomi turizminin önemli buluşma noktası olan festival, 50'yi aşkın katılımcı işletmeyle Şanlıurfa mutfak kültürünü tüm boyutlarıyla yaşatıyor.",
    start: '2027-08-08 11:00', end: '2027-08-10 23:00',
    loc: 'Şanlıurfa Fuar Alanı',
    org: 'Şanlıurfa Ticaret ve Sanayi Odası',
    cat: 'Gastronomi', free: false,
    img: '/uploads/events/yaz-gastronomi-festivali-2027.jpg',
    tags: ['gastronomi', 'yemek', 'urfa kebabı', 'festival'],
  },
  {
    title: 'Harran Yaz Geceleri Kültür Programı',
    slug: 'harran-yaz-geceleri-kultur-2027',
    desc: "Yaz gecelerinde Harran'ın petek evleri ve antik kale altında gerçekleştirilen kültür programı; geleneksel müzik performansları, ışık gösterileri ve açık hava sinemasıyla tarihin içinde unutulmaz anlar yaşatıyor. Üç gece boyunca süren etkinliğin biletleri, önceden rezervasyon gerektiriyor.",
    start: '2027-08-22 20:00', end: '2027-08-24 23:59',
    loc: 'Harran Antik Kalesi, Harran',
    org: 'Şanlıurfa Kültür ve Turizm Müdürlüğü',
    cat: 'Kültür', free: false,
    img: '/uploads/events/harran-yaz-geceleri-2027.jpg',
    tags: ['harran', 'gece', 'müzik', 'kültür'],
  },

  // 2027-09 (3 → 5)
  {
    title: 'Göbeklitepe Keşif ve Bilim Günleri',
    slug: 'gobeklitepe-kesif-bilim-gunleri-2027',
    desc: "Uluslararası arkeologlar ve bilim insanlarının katılımıyla düzenlenen Göbeklitepe sempozyumu; panel tartışmaları, arazi gezileri ve halka açık konferanslarla 12.000 yıllık tarihin sırlarını keşfettiriyor. İki gün boyunca süren etkinliğin konuşmacı listesi ve halka açık arazi gezisi programı web sitesi üzerinden takip edilebilir.",
    start: '2027-09-13 09:00', end: '2027-09-14 18:00',
    loc: 'Harran Üniversitesi Kongre Merkezi',
    org: 'Harran Üniversitesi',
    cat: 'Akademi', free: false,
    img: '/uploads/events/gobeklitepe-bilim-gunleri-2027.jpg',
    tags: ['göbeklitepe', 'arkeoloji', 'sempozyum', 'bilim'],
  },
  {
    title: 'Şanlıurfa Kültür Rotaları Bisiklet Turu',
    slug: 'sanliurfa-kultur-rotalari-bisiklet-2027',
    desc: "Şanlıurfa'nın tarihi çarşıları, camiler, kümbetler ve konaklar boyunca düzenlenen rehberli bisiklet turu; şehrin kültürel katmanlarını keşfeden yaklaşık 25 km'lik güzergahta tarihe dair anekdotlarla zenginleştiriliyor. Gümrük Hanı'ndan başlayan tur, sabah erken saatlerde düzenlenerek güzergah boyunca tarihi noktalar mercek altına alınıyor.",
    start: '2027-09-05 08:00', end: '2027-09-05 13:00',
    loc: 'Gümrük Hanı, Şanlıurfa (Başlangıç Noktası)',
    org: 'Şanlıurfa Bisiklet Derneği',
    cat: 'Turizm', free: false,
    img: '/uploads/events/bisiklet-kultur-turu-2027.jpg',
    tags: ['bisiklet', 'kültür', 'tur', 'spor'],
  },

  // 2027-10 (3 → 5)
  {
    title: 'Uluslararası Göbeklitepe Arkeoloji Kongresi',
    slug: 'uluslararasi-gobeklitepe-arkeoloji-kongresi-2027',
    desc: "Dünya genelinde 300'den fazla arkeolog ve tarihçinin katılacağı uluslararası kongre; Göbeklitepe bulgularının küresel medeniyet tarihine katkısını tartışıyor ve yeni araştırma bulgularını gündeme taşıyor. Üç gün süren kongre boyunca arkeoloji alanındaki son gelişmeler paylaşılıyor ve ortak araştırma projeleri hayata geçiriliyor.",
    start: '2027-10-03 09:00', end: '2027-10-05 18:00',
    loc: 'Şanlıurfa Kültür Merkezi',
    org: 'Kültür ve Turizm Bakanlığı',
    cat: 'Akademi', free: false,
    img: '/uploads/events/gobeklitepe-kongre-2027.jpg',
    tags: ['göbeklitepe', 'kongre', 'arkeoloji', 'uluslararası'],
  },
  {
    title: 'Urfa Hasat ve Sofra Festivali',
    slug: 'urfa-hasat-sofra-festivali-2027',
    desc: "Ekim hasatını kutlayan geleneksel Urfa sofra festivali; tarımsal ürünlerin tanıtımı, çiftçi pazarı, yöresel tariflerle pişirme yarışması ve isot hasatı gösterileriyle şehrin tarım kültürünü yaşatıyor. Şanlıurfa'nın organik tarım ürünleri ve geleneksel mutfak geleneğini bir araya getiren bu etkinlik, iki gün boyunca ziyaretçilerini ağırlıyor.",
    start: '2027-10-17 09:00', end: '2027-10-18 20:00',
    loc: 'Şanlıurfa Fuar Alanı',
    org: 'Şanlıurfa Ziraat Odası',
    cat: 'Gastronomi', free: true,
    img: '/uploads/events/hasat-sofra-festivali-2027.jpg',
    tags: ['hasat', 'tarım', 'gastronomi', 'festival'],
  },

  // 2027-12 (3 → 5)
  {
    title: 'Şanlıurfa Yılsonu Kültür Geceleri',
    slug: 'sanliurfa-yilsonu-kultur-geceleri-2027',
    desc: "Yılın son haftasında Şanlıurfa'nın kültür mekanlarında düzenlenen kapalı ve açık hava konserleri, tiyatro gösterileri ve anı sergisinden oluşan yılsonu kültür programı; şehrin sanat topluluklarını ve ziyaretçileri buluşturuyor. Üç gece boyunca farklı mekanlarda gerçekleşen program; klasik müzik, halk müziği ve çağdaş tiyatro gösterilerinden oluşuyor.",
    start: '2027-12-27 19:00', end: '2027-12-29 23:00',
    loc: 'Şanlıurfa Kültür ve Sanat Merkezi',
    org: 'Şanlıurfa Büyükşehir Belediyesi',
    cat: 'Kültür', free: true,
    img: '/uploads/events/yilsonu-kultur-geceleri-2027.jpg',
    tags: ['yılsonu', 'kültür', 'konser', 'tiyatro'],
  },
  {
    title: 'Kış Yöresel Lezzetler Şöleni',
    slug: 'kis-yoresel-lezzetler-soleni-2027',
    desc: "Aralık soğuğunda Şanlıurfa'nın ısıtıcı yöresel lezzetlerini öne çıkaran kış şöleni; büryan, beyran, kaburga dolması, lebeni ve mırra gibi kış mutfağının zengin ürünleri ustalar tarafından hazırlanıp ikram ediliyor. Kapalı çarşının tarihi atmosferinde, şehrin seçkin aşçı ve esnaflarının bir araya geldiği bu şölen, her yıl bölgenin vazgeçilmez kış etkinlikleri arasına giriyor.",
    start: '2027-12-13 12:00', end: '2027-12-13 21:00',
    loc: 'Şanlıurfa Kapalı Çarşı',
    org: 'Şanlıurfa Aşçılar Derneği',
    cat: 'Gastronomi', free: false,
    img: '/uploads/events/kis-yoresel-lezzetler-2027.jpg',
    tags: ['gastronomi', 'kış', 'yöresel', 'mutfak'],
  },
];

async function main() {
  console.log('\n🎭 İnce aylara yeni etkinlikler ekleniyor...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  let ok = 0, skip = 0;
  for (const e of EVENTS) {
    try {
      const result = await client.query(`
        INSERT INTO app.events (id, title, slug, description, start_date, end_date, location, organizer, category, image_url, is_free, price, is_featured, status, tags, view_count, attendee_count)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, false, 'published', $11, 0, 0)
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
      `, [e.title, e.slug, e.desc, e.start, e.end, e.loc, e.org, e.cat, e.img, e.free, e.tags]);
      if (result.rows.length > 0) {
        console.log(`  ✓ ${e.title}`);
        ok++;
      } else {
        console.log(`  — (zaten var) ${e.slug}`);
        skip++;
      }
    } catch (err) {
      console.log(`  ✗ ${e.title}: ${err.message}`);
    }
  }

  // Monthly distribution after
  const { rows: monthDist } = await client.query(`
    SELECT TO_CHAR(start_date, 'YYYY-MM') as month, COUNT(*) as count
    FROM app.events WHERE status='published' AND start_date >= NOW()
    GROUP BY month ORDER BY month ASC
  `);

  const { rows: [total] } = await client.query(`SELECT COUNT(*) as count FROM app.events WHERE status='published'`);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} eklendi, ${skip} zaten vardı`);
  console.log(`📊 Toplam etkinlik: ${total.count}`);
  console.log('\nGüncel aylık dağılım:');
  monthDist.forEach(r => console.log(`  ${r.month}: ${r.count}`));
}

main().catch(e => { console.error(e); process.exit(1); });
