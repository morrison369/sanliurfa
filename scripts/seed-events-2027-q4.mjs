#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import pg from 'pg';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_PORT = 15666;

const EVENTS = [
  // === EKİM 2027 ===
  {
    slug: 'sonbahar-hasat-festivali-2027',
    title: 'Şanlıurfa Sonbahar Hasat Festivali 2027',
    description: 'Ekim ayının bereketli toprak kokusunda Şanlıurfa\'nın tarım kültürünü kutlayan Sonbahar Hasat Festivali; incir, üzüm, nar ve pamuk hasatlarını bir arada sergileyen renkli bir köy şenliğine dönüşmektedir. Çiftçiler, üreticiler ve tüketicileri buluşturan festivalde yerel ürün pazarları, hasat pişirme gösterileri ve toprak ürünlerinden elde edilen geleneksel Urfa lezzetlerinin tadım etkinlikleri yer almaktadır. Çocuklar için düzenlenen mini tarım atölyeleri ve hayvan buluşma alanları da festivalin ayrılmaz parçalarını oluşturmaktadır.',
    start_date: '2027-10-04T10:00:00',
    end_date: '2027-10-05T19:00:00',
    location: 'Bağlar İlçesi Tarım Alanları, Şanlıurfa',
    organizer: 'Şanlıurfa Ziraat Odası ve Büyükşehir Belediyesi',
    category: 'Gastronomi',
    capacity: 5000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['hasat', 'sonbahar', 'festival', 'tarım', 'yerel ürün'],
  },
  {
    slug: 'tarihi-fotograflar-sergisi-2027',
    title: 'Şanlıurfa Tarihi Fotoğraflar Sergisi — Ekim 2027',
    description: 'Şanlıurfa\'nın 19. yüzyıl sonu ve 20. yüzyıl başlarına ait nadir arşiv fotoğraflarını ilk kez kamuoyuyla buluşturan bu sergi; şehrin geçmiş yüzyıldaki gündelik yaşamını, çarşılarını, tarihi yapılarını ve insanlarını belgeleyen 200\'den fazla özgün fotoğrafı kapsamaktadır. Şanlıurfa Arkeoloji Müzesi arşivleri ve özel koleksiyonlardan derlenen bu görüntüler; hem bir bellek hem de bir nostalji yolculuğu sunmaktadır. Sergi boyunca fotoğraf tarihçileriyle söyleşi etkinlikleri ve eski mahalle tartışmaları da programda yer almaktadır.',
    start_date: '2027-10-10T10:00:00',
    end_date: '2027-10-31T18:00:00',
    location: 'Şanlıurfa Kültür Merkezi',
    organizer: 'Şanlıurfa Kültür ve Turizm İl Müdürlüğü',
    category: 'Sergi',
    capacity: 2000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['sergi', 'tarihi fotoğraf', 'arşiv', 'nostalji', 'kültür'],
  },
  {
    slug: 'kros-dag-kosusu-sanliurfa-2027',
    title: 'Şanlıurfa Kros ve Dağ Koşusu 2027',
    description: 'Şanlıurfa\'nın engebeli kırsal coğrafyasını parkur olarak kullanan Kros ve Dağ Koşusu; Ekim\'in serin havasında hem rekabetçi sporcular hem de macera tutkunları için eşsiz bir deneyim sunmaktadır. 10 km kros ve 25 km dağ maratonu olmak üzere iki kategoride düzenlenen yarış; Nemrut eteklerini, vadileri ve tarihî höyükleri kapsayan özgün bir güzergahtan geçmektedir. Finişte tüm katılımcılara özel madalya ve Urfa geleneksel ürün paketi verilmektedir.',
    start_date: '2027-10-17T08:00:00',
    end_date: '2027-10-17T14:00:00',
    location: 'Karaköprü Kırsalı, Şanlıurfa',
    organizer: 'Şanlıurfa Atletizm Kulübü',
    category: 'Spor',
    capacity: 600,
    is_online: false,
    is_free: false,
    price: 80,
    tags: ['kros', 'dağ koşusu', 'spor', 'doğa', 'maraton'],
  },
  {
    slug: 'seb-i-arus-anma-2027',
    title: 'Şeb-i Arus Anma Töreni — Şanlıurfa 2027',
    description: 'Hz. Mevlana\'nın vuslat yıldönümü olan Şeb-i Arus; Şanlıurfa\'da tasavvuf müziği konserleri, sema gösterileri ve manevi etkinliklerle anılmaktadır. Şehrin köklü tarikat geleneği ve sufi kültürünü yansıtan bu organizasyon; mevlevi sema törenleri, ney ve ud performansları ile ilahi gecelerini kapsamaktadır. Her yıl binlerce katılımcıyı çeken Şeb-i Arus; Şanlıurfa\'nın inanç turizmi kapsamındaki en önemli kültürel etkinliklerinden birini oluşturmaktadır.',
    start_date: '2027-10-25T19:00:00',
    end_date: '2027-10-25T23:30:00',
    location: 'Şanlıurfa Kültür Merkezi ve Tarihi Camiler',
    organizer: 'Şanlıurfa Müftülüğü ve Kültür Bakanlığı',
    category: 'Kültür',
    capacity: 3000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['mevlana', 'şeb-i arus', 'sema', 'tasavvuf', 'sufi müziği'],
  },
  {
    slug: 'cumhuriyet-bayrami-kutlamalari-sanliurfa-2027',
    title: 'Cumhuriyet Bayramı Kutlamaları — Şanlıurfa 2027',
    description: 'Türkiye Cumhuriyeti\'nin 104. kuruluş yıl dönümünde Şanlıurfa, resmi tören, kutlama konserleri ve halka açık etkinliklerle bayramı coşkuyla karşılamaktadır. Sabah saatlerindeki resmi geçit töreni ve çelenk sunma etkinliklerinin ardından şehrin farklı meydanlarında ücretsiz konserler, halk dansı gösterileri ve Türk bayraklı ışık gösterileri düzenlenmektedir. Gençlik spor etkinlikleri, okul koroları ve belediye bandolarının katıldığı kutlamalar; şehrin tüm semtlerinde eş zamanlı olarak gerçekleşmektedir.',
    start_date: '2027-10-29T09:00:00',
    end_date: '2027-10-29T22:00:00',
    location: 'Atatürk Meydanı ve şehir geneli, Şanlıurfa',
    organizer: 'Şanlıurfa Valiliği',
    category: 'Kültür',
    capacity: 20000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['cumhuriyet bayramı', 'kutlama', 'ulusal bayram', 'konser', 'tören'],
  },

  // === KASIM 2027 ===
  {
    slug: 'gobeklitepe-kesif-yildonumu-2027',
    title: 'Göbeklitepe Keşif Yıldönümü Etkinliği 2027',
    description: 'Göbeklitepe\'nin Klaus Schmidt tarafından keşfinin yıl dönümünde düzenlenen bu özel etkinlik; alanın arkeolojik önemini ve son araştırma bulgularını kamuoyuyla paylaşmaktadır. Türkiye\'nin önde gelen arkeoloji araştırmacılarının katıldığı konferansların ardından Göbeklitepe sahasında özel rehberli tur ve gündoğumu izleme etkinliği gerçekleşmektedir. Dünya genelindeki akademisyenler ve arkeoloji meraklılarının katıldığı bu organizasyon; insanlık tarihinin sıfır noktasını yeniden hatırlatmayı amaçlamaktadır.',
    start_date: '2027-11-01T09:00:00',
    end_date: '2027-11-02T17:00:00',
    location: 'Göbeklitepe Sahası ve Şanlıurfa Arkeoloji Müzesi',
    organizer: 'Şanlıurfa Arkeoloji Müzesi ve Harran Üniversitesi',
    category: 'Arkeoloji',
    capacity: 500,
    is_online: false,
    is_free: false,
    price: 100,
    tags: ['göbeklitepe', 'arkeoloji', 'keşif', 'konferans', 'bilim'],
  },
  {
    slug: 'sonbahar-kultur-konserleri-kasim-2027',
    title: 'Sonbahar Kültür Konserleri — Kasım 2027',
    description: 'Kasım\'ın soğuk akşamlarında Şanlıurfa Kültür Merkezi sahnelerinde gerçekleşen bu konser serisi; Türk sanat müziği, tasavvuf müziği ve Urfa\'ya özgü halk türkülerini bir arada sunmaktadır. Yıl boyunca sürdürülen Sıra Gecesi geleneğini kapalı mekânda yaşatan bu konserler; hem yerel halkın hem de şehri ziyaret eden misafirlerin yoğun ilgisini çekmektedir. Usta saz ve ud ustalarının katılımıyla zenginleştirilen program; Şanlıurfa\'nın müzikal kimliğini tüm derinliğiyle yansıtmaktadır.',
    start_date: '2027-11-08T19:30:00',
    end_date: '2027-11-08T22:30:00',
    location: 'Şanlıurfa Kültür Merkezi',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
    category: 'Konser',
    capacity: 1200,
    is_online: false,
    is_free: false,
    price: 50,
    tags: ['konser', 'türk sanat müziği', 'sıra gecesi', 'tasavvuf', 'kasım'],
  },
  {
    slug: 'harran-kis-arkeoloji-konferansi-2027',
    title: 'Harran Kış Arkeoloji Konferansı 2027',
    description: 'Harran Üniversitesi ev sahipliğinde düzenlenen Kış Arkeoloji Konferansı; Güneydoğu Anadolu bölgesindeki son kazı bulgularını ve arkeolojik araştırmaları ele almaktadır. Harran, Göbeklitepe, Nevali Çori ve bölgedeki diğer Neolitik alanlar üzerine gerçekleştirilen akademik sunumlar; hem uzmanlar hem de akademik meraklılar için değerli bilgiler sunmaktadır. İki günlük konferansın sonunda katılımcılar Harran Antik Kenti\'ne arkeolog rehberli tur düzenlenmektedir.',
    start_date: '2027-11-15T09:00:00',
    end_date: '2027-11-16T17:00:00',
    location: 'Harran Üniversitesi, Şanlıurfa',
    organizer: 'Harran Üniversitesi Arkeoloji Bölümü',
    category: 'Arkeoloji',
    capacity: 400,
    is_online: false,
    is_free: false,
    price: 75,
    tags: ['arkeoloji', 'konferans', 'harran', 'akademik', 'neolitik'],
  },
  {
    slug: 'kis-sofraları-gastronomi-2027',
    title: 'Kış Sofraları Gastronomi Etkinliği — Şanlıurfa 2027',
    description: 'Kış mevsiminin soğuğuna karşı Urfa mutfağının ısındırıcı lezzetlerini öne çıkaran bu gastronomi etkinliği; bittim çorbası, beyran, meftune, sıkma ve çeşitli kış tatlılarının canlı pişirme gösterileriyle sergilendiği özel bir sofra deneyimi sunmaktadır. Katılımcılar Urfa\'nın usta aşçılarıyla aynı anda yemek pişirip tatma fırsatı bulmakta; geleneksel kış mutfağının hikayesini ilk elden öğrenmektedir. Mirra kahvesi ve kış şuruplarıyla tamamlanan program; soğuk Kasım akşamlarını sıcak bir kültür deneyimine dönüştürmektedir.',
    start_date: '2027-11-22T11:00:00',
    end_date: '2027-11-23T20:00:00',
    location: 'Gümrük Hanı, Şanlıurfa',
    organizer: 'Şanlıurfa Gastronomi Derneği',
    category: 'Gastronomi',
    capacity: 500,
    is_online: false,
    is_free: false,
    price: 120,
    tags: ['gastronomi', 'kış yemekleri', 'urfa mutfağı', 'pişirme', 'mirra'],
  },
  {
    slug: 'sanliurfa-satranc-turnuvasi-2027',
    title: 'Şanlıurfa Açık Satranç Turnuvası 2027',
    description: 'Şanlıurfa Satranç Kulübü\'nün düzenlediği bu açık turnuva; her yaştan ve seviyeden satranç oyuncularını bir araya getirmektedir. Çocuk (7-12 yaş), genç (13-18 yaş) ve yetişkin kategorilerinde gerçekleşen turnuvada İsviçre sistemi uygulanmaktadır. Bölge ve ilçelerden katılan rakiplerin karşılaştığı bu satranç organizasyonu; zeka sporlarının gelişimine katkı amacıyla her yıl düzenlenmektedir. Dereceye girenlere kupa ve nakit ödül verilmektedir.',
    start_date: '2027-11-29T09:00:00',
    end_date: '2027-11-30T18:00:00',
    location: 'Şanlıurfa Spor Salonu',
    organizer: 'Şanlıurfa Satranç Kulübü',
    category: 'Spor',
    capacity: 300,
    is_online: false,
    is_free: false,
    price: 30,
    tags: ['satranç', 'turnuva', 'spor', 'zeka', 'gençlik'],
  },

  // === ARALIK 2027 ===
  {
    slug: 'kis-kultur-festivali-aralik-2027',
    title: 'Şanlıurfa Kış Kültür Festivali 2027',
    description: 'Yılın son ayını kültür ve sanatla taçlandıran Şanlıurfa Kış Kültür Festivali; tiyatro, sinema, sergi ve konserlerden oluşan üç günlük yoğun bir program sunmaktadır. Şehrin kültür merkezleri, tarihi hanlar ve kapalı çarşı mekânlarına yayılan festival; Şanlıurfa\'nın 2027 yılı boyunca üretilen kültürel birikimini bir vitrine taşımaktadır. Yılın son büyük buluşması olma niteliğiyle festival; yerel sanatçı, zanaatkâr ve toplulukların eserlerini kamuoyuyla paylaştığı en kapsamlı platform olmaktadır.',
    start_date: '2027-12-05T11:00:00',
    end_date: '2027-12-07T22:00:00',
    location: 'Şanlıurfa Kültür Merkezi ve Tarihi Mekânlar',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
    category: 'Kültür',
    capacity: 10000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['kış', 'festival', 'kültür', 'sanat', 'tiyatro', 'aralık'],
  },
  {
    slug: 'kis-surubu-geleneksel-icecekler-2027',
    title: 'Kış Şurubu ve Geleneksel İçecekler Festivali 2027',
    description: 'Şanlıurfa\'nın kış aylarında hazırlanan geleneksel içecekleri — meyan kökü şurubu, dut şerbeti, vişne suyu, mırra kahvesi ve çeşitli bitki çayları — bu etkinlikte bir araya gelmektedir. Geleneksel usulde hazırlanan içecekler; yerel üreticiler tarafından ziyaretçilere sunulmakta, tarifleri ve şifalı özellikleri anlatılmaktadır. Şehrin büyüklerinden dinlenen sözlü tarih anlatıları eşliğinde her içeceğin Urfa kültüründeki yeri aktarılmaktadır. Soğuk kış gününde sıcak ikramlarla bezeli bu etkinlik; hem keyifli hem öğreticidir.',
    start_date: '2027-12-13T10:00:00',
    end_date: '2027-12-13T18:00:00',
    location: 'Kapalı Çarşı, Şanlıurfa',
    organizer: 'Şanlıurfa Esnaf ve Sanatkarlar Odası',
    category: 'Gastronomi',
    capacity: 1000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['şurup', 'geleneksel içecek', 'mirra', 'meyan kökü', 'kış', 'gastronomi'],
  },
  {
    slug: 'mevlana-anma-sanliurfa-2027',
    title: 'Mevlana Anma ve Sema Töreni — Şanlıurfa Aralık 2027',
    description: 'Her yıl 17 Aralık\'ta tüm dünyada gerçekleştirilen Şeb-i Arus etkinlikleri; Şanlıurfa\'da tasavvuf müziği ve mevlevi sema töreniyle anlam kazanmaktadır. Şehrin manevi atmosferini yansıtan bu gece; ney, rebab ve kudüm eşliğinde gerçekleştirilen sema gösterileriyle ziyaretçileri derin bir huşu içinde bırakmaktadır. Şanlıurfa\'nın Hz. İbrahim geleneğine dayanan derin inanç kültürü; bu törende tasavvufun evrensel diliyle buluşmaktadır. Etkinlik ücretsiz ve herkese açıktır.',
    start_date: '2027-12-17T19:30:00',
    end_date: '2027-12-17T23:00:00',
    location: 'Şanlıurfa Kültür Merkezi',
    organizer: 'Şanlıurfa Müftülüğü',
    category: 'Kültür',
    capacity: 2000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['mevlana', 'sema', 'tasavvuf', 'şeb-i arus', 'manevi', 'aralık'],
  },
  {
    slug: 'yilsonu-konserleri-sanliurfa-2027',
    title: 'Yıl Sonu Kutlama Konserleri — Şanlıurfa 2027',
    description: 'Şanlıurfa, 2027 yılını büyük bir coşkuyla kapatmak için özel bir konser programı düzenlemektedir. Balıklıgöl kıyısında 31 Aralık\'a özel düzenlenen geri sayım etkinliğinde; Türk pop ve halk müziği sanatçılarının ücretsiz konserleri, havai fişek gösterisi ve ışık şovu yer almaktadır. Gece yarısı geri sayımının ardından Urfa\'nın tarihi mekânları ışıl ışıl aydınlatılmakta; yeni yıl sevinciyle dolu kalabalık bir arada kutlama yapmaktadır.',
    start_date: '2027-12-31T20:00:00',
    end_date: '2028-01-01T01:00:00',
    location: 'Balıklıgöl Meydanı, Şanlıurfa',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
    category: 'Konser',
    capacity: 15000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['yılbaşı', 'konser', 'havai fişek', 'kutlama', 'balıklıgöl'],
  },
];

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', LOCAL_PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(LOCAL_PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n📅  2027 Q4 Etkinlikleri (Ekim–Aralık, 15 etkinlik)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;
  for (const e of EVENTS) {
    const res = await db.query(
      `INSERT INTO events (slug,title,description,start_date,end_date,location,organizer,category,capacity,is_online,is_free,price,status,is_featured,tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',false,$13)
       ON CONFLICT (slug) DO NOTHING`,
      [e.slug,e.title,e.description,e.start_date,e.end_date,e.location,e.organizer,e.category,e.capacity,e.is_online,e.is_free,e.price,e.tags]
    );
    if (res.rowCount > 0) { console.log(`  ✓ [${e.category}] ${e.title}`); inserted++; }
    else { console.log(`  — ${e.title} (zaten var)`); skipped++; }
  }

  const { rows: byMonth } = await db.query(
    `SELECT TO_CHAR(start_date,'YYYY-MM') AS ym, COUNT(*) AS cnt FROM events WHERE status='published' AND EXTRACT(YEAR FROM start_date)=2027 GROUP BY ym ORDER BY ym`
  );
  const { rows: [stats] } = await db.query(`SELECT COUNT(*) AS total FROM events WHERE status='published'`);
  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${inserted} eklendi | ${skipped} atlandı`);
  console.log(`📊 Toplam etkinlik: ${stats.total}`);
  console.log('\n2027 ay dağılımı:');
  byMonth.forEach(r => console.log(`  ${r.ym}: ${r.cnt}`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
