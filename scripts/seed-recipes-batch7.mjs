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

const LOCAL_PORT = 15634;

const RECIPES = [
  {
    slug: 'urfa-simit-kebabi',
    name: 'Urfa Simit Kebabı',
    description: 'Urfa Simit Kebabı, ince kıymanın özel baharatlarla yoğrulup şişlere sarılarak közde pişirildiği geleneksel bir Şanlıurfa lezzetidir. Adını aldığı simit şekli, kebabın ince ve uzun formuyla özdeşleşmiştir. Sunumda yoğurt, sumak soğanı ve lavaş ekmeğiyle servis edilir.',
    ingredients: [
      '500g kuzu kıyması (yağlı)',
      '1 adet soğan (rendelenmiş)',
      '2 diş sarımsak',
      '1 tatlı kaşığı isot',
      '1 tatlı kaşığı karabiber',
      '1 çay kaşığı kimyon',
      '1 yemek kaşığı domates salçası',
      'Tuz',
      'Şiş kebabı için metal şişler',
    ],
    instructions: [
      'Kıymayı geniş bir kaba alın, rendelenmiş soğan, ezilmiş sarımsak ve tüm baharatları ekleyin.',
      'Karışımı en az 10 dakika boyunca yoğurun; et homojen ve yapışkan kıvama gelmelidir.',
      'Hazırlanan eti buzdolabında 30 dakika dinlendirin.',
      'Metal şişlere kıymayı uzun ve ince şeritler halinde sarın, yüzeyi pürüzsüz yapın.',
      'Közde ya da mangalda her tarafı eşit kızarana kadar yaklaşık 12-15 dakika pişirin.',
      'Sıcak servis edin; yanında sumakla ovulmuş ince kıyılmış soğan, yoğurt ve lavaş ekmek sunun.',
    ],
    prep_time: 45,
    cook_time: 15,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'harran-mercimek-corbasi',
    name: 'Harran Mercimek Çorbası',
    description: 'Harran Mercimek Çorbası, kırmızı mercimeğin Harran Ovası baharatlarıyla buluştuğu, köklü bir yemek kültürünün ürünüdür. Sarımsak yağı ve kekik harmanıyla terbiye edilen çorba; yoğun, kremalı ve ısıtıcı yapısıyla soğuk kış gecelerinin vazgeçilmezidir. Urfa ekmeğiyle servis edildiğinde tam bir tat bütünlüğü elde edilir.',
    ingredients: [
      '2 su bardağı kırmızı mercimek',
      '1 adet büyük soğan',
      '3 diş sarımsak',
      '2 yemek kaşığı tereyağı',
      '1 çay kaşığı kimyon',
      '1 çay kaşığı kırmızı toz biber',
      '1/2 çay kaşığı zerdeçal',
      '1 limon suyu',
      'Tuz ve karabiber',
      '6 su bardağı et ya da sebze suyu',
    ],
    instructions: [
      'Mercimekleri yıkayıp süzün; tencerede et suyu ile birlikte kaynatın.',
      'Ayrı bir tavada tereyağında ince doğranmış soğanı altın rengi olana kadar kavurun.',
      'Sarımsakları ekleyin, 1 dakika daha kavurun.',
      'Soğan karışımını kaynayan mercimeğin üzerine aktarın; kimyon, biber ve zerdeçalı ekleyin.',
      'Mercimekler tamamen pişip yumuşadığında ocaktan alın ve el blenderiyle pürüzsüz hale getirin.',
      'Limon suyunu ekleyin, tuz ve karabiber ile tatlandırın.',
      'Üzerine tereyağında kızdırılmış kırmızı biber gezdirerek servis edin.',
    ],
    prep_time: 10,
    cook_time: 35,
    servings: 6,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-patlican-musakka',
    name: 'Urfa Patlıcan Musakka',
    description: 'Urfa Patlıcan Musakka; ızgarada pişirilmiş patlıcan dilimleri, baharatlı kıyma ve domates sosunun fırında buluştuğu ihtişamlı bir Şanlıurfa ana yemeğidir. Klasik musakkanın Urfa versiyonu isot ve karabiber ağırlıklı baharatıyla belirginleşir; üzerine dökülen yoğurt sosu ise yemeğe kremamsı bir denge katar.',
    ingredients: [
      '3 adet büyük patlıcan',
      '400g kuzu kıyması',
      '2 adet domates',
      '1 adet soğan',
      '3 diş sarımsak',
      '2 yemek kaşığı domates salçası',
      '1 tatlı kaşığı isot',
      '1 çay kaşığı karabiber',
      '1 çay kaşığı kimyon',
      '1 su bardağı yoğurt (sos için)',
      '1 diş sarımsak (sos için, ezilmiş)',
      'Zeytinyağı, tuz',
    ],
    instructions: [
      'Patlıcanları uzun dilimler halinde kesin, tuzlu suda 15 dakika bekletin.',
      'Kurulanan patlıcanları zeytinyağı ile fırın tepsisine dizerek 200°C\'de 20 dakika ızgara yapın.',
      'Kıymayı ince doğranmış soğanla birlikte kavurun; sarımsak, salça ve baharatları ekleyin.',
      'Domates küplerini ilave edip 5 dakika daha pişirin; tuzlayın.',
      'Fırın kabına patlıcan dilimleri ve kıyma karışımını sırayla katlar halinde yerleştirin.',
      '180°C önceden ısıtılmış fırında 25-30 dakika pişirin.',
      'Yoğurdu ezilmiş sarımsak ve tuzla karıştırın; sıcak servis sırasında musakkanın üzerine gezdirin.',
    ],
    prep_time: 30,
    cook_time: 50,
    servings: 5,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'sanlıurfa-beyran-corbasi',
    name: 'Şanlıurfa Beyran Çorbası',
    description: 'Beyran, Şanlıurfa sabahlarının en köklü lezzetlerinden biridir. Kuzu eti suyu ile pişirilmiş pirinç ve ince doğranmış etlerin sarımsak, isot ve tereyağı harlama sos ile servis edildiği bu çorba, yüzyıllardır değişmeyen tarifiyle güne güçlü bir başlangıç sunar. Özellikle soğuk kış sabahlarında içi ısıtan yapısıyla tercih edilir.',
    ingredients: [
      '300g kemikli kuzu eti',
      '1 su bardağı baldo pirinç',
      '4-5 diş sarımsak',
      '2 yemek kaşığı tereyağı',
      '1 tatlı kaşığı isot',
      '1 tatlı kaşığı kırmızı toz biber',
      '1 çay kaşığı karabiber',
      'Tuz',
      '8 su bardağı su',
    ],
    instructions: [
      'Kuzu etini bol suda haşlayın; köpüklerini alın ve yaklaşık 90 dakika pişirin.',
      'Pişmiş eti kemikten ayırın ve ince ince didikleyin.',
      'Et suyunu süzün; bir kısmını ayırın, kalanında pirinci haşlayın.',
      'Sarımsakları ince kıyın; tereyağında isot ve kırmızı biberle birlikte kızdırın.',
      'Et suyu, pirinç ve didiklenen eti derin çorba kaselerine paylaştırın.',
      'Üzerine sıcak sarımsaklı tereyağı harlamasını gezdirin ve hemen servis edin.',
    ],
    prep_time: 20,
    cook_time: 100,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-eksi-aşı',
    name: 'Urfa Ekşi Aşı',
    description: 'Ekşi Aşı, Şanlıurfa köy mutfağından gelen, kurutulmuş erik ya da nar ekşisiyle tatlandırılan pirinçli et yemeğidir. Kuzunun kemikli parçaları, kuru meyveler ve pirinçle uzun süre pişirilerek hazırlanan bu yemek; ekşi-tatlı aromasıyla damakta bıraktığı derin izle tanınır. Geleneksel düğün sofralarının olmazsa olmaz yemeklerinden biridir.',
    ingredients: [
      '500g kemikli kuzu eti (but ya da kaburga)',
      '1,5 su bardağı baldo pirinç',
      '100g kurutulmuş erik ya da 3 yemek kaşığı nar ekşisi',
      '1 adet büyük soğan',
      '2 yemek kaşığı tereyağı',
      '1 tatlı kaşığı karabiber',
      '1 çay kaşığı tarçın',
      '1 çay kaşığı yenibahar',
      'Tuz',
      '3 su bardağı sıcak su',
    ],
    instructions: [
      'Kuzu etini tereyağında her tarafı kızarana kadar kavurun.',
      'İnce doğranmış soğanı ekleyip şeffaflaşana kadar pişirin.',
      'Kurutulmuş erikler ya da nar ekşisini, baharatları ve tuzu ekleyin.',
      'Sıcak suyu ilave edin; kapağı kapatıp kısık ateşte 60 dakika pişirin.',
      'Yıkanmış pirinci et suyuna karıştırın; gerekirse su ekleyin.',
      'Pirinç pişip suyu çekene kadar yaklaşık 20 dakika daha demde bırakın.',
      'Dinlendirerek servis edin; yanında yoğurt sunabilirsiniz.',
    ],
    prep_time: 15,
    cook_time: 80,
    servings: 4,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'sanlıurfa-katikli-ekmek',
    name: 'Şanlıurfa Katkılı Ekmek',
    description: 'Katkılı Ekmek, Şanlıurfa köy fırınlarının simgesi haline gelmiş; içine kıyılmış maydanoz, domates, soğan ve baharatların karıştırıldığı geleneksel bir fırın ekmekleridir. Odun ateşinde pişirildiğinde dışı çıtır içi yumuşak olan bu ekmek, hem kahvaltı hem de ana öğünlerde sofradan eksik edilmez. Urfa peynirleriyle birlikte tüketildiğinde mükemmel bir uyum yakalar.',
    ingredients: [
      '500g un',
      '1 paket (10g) instant maya',
      '1 çay kaşığı tuz',
      '1 çay kaşığı şeker',
      '300ml ılık su',
      '3 yemek kaşığı zeytinyağı',
      '1 demet maydanoz (kıyılmış)',
      '2 adet domates (küçük doğranmış)',
      '1 adet soğan (ince doğranmış)',
      '1 tatlı kaşığı isot',
    ],
    instructions: [
      'Un, maya, tuz ve şekeri geniş bir kapta karıştırın.',
      'Zeytinyağı ve ılık suyu ekleyerek yumuşak, yapışmayan bir hamur yoğurun.',
      'Hamuru örtüp ılık ortamda 45 dakika mayalanmaya bırakın.',
      'Maydanoz, domates, soğan ve isotu harmanlayın.',
      'Mayalanan hamuru yuvarlak açın; iç harcı üzerine serpin ve hamuru katlayarak kapatın.',
      'Fırın tepsisine alın; 220°C önceden ısıtılmış fırında 20-25 dakika pişirin.',
      'Üzeri altın rengi kızarınca fırından çıkarın; sıcak servis edin.',
    ],
    prep_time: 60,
    cook_time: 25,
    servings: 6,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-havuc-tarator',
    name: 'Urfa Havuç Taratoru',
    description: 'Urfa Havuç Taratoru, haşlanmış havuçların yoğurt ve sarımsakla pürüzsüz bir dipe dönüştürüldüğü, fındık ya da ceviz kırıntılarıyla zenginleştirilen serinletici bir mezedir. Şanlıurfa sofralarında et yemeklerinin yanında sıklıkla yer bulan bu meze, hem hafif hem de besleyici yapısıyla tercih edilir. Zeytinyağı ve kuru nane harlaması sunumu tamamlar.',
    ingredients: [
      '4 adet orta boy havuç',
      '1 su bardağı yoğurt (süzme)',
      '2 diş sarımsak',
      '2 yemek kaşığı zeytinyağı',
      '1 yemek kaşığı limon suyu',
      '1 avuç ceviz ya da fındık kırığı',
      '1 çay kaşığı kuru nane',
      'Tuz ve karabiber',
    ],
    instructions: [
      'Havuçları soyup tuzlu suda yumuşayana kadar (yaklaşık 20 dakika) haşlayın.',
      'Haşlanan havuçları süzdükten sonra soğumaya bırakın.',
      'Süzme yoğurdu, ezilmiş sarımsağı, limon suyunu ve tuzu bir kapta karıştırın.',
      'Soğuyan havuçları bir çatalla ya da el blenderiyle püre kıvamına getirin.',
      'Yoğurt karışımını havuç püresine ekleyip harmanlayın.',
      'Servis kasesine alın; üzerine zeytinyağı gezdirin, ceviz kırıntıları ve kuru nane serpin.',
      'Soğuk ya da oda sıcaklığında servis edin.',
    ],
    prep_time: 10,
    cook_time: 20,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'sanlıurfa-kuymak',
    name: 'Şanlıurfa Kuymağı',
    description: 'Kuymak, Şanlıurfa kahvaltı sofralarının en lezzetli tatlılarından biridir. Tereyağında eritilmiş pekmez ve una katılan ceviz kırığıyla hazırlanan bu sıcak tatlı, özellikle soğuk sabahların ısıtıcısı olarak bilinir. Geleneksel bakır tavaların şenlendirdiği bu tarifte her lokma, nesiller boyu aktarılan bir sabah ritüelini taşır.',
    ingredients: [
      '3 yemek kaşığı tereyağı',
      '3 yemek kaşığı un',
      '4 yemek kaşığı üzüm pekmezi',
      '1 su bardağı su',
      '1 avuç ceviz kırığı',
      '1 çay kaşığı tarçın',
    ],
    instructions: [
      'Tereyağını geniş bir tavada orta ateşte eritin.',
      'Unu ekleyip sürekli karıştırarak 5 dakika kavurun; un hafif altın rengi almalıdır.',
      'Suyu yavaşça ekleyin ve topak kalmayacak şekilde çırpın.',
      'Pekmezi ilave edin; karıştırmaya devam ederek koyulaşana kadar pişirin.',
      'Ceviz kırıklarını karışıma ekleyin, 2 dakika daha pişirin.',
      'Geniş bir servis tabağına alın; üzerine tarçın serpin.',
      'Sıcak ve hemen servis edin.',
    ],
    prep_time: 5,
    cook_time: 15,
    servings: 3,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-meyan-corbasi',
    name: 'Urfa Meyan Kökü Şerbeti',
    description: 'Meyan Kökü Şerbeti, Şanlıurfa ve çevresinde yüzyıllardır tüketilen, serinletici ve şifalı geleneksel bir içecektir. Meyan kökünün suda demlenerek tatlandırılmasıyla hazırlanan bu şerbet; özellikle ramazan aylarında, bayram sofralarında ve sıcak yaz günlerinde vazgeçilmez bir içki olarak sunulur. Doğal glikorizin içeriğiyle hem mideyi yatıştırır hem de serinletir.',
    ingredients: [
      '2 yemek kaşığı öğütülmüş meyan kökü tozu (ya da 1 adet meyan kökü çubuğu)',
      '1 litre soğuk su',
      '2 yemek kaşığı şeker ya da bal (tercihe göre)',
      '1 çay kaşığı limon suyu',
      'Birkaç yaprak nane (isteğe bağlı)',
    ],
    instructions: [
      'Meyan kökü çubuğunu ya da tozunu soğuk suda en az 2 saat ya da gece boyunca bekletin.',
      'Süzdükten sonra şeker ya da balı ekleyin ve karıştırarak eritin.',
      'Limon suyunu ilave edin; tadına bakın ve şeker miktarını ayarlayın.',
      'Büyük bir sürahi içinde buza alın.',
      'Servis yaparken bardaklara buz ekleyin, nane yapraklarıyla süsleyin.',
    ],
    prep_time: 120,
    cook_time: 0,
    servings: 6,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'sanlıurfa-tepsi-boregi',
    name: 'Şanlıurfa Tepsi Böreği',
    description: 'Şanlıurfa Tepsi Böreği, el açması yufkalar arasına kıymalı ya da peynirli iç harç yerleştirilerek bol tereyağıyla fırınlanan, sofraya getirildiğinde çıtır çıtır sesiyle herkesi büyüleyen geleneksel bir börek çeşididir. Pazar sabahlarının ve bayram kahvaltılarının olmazsa olmazı olan bu börek, Urfa mutfağının en emek isteyen ve en lezzetli yapımlarından birini oluşturur.',
    ingredients: [
      '6 adet yufka',
      '300g kıyma (ya da 200g beyaz peynir)',
      '1 adet soğan',
      '2 yemek kaşığı salça',
      '1 tatlı kaşığı isot',
      '1 tatlı kaşığı karabiber',
      '150g tereyağı',
      '2 yumurta sarısı (üzeri için)',
      '1 yemek kaşığı süt',
      'Tuz',
    ],
    instructions: [
      'Kıymayı ince doğranmış soğanla kavurun; salça ve baharatları ekleyip 10 dakika pişirin.',
      'Fırın tepsisini tereyağıyla yağlayın.',
      'İlk 3 yufkayı teker teker tepsiye sererek her birinin üzerine eritilmiş tereyağı sürün.',
      'Kıyma ya da peynir harcını 3. yufkanın üzerine düzgünce yayın.',
      'Kalan 3 yufkayı aynı şekilde üst üste dizerek tereyağlayın.',
      'Yumurta sarısı ve sütü karıştırın; böreğin üzerine fırça ile sürün.',
      '180°C fırında üzeri altın rengi kızarana kadar 35-40 dakika pişirin.',
    ],
    prep_time: 30,
    cook_time: 40,
    servings: 8,
    difficulty: 'zor',
    is_spicy: false,
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
  console.log('\n🍽️  Tarif Batch 7 (10 yeni tarif)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;

  for (const r of RECIPES) {
    const res = await db.query(
      `INSERT INTO recipes (slug, name, description, ingredients, instructions, prep_time, cook_time, servings, difficulty, is_spicy, is_vegetarian, status, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'published',false)
       ON CONFLICT (slug) DO NOTHING`,
      [r.slug, r.name, r.description, r.ingredients, r.instructions, r.prep_time, r.cook_time, r.servings, r.difficulty, r.is_spicy, r.is_vegetarian]
    );
    if (res.rowCount > 0) {
      console.log(`  ✓ ${r.name}`);
      inserted++;
    } else {
      console.log(`  — ${r.name} (zaten var)`);
      skipped++;
    }
  }

  const { rows: [stats] } = await db.query(`SELECT COUNT(*) AS total FROM recipes WHERE status = 'published'`);

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${inserted} eklendi | ${skipped} atlandı`);
  console.log(`📊 Toplam tarif: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
