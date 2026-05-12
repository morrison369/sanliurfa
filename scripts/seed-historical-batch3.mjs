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

const LOCAL_PORT = 15668;

const SITES = [
  {
    slug: 'ceylanpinar-antik-yerlesimleri',
    name: 'Ceylanpınar Antik Yerleşimleri',
    title: 'Ceylanpınar Antik Yerleşimleri — Suriye Sınırı Hattındaki Tarih',
    description: 'Şanlıurfa\'nın Suriye sınırındaki Ceylanpınar ilçesi, çevresindeki verimli Harran Ovası topraklarında binlerce yıllık kesintisiz yerleşim izleri barındırmaktadır. Bölgedeki höyükler ve antik kalıntılar; Kalkolitik dönemden Osmanlı çağına kadar uzanan katmanlı bir tarihi belgelemektedir. Ceylanpınar çevresindeki Tell\'ler (höyükler), Mezopotamya medeniyetlerinin kuzey sınırlarındaki etkisini gözler önüne sermektedir. Bölge, arkeolojik potansiyeli yüksek ve henüz tam olarak kazılmamış alanlara sahip olmasıyla araştırmacıların dikkatini çekmektedir.',
    short_description: 'Harran Ovası\'nın güney ucunda, Suriye sınırında yer alan; Kalkolitik dönemden Osmanlı\'ya kesintisiz yerleşim izleri barındıran höyükler ve antik kalıntılar alanı.',
    history: 'Ceylanpınar çevresindeki höyükler, verimli ova toprakları sayesinde Mezopotamya\'nın kuzeyi ile Anadolu\'nun güneyi arasındaki ticaret ve uygarlık hattı üzerinde yer almıştır. Roma ve Bizans dönemlerine ait kalıntılar ile Osmanlı hanları bölgede hâlâ varlığını korumaktadır.',
    significance: 'Güneydoğu Anadolu ile Yukarı Mezopotamya arasındaki tarihi geçiş güzergahını belgeleyen, arkeolojik açıdan büyük potansiyel taşıyan sınır hattı yerleşim alanıdır.',
    location: 'Ceylanpınar İlçesi, Şanlıurfa',
    latitude: 36.8455,
    longitude: 40.0316,
    visiting_hours: 'Gündüz saatlerinde serbestçe ziyaret edilebilir',
    entrance_fee: 'Ücretsiz',
    tags: ['höyük', 'antik yerleşim', 'ceylanpınar', 'kalkolitik', 'sınır bölgesi'],
    is_unesco: false,
    period: 'Kalkolitik — Osmanlı (çok dönemli)',
  },
  {
    slug: 'bozova-tarihi-koprusu',
    name: 'Bozova Tarihi Köprüsü',
    title: 'Bozova Tarihi Köprüsü — Fırat\'ı Aşan Taş Köprü',
    description: 'Şanlıurfa\'nın Bozova ilçesinde Fırat\'ın bir kolu üzerinde yükselen tarihi taş köprü; Ortaçağ\'da bölgenin en önemli ticaret ve geçiş güzergahlarından birini oluşturuyordu. Selçuklu-Osmanlı dönemi mimari özelliklerini yansıtan köprü; düzgün yontulmuş taşları ve karakteristik kemerli yapısıyla bölgenin taş işçiliğinin en güzel örneklerinden biri olarak değerlendirilmektedir. Baraj gölünün yükselmesiyle kısmen sular altında kalan köprünün görünür bölümü, özellikle kış aylarında çekici bir manzara sunmaktadır.',
    short_description: 'Bozova\'da Fırat kolu üzerinde yükselen Selçuklu-Osmanlı dönemine ait tarihi taş köprü; kısmen sular altında kalan kemerli yapısıyla ilgi çekici bir tarihi miras.',
    history: 'Köprü, Selçuklu döneminde inşa edilmiş; Osmanlı döneminde onarım geçirmiştir. Fırat Nehri\'nin ticaret güzergahını kontrol eden stratejik konumuyla yüzyıllar boyunca bölgenin en işlek geçiş noktalarından biri olmuştur.',
    significance: 'Bozova\'nın tarihi kimliğini simgeleyen ve baraj gölü içinde yükselen eşsiz manzarasıyla hem tarih hem fotoğrafçılık turizmi için değerli bir nokta.',
    location: 'Bozova İlçesi, Şanlıurfa',
    latitude: 37.3720,
    longitude: 38.5163,
    visiting_hours: 'Her zaman (dışarıdan görülebilir)',
    entrance_fee: 'Ücretsiz',
    tags: ['köprü', 'bozova', 'selçuklu', 'osmanlı', 'fırat', 'taş mimari'],
    is_unesco: false,
    period: 'Selçuklu — Osmanlı dönemi',
  },
  {
    slug: 'siverek-ulu-camii',
    name: 'Siverek Ulu Camii',
    title: 'Siverek Ulu Camii — Anadolu Selçuklu Mimarisinin İzleri',
    description: 'Şanlıurfa\'nın Siverek ilçesinde yer alan Ulu Cami; Artuklu ve Selçuklu dönemine ait mimari unsurları bünyesinde barındıran önemli bir tarihi yapıdır. Taş işçiliğinin incelikle işlendiği cephesi, özgün minaresi ve iç avlusuyla bölgenin en görkemli dini mimarisi örneklerinden biri olarak öne çıkmaktadır. Yüzyıllar boyunca yapılan onarımlar camiye farklı dönemlerin izlerini katmış; bu durum yapıyı çok katmanlı bir mimari belge haline getirmiştir. Aktif olarak kullanılan cami, hem inanç turizmi hem de mimari gezi rotaları için ziyaret edilmektedir.',
    short_description: 'Siverek\'te Artuklu-Selçuklu döneminden kalma; taş işçiliği, özgün minaresi ve çok dönemli mimari katmanlarıyla dikkat çekici tarihi ulu cami.',
    history: 'İlk yapım tarihi 12. yüzyıla uzanan cami; Artuklu Beyliği döneminde inşa edilmiş, ardından Selçuklu ve Osmanlı dönemlerinde genişletilip onarılmıştır. Siverek\'in merkezi dini yapısı olma kimliğini yüzyıllar boyunca sürdürmüştür.',
    significance: 'Siverek\'in tarihi ve dini kimliğinin simgesi; Artuklu taş mimarisini Güneydoğu Anadolu\'da temsil eden önemli eserlerden biridir.',
    location: 'Siverek İlçesi, Şanlıurfa',
    latitude: 37.7547,
    longitude: 39.3178,
    visiting_hours: '07:00 - 21:00 (namaz vakitleri hariç ziyaret)',
    entrance_fee: 'Ücretsiz',
    tags: ['cami', 'siverek', 'artuklu', 'selçuklu', 'dini mimari', 'taş işçiliği'],
    is_unesco: false,
    period: '12. yüzyıl (Artuklu-Selçuklu dönemi)',
  },
  {
    slug: 'akcakale-hoyugu',
    name: 'Akçakale Höyüğü (Tell Halaf Bölgesi)',
    title: 'Akçakale Höyüğü — Güneydoğu\'nun Prehistorik Yerleşim İzleri',
    description: 'Şanlıurfa\'nın Suriye sınırındaki Akçakale ilçesinde yer alan bu höyük; Neolitik dönemden başlayarak demir çağına kadar uzanan kesintisiz yerleşim katmanlarını barındırmaktadır. Akçakale çevresindeki höyükler, Harran Ovası\'nın tell arkeolojisi açısından en zengin bölgelerinden birini oluşturmaktadır. Tell Halaf kültürüyle ilişkilendirilen bu alandaki seramik ve arkeolojik kalıntılar; insanlığın erken dönem uygarlık süreçlerine dair önemli ipuçları sunmaktadır.',
    short_description: 'Suriye sınırındaki Akçakale\'de Tell Halaf kültürüyle ilişkili; Neolitik\'ten Demir Çağı\'na uzanan zengin arkeolojik katmanlar barındıran tarihi höyük.',
    history: 'Akçakale höyüğü ve çevresi, Halaf kültürü (MÖ 6000-5300) döneminde yoğun yerleşime ev sahipliği yapmıştır. Sonraki dönemlerde Arami, Asur ve Roma uygarlıklarının da izlerini taşıyan alan; bölgenin kesintisiz tarihsel sürekliliğini belgeler.',
    significance: 'Tell Halaf kültürünün kuzey yayılımını belgeleyen nadir alanlardan biri; Güneydoğu Anadolu prehistoryasının araştırılması için birincil öneme sahip bir saha.',
    location: 'Akçakale İlçesi, Şanlıurfa',
    latitude: 36.7136,
    longitude: 38.9452,
    visiting_hours: 'Gündüz saatlerinde serbestçe ziyaret edilebilir',
    entrance_fee: 'Ücretsiz',
    tags: ['höyük', 'akçakale', 'tell halaf', 'neolitik', 'prehistorik', 'arkeoloji'],
    is_unesco: false,
    period: 'Neolitik — Demir Çağı (MÖ 6000-1000)',
  },
  {
    slug: 'viransehir-tarihi-merkezi',
    name: 'Viranşehir Tarihi Kent Merkezi',
    title: 'Viranşehir — Antik Constantina\'nın Yüzyıllar Öncesinden Uzanan Mirası',
    description: 'Şanlıurfa\'nın Viranşehir ilçesi; Bizans döneminde Constantina adıyla bilinen antik bir yerleşim üzerine kurulmuştur. İlçe merkezinde ve çevresinde Roma-Bizans dönemine ait sur kalıntıları, sütun parçaları ve mimari izler görülmektedir. Viranşehir adı da eski şehrin harabelerine göndermede bulunmakta olup bölgenin tarihi katmanlılığını yansıtmaktadır. Antik Constantina dönemi kalıntılarının bir kısmı hâlâ günlük yaşamın içinde varlığını sürdürmekte; ilçe meydanında eski sütun başlıkları ve taşlar sergilenmektedir.',
    short_description: 'Antik Bizans kenti Constantina\'nın kurulduğu yer olan Viranşehir; Roma-Bizans sur kalıntıları, sütun parçaları ve antik taşlarla örülü tarihi kent dokusunu bugün hâlâ yaşatmaktadır.',
    history: 'Roma İmparatoru Constantius tarafından MS 4. yüzyılda kurulan Constantina; Doğu Roma\'nın önemli sınır kentlerinden biri olmuştur. Sonraki yüzyıllarda Arap, Selçuklu ve Osmanlı hakimiyetine giren şehir; her dönem farklı kültürel katmanlar kazanmıştır.',
    significance: 'Antik Constantina\'nın üzerine kurulu Bizans sınır kenti mirasını taşıyan; Şanlıurfa ilçeleri arasında arkeolojik açıdan en yoğun geçmişe sahip yerleşim merkezlerinden biri.',
    location: 'Viranşehir İlçesi, Şanlıurfa',
    latitude: 37.2330,
    longitude: 39.7660,
    visiting_hours: 'Her zaman (açık alan)',
    entrance_fee: 'Ücretsiz',
    tags: ['viranşehir', 'bizans', 'constantina', 'roma', 'antik kent', 'sur'],
    is_unesco: false,
    period: 'MS 4. yüzyıl (Roma-Bizans dönemi)',
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
  console.log('\n🏛️  Tarihi Yer Batch 3 (5 yeni yer)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;
  for (const s of SITES) {
    const res = await db.query(
      `INSERT INTO historical_sites (slug,name,title,description,short_description,history,significance,location,latitude,longitude,visiting_hours,entrance_fee,tags,is_unesco,period,status,is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',false)
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug,s.name,s.title,s.description,s.short_description,s.history,s.significance,s.location,s.latitude,s.longitude,s.visiting_hours,s.entrance_fee,s.tags,s.is_unesco,s.period]
    );
    if (res.rowCount > 0) { console.log(`  ✓ ${s.name}`); inserted++; }
    else { console.log(`  — ${s.name} (zaten var)`); skipped++; }
  }

  const { rows: [stats] } = await db.query(`SELECT COUNT(*) AS total FROM historical_sites WHERE status='published'`);
  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${inserted} eklendi | ${skipped} atlandı`);
  console.log(`📊 Toplam tarihi yer: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
