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
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_TUNNEL_PORT = 15716;

const RECIPES = [
  {
    slug: 'urfa-meftune',
    name: 'Urfa Meftunesi',
    description: 'Meftune, Şanlıurfa mutfağının en kadim güveç yemeklerinden biridir. Kuzu eti, patlıcan, biber ve domatesin bir arada pişirildiği bu toprak güveç yemeği, düşük ateşte uzun süre pişirilmesiyle eşsiz bir lezzet kazanır. Urfa isotu ve sarımsakla zenginleştirilen meftune, özellikle düğün ve özel günlerde sofraların baş tacıdır. Harran ovasının bereketli topraklarından gelen sebzeler ve Urfa\'nın geleneksel baharat harmanıyla hazırlanan bu yemek, nesilden nesile aktarılan bir lezzet mirasıdır.',
    ingredients: ['500 g kuzu but', '2 adet patlıcan', '3 adet sivri biber', '2 adet domates', '1 baş soğan', '4 diş sarımsak', '2 yemek kaşığı zeytinyağı', '1 tatlı kaşığı Urfa isotu', 'tuz', 'karabiber', 'kekik'],
    instructions: ['Kuzueti küp küp doğranır, tuz ve karabiberle marine edilir.', 'Patlıcan ve biberler közlenerek kabukları soyulur.', 'Toprak güvece yağ gezdirilir, soğan kavrulur.', 'Et eklenerek her tarafı mühürlenir.', 'Sebzeler ve sarımsak eklenir, üzerine isot serpilir.', 'Güveç 180°C fırında 1.5-2 saat pişirilir.'],
    prep_time: 30, cook_time: 120, servings: 4, difficulty: 'orta', is_spicy: true, is_vegetarian: false,
  },
  {
    slug: 'harran-tarhana-corbasi',
    name: 'Harran Tarhana Çorbası',
    description: 'Harran\'ın kurak ikliminde yüzyıllar boyunca hayat veren tarhana çorbası, bu tarihi şehrin en simgesel lezzetlerinden biridir. Yazın hazırlanıp güneşte kurutulan tarhana, kışın sıcacık bir çorba olarak sofralara gelir. Harran tarhanası yoğurt, domates, biber ve buğdayın uzun mayalanmasıyla oluşur; diğer tarhanalardan daha keskin ve dolu bir tada sahiptir. Yanında Urfa peyniri ve sac ekmeğiyle servis edilir.',
    ingredients: ['4 yemek kaşığı tarhana', '1 litre et suyu', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı kırmızı biber', 'tuz', 'kurutulmuş nane', 'limon suyu'],
    instructions: ['Tarhana soğuk su ile ıslatılır, 15 dakika beklenir.', 'Et suyu kaynatılır, ıslak tarhana eklenir.', 'Devamlı karıştırarak orta ateşte 20 dakika pişirilir.', 'Tereyağında kırmızı biber yakılır, çorbaya dökülür.', 'Tuz ve nane eklenerek servis edilir.'],
    prep_time: 20, cook_time: 25, servings: 4, difficulty: 'kolay', is_spicy: false, is_vegetarian: false,
  },
  {
    slug: 'urfa-patlican-kebabi',
    name: 'Urfa Patlıcan Kebabı',
    description: 'Patlıcan kebabı, Şanlıurfa\'nın köz kültürünün en güzel örneklerinden biridir. Közde pişirilen patlıcanların içine Urfa usulü köfte harcı yerleştirilerek fırında tamamlanan bu yemek, hem görsel hem lezzet açısından etkileyicidir. Urfa\'nın acılı köfte harcı, közün dumanlı aromasıyla birleşince bambaşka bir karakter kazanır. Yanında közlenmiş domates ve biberlerle servis edilir.',
    ingredients: ['4 büyük patlıcan', '500 g kıyma', '1 soğan', '2 diş sarımsak', '1 tatlı kaşığı Urfa isotu', '1 tatlı kaşığı kırmızı biber', 'tuz', 'maydanoz', '2 adet domates', '2 adet sivri biber'],
    instructions: ['Patlıcanlar közde veya fırında pişirilip ortaları açılır.', 'Kıyma soğan ve sarımsakla yoğrulur, isot ve baharatlar eklenir.', 'Köfte harcı patlıcanların içine yerleştirilir.', '180°C fırında 25 dakika pişirilir.', 'Közlenmiş domates ve biberlerle servis edilir.'],
    prep_time: 25, cook_time: 45, servings: 4, difficulty: 'orta', is_spicy: true, is_vegetarian: false,
  },
  {
    slug: 'urfa-incir-tatlisi',
    name: 'Urfa İncir Tatlısı',
    description: 'Şanlıurfa, Türkiye\'nin en kaliteli incir üreticisi bölgelerinden biridir. Bu tatlı, taze ya da kurutulmuş Urfa incirlerinin ceviz ve fıstıkla doldurulup şerbete yatırılmasıyla hazırlanır. Osmanlı saray mutfağına kadar uzanan tarihiyle Urfa incir tatlısı, iftar sofralarının ve özel günlerin vazgeçilmezidir. Hafif şerbeti ve meyveli doluluğuyla yaz sofralarının en sevilen tatlısıdır.',
    ingredients: ['500 g kuru incir', '1 su bardağı ceviz içi', '½ su bardağı antep fıstığı', '2 su bardağı şeker', '2 su bardağı su', '1 çay kaşığı tarçın', '1 limon suyu', '1 çay kaşığı gül suyu'],
    instructions: ['İncirler ılık suda 30 dakika ıslatılır, sapları çıkarılır.', 'Ceviz ve fıstık kaba dövülür, tarçınla karıştırılır.', 'Her incirin içi doldurulur.', 'Şeker, su ve limon suyu ile şerbet hazırlanır.', 'Dolma incirler şerbete batırılarak beklemeye alınır.', 'Soğuk olarak servis edilir.'],
    prep_time: 40, cook_time: 20, servings: 6, difficulty: 'kolay', is_spicy: false, is_vegetarian: true,
  },
  {
    slug: 'kalyos',
    name: 'Kalyos',
    description: 'Kalyos, Şanlıurfa ve çevresinde kelle paça geleneğinin yerel adıdır. Kuzu kelle ve paçalarının saatlerce haşlanmasıyla elde edilen bu besleyici çorba, sabahın erken saatlerinde özel dükkânlarda satılır. Sarımsak, limon ve sirkeyle zenginleştirilen kalyos, hem doyurucu hem de şifalı kabul edilir. Sabah 5-6\'da açılan geleneksel kalyos dükkânları Şanlıurfa\'nın kültürel mirasının bir parçasıdır.',
    ingredients: ['1 kuzu kellesi', '4 kuzu paça', '1 baş sarımsak', '2 limon', '2 yemek kaşığı sirke', 'tuz', 'kekik', 'kırmızı pul biber', 'galeta unu (isteğe bağlı)'],
    instructions: ['Kelle ve paçalar temizlenip soğuk suyla haşlama kabına alınır.', 'Kaynayan suya kekik ve tuz eklenir, köpükler alınır.', 'Kısık ateşte 3-4 saat haşlanır.', 'Etler kemiklerden ayrılır, suyu süzülür.', 'Sarımsak ve limon suyu eklenerek tekrar kaynatılır.', 'Pul biberle servis edilir.'],
    prep_time: 30, cook_time: 240, servings: 6, difficulty: 'zor', is_spicy: false, is_vegetarian: false,
  },
  {
    slug: 'urfa-kisir',
    name: 'Urfa Kısırı',
    description: 'Urfa kısırı, Türkiye\'nin pek çok bölgesinde sevilen kısırın Şanlıurfa usulüne göre hazırlanmış, çok daha ateşli ve aromatik versiyonudur. İnce bulgur, Urfa isotu, domates salçası, limon ve bol yeşillikle hazırlanan bu meze, Urfalıların sofrasında her daim yer bulur. Yanında marul yaprağı, soğan ve turpla servis edilen Urfa kısırı, Güneydoğu\'nun zengin baharat kültürünün en güzel yansımalarından biridir.',
    ingredients: ['2 su bardağı ince bulgur', '3 yemek kaşığı domates salçası', '2 yemek kaşığı biber salçası', '1 tatlı kaşığı Urfa isotu', '3 yemek kaşığı zeytinyağı', '2 limon suyu', 'tuz', 'maydanoz', 'nane', 'taze soğan', 'domates'],
    instructions: ['Bulgur üzerine kaynar su dökülerek kabarması beklenir.', 'Salçalar zeytinyağıyla kavrulur, bulgura eklenir.', 'İsot, tuz ve limon suyu katılarak yoğrulur.', 'İnce doğranmış maydanoz, nane ve taze soğan eklenir.', 'En az 30 dakika dinlendirilir.', 'Marul yaprağı ve domates ile servis edilir.'],
    prep_time: 20, cook_time: 15, servings: 6, difficulty: 'kolay', is_spicy: true, is_vegetarian: true,
  },
  {
    slug: 'dogme-corbasi',
    name: 'Dögme Çorbası',
    description: 'Dögme çorbası, Şanlıurfa kırsal mutfağının en otantik lezzetlerinden biridir. Kabuğundan arındırılmış ve havanda dövülmüş buğday tanelerinden yapılan bu çorba, et suyuyla birleşince oldukça doyurucu bir kıvam alır. Kış aylarında özellikle tercih edilen dögme çorbası, yörede "dögmenin şifasına" dair inanışlarla da öne çıkar. Üzerine gezdirilecek tereyağlı isot, bu çorbayı Urfa mutfağının simgesi hâline getirir.',
    ingredients: ['1 su bardağı dögme (dövme buğday)', '1.5 litre et suyu', '200 g kuzu eti', '1 soğan', '2 yemek kaşığı tereyağı', '1 tatlı kaşığı Urfa isotu', 'tuz', 'kekik'],
    instructions: ['Dögme yıkanarak 1 gece suda bekletilir.', 'Et suyu kaynatılır, süzülmüş dögme eklenir.', 'Küp küp doğranmış etler eklenerek kısık ateşte 1 saat pişirilir.', 'Soğan kavurması yapılır, çorbaya eklenir.', 'Tereyağında isot yakılarak üzerine gezdirilir.'],
    prep_time: 20, cook_time: 70, servings: 4, difficulty: 'orta', is_spicy: false, is_vegetarian: false,
  },
  {
    slug: 'urfa-seftali-hosafi',
    name: 'Urfa Şeftali Hoşafı',
    description: 'Şanlıurfa\'nın bereketli bahçelerinde yetişen şeftalilerden yapılan hoşaf, yazın serinletici sonbaharın ise kurusu pişirilip kış için hazırlanan geleneksel bir içecek ve tatlıdır. Kuru şeftali, şeker ve tarçınla hazırlanan Urfa hoşafı; ceviz ve fıstıkla süslenip soğuk servis edilir. Urfa düğünlerinde ve Ramazan iftar sofralarında özel bir yere sahip olan bu hoşaf, şehrin meyve bahçelerinin zenginliğini yansıtır.',
    ingredients: ['400 g kuru şeftali', '3 yemek kaşığı şeker', '1 litre su', '1 çubuk tarçın', '3-4 adet karanfil', '½ limon suyu', 'ceviz ve antep fıstığı (süsleme için)'],
    instructions: ['Kuru şeftaliler yıkanarak gece suda bekletilir.', 'Şeker, su ve baharatlarla şerbet kaynatılır.', 'Islatılmış şeftaliler şerbete eklenerek 20 dakika kısık ateşte pişirilir.', 'Limon suyu eklenerek ocaktan alınır.', 'Soğuduktan sonra buzdolabına konur.', 'Ceviz ve fıstıkla süslenip soğuk servis edilir.'],
    prep_time: 15, cook_time: 25, servings: 6, difficulty: 'kolay', is_spicy: false, is_vegetarian: true,
  },
  {
    slug: 'pekmezli-kofte',
    name: 'Pekmezli Köfte',
    description: 'Pekmezli köfte, Harran ve çevresinde yüzyıllardır yapılan, köfteciliğin tatlı-tuzlu sınırını ustaca zorlayan nadir yemeklerden biridir. Kıyma ve bulgurdan hazırlanan köfteler, üzüm pekmezi ve cevizle yapılan tatlımtırak bir sosla buluşur. Bu beklenmedik lezzet kombinasyonu, şehir merkezinde pek karşılaşılmayan, kırsal köy mutfağına ait özgün bir tariftir. Pekmezin doğal tatlılığı köftenin baharatlı yapısıyla mükemmel bir denge kurar.',
    ingredients: ['400 g ince kıyma', '1 su bardağı ince bulgur', '1 yemek kaşığı biber salçası', 'tuz', 'karabiber', 'kimyon', '3 yemek kaşığı üzüm pekmezi', '½ su bardağı ceviz', '2 yemek kaşığı tereyağı'],
    instructions: ['Bulgur ılık suyla ıslatılır, kıymayla yoğrulur.', 'Tuz, karabiber ve kimyon eklenerek küçük köfteler şekillendirilir.', 'Köfteler tereyağında kızartılır.', 'Pekmez ve az su karıştırılarak köftelerin üzerine dökülür.', 'Kısık ateşte 10 dakika pişirilir.', 'Cevizler kırılarak üzerine serpilip servis edilir.'],
    prep_time: 25, cook_time: 20, servings: 4, difficulty: 'orta', is_spicy: false, is_vegetarian: false,
  },
  {
    slug: 'urfa-mercimek-corbasi',
    name: 'Urfa Mercimek Çorbası',
    description: 'Urfa usulü mercimek çorbası, aynı adı taşıyan ülke genelindeki versiyonlardan çok farklıdır. Kırmızı mercimeğin yanı sıra Urfa\'ya özgü baharatlı yağ ve isot ile tatlandırılan bu çorba, şehrin iklimini ve baharat kültürünü yansıtır. Yanında limon ve sac ekmeğiyle sunulan Urfa mercimek çorbası, sabah kahvaltısından akşam yemeğine kadar her öğünde sofraya yakışır. İnce pürüsü ve baharatlı yağıyla süslü görünümü iştah açıcıdır.',
    ingredients: ['2 su bardağı kırmızı mercimek', '1 soğan', '2 diş sarımsak', '2 yemek kaşığı zeytinyağı', '1 tatlı kaşığı kimyon', '1 tatlı kaşığı kırmızı biber', '1 tatlı kaşığı Urfa isotu', 'tuz', '1 litre su', 'tereyağı (servis için)'],
    instructions: ['Soğan ve sarımsak yağda kavrulur.', 'Yıkanmış mercimek eklenerek 1-2 dakika çevrilir.', 'Su eklenerek 25 dakika kısık ateşte pişirilir.', 'Blender ile pürüsüz hale getirilir.', 'Kimyon, tuz ve kırmızı biber eklenir.', 'Tereyağında isot yakılarak üzerine gezdirilip servis edilir.'],
    prep_time: 15, cook_time: 35, servings: 4, difficulty: 'kolay', is_spicy: true, is_vegetarian: true,
  },
];

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n🍽️  Tarif Batch 13 (10 yeni tarif) seed ediliyor...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
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
    else { console.log(`  ⊘ ${r.slug} (zaten var)`); skipped++; }
  }

  const total = await db.query(`SELECT COUNT(*) FROM recipes`);
  console.log(`\n✅ ${added} eklendi | ${skipped} atlandı | Toplam: ${total.rows[0].count}`);

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
