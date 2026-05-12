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

const LOCAL_PORT = 15652;

const RECIPES = [
  {
    slug: 'etli-ekmek-urfa',
    name: 'Urfa Etli Ekmeği',
    description: 'Urfa Etli Ekmeği, ince açılmış hamur üzerine kıyma, soğan, isot biberi ve baharatların yayılmasıyla hazırlanan, odun ateşinde pişirilen geleneksel bir Şanlıurfa lezzetidir. Lahmacundan daha kalın, pideden daha ince olan bu ekmek; hem ev sofralarının hem de fırın dükkanlarının vazgeçilmez lezzetidir. İçindeki isot biberi ile kendine özgü acılı aromasıyla bölge mutfağının sembolü sayılmaktadır.',
    ingredients: [
      '500 g un', '1 paket instant maya', '1 tatlı kaşığı tuz', '1 tatlı kaşığı şeker', '300 ml ılık su', '2 yemek kaşığı zeytinyağı',
      '400 g dana kıyma', '2 büyük soğan (rendelenmiş)', '2 domates (rendelenmiş)', '2 yemek kaşığı isot biberi', '1 tatlı kaşığı karabiber', '1 demet maydanoz (ince kıyılmış)', 'Tuz'
    ],
    instructions: [
      'Un, maya, tuz, şeker, ılık su ve yağı yoğurun; 1 saat mayalandırın.',
      'Kıyma, soğan, domates, isot, karabiber, maydanoz ve tuzu harmanlayın.',
      'Hamuru ince yuvarlak açın; iç harcı eşit şekilde yayın.',
      'Önceden ısıtılmış 230°C fırında 15-18 dakika pişirin.',
      'Sıcak servis yapın; yanına taze soğan ve maydanoz ekleyin.'
    ],
    prep_time: 75,
    cook_time: 18,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'bulgur-koftesi',
    name: 'Urfa Bulgur Köftesi',
    description: 'Urfa Bulgur Köftesi, ince köftelik bulgur ile kıymanın yoğrulmasından elde edilen, dışı çıtır çıtır kızartılan özgün bir Şanlıurfa köftesidir. İçli köfteden farklı olarak bu köftede iç harç kullanılmaz; bulgur ve kıyma doğrudan harmanlanır. Yanında Urfa soğan ve maydonozla servis edilir; sofraya getirilen ilk andan itibaren kapışılır.',
    ingredients: [
      '2 su bardağı ince köftelik bulgur', '300 g dana kıyma (yağlı)', '1 büyük soğan', '2 yemek kaşığı isot biberi', '1 tatlı kaşığı kimyon', '1 tatlı kaşığı tuz', '1/2 tatlı kaşığı karabiber',
      'Kızartmak için sıvıyağ'
    ],
    instructions: [
      'Bulgurun üzerine sıcak su ekleyip şişmesini bekleyin (20 dakika).',
      'Kıyma, rendelenmiş soğan, isot, kimyon, tuz ve karabiberi bulgura ekleyin.',
      'Ellerinizi ıslatarak tüm malzemeyi iyice yoğurun.',
      'Ceviz büyüklüğünde yuvarlak köfteler şekillendirin.',
      'Derin yağda kızgın sıvıyağda her tarafı altın rengi olana kadar kızartın.',
      'Kağıt havluya alın; sıcak servis yapın.'
    ],
    prep_time: 30,
    cook_time: 20,
    servings: 5,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'yayla-corbasi',
    name: 'Yayla Çorbası',
    description: 'Yayla Çorbası, yoğurt, pirinç ve nane üçlüsünden oluşan; hem doyurucu hem de ferahlatıcı geleneksel bir Şanlıurfa çorbasıdır. Özellikle yaz aylarında soğuk ya da ılık tüketilen bu çorba; Güneydoğu Anadolu mutfağının hafif ama besleyici tarafını temsil eder. Üzerine dökülen tereyağı-nane sosu hem görünümüne hem lezzetine ayrı bir boyut katmaktadır.',
    ingredients: [
      '1 litre et suyu ya da su', '3 yemek kaşığı pirinç', '500 g yoğurt', '2 yemek kaşığı un', '1 yumurta sarısı', 'Tuz',
      '2 yemek kaşığı tereyağı', '1 tatlı kaşığı kuru nane'
    ],
    instructions: [
      'Pirinci et suyu ile haşlayın; yumuşayana kadar pişirin.',
      'Yoğurt, un ve yumurta sarısını çırpın; soğuk et suyu ile sulandırın.',
      'Yoğurt karışımını yavaşça kaynayan çorbaya ekleyip sürekli karıştırın.',
      'Kısık ateşte 10 dakika daha pişirin; tuz ayarı yapın.',
      'Tereyağında naneyi kavurun; çorbanın üzerine gezdirin.',
      'Sıcak ya da ılık servis yapın.'
    ],
    prep_time: 10,
    cook_time: 30,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'harran-arpa-corbasi',
    name: 'Harran Arpa Çorbası',
    description: 'Harran Arpa Çorbası, Harran ovasının kadim buğday ve arpa kültüründen ilham alan; az malzemeyle derin tat veren bir köy çorbasıdır. Arpa yarması, kuru soğan ve baharatlarla hazırlanan bu çorba, Harran\'ın tarihi topraklarında yüzyıllardır sofraları ısıtan sade ama beslendirici bir geleneksel lezzettir. Üzerine gezdirilen nane tereyağı çorbayı tamamlar.',
    ingredients: [
      '1 su bardağı arpa yarması', '1 adet kuru soğan (ince doğranmış)', '2 yemek kaşığı tereyağı', '1,5 litre et suyu', '1 tatlı kaşığı kimyon', '1 tatlı kaşığı kırmızı pul biber', 'Tuz', 'Kuru nane'
    ],
    instructions: [
      'Tereyağında soğanı kavurun; pembeleşince arpa yarmasını ekleyin.',
      '2-3 dakika kavurun; et suyunu ekleyin.',
      'Kimyon, kırmızı biber ve tuz ekleyin.',
      'Kısık ateşte arpa yumuşayana kadar (40-45 dakika) pişirin.',
      'Gerekirse su ekleyerek kıvamını ayarlayın.',
      'Üzerine tereyağında kızdırılan nane ile servis yapın.'
    ],
    prep_time: 10,
    cook_time: 50,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: false,
  },
  {
    slug: 'kiymali-pide',
    name: 'Şanlıurfa Kıymalı Pidesi',
    description: 'Şanlıurfa Kıymalı Pidesi, uzun kayık şekilli ince hamur üzerine isot biberi ağırlıklı kıymalı harç serilerek pişirilen özgün bir pide çeşididir. Diğer şehirlerin pidelerinden farklı olarak Urfa pidesinde isot biberi kullanımı ve açık pide görünümü öne çıkmaktadır. Fırından çıkar çıkmaz doğranan pide, yanında taze soğan ve maydanozla servis edilir.',
    ingredients: [
      '500 g un', '1 paket instant maya', '1 tatlı kaşığı tuz', '1 çay kaşığı şeker', '280 ml ılık su', '2 yemek kaşığı zeytinyağı',
      '350 g dana kıyma', '1 büyük soğan (rendelenmiş)', '1 domates (rendelenmiş)', '2 yemek kaşığı isot biberi', 'Maydanoz', 'Tuz', 'Karabiber'
    ],
    instructions: [
      'Hamur malzemelerini karıştırıp yoğurun; 45 dakika dinlendirin.',
      'Kıyma, soğan, domates, isot, maydanoz, tuz ve karabiberi yoğurun.',
      'Hamuru uzun oval şekle getirin; kenarlarını hafifçe kaldırın.',
      'İç harcı eşit şekilde yayın.',
      '230°C fırında 15-18 dakika pişirin.',
      'Sıcak dilimleyerek servis yapın.'
    ],
    prep_time: 60,
    cook_time: 18,
    servings: 3,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'salgam-dolmasi',
    name: 'Şalgam Dolması',
    description: 'Şalgam Dolması, Şanlıurfa\'ya özgü nadir dolma çeşitlerinden biri olup turp ya da şalgamın oyularak içine bulgur, kıyma ve baharatlarla hazırlanan haşlama bir dolmadır. Güneydoğu Anadolu mutfağının sebze dolmacılığındaki yaratıcılığını gösteren bu tarif; kaburga suyu ile pişirildiğinde eşsiz bir derinlik kazanır. Hem görsel hem de tat açısından sofranın dikkat çekici misafiridir.',
    ingredients: [
      '8-10 adet orta boy şalgam ya da turp', '200 g dana kıyma', '1 su bardağı pirinç ya da iri bulgur', '1 soğan (ince doğranmış)', '2 domates (küp doğranmış)', '2 yemek kaşığı isot biberi', '1 yemek kaşığı domates salçası', 'Tuz', 'Karabiber', 'Nane', '500 ml et suyu'
    ],
    instructions: [
      'Şalgamları soyun; ortasını oyarak boşaltın (kazıntıları saklayın).',
      'Kıyma, pirinç/bulgur, soğan, domates, isot, salça, tuz, karabiber ve naneyi karıştırın.',
      'Şalgamları doldurun; üstlerini küçük bir parça şalgamla kapatın.',
      'Tencereye dizin; kazıntıları arasına yerleştirin.',
      'Et suyunu ekleyin; kapağı kapalı kısık ateşte 45-50 dakika pişirin.',
      'Üzerine nane tereyağı gezdirerek servis yapın.'
    ],
    prep_time: 30,
    cook_time: 50,
    servings: 4,
    difficulty: 'orta',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'rezene-corbasi',
    name: 'Urfa Rezene Çorbası',
    description: 'Urfa Rezene Çorbası, taze rezene sapları ve tohumlarının kuru fasulye ya da nohutla buluşturulduğu; ferahlatıcı ve aromatik bir Güneydoğu Anadolu geleneğidir. Rezenenin anason benzeri kokusu ve taze lezzeti, çorbaya hafif ama belirgin bir aroma katar. Şifa deposu olduğuna inanılan bu çorba; kış aylarında hem ısındırıcı hem de sağlık verici olarak tercih edilir.',
    ingredients: [
      '1 bağ taze rezene (dal ve yapraklarıyla)', '1 su bardağı haşlanmış nohut ya da kuru fasulye', '1 adet soğan (doğranmış)', '2 diş sarımsak', '2 yemek kaşığı zeytinyağı', '1 litre su ya da tavuk suyu', '1 limon suyu', 'Tuz', 'Karabiber'
    ],
    instructions: [
      'Zeytinyağında soğan ve sarımsağı kavurun.',
      'İnce doğranmış rezene saplarını ekleyin; 5 dakika kavurun.',
      'Su ya da tavuk suyunu ekleyin; kaynatın.',
      'Haşlanmış nohut/fasulyeyi ekleyin.',
      'Kısık ateşte 25-30 dakika pişirin.',
      'Tuz, karabiber ve limon suyu ile tatlandırın.',
      'Rezene yapraklarını ekleyip 2 dakika daha ısıtın; sıcak servis yapın.'
    ],
    prep_time: 15,
    cook_time: 35,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'urfa-seker-pare',
    name: 'Urfa Şeker Paresi',
    description: 'Urfa Şeker Paresi, geleneksel şeker pare tarifinin Şanlıurfa versiyonudur. Fıstık ezmesi ve gül suyu eklenmiş irmikli hamur; şerbete basılmadan önce Antep fıstığı ile süslenir. Şehrin yoğun baharatı ve çikolata kültürüyle yoğrulan bu tatlı; hem doku hem lezzet olarak klasik tarifinden belirgin şekilde ayrılmakta ve sofranın en sevilen tatlısı olmaktadır.',
    ingredients: [
      '200 g yumuşak tereyağı', '1 su bardağı pudra şekeri', '1 yumurta', '2 yemek kaşığı ince irmik', '2 su bardağı un', '2 yemek kaşığı fıstık ezmesi', 'Antep fıstığı (üzeri için)',
      '2 su bardağı şeker', '2 su bardağı su', '1 yemek kaşığı limon suyu', '1 yemek kaşığı gül suyu'
    ],
    instructions: [
      'Tereyağı ve pudra şekerini çırpın; yumurta ekleyin.',
      'İrmik, un ve fıstık ezmesini ekleyin; kulak memesi kıvamında hamur yoğurun.',
      'Ceviz büyüklüğünde toplar yapın; üzerlerine fıstık basın.',
      '170°C fırında 20-25 dakika, hafif altın rengi olana kadar pişirin.',
      'Şeker, su ve limon suyunu kaynatarak şerbet yapın; gül suyunu ekleyin.',
      'Sıcak tatlıları soğuk şerbete ya da soğuk tatlıları sıcak şerbete basın.',
      '2 saat şerbet çekmesi için bekleyin; servis yapın.'
    ],
    prep_time: 20,
    cook_time: 25,
    servings: 20,
    difficulty: 'orta',
    is_spicy: false,
    is_vegetarian: true,
  },
  {
    slug: 'sem-corbasi',
    name: 'Şem Çorbası',
    description: 'Şem Çorbası, Şanlıurfa\'nın Halfeti ve Bozova ilçelerinde yapılan, tarhana benzeri kurutulmuş bir ürünün suda açılmasıyla hazırlanan eski bir kış çorbasıdır. Mayalı unun sebzelerle pişirilip kurutulmasından elde edilen şem; kışın suda kaynatılarak kısa sürede lezzetli bir çorba haline gelir. Korunmuş gıda geleneğinin en nadide örneklerinden olan bu çorba, bölgede giderek azalmaktadır.',
    ingredients: [
      '2 su bardağı şem ya da tarhana', '1,5 litre et suyu', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı isot biberi', 'Tuz', 'Kuru nane'
    ],
    instructions: [
      'Şemi ya da tarhanayı et suyu ile çırpın; topaklanmadan eritin.',
      'Tencereye alın; sürekli karıştırarak kaynatın.',
      'Kısık ateşte 20-25 dakika pişirin; tuz ayarını yapın.',
      'Tereyağında isot ve naneyi kavurun; çorbanın üzerine gezdirin.',
      'Sıcak servis yapın.'
    ],
    prep_time: 10,
    cook_time: 25,
    servings: 4,
    difficulty: 'kolay',
    is_spicy: true,
    is_vegetarian: false,
  },
  {
    slug: 'urfa-cig-badem',
    name: 'Urfa Çiğ Badem Tatlısı',
    description: 'Urfa Çiğ Badem Tatlısı, Nisan-Mayıs aylarında hasatından hemen sonra toplanan taze çiğ bademlerin şeker ve gül suyu ile tatlandırılmasından oluşan mevsimlik bir geleneksel lezzettir. Şanlıurfa bağ ve bahçelerinde bol miktarda yetişen çiğ badem; yörede baharın gelişinin habercisi sayılır. Bu tatlı; çiğ bademin yeşil kabuğuyla sunulması ve buz gibi ikram edilmesiyle yazın serinletici bir atıştırmalık olarak da tercih edilmektedir.',
    ingredients: [
      '500 g taze çiğ badem (yeşil kabuklu)', '3 yemek kaşığı pudra şekeri ya da bal', '1 yemek kaşığı gül suyu', '1 çay kaşığı tuz', 'Kırık buz (servis için)'
    ],
    instructions: [
      'Çiğ bademleri soğuk suda yıkayın; süzün.',
      'Büyük bir kaseye alın; pudra şekeri ya da bal, gül suyu ve tuz serpin.',
      'Hafifçe karıştırın; 10-15 dakika dinlendirin.',
      'Kırık buz üzerine yerleştirerek soğuk servis yapın.',
      'Yeşil kabukları bırakarak ya da soyarak yenebilir.'
    ],
    prep_time: 15,
    cook_time: 0,
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
  console.log('\n🍽️  Tarif Batch 8 (10 yeni tarif)...\n');
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
