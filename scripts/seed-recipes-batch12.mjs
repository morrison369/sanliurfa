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

const LOCAL_PORT = 15702;

const RECIPES = [
  {
    slug: 'bici-bici',
    name: 'Bici Bici',
    description: 'Bici Bici, Şanlıurfa\'nın yaz aylarında vazgeçilmezi olan geleneksel bir tatlı içecektir. Nişastadan yapılan şeffaf, jöle benzeri parçalar; gül suyu, şeker şerbeti ve öğütülmüş buz ile servis edilir. Tatlı-ferahlatıcı dengesiyle hem içecek hem tatlı niteliği taşıyan Bici Bici; Urfa sokaklarında seyyar satıcıların elinde bakır kaplarla satıldığı, çocukluktan kalma bir Şanlıurfa anısıdır. Yazın kavurucu sıcağında adeta bir serinlik abidesi olan bu lezzet; gül suyunun çiçeksi aroması ve burcak şerbetinin derin tatlılığıyla eşsiz bir tat deneyimi sunar.',
    ingredients: [
      '200 g buğday nişastası', '1 litre su', '1/2 bardak toz şeker',
      '2 yemek kaşığı gül suyu', '500 g kıyılmış buz (servis için)',
      '1 çay kaşığı kırmızı gıda boyası (opsiyonel)', '1 bardak şeker şerbeti',
    ],
    instructions: [
      'Nişastayı su ile karıştırıp pişirerek şeffaf jöle elde edin.',
      'Tepsiye yayın ve soğutun; şerit veya küp şeklinde kesin.',
      'Şekeri 1 bardak suda eritip gül suyu ekleyin; şerbeti hazırlayın.',
      'Kâsede kıyılmış buzu yerleştirin, üzerine nişasta parçalarını koyun.',
      'Gül suyu şerbetini dökerek servis yapın.',
    ],
    prep_time: 15,
    cook_time: 20,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'zerde',
    name: 'Zerde',
    description: 'Zerde, Şanlıurfa\'nın özel günlerinde ve düğün sofralarında sunulan safran aromalı geleneksel pirinç tatlısıdır. Altın sarısı rengi safrana borçlu olan bu tatlı; gül suyu, tarçın ve karanfille tatlandırılmış; üzerine nar taneleri, fıstık ve badem serpilerek zenginleştirilmiş bir lezzettir. Osmanlı mutfağından miras kalan Zerde; Şanlıurfa\'da sünnet düğünleri ve nişan törenlerinin vazgeçilmez tatlısıdır. Pişirildiğinde evin her köşesini dolduran safran kokusu; bu tatlının sadece bir lezzet değil, aynı zamanda bir kutlama simgesi olduğunu anlatmaktadır.',
    ingredients: [
      '1 bardak pirinç', '4 bardak su', '1 bardak toz şeker',
      '1 çay kaşığı safran (1 yemek kaşığı ılık suda eritilmiş)', '1 yemek kaşığı gül suyu',
      '1 adet tarçın çubuğu', '4-5 karanfil', '2 yemek kaşığı nişasta',
      'Nar tanesi, fıstık, badem (servis için)',
    ],
    instructions: [
      'Pirinci yıkayıp 30 dakika suda bekletin.',
      'Pirinci su ile kaynatın; erimiş safran, tarçın ve karanfili ekleyin.',
      'Pirinç yumuşayınca şekeri ekleyin; kısık ateşte 10 dakika pişirin.',
      'Nişastayı 3-4 yemek kaşığı soğuk suyla eritin; karıştırarak ekleyin.',
      'Gül suyunu ekleyin; kıvam alınca servis kaselerine dökün.',
      'Soğuyunca nar taneleri, fıstık ve bademle süsleyerek servis yapın.',
    ],
    prep_time: 35,
    cook_time: 30,
    servings: 6,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'yarpuz-corbasi',
    name: 'Yarpuz Çorbası',
    description: 'Yarpuz Çorbası, nane ailesinden yarpuz (pennyroyal) bitkisinin kendine özgü yoğun aromasını ön plana çıkaran; Güneydoğu Anadolu\'nun sarp dağ köylerinden gelen otantik bir çorba tarifidir. Şanlıurfa ve çevresinde kış aylarında sıklıkla pişirilen bu çorba; yarpuzun mentol benzeri taze kokusuyla birlikte yoğurt, kırmızı biber ve sarımsağın derinliğini birleştirir. Sindirim dostu özellikleriyle de bilinen yarpuz; çorbanın hem lezzetini hem de şifalı karakterini belirlemektedir. Köy ekmeğiyle servis edilen bu çorba; Şanlıurfa kırsal mutfağının unutulmaya yüz tutmuş nadir tariflerinden biridir.',
    ingredients: [
      '1 demet taze yarpuz (veya 2 yemek kaşığı kuru yarpuz)', '500 g kuzu eti (küp doğranmış)',
      '1 soğan', '3 diş sarımsak', '1 bardak yoğurt',
      '2 yemek kaşığı tereyağı', '1 yemek kaşığı kırmızı toz biber', 'Tuz, karabiber',
    ],
    instructions: [
      'Kuzuyu soğanla kavurup su ekleyin; 45 dakika pişirin.',
      'Yarpuzu ayıklayıp doğrayın; et suyuna ekleyin.',
      'Sarımsakları ezin; tereyağıyla kavurun, kırmızı biber ekleyin.',
      'Yoğurdu bir kepçe sıcak su ile karıştırın; yavaşça çorbaya ekleyin.',
      'Sarımsaklı tereyağını yoğurt eklendikten sonra üzerine gezdirin.',
      'Tuz ayarlayıp servis yapın.',
    ],
    prep_time: 20,
    cook_time: 55,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'siron',
    name: 'Şiron',
    description: 'Şiron, Şanlıurfa\'nın harman dönemlerine ve uzun kış gecelerine ait geleneksel bir buğday çorbası-yemeğidir. Sert buğdayların (aşurelik buğday) çekilmesiyle elde edilen iri buğday tanelerinin; koyun eti ya da kuzu kemikleriyle saatlerce kaynatılmasıyla hazırlanan Şiron; kıvamıyla çorbayı, besleyiciliğiyle ana yemeği andırır. İçine düşürülen tereyağı ve kırmızı biber eriyen "yağ gezme" ritüeli; servisin olmazsa olmaz tamamlayıcısıdır. Şanlıurfa kırsalında özellikle kış sabahlarında ve yorgunluk giderici olarak tüketilen Şiron; gücünü basit ve derin malzeme kombinasyonundan alır.',
    ingredients: [
      '1 bardak aşurelik buğday (önceden ıslatılmış)', '400 g kuzu kemikli et', '1 soğan',
      '3 yemek kaşığı tereyağı', '1 çay kaşığı kırmızı toz biber',
      '1 çay kaşığı karabiber', 'Tuz', '6 bardak su veya et suyu',
    ],
    instructions: [
      'Islatılmış buğdayı et ve soğanla tencereye alın; su ekleyin.',
      'Kaynamaya başlayınca köpüğü alın; kısık ateşte 1,5-2 saat pişirin.',
      'Et suyu azalırsa sıcak su ekleyin; buğdaylar tamamen açılana dek pişirmeye devam edin.',
      'Et kemikten ayrıldıkça parçalara ayırın; tuz ve karabiber ekleyin.',
      'Tereyağını eritin, kırmızı biber ekleyin; pişmiş Şiron\'un üzerine gezdirin.',
      'Sıcak servis yapın.',
    ],
    prep_time: 15,
    cook_time: 120,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-dut-tatlisi',
    name: 'Urfa Dut Tatlısı',
    description: 'Urfa Dut Tatlısı; Şanlıurfa bölgesinde yetişen siyah ve ak dutların mevsiminde güneşte kurutularak ya da taze haliyle pişirilmesiyle hazırlanan geleneksel bir meyve tatlısıdır. Şanlıurfa\'nın asırlık dut bahçeleri; hem taze meyve hem de kurutulmuş dutun hammaddesi olan dut pekmezini üretmektedir. Bu tatlıda dutlar; şeker, tarçın ve karanfille tatlandırılarak pişirilir; üzerine ceviz veya fıstık serpilir. Bölgede ev yapımı "dut reçeli" ile köy ekmeği kombinasyonu, kahvaltı sofralarının en sevilen lezzetlerinden biridir. Hem sağlıklı hem de doğal şekerinin zenginliğiyle göz alıcı olan bu tatlı; Şanlıurfa meyve geleneğinin zarif bir yansımasıdır.',
    ingredients: [
      '500 g olgun siyah dut', '1/2 bardak toz şeker (dutun tatlılığına göre ayarlanır)',
      '1 adet tarçın çubuğu', '3-4 karanfil', '1 yemek kaşığı limon suyu',
      'Ceviz veya antep fıstığı (servis için)',
    ],
    instructions: [
      'Dutları yıkayıp saplarını temizleyin.',
      'Şeker, tarçın, karanfil ve limon suyu ile birlikte tencereye alın.',
      'Kısık ateşte suyunu salana kadar bekleyin; ara sıra karıştırın.',
      '20-25 dakika kıvam alana dek pişirin.',
      'Tarçın ve karanfili çıkarın; kaselere dökün.',
      'Ilıkken ya da soğuyunca ceviz/fıstık ile servis yapın.',
    ],
    prep_time: 10,
    cook_time: 25,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-sogan-kebabi',
    name: 'Urfa Soğan Kebabı',
    description: 'Urfa Soğan Kebabı; kıyma ve isot biberinin yoğun aromasını iri kıyılmış soğanın tatlılığıyla birleştiren; kömür ateşinde pişirilen geleneksel Şanlıurfa kebabıdır. Soğanın mangal dumanıyla kavrulan tatlı kokusu kıymanın isot biberli sertliğini dengeleyerek eşsiz bir harmoni oluşturur. Yassı köfte formunda hazırlanan bu kebap; ızgarada pişirilirken soğan dilimleri etin yanına yerleştirilir ve birlikte servis edilir. Urfa usulü lavash ekmeğiyle sunulan bu yemek; maydanoz, nar ekşisi ve reyhanla tamamlanan zengin bir tabak oluşturur.',
    ingredients: [
      '600 g koyun kıyması (iki kez çekilmiş)', '3 orta boy soğan',
      '2 yemek kaşığı isot biberi', '1 çay kaşığı karabiber',
      '1 çay kaşığı kimyon', '1 çay kaşığı tuz',
      'Lavash ekmeği, maydanoz, nar ekşisi (servis için)',
    ],
    instructions: [
      'Kıymayı isot, karabiber, kimyon ve tuzla iyice yoğurun.',
      'Islak elimizle yassı oval köfteler şekillendirin; şişe geçirin.',
      'Soğanları iri halka veya dilimler halinde kesin.',
      'Kömür ateşinin üzerinde köfteleri ve soğanları ızgaralayın.',
      'Kebaplar iki yönden de kızarınca soğanlarla birlikte alın.',
      'Lavash üzerinde, maydanoz ve nar ekşisiyle servis yapın.',
    ],
    prep_time: 20,
    cook_time: 15,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'goguc-corbasi',
    name: 'Göğüs Çorbası',
    description: 'Göğüs Çorbası; kuzu ya da sığır göğüs kemiğinin saatlerce kaynatılmasıyla elde edilen yoğun et suyuna; yumuşak bulgur ve baharatların eklenmesiyle hazırlanan besleyici Urfa kış çorbasıdır. Kemikten sızan ilik ve jelatin; çorbaya hem lezzet hem de şifalı bir kıvam katar. Şanlıurfa\'nın soğuk kış sabahlarında sıcak tutmak için tüketilen Göğüs Çorbası; bölgedeki evlerde ocak başı geleneğinin simgesidir. Üzerine dökülen tereyağı-pul biber karışımı ve taze limon suyu; her kaşıkta derinleşen bir tat deneyimi yaratmaktadır.',
    ingredients: [
      '700 g kuzu göğüs kemiği (parçalanmış)', '1/2 bardak orta boy bulgur', '1 soğan',
      '2 diş sarımsak', '2 yemek kaşığı tereyağı', '1 çay kaşığı pul biber',
      '1 çay kaşığı karabiber', 'Tuz', '8 bardak su',
    ],
    instructions: [
      'Göğüs kemiklerini soğan ve sarımsakla tencereye alın; su ekleyin.',
      'Kaynamaya başlayınca köpüğü alın; kısık ateşte 1,5 saat pişirin.',
      'Kemikleri çıkarın; etleri söküp suya geri ekleyin.',
      'Yıkanmış bulguru ilave edip 20 dakika pişirin.',
      'Tuz ve karabiber ile tadını ayarlayın.',
      'Tereyağını eritin, pul biber ekleyin; üzerine gezdirin. Limon ile servis yapın.',
    ],
    prep_time: 15,
    cook_time: 110,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-bahcivan-kebabi',
    name: 'Urfa Bahçıvan Kebabı',
    description: 'Urfa Bahçıvan Kebabı; çeşitli taze sebzelerin kuzu veya dana kıymasıyla birlikte fırında pişirildiği; sebze ve etin mükemmel ahengini temsil eden geleneksel bir Şanlıurfa tencere yemeğidir. Biber, domates, patlıcan ve soğan gibi yazın bolca yetişen Urfa sebzelerinin kıymayla buluştuğu bu yemek; adını bahçenin taze ve bereketli ürünlerinden almaktadır. Fırında uzun süre kavrulan sebzeler; kıymanın baharatlı suyunu emerek tam anlamıyla doyurucu ve derin aromalı bir yemek oluşturur. Şanlıurfa\'nın verimli bahçelerinden gelen ürünlerin en güzel ifadesi olan bu kebap; zeytinyağı ve domates suyuyla buluşunca sofraları parmak ısırtan bir şölen tabağına dönüşür.',
    ingredients: [
      '400 g koyun kıyması', '2 büyük domates', '2 yeşil biber', '1 kırmızı biber',
      '1 patlıcan (küp doğranmış)', '2 soğan (halka)', '3 diş sarımsak',
      '2 yemek kaşığı zeytinyağı', '1 çay kaşığı isot biberi', 'Tuz, karabiber',
    ],
    instructions: [
      'Kıymayı isot, tuz ve karabiberle yoğurun; küçük köfteler hazırlayın.',
      'Tüm sebzeleri doğruyun; zeytinyağıyla harmanlanın.',
      'Geniş fırın kabına önce soğanları ve patlıcanı serin.',
      'Üzerine köfteleri yerleştirin; sebzelerle çevreyin.',
      'Domatesleri üzerine sıkın veya dilimleyerek kapatın.',
      '180°C fırında 50 dakika, üstü altın rengi alana kadar pişirin.',
    ],
    prep_time: 25,
    cook_time: 50,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-sac-tava',
    name: 'Urfa Sac Tava',
    description: 'Urfa Sac Tava; geleneksel sac üzerinde pişirilen; kuzu eti, taze sebze ve isot biberinin harmanlandığı Şanlıurfa\'ya özgü bir et-sebze kavurması tarifidir. Kızgın sac üzerinde çabuk pişirilen et; sebzelerin canlılığını ve isot biberinin derin kırmızı aromasını bünyesinde barındırır. Şanlıurfa\'nın köy düğünlerinde ve açık hava etkinliklerinde büyük sac üzerinde toplu olarak hazırlanan bu yemek; kalabalık sofraların gözdesidir. Sac\'ın verdiği eşsiz "duman kokusu" ve ateşin yakıcı hırsıyla olgunlaşan etler; lavash ekmeği ve sumak soğan salatasıyla mükemmel bir uyum oluşturur.',
    ingredients: [
      '500 g kuzu but (ince dilim)', '2 domates (dilim)', '2 yeşil sivri biber',
      '1 büyük soğan (dilim)', '2 yemek kaşığı isot biberi', '1 çay kaşığı kimyon',
      '2 yemek kaşığı tereyağı veya kuyruk yağı', 'Tuz, karabiber',
      'Lavash ekmeği, sumak, maydanoz (servis için)',
    ],
    instructions: [
      'Kuzu etini ince dilimleyin; isot, kimyon, tuz ve karabiberle marine edin.',
      'Sac veya büyük döküm tavayı çok yüksek ısıda kızdırın.',
      'Tereyağını/kuyruk yağını eriterek marineli etleri yüksek ısıda mühürleyin.',
      'Soğan ve biberleri ekleyin; sürekli çevirerek kavurun.',
      'Domatesleri en son ekleyin; suyunu salana kadar 3-4 dakika kavurun.',
      'Lavash üzerinde, sumak soğan ve maydanozla servis yapın.',
    ],
    prep_time: 15,
    cook_time: 20,
    servings: 3,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'pirasa-salatasi',
    name: 'Pırasa Salatası',
    description: 'Pırasa Salatası; Şanlıurfa mutfağında sade malzemenin büyük lezzet potansiyeli taşıdığını kanıtlayan; haşlanmış ya da çiğ pırasa, zeytinyağı, limon ve nar ekşisinin buluştuğundan oluşan ferahlatıcı bir meze-salata tarifidir. Urfa sofralarında kebap ve ızgara etlerin yanında mutlaka yer alan bu salata; pırasa\'nın hafif acılığını limon ve nar ekşisinin ekşiliğiyle dengelemektedir. İnce kıyılmış maydanoz ve kırmızı biber ile zenginleşen salata; özellikle kış aylarında taze ve sağlıklı bir meze seçeneği sunar. Şanlıurfa tarihî çarşı lokantalarında sofranın sessiz kahramanı olan bu salata; ustalığı sadeliğinde saklayan bir Urfa klâsiğidir.',
    ingredients: [
      '2 büyük pırasa', '3 yemek kaşığı zeytinyağı', '1 limonun suyu',
      '1 yemek kaşığı nar ekşisi', '1/2 demet maydanoz (doğranmış)',
      '1 çay kaşığı kırmızı pul biber', 'Tuz',
    ],
    instructions: [
      'Pırasaları ince halkalar halinde kesin; soğuk suyla yıkayın.',
      'Kaynar tuzlu suda 3-4 dakika haşlayın; soğuk suya alın ve süzün.',
      'Zeytinyağı, limon suyu, nar ekşisi ve tuzu karıştırarak sos hazırlayın.',
      'Pırasa halkalarını sosu ile harmanlayın.',
      'Doğranmış maydanozu ve pul biberi ekleyin.',
      'Buzdolabında 15 dakika dinlendirip servis yapın.',
    ],
    prep_time: 15,
    cook_time: 5,
    servings: 4,
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
  console.log('\n🍽️  Tarif Batch 12 Seed...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let added = 0, skipped = 0;
  for (const r of RECIPES) {
    const res = await db.query(
      `INSERT INTO recipes (slug, name, description, ingredients, instructions, prep_time, cook_time, servings, difficulty, is_spicy, is_vegetarian, cover_image, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,'published',NOW(),NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [r.slug, r.name, r.description, r.ingredients, r.instructions, r.prep_time, r.cook_time, r.servings, r.difficulty, r.is_spicy, r.is_vegetarian]
    );
    if (res.rowCount > 0) { console.log(`  ✓ ${r.slug}`); added++; }
    else { console.log(`  ⊘ ${r.slug} (var)`); skipped++; }
  }

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${added} eklendi | ${skipped} atlandı`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
