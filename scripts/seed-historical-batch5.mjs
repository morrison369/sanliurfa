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

const LOCAL_TUNNEL_PORT = 15718;

const SITES = [
  {
    slug: 'sumatar-harabesi',
    name: 'Sumatar Harabesi',
    title: 'Sumatar Harabesi — Ay Tanrısı Sin\'in Kutsal Kenti',
    description: 'Sumatar Harabesi, Harran\'ın yaklaşık 60 km kuzeydoğusunda yer alan ve MS 2-3. yüzyıllara tarihlenen benzersiz bir tapınak kompleksidir. Paganlığın son büyük merkezi olarak kabul edilen bu alan, Ay Tanrısı Sin\'e adanmış bir dizi tapınağı, kule ve mezarı barındırır. Aramice yazıtlarla süslü kaya oyma tapınakları, dönemin inanç dünyasını gözler önüne serer. UNESCO Dünya Mirası Geçici Listesi\'nde yer alan bölge, az ziyaretçi gören ama derin bir tarihsel değer taşıyan bir açık hava müzesidir.',
    short_description: 'Harran yakınlarında MS 2-3. yy\'a ait pagan tapınak kompleksi; Ay Tanrısı Sin\'e adanmış kaya oyma tapınakları ve Aramice yazıtlarla.',
    history: 'Sumatar, Harran\'ın pagan inanç geleneğinin merkeziydi. Romalı ve Bizanslı dönemlerde de aktif olan alan, Hristiyanlığın yayılmasıyla terk edildi. Bölgedeki Süryanice ve Aramice yazıtlar, Erken Dönem Hristiyanlık öncesi dini yaşama dair önemli belgeler içerir.',
    significance: 'Aramice yazıtlara sahip az sayıdaki alanlardan biri olması, pagan inanç tarihindeki yeri ve Harran Sabii geleneğiyle bağlantısı nedeniyle dünya genelinde arkeologlarca incelenmektedir.',
    location: 'Harran ilçesi, Şanlıurfa',
    latitude: 36.8234,
    longitude: 38.9876,
    visiting_hours: 'Her gün 08:00-18:00',
    entrance_fee: 'Ücretsiz',
    tags: ['arkeoloji', 'pagan', 'tapınak', 'Aramice', 'Harran', 'tarihi'],
    is_unesco: false,
    period: 'MS 2-3. Yüzyıl',
  },
  {
    slug: 'urfa-huseyin-pasa-hammami',
    name: 'Hüseyin Paşa Hamamı',
    title: 'Hüseyin Paşa Hamamı — Osmanlı Dönemi\'nden Kalma Tarihi Hamam',
    description: 'Hüseyin Paşa Hamamı, Şanlıurfa\'nın tarihi çarşı bölgesinde yer alan ve 18. yüzyıla tarihlenen nadide bir Osmanlı yapısıdır. Geleneksel kervansaray mimarisinin izlerini taşıyan hamam, kalın taş duvarları, göbek taşı ve çifte kubbeleriyle dönemin yaşam kültürünü yansıtır. Uzun yıllar boyunca şehrin sosyal buluşma mekânı işlevi gören yapı, restorasyon çalışmaları sonrasında kültürel ziyaretlere açık hale gelmiştir. Yakın çevresindeki çarşılar ve hanlarla birlikte Urfa\'nın ticaret tarihi açısından önemli bir konumdadır.',
    short_description: '18. yy Osmanlı dönemi taş hamamı; çifte kubbesi, göbek taşı ve tarihi çarşı bölgesindeki konumuyla.',
    history: 'Osmanlı döneminde bölgenin önemli bir ticaret merkezi olan Şanlıurfa\'da hamam geleneği vazgeçilmezdi. Hüseyin Paşa Hamamı, şehrin en köklü Osmanlı yapılarından biri olarak kayıtlara geçmiştir.',
    significance: 'Osmanlı döneminin kentsel sosyal yaşamına dair somut bir tanıklık sunan yapı, restore edilerek gelecek kuşaklara aktarılma hedefiyle kültürel koruma altındadır.',
    location: 'Tarihi Çarşı, Haliliye, Şanlıurfa',
    latitude: 37.1582,
    longitude: 38.7908,
    visiting_hours: 'Sal-Paz 09:00-17:00',
    entrance_fee: 'Ücretsiz',
    tags: ['hamam', 'Osmanlı', 'tarihi', 'mimari', 'çarşı', 'restorasyon'],
    is_unesco: false,
    period: '18. Yüzyıl Osmanlı',
  },
  {
    slug: 'tek-tek-daglar-milli-parki',
    name: 'Tek Tek Dağları Milli Parkı',
    title: 'Tek Tek Dağları Milli Parkı — Prehistorik Höyükler ve Doğal Güzellik',
    description: 'Tek Tek Dağları Milli Parkı, Şanlıurfa\'nın güneyinde yaklaşık 3.200 hektar alan kaplayan benzersiz bir doğal ve kültürel miras alanıdır. Park içinde ve çevresinde Neolitik, Kalkolitik ve Tunç Çağı\'na ait çok sayıda höyük ve yerleşim izi bulunmaktadır. Dağlık topoğrafyası, kayalık mağaraları ve mevsimlik gölleriyle bölge; flora ve fauna çeşitliliği açısından da zengindir. Yerel halk için geleneksel piknik ve doğa yürüyüşü alanı olan park, arkeologlar için de açık bir araştırma sahası niteliği taşır.',
    short_description: 'Şanlıurfa güneyinde 3.200 hektar milli park; prehistorik höyükler, kayalık mağaralar ve zengin doğa yaşamıyla.',
    history: 'Bölgede Neolitik dönemden itibaren kesintisiz yerleşimin izleri bulunmaktadır. 1994 yılında milli park statüsü kazanan alan, bugün hem doğa koruma hem arkeolojik araştırma bölgesi olarak korunmaktadır.',
    significance: 'Prehistorik yerleşim kalıntılarının doğal bir peyzajla iç içe bulunduğu ender alanlardan biridir. Endemik bitki türleri ve göçmen kuş yolları üzerindeki konumuyla ekolojik önemi de yüksektir.',
    location: 'Şanlıurfa güneyinde, Siverek-Viranşehir sınırı',
    latitude: 37.0256,
    longitude: 39.1432,
    visiting_hours: 'Her gün gün doğumu-gün batımı',
    entrance_fee: 'Ücretsiz',
    tags: ['milli park', 'doğa', 'höyük', 'arkeoloji', 'piknik', 'yürüyüş'],
    is_unesco: false,
    period: 'Neolitik - Günümüz',
  },
  {
    slug: 'birecik-kalesi-surlar',
    name: 'Birecik Kalesi ve Sur Kalıntıları',
    title: 'Birecik Kalesi — Fırat Köprüsünün Bekçisi',
    description: 'Fırat Nehri\'nin sol yakasında yer alan Birecik Kalesi, antik çağlardan bu yana stratejik önemini koruyan ve defalarca el değiştiren köklü bir savunma yapısıdır. Asurlar, Romalılar, Bizanslılar ve Osmanlılar\'ın ardı ardına egemenlik kurduğu bu kale, Fırat\'ı geçen ticaret ve sefer yollarının kilit noktasında bulunur. Bugün büyük bölümü ayakta olan surlar ve kule kalıntıları, yıllar içinde geçirilen savaşların ve mimarların izlerini taşır. Birecik\'in kayalık sırtına inşa edilen kale, nehir manzarasıyla eşsiz bir panorama sunar.',
    short_description: 'Fırat kıyısında çok katmanlı tarihsel kale; Asur\'dan Osmanlı\'ya uzanan katmanları ve nehir manzarasıyla.',
    history: 'Antik çağda Makedonca Apamea, Romalılar döneminde Capersana adıyla bilinen bölge, İslami fetheden sonra Biredjik (Küçük Kule) adını almıştır. Osmanlı döneminde Fırat\'taki köprüyü koruyan önemli bir sınır kalesidir.',
    significance: 'Fırat üzerindeki tarihsel geçiş noktasını kontrol eden kale, pek çok kültürün izini bir arada taşır. Bölgenin antik ticaret yolları ve askeri tarihi açısından kritik bir referans noktasıdır.',
    location: 'Birecik ilçesi, Şanlıurfa',
    latitude: 37.0258,
    longitude: 37.9782,
    visiting_hours: 'Her gün 08:00-18:00',
    entrance_fee: 'Ücretsiz',
    tags: ['kale', 'Birecik', 'Fırat', 'Osmanlı', 'Bizans', 'surlar'],
    is_unesco: false,
    period: 'Antik Çağ - Osmanlı',
  },
  {
    slug: 'urfa-bedesteni',
    name: 'Şanlıurfa Bedesteni',
    title: 'Urfa Bedesteni — Tarihi Kapalı Çarşı ve El Sanatları Merkezi',
    description: 'Şanlıurfa Bedesteni, şehrin tarihi çarşı dokusunun kalbinde yer alan ve Osmanlı döneminde inşa edilmiş kapalı bir ticaret yapısıdır. Uzun yıllar boyunca bakır, tekstil ve baharat ticaretinin kalbi olan bedestenin tonozlu koridorları ve taş kemerli dükkanları, Orta Doğu çarşı kültürünün Anadolu\'daki en etkileyici örneklerinden birine ev sahipliği yapar. Günümüzde geleneksel el sanatları (bakır işlemeciliği, heybe dokumacılığı, takı) ile yerel lezzetlerin satıldığı bedestenin atmosferi, ziyaretçiyi yüzyıllar öncesine götürür.',
    short_description: 'Osmanlı döneminden kalma tarihi kapalı çarşı; tonozlu koridorları, taş kemerli dükkanları ve geleneksel el sanatları atölyeleriyle.',
    history: 'Osmanlı döneminde Şanlıurfa\'nın önemli bir ticaret merkezi olarak inşa edilen bedestenin tam inşa tarihi tartışmalıdır, ancak 17-18. yüzyıla tarihlendirilmektedir. Bakırcılar çarşısı ile iç içe olan yapı, şehrin ticari kimliğinin simgesidir.',
    significance: 'Canlı bir el sanatları ve turizm merkezi olarak korunan bedestenin özgün mimari dokusu, Güneydoğu Anadolu\'nun çarşı geleneğini yaşatmaktadır.',
    location: 'Tarihi Çarşı, Haliliye, Şanlıurfa',
    latitude: 37.1591,
    longitude: 38.7913,
    visiting_hours: 'Pzt-Cmt 08:00-19:00',
    entrance_fee: 'Ücretsiz',
    tags: ['bedeseten', 'çarşı', 'Osmanlı', 'el sanatları', 'tarihi', 'bakırcılar'],
    is_unesco: false,
    period: '17-18. Yüzyıl Osmanlı',
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
  console.log('\n🏛️  Tarihi Yer Batch 5 (5 yeni yer) seed ediliyor...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let added = 0, skipped = 0;

  for (const s of SITES) {
    const res = await db.query(
      `INSERT INTO historical_sites (slug, name, title, description, short_description, history, significance, location, latitude, longitude, visiting_hours, entrance_fee, tags, is_unesco, period, status, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',NOW(),NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.name, s.title, s.description, s.short_description, s.history, s.significance, s.location, s.latitude, s.longitude, s.visiting_hours, s.entrance_fee, s.tags, s.is_unesco, s.period]
    );
    if (res.rowCount > 0) { console.log(`  ✓ ${s.slug}`); added++; }
    else { console.log(`  ⊘ ${s.slug} (zaten var)`); skipped++; }
  }

  const total = await db.query(`SELECT COUNT(*) FROM historical_sites`);
  console.log(`\n✅ ${added} eklendi | ${skipped} atlandı | Toplam: ${total.rows[0].count}`);

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
