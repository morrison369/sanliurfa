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

const LOCAL_PORT = 15670;

const RECIPES = [
  {
    slug: 'ciger-kavurma',
    name: 'Urfa Ciğer Kavurması',
    description: 'Urfa Ciğer Kavurması, şehrin ünlü ciğer geleneğinin sofraya taşınan hane versiyonudur. Doğranmış kuzu ya da dana ciğeri; bolca soğan, isot biberi ve maydanozla birlikte sacda ya da tavada yüksek ateşte kısa sürede kavrulan bu yemek; dışı çıtır, içi yumuşacık bir doku kazanmaktadır. Şanlıurfa pazarlarında sabah saatlerinde mutlaka rastlanan bu lezzet, ekmek arası ya da yanında salata ile servis edildiğinde ikonik bir Urfa kahvaltısını tamamlamaktadır.',
    ingredients: [
      '500 g kuzu ciğeri (ince dilim)', '2 büyük soğan (halka)', '3 yemek kaşığı isot biberi', '1 demet maydanoz', '2 yemek kaşığı sıvıyağ', 'Tuz', 'Karabiber', '1 limon'
    ],
    instructions: [
      'Ciğerleri ince dilimleyin; tuz ve karabiberle harmanlayın.',
      'Sacı ya da kalın tabanlı tavayı iyice kızdırın.',
      'Yağı ekleyin; soğan halkalarını 3-4 dakika kavurun.',
      'Ciğerleri ekleyin; yüksek ateşte 4-5 dakikada kavurun.',
      'İsot biber ve maydanozu ekleyin; 1 dakika daha karıştırın.',
      'Limon sıkarak sıcak servis yapın.'
    ],
    prep_time: 15,
    cook_time: 10,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'nohutlu-bulgur-pilavi',
    name: 'Nohutlu Bulgur Pilavı',
    description: 'Nohutlu Bulgur Pilavı, Şanlıurfa\'nın günlük sofrasının en temel lezzetlerinden birini oluşturmaktadır. İri bulgur ve haşlanmış nohutun tereyağlı soğan kavurmasıyla bir araya geldiği bu pilav; hem doyurucu hem de ekonomik olmasıyla her öğünde sofraya layık görülmektedir. Üstüne dökülen eritilmiş tereyağı ve servis sırasında eklenen domates salatası ile Urfa usulü bulgur pilavı tüm meziyetlerini ortaya koymaktadır.',
    ingredients: [
      '2 su bardağı iri köy bulguru', '1 su bardağı haşlanmış nohut', '1 büyük soğan (ince doğranmış)', '3 yemek kaşığı tereyağı', '3 su bardağı sıcak et suyu ya da su', 'Tuz', 'Karabiber'
    ],
    instructions: [
      'Tereyağında soğanı altın rengi olana kadar kavurun.',
      'Bulguru ekleyin; 2-3 dakika kavurun.',
      'Nohut, tuz ve karabiberi ekleyin.',
      'Sıcak suyu ya da et suyunu dökün; kaynatın.',
      'Kapağı kapatıp kısık ateşte 20 dakika pişirin.',
      '10 dakika demlenmeye bırakın; çatalla kabartarak servis yapın.'
    ],
    prep_time: 10,
    cook_time: 25,
    servings: 5,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'misket-kofte',
    name: 'Misket Köfte',
    description: 'Misket Köfte, yuvarlak minik köftelerin domates sosunda pişirildiği; çocukların ve büyüklerin sevgilisi geleneksel bir Şanlıurfa yemeğidir. Adını şekil olarak misket bilye büyüklüğünden alan bu köfteler; ince öğütülmüş kıyma, soğan ve baharatlarla yoğrulur. Közlenmiş domates ve biber sosunda pişen küçük köfteler; pirinç pilavı ya da bulgur yanında bütünlük kazanmaktadır.',
    ingredients: [
      '400 g dana kıyma', '1 soğan (rendelenmiş)', '2 dilim bayat ekmek (ıslatılmış)', '1 yumurta', 'Tuz', 'Karabiber', '1 tatlı kaşığı kimyon',
      '3 domates (rendeli)', '2 sivri biber', '1 yemek kaşığı domates salçası', '2 yemek kaşığı zeytinyağı'
    ],
    instructions: [
      'Kıyma, soğan, ekmek, yumurta, tuz, karabiber ve kimyonu yoğurun.',
      'Misket büyüklüğünde yuvarlak köfteler şekillendirin.',
      'Zeytinyağında köfteleri hafif kızartın; tabağa alın.',
      'Aynı yağda salça ve domates rendesini kavurun.',
      'Köfteleri sosun içine alın; kapağı kapalı 20 dakika pişirin.',
      'Maydanoz serperek servis yapın.'
    ],
    prep_time: 25,
    cook_time: 25,
    servings: 4,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'patlican-mucver',
    name: 'Patlıcan Mücver',
    description: 'Patlıcan Mücver, Şanlıurfa\'nın bol patlıcan geleneğini hafif ve çıtır bir meze formatına taşıyan özgün bir tarif olup közlenmiş patlıcanın yoğurt, yumurta ve un ile harmanlanarak yağda kızartılmasından oluşmaktadır. Dışı altın rengi çıtır, içi patlıcanlı yumuşak kıvamıyla bu mücver; hem meze olarak hem de ana yemek tamamlayıcısı olarak sofraya konulmaktadır. Üzerine sürülen sarımsaklı yoğurt ile sunumu tamamlanmaktadır.',
    ingredients: [
      '2 büyük patlıcan (közlenmiş, soyulmuş)', '2 yumurta', '3 yemek kaşığı un', '2 yemek kaşığı yoğurt', '2 diş sarımsak (ezilmiş)', '1 tatlı kaşığı tuz', '1 çay kaşığı isot', 'Kızartma yağı',
      '200 g süzme yoğurt', '2 diş sarımsak (servis için)'
    ],
    instructions: [
      'Közlenmiş patlıcanları ezerek suyunu sıkın.',
      'Yumurta, un, yoğurt, sarımsak, tuz ve isotla harmanlayın.',
      'Kızgın yağda kaşık kaşık mücverleri dökün.',
      'Her iki tarafı altın rengi olana kadar kızartın.',
      'Kağıt havluya alın.',
      'Sarımsaklı yoğurtla servis yapın.'
    ],
    prep_time: 20,
    cook_time: 20,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-soguk-ayva-tatlisi',
    name: 'Urfa Soğuk Ayva Tatlısı',
    description: 'Ayva Tatlısı, sonbahar aylarında Şanlıurfa pazarlarını dolduran yerel ayvaların şeker şerbetinde yumuşayana kadar pişirilmesi ve soğuk servis edilmesiyle hazırlanan geleneksel bir Urfa tatlısıdır. Tarifte damla sakızı ve gül suyu kullanılması bu ayva tatlısını diğer versiyonlardan ayırmaktadır. Üzerine koyulan kaymak ya da dövülmüş cevizle sunulan tatlı; soğuk kış gecelerinde ya da sonbahar sofralarında sevilen bir kapanış lezzetidir.',
    ingredients: [
      '4 büyük ayva', '2 su bardağı şeker', '3 su bardağı su', '1 çay kaşığı damla sakızı (dövülmüş)', '1 yemek kaşığı gül suyu', '1 limon (suyu ve kabuğu)', '50 g ceviz (kıyılmış)', 'Kaymak (servis için)'
    ],
    instructions: [
      'Ayvaları soyun; ikiye bölüp çekirdeklerini alın.',
      'Şeker ve suyu kaynatın; damla sakızı ve limon kabuğunu ekleyin.',
      'Ayvaları şerbete koyun; kısık ateşte 40-45 dakika pişirin.',
      'Gül suyunu ekleyin; birkaç dakika daha kaynatın.',
      'Şerbetinin içinde soğumaya bırakın.',
      'Soğuk servis edin; üzerine kaymak ve ceviz koyun.'
    ],
    prep_time: 15,
    cook_time: 50,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-tas-firin-ekmegi',
    name: 'Urfa Taş Fırın Ekmeği',
    description: 'Urfa Taş Fırın Ekmeği, odun ateşiyle ısıtılmış taş fırınlarda pişirilen; dışı çıtır çıtır, içi gözenekli ve yumuşacık geleneksel bir Şanlıurfa ekmek çeşididir. Uzun mayalama süresi ve taş ısısının bir araya gelmesiyle oluşan eşsiz lezzet; ev fırınlarında tam olarak elde edilemeyen o rustik aromayı yakalamaktadır. Üzerine susamlı ya da çörekotlu çeşitleriyle kahvaltı sofralarının en değerli misafiridir.',
    ingredients: [
      '500 g un', '1 paket kuru maya', '1 tatlı kaşığı tuz', '1 tatlı kaşığı şeker', '300 ml ılık su', '2 yemek kaşığı zeytinyağı',
      '1 yumurta sarısı (üzeri için)', '2 yemek kaşığı susam ya da çörekotu'
    ],
    instructions: [
      'Maya, şeker ve ılık suyu karıştırın; 10 dakika köpürtün.',
      'Una tuz ve maya karışımını ekleyin; zeytinyağıyla yoğurun.',
      '2 saat mayalandırın; hamurun iki katına çıkması beklenir.',
      'Yuvarlak ya da oval şekil verin; yağlı kağıda alın.',
      '30 dakika daha dinlendirin.',
      'Yumurta sarısı sürün; susam ya da çörekotu serpin.',
      '220°C fırında 25-30 dakika, altın rengi olana kadar pişirin.'
    ],
    prep_time: 150,
    cook_time: 30,
    servings: 6,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-domates-corbasi',
    name: 'Urfa Usulü Domates Çorbası',
    description: 'Urfa Usulü Domates Çorbası, olgun Urfa domateslerinin közlenerek pişirilip tarhana ve isot biberiyle harmanlandığı; sıradan domates çorbasından tamamen farklı bir derinliğe sahip geleneksel bir tarif olup yöresel mutfağın sezonluk kış yiyeceği olarak öne çıkmaktadır. Köz aroması ve isotun acısı çorbanın kıvamıyla buluşunca; tek başına bir öğün olabilecek zenginlikte bir tat ortaya çıkmaktadır. Üzerine gezdirilen tereyağı ve kuru nane ile sofralara sunulmaktadır.',
    ingredients: [
      '8 büyük domates (közlenmiş ya da fırınlanmış)', '1 soğan (közlenmiş)', '4 diş sarımsak', '2 yemek kaşığı tarhana', '1 yemek kaşığı isot biberi', '1 litre su ya da et suyu', '2 yemek kaşığı tereyağı', 'Tuz', 'Kuru nane'
    ],
    instructions: [
      'Közlenmiş domates, soğan ve sarımsağı blenderdan geçirin.',
      'Tencereye alın; et suyu ekleyin ve kaynatın.',
      'Tarhanayı soğuk su ile eritin; çorbaya ekleyin.',
      'İsot ve tuz ekleyin; kısık ateşte 20 dakika pişirin.',
      'Tereyağında naneyi kavurun; üzerine gezdirin.',
      'Sıcak servis yapın.'
    ],
    prep_time: 20,
    cook_time: 25,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: true,
  },
  {
    slug: 'kavurga',
    name: 'Kavurga (Urfa Kavrulmuş Buğday)',
    description: 'Kavurga, Şanlıurfa ve Güneydoğu Anadolu\'nun kadim snack geleneğini yansıtan; ham buğdayın ya da nohutun kuru ısıda ya da kızgın kumda kavrulmasıyla elde edilen geleneksel bir atıştırmalıktır. Şanlıurfa pazarlarında ve köy evlerinde yüzyıllardır hazırlanan kavurga; hem lezzetli hem de besleyici yapısıyla sinemalarda mısır gibi, çay yanında leblebi gibi tüketilmektedir. Kabuğu yarılmış, içi altın rengi kavurga; üzerine tuz eklenerek servis edilir.',
    ingredients: [
      '500 g sert buğday ya da nohut', '1 tatlı kaşığı tuz', '1 tatlı kaşığı isot biberi (isteğe bağlı)'
    ],
    instructions: [
      'Buğdayı ya da nohutları yıkayıp kurulayın.',
      'Kalın tabanlı kuru tavayı orta ateşte kızdırın.',
      'Buğdayı ekleyin; sürekli karıştırarak kavurun.',
      'Kabuğu çatlayana ve altın rengi oluşana kadar 20-25 dakika devam edin.',
      'Ocaktan alın; tuz ve isot ile harmanlayın.',
      'Soğuduktan sonra hava almayan kapta saklayın; atıştırmalık olarak servis edin.'
    ],
    prep_time: 5,
    cook_time: 25,
    servings: 8,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-peynirli-gozleme',
    name: 'Urfa Peynirli Gözleme',
    description: 'Urfa Peynirli Gözleme, ince açılmış mayasız hamura taze lor peyniri, maydanoz ve isot biberi doldurularak sacda pişirilen; Şanlıurfa\'nın köy kahvaltılarını ve pazar sabahlarını tamamlayan geleneksel bir lezzettir. El açması hamur inceliği ve lor peynirinin taze aroması bir araya gelince ortaya çıkan bu gözleme; şehrin çay bahçelerinde sabahın erken saatlerinden itibaren servis edilmektedir. Üzerine sürülen tereyağıyla çıtır bir tat katmanı kazanmaktadır.',
    ingredients: [
      '3 su bardağı un', '1 tatlı kaşığı tuz', '200 ml su', '1 yemek kaşığı zeytinyağı',
      '300 g lor peyniri ya da beyaz peynir (ufalanmış)', '1 demet maydanoz (kıyılmış)', '2 yemek kaşığı isot biberi', 'Tereyağı (pişirme için)'
    ],
    instructions: [
      'Un, tuz, su ve yağı yoğurun; 30 dakika dinlendirin.',
      'Peynir, maydanoz ve isotu karıştırın.',
      'Hamuru ince yuvarlak açın; bir yarısına iç harç yayın.',
      'Diğer yarısını üzerine katlayın.',
      'Kızgın sacda ya da tavada tereyağıyla pişirin.',
      'Her iki tarafı altın rengi olana kadar çevirin; sıcak servis edin.'
    ],
    prep_time: 40,
    cook_time: 15,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: true,
  },
  {
    slug: 'keledos',
    name: 'Keledos (Urfa Köy Mantısı)',
    description: 'Keledos, Şanlıurfa\'nın kırsal kesiminde yapılan; standart mantıdan farklı olarak daha büyük ve kaba şekillendirilmiş, haşlanmış hamur içine bolca kıymalı iç harç konulan bir köy mantısı çeşididir. Yörede "kaba mantı" ya da "köy mantısı" olarak da bilinen keledos; çarşamba mantısının rustik akrabasıdır. Üzerine dökülen sarımsaklı yoğurt ve tereyağlı isot sosu; yemeği Urfa mutfağının karakteristik tatlarıyla buluşturmaktadır.',
    ingredients: [
      '2 su bardağı un', '1 yumurta', '1/2 çay kaşığı tuz', 'Su (hamur için)',
      '300 g dana kıyma', '1 soğan (rendelenmiş)', 'Tuz', 'Karabiber', 'İsot',
      '400 g süzme yoğurt', '3 diş sarımsak', '3 yemek kaşığı tereyağı', '1 yemek kaşığı isot'
    ],
    instructions: [
      'Un, yumurta, tuz ve suyla sert hamur yoğurun; 30 dakika dinlendirin.',
      'Kıyma, soğan, tuz, karabiber ve isotu karıştırın.',
      'Hamuru ince açın; büyük kare ya da daire şekiller kesin.',
      'Her parçaya iç harç koyun; kenarları sıkıştırın.',
      'Tuzlu kaynayan suda haşlayın; 12-15 dakika.',
      'Sarımsaklı yoğurt ve tereyağında eritilmiş isot ile servis yapın.'
    ],
    prep_time: 60,
    cook_time: 20,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
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
  console.log('\n🍽️  Tarif Batch 10 (10 yeni tarif)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;
  for (const r of RECIPES) {
    const res = await db.query(
      `INSERT INTO recipes (slug,name,description,ingredients,instructions,prep_time,cook_time,servings,difficulty,is_spicy,is_vegetarian,status,is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',false)
       ON CONFLICT (slug) DO NOTHING`,
      [r.slug,r.name,r.description,r.ingredients,r.instructions,r.prep_time,r.cook_time,r.servings,r.difficulty,r.is_spicy,r.is_vegetarian]
    );
    if (res.rowCount > 0) { console.log(`  ✓ ${r.name}`); inserted++; }
    else { console.log(`  — ${r.name} (zaten var)`); skipped++; }
  }

  const { rows: [stats] } = await db.query(`SELECT COUNT(*) AS total FROM recipes WHERE status='published'`);
  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${inserted} eklendi | ${skipped} atlandı`);
  console.log(`📊 Toplam tarif: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
