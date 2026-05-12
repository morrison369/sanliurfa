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

const LOCAL_PORT = 15655;

const EVENTS = [
  // === NİSAN 2027 ===
  {
    slug: 'nevruz-bahari-festivali-2027',
    title: 'Nevruz Baharı Kültür Festivali 2027',
    description: 'Şanlıurfa Belediyesi tarafından düzenlenen Nevruz Baharı Kültür Festivali, baharın gelişini geleneksel Güneydoğu Anadolu törenleriyle kutlamaktadır. Atış gösterileri, halk dansları, ateş yakma ritüelleri ve yerel müzik performanslarıyla zenginleştirilen festival; şehrin kültürel çeşitliliğini tüm canlılığıyla yansıtmaktadır. Aileler ve çocuklar için el sanatları atölyeleri, geleneksel oyunlar ve Urfa mutfağından özel lezzetler sunulmaktadır. Bölge halkının yüzyıllardır kutladığı Nevruz geleneğini yaşatmak amacıyla düzenlenen bu şenlik, ziyaretçilere unutulmaz bir kültürel deneyim yaşatmaktadır.',
    start_date: '2027-04-01T10:00:00',
    end_date: '2027-04-03T22:00:00',
    location: 'Karaköprü Şehir Parkı, Şanlıurfa',
    organizer: 'Şanlıurfa Belediyesi Kültür İşleri Müdürlüğü',
    category: 'Kültür',
    capacity: 5000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['nevruz', 'bahar', 'festival', 'halk dansları', 'kültür'],
  },
  {
    slug: 'tarihi-mekanlar-fotograf-yarismasi-2027',
    title: 'Tarihi Mekânlar Fotoğrafçılık Yarışması 2027',
    description: 'Şanlıurfa Kültür ve Turizm İl Müdürlüğü\'nün organize ettiği bu fotoğrafçılık yarışması; Göbeklitepe, Harran, Balıklıgöl, Halfeti ve Şanlıurfa Kalesi gibi eşsiz tarihi mekânları mercek altına almaktadır. Amatör ve profesyonel fotoğrafçıların katılabileceği yarışmada; doğa, mimari, kültürel yaşam ve arkeoloji olmak üzere dört ayrı kategori bulunmaktadır. Birinci seçilen fotoğraflar Şanlıurfa Arkeoloji Müzesi\'nde sergilenecek; dereceye giren eserlerin sahiplerine ödül töreniyle plaket ve para ödülü verilecektir. Başvurular çevrimiçi olarak yapılabilmektedir.',
    start_date: '2027-04-06T09:00:00',
    end_date: '2027-04-07T18:00:00',
    location: 'Şanlıurfa Arkeoloji Müzesi, Şanlıurfa',
    organizer: 'Şanlıurfa Kültür ve Turizm İl Müdürlüğü',
    category: 'Kültür',
    capacity: 300,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['fotoğrafçılık', 'yarışma', 'tarihi mekanlar', 'sanat', 'kültür'],
  },
  {
    slug: 'sanliurfa-bahar-yemek-festivali-2027',
    title: 'Şanlıurfa Bahar Yemek Festivali 2027',
    description: 'Baharın ilk ışıklarıyla Şanlıurfa sokaklarını geleneksel lezzetlerle donatan Şanlıurfa Bahar Yemek Festivali, yöresel mutfağın en seçkin örneklerini bir araya getirmektedir. Festivalde canlı pişirme gösterileri, usta aşçılarla masterclass etkinlikleri ve ziyaretçilerin de katılabileceği tarif yarışmaları yer almaktadır. Urfa kebabı, ciğer kebabı, lahmacun, kadayıf ve baklava gibi ikonik lezzetlerin yanı sıra az bilinen yöresel yemekler de tanıtılmaktadır. Çocuklara yönelik mini aşçılık atölyeleri ve halk müziği eşliğinde şenlikli bir ortam sunulmaktadır.',
    start_date: '2027-04-14T11:00:00',
    end_date: '2027-04-15T22:00:00',
    location: 'Gümrük Hanı ve Kapalı Çarşı, Şanlıurfa',
    organizer: 'Şanlıurfa Gastronomi Derneği',
    category: 'Gastronomi',
    capacity: 3000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['gastronomi', 'yemek festivali', 'urfa mutfağı', 'bahar', 'kültür'],
  },
  {
    slug: 'bahar-konserleri-sanliurfa-2027',
    title: 'Bahar Konserleri — Şanlıurfa Nisan 2027',
    description: 'Şanlıurfa Büyükşehir Belediyesi Şehir Orkestrası, bahar konserleri serisi kapsamında iki konser vermektedir. Türk Sanat Müziği ve Türk Halk Müziği eserlerinden oluşan repertuvar; bölgenin sevilen bestecilerine ve Şanlıurfa türkülerine özel bir bölüm içermektedir. Sıra gecesi geleneğinden esinlenen ikinci konser; ud, saz, darbuka ve keman eşliğinde Şanlıurfa\'nın geleneksel müzikal kimliğini özgün bir biçimde yansıtmaktadır. Konserler ücretsiz ve açık hava ortamında gerçekleşmektedir; tüm yaş grupları davetlidir.',
    start_date: '2027-04-20T19:30:00',
    end_date: '2027-04-20T22:00:00',
    location: 'Balıklıgöl Açık Hava Tiyatrosu, Şanlıurfa',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
    category: 'Konser',
    capacity: 2000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['konser', 'müzik', 'türk sanat müziği', 'sıra gecesi', 'bahar'],
  },
  {
    slug: 'halfeti-kano-yarislari-2027',
    title: 'Halfeti Fırat Kano Yarışları 2027',
    description: 'Halfeti\'nin eşsiz nehir manzarası eşliğinde düzenlenen Fırat Kano Yarışları, ulusal ve uluslararası kanocu takımlarını Fırat\'ın berrak sularında buluşturmaktadır. Baraj gölünün sakin sularında gerçekleşen yarışlar; hem rekabetçi sporcular hem de ailelerin keyifle izleyeceği bir etkinlik olarak öne çıkmaktadır. Yarış günü boyunca Halfeti\'nin ünlü siyah gülleri ve nehir üzeri tekne turları ziyaretçilere sunulmaktadır. Etkinlik alanında yerel lezzetler ve el sanatları stantları da yer almaktadır.',
    start_date: '2027-04-25T09:00:00',
    end_date: '2027-04-26T17:00:00',
    location: 'Halfeti İskelesi, Şanlıurfa',
    organizer: 'Halfeti Kaymakamlığı ve Şanlıurfa Spor İl Müdürlüğü',
    category: 'Spor',
    capacity: 1500,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['kano', 'halfeti', 'fırat', 'spor', 'nehir'],
  },

  // === MAYIS 2027 ===
  {
    slug: 'sanliurfa-kultur-sanat-haftasi-2027',
    title: 'Şanlıurfa Kültür ve Sanat Haftası 2027',
    description: 'Her yıl Mayıs ayında düzenlenen Şanlıurfa Kültür ve Sanat Haftası, şehrin zengin medeniyetler mirasını sahne sanatları, görsel sanatlar ve geleneksel el sanatları aracılığıyla yaşatmaktadır. Bir hafta süren etkinlik programında tiyatro gösterileri, sergi açılışları, halk dansı gösterileri, şiir okuma etkinlikleri ve sanatçı buluşmaları yer almaktadır. Yurt içinden ve yurt dışından konuk sanatçıların katıldığı bu platform; Şanlıurfa\'yı kültür ve sanat alanında ulusal ölçekte öne çıkarmayı hedeflemektedir.',
    start_date: '2027-05-03T10:00:00',
    end_date: '2027-05-09T22:00:00',
    location: 'Şanlıurfa Kültür Merkezi ve çeşitli mekânlar',
    organizer: 'Şanlıurfa Valiliği ve Büyükşehir Belediyesi',
    category: 'Kültür',
    capacity: 10000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['kültür', 'sanat', 'tiyatro', 'sergi', 'halk dansı', 'haftalık program'],
  },
  {
    slug: 'cagdas-sanatlar-sergisi-sanliurfa-2027',
    title: 'Çağdaş Sanatlar Sergisi — Şanlıurfa 2027',
    description: 'Şanlıurfa Güzel Sanatlar Galerisi\'nde açılan Çağdaş Sanatlar Sergisi, Türkiye\'nin dört bir yanından 30 genç sanatçının eserlerini bir araya getirmektedir. Ressam, heykeltıraş ve enstalasyon sanatçılarının katıldığı sergide ortak tema; Mezopotamya\'nın tarihi derinliği ile modern yaşamın kesişimini sanatsal bir dil aracılığıyla yorumlamaktır. Şanlıurfa\'nın antik kültürel dokusundan ilham alan eserler; çağdaş sanat pratikleriyle buluşarak özgün bir etki yaratmaktadır. Sergi ücretsiz olup hafta içi ve hafta sonu ziyaret edilebilmektedir.',
    start_date: '2027-05-10T10:00:00',
    end_date: '2027-05-31T18:00:00',
    location: 'Şanlıurfa Güzel Sanatlar Galerisi',
    organizer: 'Şanlıurfa Kültür ve Sanat Vakfı',
    category: 'Sergi',
    capacity: 500,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['sergi', 'çağdaş sanat', 'mezopotamya', 'resim', 'heykel'],
  },
  {
    slug: 'gobeklitepe-tanitim-gunleri-mayis-2027',
    title: 'Göbeklitepe Tanıtım Günleri — Mayıs 2027',
    description: 'Şanlıurfa Arkeoloji Müzesi\'nin koordinasyonuyla düzenlenen Göbeklitepe Tanıtım Günleri; arkeologlar, tarihçiler ve akademisyenlerin katılımıyla Göbeklitepe araştırmalarının son bulgularını kamuoyuyla paylaşmaktadır. İki günlük program boyunca konferanslar, belgesel gösterimleri, interaktif harita sunumları ve Göbeklitepe\'ye özel uzman rehberli turlar gerçekleşmektedir. Yerleşim tarihinin yeniden yazılmasına katkıda bulunan bu eşsiz arkeolojik alanı daha geniş bir kitleye tanıtmak amacıyla düzenlenen günler, hem yerli hem yabancı katılımcılara açıktır.',
    start_date: '2027-05-17T09:00:00',
    end_date: '2027-05-18T18:00:00',
    location: 'Şanlıurfa Arkeoloji Müzesi ve Göbeklitepe Sahası',
    organizer: 'Şanlıurfa Arkeoloji Müzesi ve Kültür Bakanlığı',
    category: 'Arkeoloji',
    capacity: 800,
    is_online: false,
    is_free: false,
    price: 50,
    tags: ['göbeklitepe', 'arkeoloji', 'konferans', 'tarih', 'araştırma'],
  },
  {
    slug: 'halfeti-laleler-turu-2027',
    title: 'Halfeti Siyah Güller ve Lale Turu 2027',
    description: 'Yalnızca Halfeti\'de yetişen nadir siyah güllerin ve bölgede Mayıs ayında açan rengarenk lalelerin görülmesi için özel olarak düzenlenen bu rehberli tur; Fırat kıyılarında doğa, tarih ve güzelliği bir araya getirmektedir. Katılımcılar teknelerle nehirde tur yapabilmekte, Halfeti\'nin sular altında kalan tarihi Rum Kale köyünü gözlemleyebilmekte ve botanik rehberler eşliğinde nadir çiçek türleri hakkında bilgi alabilmektedir. Fotoğraf severler ve doğa tutkunları için vazgeçilmez bir bahar deneyimidir.',
    start_date: '2027-05-22T08:00:00',
    end_date: '2027-05-24T18:00:00',
    location: 'Halfeti İlçesi, Şanlıurfa',
    organizer: 'Şanlıurfa Turizm Rehberleri Derneği',
    category: 'Turizm',
    capacity: 200,
    is_online: false,
    is_free: false,
    price: 150,
    tags: ['halfeti', 'siyah gül', 'lale', 'doğa', 'tekne turu', 'bahar'],
  },
  {
    slug: 'sanliurfa-maraton-2027',
    title: 'Şanlıurfa Bahar Maratonu 2027',
    description: 'Şanlıurfa\'nın tarihi dokusunu ve doğal güzelliklerini keşfetme fırsatı sunan Şanlıurfa Bahar Maratonu; 5 km, 10 km ve yarı maraton (21 km) olmak üç kategoride sporseverlere kapılarını açmaktadır. Güzergah; Balıklıgöl, Şanlıurfa Kalesi çevresi, tarihi çarşılar ve Atatürk Bulvarı gibi sembolik noktalardan geçmektedir. Tüm yaş gruplarına açık olan etkinliğe Türkiye\'nin dört bir yanından koşucular katılmaktadır. Bitiş çizgisindeki ödül töreninde dereceye girenlere kupa ve özel hediyeler verilmektedir.',
    start_date: '2027-05-30T07:00:00',
    end_date: '2027-05-30T13:00:00',
    location: 'Balıklıgöl — Atatürk Bulvarı, Şanlıurfa',
    organizer: 'Şanlıurfa Atletizm Kulübü ve Büyükşehir Belediyesi',
    category: 'Spor',
    capacity: 3000,
    is_online: false,
    is_free: false,
    price: 100,
    tags: ['maraton', 'koşu', 'spor', 'bahar', 'şanlıurfa'],
  },

  // === HAZİRAN 2027 ===
  {
    slug: 'altin-magara-festivali-2027',
    title: 'Uluslararası Altın Mağara Kültür Festivali 2027',
    description: 'Şanlıurfa\'nın en köklü kültür festivallerinden biri olan Uluslararası Altın Mağara Kültür Festivali, dört gün boyunca yurt içi ve yurt dışından sanatçılar ve toplulukları bir araya getirmektedir. Festival programı; Türk halk müziği konserlerini, uluslararası dans topluluklarının gösterilerini, Şanlıurfa geleneksel kültür sergileri ile yerel halk oyunları yarışmalarını kapsamaktadır. Çocuklar için özel tasarlanmış kültür atölyeleri ve sokak performansları da festival boyunca devam etmektedir. Bölgenin en geniş katılımlı kültür organizasyonlarından birini oluşturan festival, binlerce yerli ve yabancı ziyaretçiyi şehre çekmektedir.',
    start_date: '2027-06-05T10:00:00',
    end_date: '2027-06-08T23:00:00',
    location: 'Gölbaşı ve Balıklıgöl Meydanı, Şanlıurfa',
    organizer: 'Şanlıurfa Valiliği ve Kültür Bakanlığı',
    category: 'Kültür',
    capacity: 15000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['festival', 'uluslararası', 'kültür', 'müzik', 'dans', 'halk oyunları'],
  },
  {
    slug: 'urfa-mutfagi-atolye-2027',
    title: 'Geleneksel Urfa Mutfağı Atölyesi — Haziran 2027',
    description: 'Şanlıurfa\'nın deneyimli aşçıları tarafından yürütülen bu gastronomi atölyesi; katılımcılara Urfa kebabı, lahmacun, ciğer kebabı, çiğ köfte ve katmer gibi ikonik yöresel lezzetlerin sırlarını aktarmaktadır. İki günlük yoğun programa katılan her katılımcı; pişirme tekniklerini bizzat uygulama ve ustalardan birebir geri bildirim alma fırsatı bulmaktadır. Atölye sonunda Şanlıurfa Gastronomi Derneği tarafından sertifika düzenlenmektedir. Kısıtlı kontenjan nedeniyle önceden kayıt zorunludur.',
    start_date: '2027-06-13T09:00:00',
    end_date: '2027-06-14T17:00:00',
    location: 'Şanlıurfa Gastronomi Merkezi',
    organizer: 'Şanlıurfa Gastronomi Derneği',
    category: 'Gastronomi',
    capacity: 60,
    is_online: false,
    is_free: false,
    price: 500,
    tags: ['gastronomi', 'atölye', 'urfa mutfağı', 'pişirme', 'sertifika'],
  },
  {
    slug: 'yaz-acik-hava-konserleri-2027',
    title: 'Yaz Açık Hava Konserleri — Haziran 2027',
    description: 'Balıklıgöl manzarasının büyülü arka planında gerçekleşen Yaz Açık Hava Konserleri, Türk pop, arabesk ve özgün müzik sanatçılarını ücretsiz sahnelerle Şanlıurfa halkıyla buluşturmaktadır. Akşam saatlerinde başlayan konserler; Balıklıgöl\'ün serin sularını ve tarihi atmosferini eşsiz bir müzik deneyimiyle birleştirmektedir. Yerel halk müziği gruplarının mini performanslarıyla başlayan program; ana sanatçıların sahnesine ardından devam etmektedir. Çocuklar ve aileler için sosyal alan, yiyecek-içecek stantları ve anı fotoğraf köşesi de etkinlik boyunca açık tutulmaktadır.',
    start_date: '2027-06-19T19:00:00',
    end_date: '2027-06-19T23:30:00',
    location: 'Balıklıgöl Açık Hava Tiyatrosu, Şanlıurfa',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
    category: 'Konser',
    capacity: 4000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['konser', 'açık hava', 'yaz', 'müzik', 'balıklıgöl'],
  },
  {
    slug: 'el-sanatlari-cini-sergisi-2027',
    title: 'El Sanatları ve Çini Sergisi — Şanlıurfa 2027',
    description: 'Şanlıurfa\'nın köklü el sanatları geleneğini yaşatan ustalar ve genç zanaatkârların eserlerini bir arada sunan bu sergi; bakır işlemeciliği, çini, dokuma, kilim ve ahşap oymacılığı alanlarında yüzlerce orijinal eseri kapsamaktadır. Ziyaretçiler hem eserleri inceleyip satın alabilmekte hem de canlı ustaların çalışmalarını gözlemleyebilmektedir. Geleneksel zanaatlara meraklı çocuklar için kısa süreli çini boyama atölyeleri de programda yer almaktadır. Sergi; Şanlıurfa el sanatlarını gelecek nesillere aktarma vizyonuyla düzenlenmektedir.',
    start_date: '2027-06-25T10:00:00',
    end_date: '2027-06-26T19:00:00',
    location: 'Şanlıurfa Kapalı Çarşı ve Gümrük Hanı',
    organizer: 'Şanlıurfa Esnaf ve Sanatkarlar Odası',
    category: 'Sergi',
    capacity: 2000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['el sanatları', 'çini', 'sergi', 'bakır', 'kilim', 'zanaat'],
  },
  {
    slug: 'birecik-bisiklet-turu-2027',
    title: 'Birecik Fırat Kıyısı Bisiklet Turu 2027',
    description: 'Fırat\'ın kıyısında uzanan yeşil alanlar ve tarihi Birecik Kalesi\'nin gölgesinde düzenlenen bu bisiklet turu, doğa tutkunlarını ve sporseverleri buluşturmaktadır. 25 km ve 50 km olmak üzere iki güzergah seçeneği sunan tur; ailelerin katılabileceği kısa parkuru ve deneyimli bisikletçiler için uzun parkuru kapsamaktadır. Rota boyunca Fırat manzarası, kelaynak kuşları koruma alanı ve eski Birecik evleri gibi özgün manzaralar bisikletçilere eşlik etmektedir. Etkinliğin sonunda katılımcılara ödüller ve özel Birecik bisiklet turu sertifikaları verilmektedir.',
    start_date: '2027-06-27T07:30:00',
    end_date: '2027-06-27T14:00:00',
    location: 'Birecik İskelesi, Birecik İlçesi, Şanlıurfa',
    organizer: 'Birecik Belediyesi ve Şanlıurfa Bisiklet Topluluğu',
    category: 'Spor',
    capacity: 500,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['bisiklet', 'birecik', 'fırat', 'doğa', 'spor', 'kelaynak'],
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
  console.log('\n📅  2027 Q2 Etkinlikleri (Nisan–Haziran, 15 etkinlik)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;

  for (const e of EVENTS) {
    const res = await db.query(
      `INSERT INTO events
         (slug, title, description, start_date, end_date, location, organizer,
          category, capacity, is_online, is_free, price, status, is_featured, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'published',false,$13)
       ON CONFLICT (slug) DO NOTHING`,
      [
        e.slug, e.title, e.description, e.start_date, e.end_date,
        e.location, e.organizer, e.category, e.capacity,
        e.is_online, e.is_free, e.price, e.tags,
      ]
    );
    if (res.rowCount > 0) {
      console.log(`  ✓ [${e.category}] ${e.title}`);
      inserted++;
    } else {
      console.log(`  — ${e.title} (zaten var)`);
      skipped++;
    }
  }

  const { rows: byMonth } = await db.query(
    `SELECT TO_CHAR(start_date,'YYYY-MM') AS ym, COUNT(*) AS cnt
     FROM events WHERE status='published' AND EXTRACT(YEAR FROM start_date)=2027
     GROUP BY ym ORDER BY ym`
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
