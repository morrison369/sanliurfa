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

const LOCAL_PORT = 15660;

const RECIPES = [
  {
    slug: 'tirnaklı-pide',
    name: 'Tırnaklı Pide',
    description: 'Tırnaklı Pide, Şanlıurfa\'ya özgü geleneksel bir pide çeşididir. Adını hamura parmak uçlarıyla açılan girintilerden alan bu pide; sade ya da az malzemeliyken fırın ateşinin yoğun sıcaklığında eşsiz bir kabuk oluşturmaktadır. Tereyağı ya da çökelek ile servis edilen bu ince, çıtır pide; özellikle kahvaltılarda sofraların vazgeçilmez lezzeti olmaktadır. Geleneksel Urfa fırınlarında taşın üzerinde pişirilmesi, hamuruna ayrı bir lezzet katmaktadır.',
    ingredients: [
      '3 su bardağı un', '1 paket instant maya', '1 tatlı kaşığı tuz', '1 tatlı kaşığı şeker', '200 ml ılık su', '1 yemek kaşığı zeytinyağı',
      '2 yemek kaşığı tereyağı (üzeri için)', '1 çay kaşığı çörekotu'
    ],
    instructions: [
      'Un, maya, tuz, şeker ve ılık suyu karıştırın; yumuşak hamur yoğurun.',
      '30 dakika dinlendirin.',
      'Hamuru ince yuvarlak şekle açın.',
      'Parmak uçlarıyla düzenli aralıklarla delikler açın.',
      'Üzerine tereyağı ve çörekotu sürün.',
      '220°C fırında 12-15 dakika, altın rengi olana kadar pişirin.'
    ],
    prep_time: 45,
    cook_time: 15,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-nohut-corbasi',
    name: 'Urfa Nohut Çorbası',
    description: 'Urfa Nohut Çorbası, kuru nohutun et suyu ve baharatlarla uzun süre pişirilmesinden elde edilen; doyurucu, kadifemsi kıvamıyla kış sofralarının baş tacı olan geleneksel bir Şanlıurfa çorbasıdır. İsot biberi ve kimyonun belirgin aromasıyla bu çorba; bölgenin damak tadını yansıtan karakteristik bir lezzete sahiptir. Üzerine gezdirilen sızma zeytinyağı ve kırmızı biber sosu sunumu tamamlamaktadır.',
    ingredients: [
      '2 su bardağı kuru nohut (gece öncesinden ıslatılmış)', '1,5 litre et suyu', '1 büyük soğan (doğranmış)', '3 diş sarımsak', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı isot biberi', '1 tatlı kaşığı kimyon', 'Tuz', 'Sızma zeytinyağı (servis için)'
    ],
    instructions: [
      'Islatılmış nohutları tencereye alın; üzerini 3 cm geçecek kadar su ekleyin ve haşlayın.',
      'Tereyağında soğan ve sarımsağı kavurun.',
      'Süzülmüş nohutları et suyu ile kavrulan soğana ekleyin.',
      'İsot, kimyon ve tuz ekleyin; kısık ateşte 40 dakika pişirin.',
      'Blender ile kısmen ya da tamamen püreleyin.',
      'Üzerine zeytinyağı ve kırmızı biber ile servis yapın.'
    ],
    prep_time: 20,
    cook_time: 60,
    servings: 5,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'soguk-tahin-pekmez',
    name: 'Soğuk Tahin Pekmez Tatlısı',
    description: 'Şanlıurfa\'nın en sevilen geleneksel ikramlarından olan Tahin Pekmez; susam yağından yapılan tahin ile üzüm ya da dut pekmezinin karıştırılmasıyla elde edilen, hem tatlı hem de besleyici bir kahvaltı-tatlı ikilisidir. Ekmekle yenildiğinde tam anlamıyla bir Urfa kahvaltısını temsil eden bu karışım; soğuk servis edildiğinde ferahlatıcı bir yaz tatlısına dönüşmektedir. Tahini zeytinyağıyla hafif inceltip pekmezle katmanlamak bu tarifi farklı kılan inceliktir.',
    ingredients: [
      '4 yemek kaşığı tahin', '4 yemek kaşığı üzüm ya da dut pekmezi', '1 yemek kaşığı zeytinyağı', '1 çay kaşığı susam', 'Dövülmüş ceviz (üzeri için)'
    ],
    instructions: [
      'Tahini zeytinyağıyla karıştırarak kıvamını açın.',
      'Derin bir tabağa ya da kasenin tabanına tahin yayın.',
      'Üzerine pekmezi dökün; ikisi birbirine çok fazla karışmasın.',
      'Susam ve dövülmüş cevizle süsleyin.',
      'Buzdolabında 30 dakika soğutun; serin servis yapın.',
      'Yanında tırnaklı pide ya da bazlama ile servis edilir.'
    ],
    prep_time: 10,
    cook_time: 0,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-pazi-sarma',
    name: 'Urfa Pazı Sarması',
    description: 'Urfa Pazı Sarması, asma yaprağı dolmasının bölgesel varyantı olan; büyük pazı yapraklarına pirinç, kıyma, isot ve nane ile doldurulup limon suyuyla pişirilen geleneksel bir Şanlıurfa yemeğidir. Pazı yapraklarının hafif ekşi lezzeti; içindeki baharatlı harçla mükemmel bir uyum yakalamaktadır. Yoğurtla servis edildiğinde Urfa sofralarının en sevilen ev yemeklerinden biri haline gelmektedir.',
    ingredients: [
      '20-25 büyük pazı yaprağı', '200 g dana kıyma', '1 su bardağı pirinç', '1 soğan (ince doğranmış)', '2 yemek kaşığı isot biberi', '1 demet nane', '1 demet dereotu', 'Tuz', 'Karabiber', '2 limon suyu', '2 yemek kaşığı zeytinyağı'
    ],
    instructions: [
      'Pirinçleri yıkayın; kıyma, soğan, isot, nane, dereotu, tuz ve karabiberle karıştırın.',
      'Pazı yapraklarını kaynayan suya daldırın; 30 saniye haşlayın.',
      'Her yaprağa bir yemek kaşığı iç harç koyun; sıkıca sarın.',
      'Tencereye dizin; üzerine limon suyu ve zeytinyağı ekleyin.',
      '1 bardak su ekleyin; kapağı kapalı kısık ateşte 45 dakika pişirin.',
      'Soğumasını bekleyin; yoğurtla servis yapın.'
    ],
    prep_time: 40,
    cook_time: 45,
    servings: 5,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-sebzeli-guvec',
    name: 'Urfa Sebzeli Güveç',
    description: 'Urfa Sebzeli Güveç, çömlek kap içinde yavaş pişirme yöntemiyle hazırlanan; patlıcan, patates, domates, biber ve soğanın et parçalarıyla birleştiği geleneksel bir Şanlıurfa yemeğidir. İsot biber ve çeşitli baharatlarla tatlandırılan güvecin pişim sırasında oluşan buhar, malzemelerin lezzetini kendi içinde harmanlayarak eşsiz bir tat bütünlüğü yaratmaktadır. Fırından doğrudan sofraya gelen çömlek kap, hem görsel hem tat açısından yemeğe prestij katmaktadır.',
    ingredients: [
      '400 g kemikli kuzu eti (küp)', '2 patlıcan', '3 patates', '3 domates', '3 sivri biber', '2 soğan (halka)', '4 diş sarımsak', '2 yemek kaşığı domates salçası', '2 yemek kaşığı isot biberi', '1 tatlı kaşığı kimyon', 'Tuz', 'Zeytinyağı'
    ],
    instructions: [
      'Patlıcan ve patatesleri küp doğrayın; tuzlu suda 15 dakika bekletin.',
      'Güveç kabına sırayla et, soğan, patlıcan, patates, domates ve biberleri dizin.',
      'Sarımsak, salça, isot, kimyon ve tuz karıştırın; üzerine gezdirin.',
      'Zeytinyağı döküp güveci kapatın.',
      '180°C fırında 90 dakika pişirin.',
      'Son 15 dakika kapağı açık bırakın; sıcak servis yapın.'
    ],
    prep_time: 30,
    cook_time: 90,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'haydari-urfa-usulu',
    name: 'Urfa Usulü Haydari',
    description: 'Urfa Usulü Haydari, Şanlıurfa\'nın bol baharatlı damak zevkine göre uyarlanmış bir yoğurt mezesidir. Klasik haydariden farkı; içine eklenen isot biberi, sumak ve ceviz ile daha yoğun ve aromatik bir lezzet profili sunmasıdır. Bu mezeyi zenginleştiren sarımsak miktarı da standart tariflerden belirgin şekilde fazladır. Yöresel ekmeklerle aperatif olarak sunulan Urfa haydari; masaya oturur oturmaz tüketilen ilk lezzetlerden biridir.',
    ingredients: [
      '500 g süzme yoğurt', '4 diş sarımsak (ezilmiş)', '1 demet dereotu (ince kıyılmış)', '1 demet nane (kıyılmış)', '2 yemek kaşığı isot biberi', '1 yemek kaşığı sumak', '50 g ceviz (kıyılmış)', '2 yemek kaşığı sızma zeytinyağı', 'Tuz'
    ],
    instructions: [
      'Süzme yoğurdu geniş bir kaba alın; sarımsak ve tuzu karıştırın.',
      'Dereotu, nane, isot ve sumağı ekleyin; iyice karıştırın.',
      'Kıyılmış cevizlerin yarısını içine katın.',
      'Servis tabağına yayın; kalan ceviz ve zeytinyağıyla süsleyin.',
      'Buzdolabında en az 1 saat dinlendirin; soğuk servis yapın.'
    ],
    prep_time: 15,
    cook_time: 0,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: true,
  },
  {
    slug: 'incirli-tavuk',
    name: 'Urfa İncirli Tavuk',
    description: 'Urfa İncirli Tavuk, Şanlıurfa\'nın ünlü taze ve kuru incirlerini tavuk budu ile harmanlayan; tatlı-baharatlı bir pişirme geleneğini yansıtan özgün bir yemektir. Bölgede yetişen Sarılop inciri ile yapıldığında eşsiz bir tat derinliği yakalayan bu tarif; incirin doğal şekerinin et suyu ile pişerken oluşturduğu sosta kendine özgü bir aromaya bürünmektedir. Pilav ya da bulgurla servis edildiğinde sofraya renk katan hem gösterişli hem de lezzetli bir misafir yemeğidir.',
    ingredients: [
      '6 adet tavuk but', '8-10 adet kuru incir', '2 soğan (ince doğranmış)', '3 diş sarımsak', '1 yemek kaşığı domates salçası', '1 tatlı kaşığı tarçın', '1 tatlı kaşığı karabiber', '1 tatlı kaşığı tuz', '2 yemek kaşığı zeytinyağı', '200 ml et suyu'
    ],
    instructions: [
      'Tavuk butları tuzlanarak zeytinyağında her iki taraftan kızartın.',
      'Kızartılan tavukları tencereye alın.',
      'Aynı yağda soğan ve sarımsağı kavurun; salça ekleyin.',
      'Kavrulan harcı tavuğun üzerine ekleyin.',
      'Kuru incirleri, tarçın, karabiber ve et suyunu ilave edin.',
      'Kapağı kapalı kısık ateşte 45 dakika pişirin; sıcak servis yapın.'
    ],
    prep_time: 20,
    cook_time: 55,
    servings: 4,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-mercimek-kofte',
    name: 'Urfa Mercimek Köftesi',
    description: 'Urfa Mercimek Köftesi, kırmızı mercimeğin ince bulgurla yoğrulduğu ve bolca isot biberi ile soğan eklenerek şekillendirilen bitkisel bir Şanlıurfa köftesidir. Klasik mercimek köftesinden farklı olarak bu tarifin sırrı; haşlanan mercimek ile bulgur oranının hassas tutulması ve soğanın çiğ olarak katılmasıdır. Soğuk servis edildiğinde meze olarak; sıcak ikram edildiğinde ise ana yemek olarak sofralarda yerini almaktadır.',
    ingredients: [
      '1 su bardağı kırmızı mercimek', '1,5 su bardağı ince bulgur', '1 büyük kuru soğan (rendelenmiş)', '4 taze soğan (ince kıyılmış)', '2 yemek kaşığı isot biberi', '1 yemek kaşığı domates salçası', '3 yemek kaşığı zeytinyağı', '1 limon suyu', 'Tuz', 'Maydanoz'
    ],
    instructions: [
      'Mercimeği 2 su bardağı suyla pişirin; su çekilince bulguru ekleyin.',
      'Kapağı kapatıp 20 dakika dinlendirin; mercimek ve bulgur yumuşasın.',
      'Soğan, salça, isot, zeytinyağı, limon suyu ve tuzu ekleyin.',
      'Yoğurun; hamur kıvamına gelince taze soğan ve maydanoz ekleyin.',
      'Ceviz büyüklüğünde oval şekiller verin.',
      'Yeşillikler üzerinde soğuk servis yapın.'
    ],
    prep_time: 40,
    cook_time: 20,
    servings: 6,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: true,
  },
  {
    slug: 'harran-bazlamasi',
    name: 'Harran Bazlaması',
    description: 'Harran Bazlaması, Harran ovasının sac üstünde pişirilme geleneğinden gelen; dışı çıtır, içi yumuşak, mayasız hamurdan yapılan geleneksel bir ekmek çeşididir. Harran\'ın sade ama besleyici mutfak geleneğini yansıtan bu bazlama; hem kahvaltıda hem de öğün aralarında çökelek, tahin ya da taze sebzelerle yenilmektedir. Sacın ısısıyla oluşan siyah lekeler bazlamanın geleneksel simgesini oluşturmaktadır.',
    ingredients: [
      '2 su bardağı un', '1 çay bardağı su', '1 çay bardağı yoğurt', '1 tatlı kaşığı tuz', '1 çay kaşığı karbonat'
    ],
    instructions: [
      'Tüm malzemeleri birleştirip yumuşak hamur yoğurun.',
      '20 dakika dinlendirin.',
      'Hamuru portakal büyüklüğünde parçalara bölün.',
      'Her parçayı ince yuvarlak açın.',
      'Kuru sacı kızdırın; her iki tarafını pişirin (her yüz 2-3 dakika).',
      'Üzerine tereyağı sürün; hemen servis yapın.'
    ],
    prep_time: 30,
    cook_time: 15,
    servings: 6,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-badem-helvasi',
    name: 'Urfa Badem Helvası',
    description: 'Urfa Badem Helvası, öğütülmüş çiğ bademin şeker ve gül suyu ile yoğrularak şekillendirilen; Şanlıurfa\'da özellikle kandil gecelerinde ve bayramlarda ikram edilen geleneksel bir tatlıdır. Bölgede bol miktarda yetişen bademlerin en özgün kullanımlarından olan bu helva; hem doku hem lezzet açısından ticari bademli tatlılardan belirgin biçimde ayrılmaktadır. El yapımı olması ve katkı maddesi içermemesiyle şehrin seçkin misafir ikramları arasında yer almaktadır.',
    ingredients: [
      '300 g çiğ badem (kabuklu ya da kabuksuz)', '150 g pudra şekeri', '2 yemek kaşığı gül suyu', '1 çay kaşığı tarçın', '1 çay kaşığı kakule', 'Antep fıstığı (süsleme için)'
    ],
    instructions: [
      'Bademleri kaynar suya 5 dakika koyun; kabuklarını soyun.',
      'Kurumuş bademleri robotla ince toz haline getirin.',
      'Pudra şekeri, gül suyu, tarçın ve kakuleyi ekleyin.',
      'Yoğurun; hamur kıvamına gelene kadar devam edin.',
      'Küçük oval ya da yuvarlak şekiller verin.',
      'Üzerine Antep fıstığı parçaları yerleştirin; oda sıcaklığında saklayın.'
    ],
    prep_time: 30,
    cook_time: 5,
    servings: 20,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
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
  console.log('\n🍽️  Tarif Batch 9 (10 yeni tarif)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;

  for (const r of RECIPES) {
    const res = await db.query(
      `INSERT INTO recipes
         (slug, name, description, ingredients, instructions,
          prep_time, cook_time, servings, difficulty,
          is_spicy, is_vegetarian, status, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',false)
       ON CONFLICT (slug) DO NOTHING`,
      [
        r.slug, r.name, r.description, r.ingredients, r.instructions,
        r.prep_time, r.cook_time, r.servings, r.difficulty,
        r.is_spicy, r.is_vegetarian,
      ]
    );
    if (res.rowCount > 0) {
      console.log(`  ✓ ${r.name}`);
      inserted++;
    } else {
      console.log(`  — ${r.name} (zaten var)`);
      skipped++;
    }
  }

  const { rows: [stats] } = await db.query(`SELECT COUNT(*) AS total FROM recipes WHERE status='published'`);
  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${inserted} eklendi | ${skipped} atlandı`);
  console.log(`📊 Toplam tarif: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
