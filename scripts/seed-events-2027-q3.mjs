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

const LOCAL_PORT = 15658;

const EVENTS = [
  // === TEMMUZ 2027 ===
  {
    slug: 'uluslararasi-gobeklitepe-festivali-2027',
    title: 'Uluslararası Göbeklitepe Kültür Festivali 2027',
    description: 'İnsanlık tarihinin sıfır noktası kabul edilen Göbeklitepe\'nin gölgesinde düzenlenen Uluslararası Göbeklitepe Kültür Festivali; arkeoloji, müzik, sanat ve gastronomiyi bir arada sunmaktadır. Festival boyunca dünya genelinden gelen arkeologların katıldığı konferanslar, açık hava konserler, geleneksel Urfa müziği performansları ve yöresel yemek stantları yer almaktadır. Gündüz Göbeklitepe sahasında yapılan uzman rehberli turlar, akşam ise Balıklıgöl çevresindeki Sıra Gecesi gösterileriyle devam etmektedir. Şanlıurfa\'nın uluslararası platformdaki en büyük kültürel buluşmasıdır.',
    start_date: '2027-07-04T10:00:00',
    end_date: '2027-07-07T23:00:00',
    location: 'Göbeklitepe Sahası ve Şanlıurfa Merkez',
    organizer: 'Şanlıurfa Valiliği ve Kültür Bakanlığı',
    category: 'Kültür',
    capacity: 20000,
    is_online: false,
    is_free: false,
    price: 0,
    tags: ['göbeklitepe', 'uluslararası', 'festival', 'arkeoloji', 'kültür', 'müzik'],
  },
  {
    slug: 'halfeti-gece-teknesi-turu-2027',
    title: 'Halfeti Gece Teknesi Turu — Yaz 2027',
    description: 'Halfeti\'nin göz alıcı nehir manzarasını gün batımından sonra deneyimlemenizi sağlayan bu özel gece teknesi turu; Fırat\'ın sularında yıldızların altında rehberli bir yolculuk sunmaktadır. Tekne turu boyunca sular altındaki eski köy kalıntıları ve kayalıklardaki Rum Kale yansımaları gözlemlenebilmektedir. Yerel müzisyenlerin eşliğinde Halfeti\'ye özgü türküler seslendirilmekte, yolculuk boyunca ikramlar sunulmaktadır. Yaz gecelerinin en serin ve romantik etkinliklerinden biri olan bu tur, kısıtlı kontenjanla düzenlenmektedir.',
    start_date: '2027-07-12T20:00:00',
    end_date: '2027-07-12T23:00:00',
    location: 'Halfeti İskelesi, Şanlıurfa',
    organizer: 'Halfeti Turizm Girişimcileri Derneği',
    category: 'Turizm',
    capacity: 120,
    is_online: false,
    is_free: false,
    price: 200,
    tags: ['halfeti', 'tekne turu', 'gece', 'fırat', 'yaz', 'romantik'],
  },
  {
    slug: 'sanliurfa-yuzme-sampiyonasi-2027',
    title: 'Şanlıurfa Açık Hava Yüzme Şampiyonası 2027',
    description: 'Şanlıurfa Spor İl Müdürlüğü\'nün organize ettiği Açık Hava Yüzme Şampiyonası; 8-18 yaş ve büyükler kategorisinde yüzücülerin rekabet ettiği bölgesel bir spor etkinliğidir. Şehrin olimpik ölçülerdeki açık hava yüzme havuzunda gerçekleşen yarışlarda 50m, 100m ve 200m stilleri yer almaktadır. Yarışların yanı sıra başlangıç seviyesi için yüzme kursları ve su güvenliği seminerleri de program kapsamında sunulmaktadır. Başarılı sporcular Türkiye Yüzme Federasyonu tarafından düzenlenen ulusal seçmelere davet edilmektedir.',
    start_date: '2027-07-19T09:00:00',
    end_date: '2027-07-19T17:00:00',
    location: 'Şanlıurfa Olimpik Yüzme Havuzu',
    organizer: 'Şanlıurfa Spor İl Müdürlüğü',
    category: 'Spor',
    capacity: 500,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['yüzme', 'spor', 'şampiyona', 'gençlik', 'yarışma'],
  },
  {
    slug: 'yaz-geceleri-konserleri-temmuz-2027',
    title: 'Yaz Geceleri Açık Hava Konserleri — Temmuz 2027',
    description: 'Temmuz\'un serin gecelerinde Balıklıgöl kıyısında düzenlenen bu açık hava konser serisi; Türk pop, klasik Türk müziği ve bölgeye özgü halk müziği yorumlarını kapsayan zengin bir program sunmaktadır. Şanlıurfa\'nın tanınan yerel sanatçıları ve ulusal düzeyde tanınan isimlerle sahneye çıkan konserlerin tamamı ücretsizdir. Su üzerindeki ışık gösterisi eşliğinde gerçekleşen bu akşam buluşmaları; aileler, çiftler ve müzik severler için eşsiz yaz anları yaratmaktadır. Etkinlik alanında yerel lezzet stantları açık tutulmaktadır.',
    start_date: '2027-07-25T20:00:00',
    end_date: '2027-07-25T23:30:00',
    location: 'Balıklıgöl Açık Hava Sahnesi, Şanlıurfa',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi Kültür İşleri',
    category: 'Konser',
    capacity: 3500,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['konser', 'açık hava', 'yaz', 'balıklıgöl', 'müzik', 'temmuz'],
  },
  {
    slug: 'urfa-geleneksel-sporlar-festivali-2027',
    title: 'Urfa Geleneksel Sporlar ve Güreş Festivali 2027',
    description: 'Şanlıurfa\'nın köklü sporiva kültürünü yaşatan bu festival; yağlı güreş, cirit oyunu, at yarışı ve okçuluk gibi geleneksel spor dallarının gösterilerini bir araya getirmektedir. Bölgenin en deneyimli güreşçilerinin katıldığı müsabakalar heyecan verici anlara sahne olmaktadır. Geleneksel kıyafetlerle gerçekleştirilen cirit gösterileri izleyicilere tarihin derinliklerine yolculuk yaptırmaktadır. Çocuklar için özel tasarlanmış okçuluk denemesi ve mini cirit alanı da etkinliğin vazgeçilmez bölümleri arasındadır.',
    start_date: '2027-07-30T09:00:00',
    end_date: '2027-07-31T18:00:00',
    location: 'Karaköprü Spor Alanı, Şanlıurfa',
    organizer: 'Şanlıurfa Geleneksel Sporlar Derneği',
    category: 'Spor',
    capacity: 4000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['güreş', 'cirit', 'geleneksel sporlar', 'yağlı güreş', 'festival'],
  },

  // === AĞUSTOS 2027 ===
  {
    slug: 'harran-antik-festivali-2027',
    title: 'Harran Antik Kent Festivali 2027',
    description: 'Harran\'ın binlerce yıllık tarihi dokusunda, konik kubbeli evlerin gölgesinde düzenlenen Harran Antik Kent Festivali; tarih, kültür ve sanatı eşsiz bir atmosferde buluşturmaktadır. Festival süresince Harran Arkeoloji Müzesi\'nde özel sergi açılışları, geleneksel giysilerle yapılan tarihi yürüyüş turları, Harran mutfağından özel lezzetler ve el sanatları çarşısı etkinlikleri yer almaktadır. Harran Üniversitesi\'nin ev sahipliğinde gerçekleştirilen akademik paneller; alanın tarihsel önemini geniş kitlelere aktarmaktadır. Gece ise Harran Kalesi\'nin siluetinde bölge sanatçılarının konseri düzenlenmektedir.',
    start_date: '2027-08-07T10:00:00',
    end_date: '2027-08-09T22:00:00',
    location: 'Harran Antik Kenti, Şanlıurfa',
    organizer: 'Harran Belediyesi ve Şanlıurfa Valiliği',
    category: 'Kültür',
    capacity: 8000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['harran', 'antik kent', 'festival', 'tarih', 'kültür', 'arkeoloji'],
  },
  {
    slug: 'acik-hava-sira-gecesi-agustos-2027',
    title: 'Açık Hava Sıra Gecesi — Ağustos 2027',
    description: 'Şanlıurfa\'nın en özgün geleneklerinden Sıra Gecesi; Ağustos\'un yıldızlı gecelerinde Balıklıgöl kıyısında açık hava formatında hayat bulmaktadır. Geleneksel sıra gecesi topluluklarından oluşan gruplar; ud, ney, keman ve darbuka eşliğinde klasik Urfa türkülerini ve makamlarını seslendirmektedir. Seyirciler halka açık alanlarda oturarak hem müziği dinlemekte hem de mirra kahvesi ve meyve ikramlarından yararlanmaktadır. Şanlıurfa\'yı ziyaret edenlere bölgenin en otantik kültürel deneyimlerinden birini sunan bu gece; rezervasyonla katılım gerektirmektedir.',
    start_date: '2027-08-14T20:30:00',
    end_date: '2027-08-14T24:00:00',
    location: 'Balıklıgöl Meydanı, Şanlıurfa',
    organizer: 'Şanlıurfa Kültür ve Sanat Vakfı',
    category: 'Konser',
    capacity: 800,
    is_online: false,
    is_free: false,
    price: 75,
    tags: ['sıra gecesi', 'urfa müziği', 'açık hava', 'geleneksel', 'mirra'],
  },
  {
    slug: 'gobeklitepe-gece-turu-agustos-2027',
    title: 'Göbeklitepe Gün Batımı ve Gece Turu — Ağustos 2027',
    description: 'Göbeklitepe\'nin mistik atmosferini gün batımında ve gece yıldız ışığında deneyimlemek için tasarlanan bu özel tur; sınırlı katılımcıya olağanüstü bir arkeolojik deneyim sunmaktadır. Uzman arkeolog rehberler eşliğinde yapılan turun gün batımı bölümünde tapınak alanının dramatik silueti, gece bölümünde ise eski anıtların projektörler altındaki gizemli görünümü keşfedilmektedir. Türkiye\'nin en az ışık kirliliğine sahip bölgelerinden birinde yıldız gözlemi de programın özel kısmını oluşturmaktadır. Biletler önceden satın alınmalıdır.',
    start_date: '2027-08-21T18:30:00',
    end_date: '2027-08-21T22:30:00',
    location: 'Göbeklitepe Arkeoloji Sahası, Şanlıurfa',
    organizer: 'Şanlıurfa Arkeoloji Müzesi',
    category: 'Turizm',
    capacity: 150,
    is_online: false,
    is_free: false,
    price: 250,
    tags: ['göbeklitepe', 'gece turu', 'arkeoloji', 'yıldız gözlemi', 'rehberli tur'],
  },
  {
    slug: 'mezopotamya-fotograf-sergisi-2027',
    title: 'Mezopotamya Fotoğraf Sergisi — Şanlıurfa 2027',
    description: 'Şanlıurfa Arkeoloji Müzesi koridorlarında açılan Mezopotamya Fotoğraf Sergisi; Türkiye\'nin ve dünyanın önde gelen belgesel fotoğrafçılarının Güneydoğu Anadolu ve Mezopotamya havzasından derlediği 150 özgün eseri sergilemektedir. Göbeklitepe, Harran, Halfeti, Karaköprü ve bölgenin ıssız köylerini belgeleyen fotoğraflar; toprağın hafızasını ve insanın tarihle olan diyaloğunu güçlü bir biçimde aktarmaktadır. Sergi boyunca fotoğraf atölyeleri ve sanatçıyla söyleşi etkinlikleri de düzenlenmektedir.',
    start_date: '2027-08-28T10:00:00',
    end_date: '2027-09-20T18:00:00',
    location: 'Şanlıurfa Arkeoloji Müzesi, Şanlıurfa',
    organizer: 'Türkiye Fotoğraf Sanatı Federasyonu',
    category: 'Sergi',
    capacity: 1000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['fotoğraf', 'sergi', 'mezopotamya', 'belgesel', 'sanat', 'arkeoloji'],
  },
  {
    slug: 'uzum-hasadi-senligi-2027',
    title: 'Üzüm Hasadı Şenliği — Şanlıurfa 2027',
    description: 'Ağustos sonunda Şanlıurfa bağlarında başlayan üzüm hasadını kutlayan bu şenlik; bölgenin köklü bağcılık geleneğini ve üzümden elde edilen geleneksel ürünleri tanıtmaktadır. Katılımcılar üzüm hasadına bizzat eşlik ederek geleneksel bağ bozumu etkinliğini deneyimlemekte; ardından pestil, köme, şıra, üzüm pekmezi ve sirke yapım atölyelerine katılabilmektedir. Yerel tüm üzüm çeşitleri ve bu üzümlerden üretilen geleneksel Urfa atıştırmalıkları sergilenmekte ve tadıma sunulmaktadır. Müzik eşliğinde gerçekleşen bu kırsal şenlik, şehir yaşamının dışına çıkmak isteyenler için ideal bir kaçış noktasıdır.',
    start_date: '2027-08-29T09:00:00',
    end_date: '2027-08-29T18:00:00',
    location: 'Bağlar İlçesi Bağ Alanları, Şanlıurfa',
    organizer: 'Şanlıurfa Ziraat Odası',
    category: 'Gastronomi',
    capacity: 1000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['üzüm', 'hasat', 'şenlik', 'pestil', 'geleneksel', 'bağcılık'],
  },

  // === EYLÜL 2027 ===
  {
    slug: 'uluslararasi-urfa-kultur-festivali-2027',
    title: 'Uluslararası Şanlıurfa Kültür ve Turizm Festivali 2027',
    description: 'Her yıl Eylül ayında düzenlenen Uluslararası Şanlıurfa Kültür ve Turizm Festivali, şehrin geçmiş ile geleceği buluşturan en kapsamlı festivalidir. Dünyadan 30\'dan fazla ülkenin katıldığı bu festivalde; dünya müziği konserleri, geleneksel kostüm gösterileri, uluslararası gastronomi yarışmaları ve kültürel diyalog panelleri yer almaktadır. Beş gün boyunca şehrin farklı noktalarında eş zamanlı etkinlikler düzenlenmekte; Gölbaşı\'ndan Tarihi Çarşı\'ya kadar tüm güzergahlar kültürel aktivitelerle canlanmaktadır. Turizm sektörünün en önemli tanıtım platformlarından biridir.',
    start_date: '2027-09-05T10:00:00',
    end_date: '2027-09-09T23:00:00',
    location: 'Şanlıurfa Gölbaşı ve Tarihi Mekânlar',
    organizer: 'Şanlıurfa Valiliği ve Kültür Bakanlığı',
    category: 'Kültür',
    capacity: 25000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['uluslararası', 'festival', 'kültür', 'turizm', 'dünya müziği', 'eylül'],
  },
  {
    slug: 'halfeti-triatlon-2027',
    title: 'Halfeti Fırat Triatlon 2027',
    description: 'Halfeti\'nin eşsiz doğal ortamında yüzme, bisiklet ve koşudan oluşan Fırat Triatlon; güzergahı boyunca Fırat\'ın mavi sularını, bağlı yolları ve tarihi köy sokaklarını bir araya getirmektedir. Sprint ve olimpik mesafede iki kategori sunan yarışmaya hem bölgesel hem ulusal sporcular katılmaktadır. Fırat\'ta yüzme parkurundan başlayıp Halfeti kırsalında bisiklet turunu ve tarihi kasabada koşuyla sonlanan tur; sporcular için görsel bir şölenle birleşmektedir. Finişe ulaşan tüm katılımcılara özel tasarım madalya verilmektedir.',
    start_date: '2027-09-13T07:00:00',
    end_date: '2027-09-13T14:00:00',
    location: 'Halfeti İlçesi, Şanlıurfa',
    organizer: 'Şanlıurfa Triatlon Kulübü',
    category: 'Spor',
    capacity: 400,
    is_online: false,
    is_free: false,
    price: 150,
    tags: ['triatlon', 'halfeti', 'fırat', 'yüzme', 'bisiklet', 'koşu'],
  },
  {
    slug: 'sonbahar-muzik-gunleri-2027',
    title: 'Sonbahar Müzik Günleri — Şanlıurfa 2027',
    description: 'Yazın sıcaklığının hafiflemesiyle Şanlıurfa sokaklarını müzikle dolduran Sonbahar Müzik Günleri; üç gün boyunca şehrin tarihi meydanlarında ve açık hava sahnelerinde ücretsiz konserler sunmaktadır. Türk sanat müziği, Kürtçe halk müziği, Süryanice geleneksel ezgiler ve çağdaş fusyon performansları programda yer almaktadır. Konserler Balıklıgöl, Gümrük Hanı avlusu ve Şanlıurfa Kalesi eteklerindeki tarihi mekânlarda gerçekleşmektedir. Şehrin çok kültürlü müzik mirasını yansıtan bu organizasyon, her yıl artan katılımla bölgenin sevilen etkinlikleri arasına girmiştir.',
    start_date: '2027-09-19T17:00:00',
    end_date: '2027-09-21T23:00:00',
    location: 'Balıklıgöl, Gümrük Hanı ve Şanlıurfa Kalesi',
    organizer: 'Şanlıurfa Büyükşehir Belediyesi',
    category: 'Konser',
    capacity: 5000,
    is_online: false,
    is_free: true,
    price: 0,
    tags: ['müzik', 'sonbahar', 'konser', 'açık hava', 'çok kültürlü', 'eylül'],
  },
  {
    slug: 'sogmatar-antik-gece-turu-2027',
    title: 'Soğmatar Antik Gezegen Tapınakları Gece Turu 2027',
    description: 'Antik dönemin yedi gezegen kültüne adanmış tapınaklarını barındıran Soğmatar\'da; yıldız dolu gökyüzü altında gerçekleştirilen bu gece turu, astronomik ve arkeolojik bir keşfi birleştirmektedir. Uzman arkeologlar ve amatör astronomların ortak rehberlik ettiği turda; Soğmatar\'ın antik tapınak platformları, Süryanice yazıtlar ve gökyüzündeki gezegenlerin bu platformlarla ilişkisi aktarılmaktadır. Işık kirliliğinin neredeyse hiç olmadığı bu bölgede portatif teleskoplarla gezegen gözlemi de yapılmaktadır. Türkiye\'nin en özgün gece turizm deneyimlerinden biridir.',
    start_date: '2027-09-26T19:00:00',
    end_date: '2027-09-26T23:30:00',
    location: 'Soğmatar Antik Kenti, Şanlıurfa',
    organizer: 'Şanlıurfa Turizm Rehberleri Derneği ve Harran Üniversitesi Astronomi Kulübü',
    category: 'Turizm',
    capacity: 80,
    is_online: false,
    is_free: false,
    price: 200,
    tags: ['soğmatar', 'gece turu', 'arkeoloji', 'astronomi', 'gezegen', 'yıldız'],
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
  console.log('\n📅  2027 Q3 Etkinlikleri (Temmuz–Eylül, 15 etkinlik)...\n');
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
