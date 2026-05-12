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

const LOCAL_PORT = 15700;

const SITES = [
  {
    slug: 'harran-universitesi-harabeleri',
    name: 'Harran Üniversitesi Harabeleri',
    title: 'Harran Üniversitesi Harabeleri — Dünyanın İlk Üniversitesi',
    description: 'Harran, İslam dünyasının ilk üniversitesi olarak kabul edilen "Câmiatü\'l-Harran"ın kurulduğu şehirdir. 9. yüzyılda Abbasi döneminde kurulan bu ilim yuvası; matematik, astronomi, felsefe ve tıp alanlarında döneminin en ileri çalışmalarına ev sahipliği yapmıştır. Sabiiler tarafından da kutsal kabul edilen Harran\'da yer alan bu tarihi yapı kompleksi, günümüzde kısmen harabeler halinde ziyaretçileri karşılamaktadır. Dünyanın en eski yüksekokul geleneğinin izlerini taşıyan bu mekân, bilim tarihinin önemli bir durağıdır. Harran\'ın ilim geleneği; Thabit ibn Qurra ve Al-Battani gibi büyük matematikçi ve astronomların yetişmesine zemin hazırlamıştır.',
    short_description: 'Abbasi döneminde kurulan İslam dünyasının ilk üniversitesi olan Câmiatü\'l-Harran\'ın tarihi kalıntıları; astronomi, matematik ve tıp alanlarında dünya ilim tarihinin kilometre taşı.',
    history: '9. yüzyılda Abbasi halifesi Me\'mun döneminde kurulan bu ilim merkezi; Mezopotamya\'nın antik bilgelik geleneğini İslam bilimi ile sentezlemiştir. Özellikle Sabiiler\'in astroloji ve felsefe birikimi, Arap-İslam düşüncesiyle harmanlanarak çığır açan eserlerin ortaya çıkmasını sağlamıştır.',
    significance: 'Organize yükseköğretimin kökleri arasında gösterilen Harran Üniversitesi; Ortaçağ İslam biliminin temel taşlarından biri olarak küresel ilim tarihinde yerini almıştır.',
    location: 'Harran İlçesi, Şanlıurfa',
    latitude: 36.8638,
    longitude: 39.0235,
    visiting_hours: 'Her gün 08:00 - 18:00',
    entrance_fee: 'Ücretsiz (Harran arkeolojik alanı kapsamında)',
    tags: ['harran', 'üniversite', 'ilim', 'abbasi', 'sabiiler', 'astronomi', 'tarih'],
    is_unesco: false,
    period: '9. yüzyıl (Abbasi dönemi)',
  },
  {
    slug: 'urfa-kizilkoyun-nekropolu',
    name: 'Kızılkoyun Nekropolü',
    title: 'Kızılkoyun Nekropolü — Şanlıurfa\'nın Antik Mezarlık Alanı',
    description: 'Şanlıurfa il merkezine yakın konumdaki Kızılkoyun Nekropolü; Roma ve erken Bizans dönemlerine ait kaya mezarları, lahitler ve yeraltı oda mezarlarından oluşan önemli bir antik mezarlık alanıdır. Kırmızı kireçtaşı kayalıklarına oyulmuş mezarlar; bölgenin antik dönem nüfusunun büyüklüğüne ve cenaze ritüellerine dair değerli bilgiler sunmaktadır. Bazı mezarlarda görülen Süryanice ve Aramice yazıtlar; bölgenin çok kültürlü geçmişinin somut kanıtlarıdır. Koruma altında bulunan alan; arkeolojik değeri ve görsel etkisiyle ziyaretçileri cezbetmektedir.',
    short_description: 'Roma-Bizans dönemine ait kaya oyma mezarlar, lahitler ve Süryanice yazıtlardan oluşan; Şanlıurfa\'nın antik çok kültürlü geçmişini belgeleyen önemli nekropol alanı.',
    history: 'MS 1. yüzyıldan 6. yüzyıla kadar kullanılan nekropol; Edessa (Urfa) şehrinin varlıklı kesimlerinin gömüldüğü seçkin bir mezarlık alanı niteliği taşımaktaydı. Mezar mimarisindeki çeşitlilik, bölgede Pagan, Hristiyan ve Yahudi toplulukların bir arada yaşadığına işaret etmektedir.',
    significance: 'Şanlıurfa\'nın antik dönem demografisini, çok kültürlü yapısını ve cenaze geleneklerini belgeleyen; bölgedeki Hellenistik ve Hristiyan geleneğin en somut arkeolojik kanıtlarından biri.',
    location: 'Kızılkoyun, Şanlıurfa Merkez',
    latitude: 37.1542,
    longitude: 38.8127,
    visiting_hours: 'Her gün 08:30 - 17:30',
    entrance_fee: 'Ücretsiz',
    tags: ['nekropol', 'roma', 'bizans', 'kaya mezarı', 'süryanice', 'arkeoloji', 'edessa'],
    is_unesco: false,
    period: 'Roma — erken Bizans dönemi (MS 1-6. yüzyıl)',
  },
  {
    slug: 'halfeti-rum-kilisesi',
    name: 'Halfeti Rum Kilisesi',
    title: 'Halfeti Rum Kilisesi — Sular Altındaki Tarihin Tanığı',
    description: 'Fırat Nehri\'nin Birecik Barajı\'nın sular altında bıraktığı eski Halfeti ilçesindeki Rum Ortodoks kilisesi; yükselen su seviyesiyle birlikte kısmen sular altına giren tarihi bir yapıdır. Yalnızca su seviyesinin düştüğü dönemlerde ziyaret edilebilen bu kilise; Antik Çağ\'dan Osmanlı dönemine uzanan Hristiyan varlığının bölgedeki son izlerinden biridir. Bölgede yaşayan Rum Ortodoks cemaatinin göç etmek zorunda kaldığı 20. yüzyılın başlarına kadar aktif olarak kullanılan kilise; günümüzde hem tarihi hem de mistik atmosferiyle turizm ilgisi çekmektedir. Halfeti\'nin eşsiz doğal güzelliğiyle bütünleşen bu yapı; bölgenin en fotoğrafik noktalarından biri haline gelmiştir.',
    short_description: 'Birecik Barajı\'nın sular altında bıraktığı eski Halfeti\'de kısmen su altında kalan Rum Ortodoks kilisesi; tarihi, doğal güzelliği ve mistik atmosferiyle dikkat çekici bir miras.',
    history: 'Kilise, bölgede yüzyıllarca yaşayan Rum Ortodoks topluluğu tarafından inşa edilmiş ve 20. yüzyılın başlarına kadar aktif olarak kullanılmıştır. 1998\'de Birecik Barajı\'nın tamamlanmasıyla eski Halfeti sular altında kalınca kilise de büyük ölçüde su altına gömülmüştür.',
    significance: 'Halfeti\'nin su altındaki tarihini ve bölgedeki çok kültürlü geçmişi simgeleyen; yalnızca kuraklık dönemlerinde ziyaret edilebilen, eşsiz bir tarihi ve estetik miras noktası.',
    location: 'Halfeti İlçesi, Şanlıurfa (Fırat üzerinde)',
    latitude: 37.2593,
    longitude: 37.8786,
    visiting_hours: 'Su seviyesine bağlı (tekne turu ile ulaşım, Nisan-Ekim önerilen)',
    entrance_fee: 'Tekne turu ücreti (kişi başı değişken)',
    tags: ['halfeti', 'rum kilisesi', 'su altı', 'fırat', 'hristiyan', 'baraj', 'tekne turu'],
    is_unesco: false,
    period: 'Osmanlı dönemi — 20. yüzyıl başı',
  },
  {
    slug: 'pinarbasi-hoyugu',
    name: 'Pınarbası Höyüğü',
    title: 'Pınarbası Höyüğü — Neolitik Yerleşimin İzlerinde',
    description: 'Şanlıurfa\'ya yakın konumdaki Pınarbası Höyüğü; Neolitik çağa ait önemli bir yerleşim yeri kalıntısıdır. Arkeologların bölgede yürüttüğü yüzey araştırmaları; alanın yaklaşık MÖ 9000 yıllarına tarihlenebileceğini ortaya koymaktadır. Göbeklitepe ile çağdaş olan bu höyük; erken çiftçilik geleneğine geçiş döneminin izlerini barındırmakta ve Verimli Hilal\'in kuzey ucundaki yerleşim örüntülerini anlamak açısından kritik veriler sunmaktadır. Sistematik kazıların henüz tamamlanmadığı alan; arkeolojik potansiyeliyle bilim dünyasının gündemindedir.',
    short_description: 'Göbeklitepe ile çağdaş, MÖ 9000\'e tarihlenen Neolitik yerleşim kalıntıları barındıran höyük; erken çiftçilik döneminin Şanlıurfa bölgesindeki izlerini taşıyan önemli arkeolojik alan.',
    history: 'MÖ 10. binyıldan itibaren yerleşime sahne olan Pınarbası Höyüğü; avcı-toplayıcı yaşam biçiminden yerleşik tarım toplumuna geçiş dönemini belgeleyen katmanlı arkeolojik kanıtlar içermektedir. Bölgede bulunan hayvan kemikleri ve bitkisel kalıntılar; erken dönem tarım uygulamalarına işaret etmektedir.',
    significance: 'Göbeklitepe çevresindeki Neolitik yerleşim ağını anlamamıza katkı sağlayan; insan uygarlığının tarıma geçiş dönemini belgeleyen nadir arkeolojik alanlardan biri.',
    location: 'Merkez İlçe, Şanlıurfa (Göbeklitepe yakını)',
    latitude: 37.2231,
    longitude: 38.9516,
    visiting_hours: 'Gün içinde ziyaret edilebilir (rehber önerilir)',
    entrance_fee: 'Ücretsiz',
    tags: ['höyük', 'neolitik', 'arkeoloji', 'çiftçilik', 'göbeklitepe yakını', 'prehistorik'],
    is_unesco: false,
    period: 'MÖ 9000 civarı (Çanak Çömleksiz Neolitik A)',
  },
  {
    slug: 'sanliurfa-kapi-cami',
    name: 'Kapı Camii',
    title: 'Kapı Camii — Şanlıurfa\'nın Tarihi Çarşı Camisi',
    description: 'Şanlıurfa tarihi çarşısının kalbinde yer alan Kapı Camii; Osmanlı döneminden kalma mimari özellikleriyle şehrin en önemli tarihi dini yapılarından biridir. Taş işçiliğinin incelikle yansıtıldığı cephesi, orijinal minaresi ve iç avlusuyla Güneydoğu Anadolu Osmanlı camii mimarisinin seçkin bir örneği olan yapı; yüzyıllar boyunca çarşı esnafının ve şehir halkının buluşma noktası olmuştur. Kapalı çarşıya bitişik konumda yer alması; camiye tarihi ticaret dokusuyla bütünleşik bir kimlik kazandırmaktadır. Günümüzde de aktif ibadet yeri olarak kullanılan Kapı Camii; hem dini turizm hem de kültürel miras turu kapsamında ziyaret edilmektedir.',
    short_description: 'Şanlıurfa tarihi kapalı çarşısına bitişik, Osmanlı döneminden kalma; taş işçiliği ve çarşı dokusuyla bütünleşik mimarisiyle öne çıkan aktif tarihi cami.',
    history: 'Osmanlı döneminde inşa edilen Kapı Camii; şehrin ticaret merkezinin gelişimiyle birlikte çarşı esnafının ve yolcuların ibadete durduğu temel mekân haline gelmiştir. Adını yakınındaki tarihi şehir kapısından alan yapı; birçok onarım geçirerek günümüze ulaşmıştır.',
    significance: 'Şanlıurfa tarihi çarşı dokusunun ayrılmaz parçası olan Kapı Camii; ticaret-ibadet ilişkisinin mimari yansıması ve şehrin Osmanlı dönemindeki kentsel hafızasının önemli taşıyıcısı.',
    location: 'Tarihi Çarşı, Şanlıurfa Merkez',
    latitude: 37.1604,
    longitude: 38.7950,
    visiting_hours: '07:00 - 22:00 (namaz vakitlerinde ziyaretçi girişi kısıtlı)',
    entrance_fee: 'Ücretsiz',
    tags: ['cami', 'osmanlı', 'çarşı', 'tarihi merkez', 'dini miras', 'taş mimari'],
    is_unesco: false,
    period: 'Osmanlı dönemi',
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
  console.log('\n🏛️  Tarihi Yer Batch 4 Seed...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let added = 0, skipped = 0;
  for (const s of SITES) {
    const res = await db.query(
      `INSERT INTO historical_sites (slug, name, title, description, short_description, history, significance, location, latitude, longitude, visiting_hours, entrance_fee, tags, is_unesco, period, status, cover_image, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',NULL,NOW(),NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.name, s.title, s.description, s.short_description, s.history, s.significance, s.location, s.latitude, s.longitude, s.visiting_hours, s.entrance_fee, s.tags, s.is_unesco, s.period]
    );
    if (res.rowCount > 0) { console.log(`  ✓ ${s.slug}`); added++; }
    else { console.log(`  ⊘ ${s.slug} (var)`); skipped++; }
  }

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${added} eklendi | ${skipped} atlandı`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
