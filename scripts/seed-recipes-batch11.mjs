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

const LOCAL_PORT = 15678;

const RECIPES = [
  {
    slug: 'urfa-icli-kofte',
    name: 'Urfa İçli Köfte',
    description: 'Urfa İçli Köfte, kıymalı iç harç ile doldurulan ince bulgur kabuğundan oluşan; hem haşlanarak hem kızartılarak servis edilen geleneksel bir Urfa lezzetidir. Dışındaki ince bulgur tabakası çıtır çıtır olurken içindeki kıymalı, soğanlı ve cevizli harç tüm lezzeti barındırır. Şanlıurfa mutfağında özel günlerin ve misafir sofralarının vazgeçilmezi olan bu köfte, sabırla yoğrulan bulgur hamuru ve özenle hazırlanan iç harcıyla gerçek bir el emeğidir.',
    ingredients: [
      '2 su bardağı ince bulgur', '200 g çekilmiş kıyma (iç)', '1 büyük soğan (iç için)',
      '100 g ceviz içi (iç için)', '2 yemek kaşığı isot biberi', '1 yumurta (hamur için)',
      '1 çay kaşığı tuz', '1 çay kaşığı karabiber', 'Kızartma için sıvıyağ',
    ],
    instructions: [
      'Bulguru ılık suyla ıslatın, 20 dakika bekletin.',
      'Kıyma ve soğanı kavurun; ceviz ve isot ekleyin, iç harcı hazırlayın.',
      'Islanan bulgura yumurta ve tuz ekleyerek yoğurun; cıvık hamur elde edin.',
      'Avuç içine bulgur hamurunu yayın, iç harcı koyun ve kapatarak oval şekil verin.',
      'Yağda her yönden altın rengi alana kadar kızartın.',
      'Havlu kağıda alarak sıcak servis yapın.',
    ],
    prep_time: 40,
    cook_time: 20,
    servings: 6,
    difficulty: 'zor',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'anali-kizli',
    name: 'Analı Kızlı',
    description: 'Analı Kızlı, Şanlıurfa mutfağının en köklü yemeklerinden biridir; adını nohut taneleri ile iri bulgur köftelerinin birbirinin yanında yer almasından alır. Kuzu eti ile pişirilen nohut ve büyük boy yuvarlak bulgur köftelerinden oluşan bu yemek; hem doyurucu hem de derin aromalıdır. Urfa mutfağında kış aylarının ve özel günlerin sofralarını süsleyen Analı Kızlı, sabırlı bir pişirme süreci ve yüksek kaliteli malzeme gerektiren prestijli bir yemektir.',
    ingredients: [
      '500 g kuzu but (küp)', '2 su bardağı kuru nohut (önceden ıslatılmış)', '1 su bardağı iri bulgur',
      '2 yemek kaşığı un (köfte için)', '1 yemek kaşığı tuz', '1 çay kaşığı karabiber',
      '1 çay kaşığı pul biber', '1 soğan', '2 yemek kaşığı tereyağı',
    ],
    instructions: [
      'Nohutu akşamdan ıslatın; kuzuyu tencerede soğanla kavurun.',
      'Nohut ve yeterli suyu ekleyin; 45 dakika pişirin.',
      'Bulguru ıslatın, un ve tuz ile yoğurun; büyük ceviz boyutunda yuvarlaklar yapın.',
      'Yuvarlakları et-nohut suyuna ekleyin; 20 dakika kısık ateşte pişirin.',
      'Tereyağını eritip pul biber ekleyin; servis öncesi üzerine gezdirin.',
    ],
    prep_time: 30,
    cook_time: 70,
    servings: 6,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-eksili-kofte',
    name: 'Urfa Ekşili Köfte',
    description: 'Urfa Ekşili Köfte, zeytinyağı ve limon suyunun verdiği ferahlatıcı ekşilik ile isot biberinin derin aromasının buluştuğu özel bir tarif yorumudur. Pişirilmeden servis edilen bu soğuk köfte; ince bulgur, domates, maydanoz ve baharatların yoğrulmasıyla hazırlanır ve üzerine bol limon sıkılarak servis edilir. Yaz aylarında serin ve doyurucu bir meze olarak tercih edilen bu köfte; Şanlıurfa\'nın hafif mutfağını temsil eden en sevilen tariflerden biridir.',
    ingredients: [
      '1,5 su bardağı ince bulgur', '1 soğan (rendelenmiş)', '2 domates (rendelenmiş)',
      '1 demet maydanoz', '2 yemek kaşığı isot biberi', '1 limonun suyu',
      '2 yemek kaşığı zeytinyağı', '1 çay kaşığı tuz', '1 çay kaşığı kimyon',
    ],
    instructions: [
      'Bulguru 15 dakika ılık suda bekletin; süzün.',
      'Rendelenmiş soğan ve domatesi bulgura ekleyin.',
      'İsot, kimyon, tuz, zeytinyağı ve limon suyunu ekleyin.',
      'Tüm malzemeleri iyice yoğurup 10 dakika dinlendirin.',
      'Doğranmış maydanozu ekleyerek yuvarlayın ve servis yapın.',
    ],
    prep_time: 25,
    cook_time: 0,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: true,
  },
  {
    slug: 'harran-sutlu-borek',
    name: 'Harran Usulü Sütlü Börek',
    description: 'Harran Usulü Sütlü Börek, Harran\'ın ev kadınlarından kuşaktan kuşağa aktarılan sütlü ıslak börek geleneğinin temsilcisidir. İnce yufkalarla hazırlanan bu börek; pişirildikten sonra üzerine dökülen ılık sütlü sos sayesinde yumuşacık ve kremamsı bir doku kazanır. Tuzlu beyaz peynir ile tatlandırılan iç harç; sütlü sos ile olağanüstü bir uyum sağlar. Harran ovasının bereketini sofraya taşıyan bu börek, kahvaltıdan akşam yemeğine her öğünde yer alır.',
    ingredients: [
      '6 yaprak yufka', '300 g beyaz peynir (ufalanmış)', '1 demet maydanoz',
      '2 su bardağı süt', '2 yumurta', '4 yemek kaşığı sıvıyağ',
      '1 çay kaşığı tuz', '1 çay kaşığı pul biber',
    ],
    instructions: [
      'Peynir ve maydanozu karıştırarak iç harcı hazırlayın.',
      'Yağlı fırın tepsisine bir kat yufka serin; yağlayın.',
      'Üç kat yufka arasına iç harcı paylaştırın.',
      '175°C fırında 25 dakika pişirin.',
      'Sütü, yumurta ve tuzla çırpın; pişen böreğin üzerine döküp 10 dakika daha fırınlayın.',
      'Dinlendirip servis yapın.',
    ],
    prep_time: 20,
    cook_time: 35,
    servings: 6,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'meftune',
    name: 'Meftune (Urfa Kuzulu Sebze Güveci)',
    description: 'Meftune, Şanlıurfa mutfağının en özgün yemeklerinden biridir; kuzu eti, patlıcan, domates ve biberin birlikte yavaş ateşte pişirilmesiyle hazırlanan bu güveç, derin ve katmanlı bir lezzet sunar. İsot biber ile baharatlanan Meftune; patlıcan ve etin birbirinin içine geçerek oluşturduğu o eşsiz kıvam ile öne çıkar. Şanlıurfa\'da yemek kültürünün simgesi haline gelmiş Meftune, özellikle sonbahar hasadının ardından pişirilen ve bereketi simgeleyen bir sofra yemeğidir.',
    ingredients: [
      '600 g kuzu omuz (küp)', '3 orta patlıcan (halka)', '3 büyük domates (dilim)',
      '2 yeşil biber', '1 kuru soğan', '3 diş sarımsak',
      '2 yemek kaşığı isot biberi', '3 yemek kaşığı zeytinyağı', 'Tuz, karabiber',
    ],
    instructions: [
      'Kuzu etini zeytinyağında mühürleyin; soğan ve sarımsakla kavurun.',
      'Patlıcanları tuzlu suda 10 dakika bekletip süzün; yağda soteleyin.',
      'Et, patlıcan, domates ve biberleri katmanlar halinde güveç kabına dizin.',
      'İsot, tuz ve karabiber serpin; üzerine bir bardak su ekleyin.',
      'Güveci kapatın; 180°C fırında 90 dakika pişirin.',
    ],
    prep_time: 25,
    cook_time: 100,
    servings: 5,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-tirit',
    name: 'Urfa Tirit',
    description: 'Urfa Tirit, kuru ekmek ya da sac ekmeğinin üzerine dökülen koyun eti suyuyla hazırlanan; yoğurt ve tereyağının üstüne eklendiği doyurucu ve ısındırıcı bir Urfa yemeğidir. Kışın en sevilen sofralardan biri olan Tirit; basit malzemelerden büyük bir lezzet çıkarma sanatının simgesidir. Üzerine gezdirilen kızdırılmış tereyağı ve pul biber bu yemeği tam bir sofra şölenine dönüştürür; ekmek suyu emerek yumuşarken yoğurt ferahlık katmaktadır.',
    ingredients: [
      '400 g koyun eti (kemikli)', '4 ince lavaş ya da sac ekmeği (bayat)',
      '1 su bardağı yoğurt', '50 g tereyağı', '1 çay kaşığı pul biber',
      '1 çay kaşığı kuru nane', '2 diş sarımsak (dövülmüş)', 'Tuz',
    ],
    instructions: [
      'Eti tuzlu suda 60 dakika haşlayın; et suyunu ayırın.',
      'Eti kemikten ayırın; liflerine ayırın.',
      'Bayat ekmeği parçalayarak servis kasesine dizin.',
      'Sıcak et suyunu üzerine dökün; 5 dakika bekletin.',
      'Üzerine eti, yoğurdu ve sarımsaklı yoğurdu koyun.',
      'Tereyağını eritip pul biber ve nane ekleyin; üzerine gezdirin.',
    ],
    prep_time: 15,
    cook_time: 70,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'bostana',
    name: 'Bostana (Urfa Patlıcan Salatası)',
    description: 'Bostana, Şanlıurfa mutfağının vazgeçilmez mezeleri arasında yer alan közlenmiş patlıcan salatasıdır. Ateşte közlenerek kabuğu soyulan patlıcana zeytinyağı, sarımsak, limon ve taze domates eklenerek hazırlanan bu meze; dumanı tüten közlenmiş aromasıyla sofraya eşsiz bir lezzet katar. Özellikle yaz aylarında mangal yanı mezelerin en önemlisi olan Bostana, her Urfa sofrasında mutlaka yer alır ve ekmekle servis edilir.',
    ingredients: [
      '3 büyük patlıcan', '2 domates (küp)', '2 diş sarımsak (dövülmüş)',
      '2 yemek kaşığı zeytinyağı', '1 limonun suyu', '1 demet maydanoz',
      '1 çay kaşığı tuz', 'İsteğe göre isot biberi',
    ],
    instructions: [
      'Patlıcanları doğrudan ateş veya ızgara üzerinde közleyin; derileri kabarana dek.',
      'Soğuyunca soyun; fazla suyunu sıkın ve çatalla ezip parçalayın.',
      'Domates küpleri, sarımsak, zeytinyağı ve limon suyunu ekleyin.',
      'Maydanozu doğrayın; tuzla birlikte karıştırın.',
      'İsteğe göre isot biber serperek servis yapın.',
    ],
    prep_time: 10,
    cook_time: 20,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-oklava-boregi',
    name: 'Urfa Oklava Böreği',
    description: 'Urfa Oklava Böreği, yufkanın oklava etrafına sarılarak kızartıldığı; içinde kıymalı ya da peynirli harçla hazırlanan ince ve çıtır bir börek türüdür. İnce yufkayı oklavayla döndürerek sıkıştırıp kızartma tekniği; böreğe eşsiz çıtır ve katmanlı bir yapı kazandırır. Şanlıurfa\'nın sabah kahvaltılarının ve çay saatlerinin vazgeçilmezi olan bu börek; hem pratik yapımı hem de çıtır dokusuyla herkese sevdirir.',
    ingredients: [
      '4 yaprak yufka', '200 g kıyma (ya da ufalanmış beyaz peynir)',
      '1 soğan (ince kıyılmış)', '1 çay kaşığı pul biber', '1 çay kaşığı tuz',
      'Kızartma için sıvıyağ', '1 demet maydanoz',
    ],
    instructions: [
      'Kıymayı soğanla kavurun; pul biber, tuz ve maydanoz ekleyin.',
      'Yufkayı keserek uzun şeritler hazırlayın.',
      'Harç şerit kenarına koyun; oklavaya sararak sıkıştırın.',
      'Oklavaşekli çözüldükten sonra ruloları kavurma yağında kızartın.',
      'Havlu kağıda alıp çay yanında sıcak servis yapın.',
    ],
    prep_time: 20,
    cook_time: 15,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-fistikli-baklava',
    name: 'Urfa Fıstıklı Baklava',
    description: 'Urfa Fıstıklı Baklava, Güneydoğu Anadolu baklava geleneğinin Şanlıurfa yorumudur. Antep fıstığının bolca kullanıldığı bu baklava; ince yufka katları arasına yerleştirilen taze fıstık dolgusuyla donatılır ve pişirildikten sonra üzerine tereyağı ile hafif şeker şerbeti dökülür. Urfa usulü baklavalar Gaziantep geleneğine kıyasla daha az tatlı ve daha fıstıklıdır; tereyağı baskın notası ve ince yufka dokusuyla ayrışır.',
    ingredients: [
      '500 g hazır baklava yufkası', '300 g taze Antep fıstığı (çekilmiş)', '200 g tereyağı (eritilmiş)',
      '1,5 su bardağı şeker', '1 su bardağı su', '1 çay kaşığı limon suyu',
    ],
    instructions: [
      'Şeker, su ve limon suyunu kaynatarak ince şerbet yapın; soğutun.',
      'Tepsiye yağ sürün; 10 kat yufkayı tereyağı geçirerek serin.',
      'Fıstık dolgusunu yayın; üzerine kalan yufkaları aynı şekilde serin.',
      'Üstüne bol tereyağı gezdirin; dilimleyin.',
      '180°C fırında 30–35 dakika altın rengi alana dek pişirin.',
      'Fırından çıkar çıkmaz soğuk şerbeti dökün; 2 saat dinlendirin.',
    ],
    prep_time: 30,
    cook_time: 35,
    servings: 12,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-kuru-kofte',
    name: 'Urfa Kuru Köfte',
    description: 'Urfa Kuru Köfte, ızgara ya da tavada yüksek ateşte pişirilen; dışı çıtır içi sulu kalıplandırılmış bir et köftesidir. Dana ya da kuzu kıyması, soğan, isot biberi ve baharat karışımının yoğrulmasıyla hazırlanan bu köfte; Urfa esnaf lokantalarının ve ev sofralarının değişmez klasiğidir. Yanında çiğ soğan, domates ve közlenmiş biber ile servis edilen Urfa Kuru Köfte, ekmek arasında da tüketilerek şehrin sokak lezzetleri arasına girmiştir.',
    ingredients: [
      '500 g kuzu ya da dana kıyma (yağlı)', '1 soğan (rende)', '2 yemek kaşığı isot biberi',
      '1 çay kaşığı kimyon', '1 çay kaşığı karabiber', '1 çay kaşığı tuz',
      '2 diş sarımsak (dövülmüş)', 'Servis için: domates, soğan, maydanoz',
    ],
    instructions: [
      'Kıymayı rendelenmiş soğan, sarımsak ve baharatlarla yoğurun.',
      'Buzdolabında 30 dakika dinlendirin.',
      'Islak elle uzun yuvarlak köftelere şekil verin.',
      'Yağsız tavada ya da ızgarada her yandan 4–5 dakika pişirin.',
      'Çiğ soğan, domates ve maydanozla servis yapın.',
    ],
    prep_time: 40,
    cook_time: 12,
    servings: 5,
    difficulty: 'kolay',
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
  console.log('\n🍽️  Tarif Batch 11 (10 yeni tarif)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;
  for (const r of RECIPES) {
    const res = await db.query(
      `INSERT INTO recipes (slug,name,description,ingredients,instructions,prep_time,cook_time,servings,difficulty,is_spicy,is_vegetarian,status,is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',false)
       ON CONFLICT (slug) DO NOTHING`,
      [r.slug, r.name, r.description, r.ingredients, r.instructions, r.prep_time, r.cook_time, r.servings, r.difficulty, r.is_spicy, r.is_vegetarian]
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
