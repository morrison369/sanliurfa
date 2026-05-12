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

const LOCAL_PORT = 15636;

const SITES = [
  {
    slug: 'karakus-tumulu',
    name: 'Karakuş Tümülüsü',
    title: 'Karakuş Tümülüsü — Kommagene Döneminin Gizemli Mezar Tepesi',
    description: 'Karakuş Tümülüsü, Adıyaman sınırına yakın Şanlıurfa çevresinde yer alan ve Kommagene Krallığı dönemine (M.Ö. 1. yüzyıl) tarihlenen görkemli bir mezar tepesidir. Tepesinde sütunlar ve hayvan heykellerinin bulunduğu anıt, bölgenin en önemli antik yapılarından biridir. Karakuş, Kommagene kültürünün derinliklerine incelemek isteyenler için zorunlu bir durak niteliği taşımaktadır.',
    short_description: 'M.Ö. 1. yüzyıldan kalma Kommagene dönemi kraliyet mezarı; tepesindeki sütunlar ve hayvan heykelleriyle bölgenin en dikkat çekici antik yapılarından biridir.',
    history: 'Karakuş Tümülüsü, Kommagene Krallığı döneminde kral ailesinin kadın üyeleri için inşa edilmiştir. Yapının tepe noktasında bir kartal heykeli yer almakta olup tümülüsün adı da bu kartal figüründen gelmektedir. Kommagene Krallığı, Nemrut Dağı ile birlikte bu anıtı da kültürel hafızada derin bir iz bırakmıştır.',
    significance: 'Kommagene Krallığı mirasının Şanlıurfa çevresindeki en önemli temsilcilerinden biri olup arkeolojik açıdan bölge tarihini aydınlatmaktadır.',
    location: 'Kahta İlçesi yakını, Adıyaman-Şanlıurfa bölgesi',
    latitude: 37.9312,
    longitude: 38.6185,
    visiting_hours: '08:00 - 18:00 (her gün)',
    entrance_fee: 'Ücretsiz',
    tags: ['kommagene', 'tümülüs', 'antik', 'arkeoloji', 'mezar'],
    is_unesco: false,
    period: 'M.Ö. 1. yüzyıl (Kommagene Dönemi)',
  },
  {
    slug: 'suayb-sehri',
    name: 'Suayb Şehri (Şuayb Şehri)',
    title: 'Suayb Şehri — Hz. Şuayb Peygamberin Makamı',
    description: 'Suayb Şehri, Şanlıurfa\'nın Hilvan ilçesine bağlı olup Hz. Şuayb Peygamber ile özdeşleştirilen kutsal bir ziyaret alanıdır. Kaya oyma yapılar, antik sütunlar ve Hz. Şuayb\'a ait olduğuna inanılan mağara-makam bu alanda bir arada bulunmaktadır. İnanç turizmi ile arkeoloji meraklılarını aynı anda bünyesinde toplayan ender alanlardan biridir.',
    short_description: 'Hz. Şuayb Peygamber\'in makamı olduğuna inanılan kaya oyma yapılar, antik sütunlar ve kutsal mağarayı barındıran inanç ve arkeoloji turizmi alanı.',
    history: 'Bölge, Roma ve Bizans dönemlerine ait kaya oyma yapıları ile İslam öncesi ve sonrası inanç izlerini bir arada barındırmaktadır. Hz. Şuayb\'ın bu bölgede yaşadığı ve Medyen halkına peygamber olarak gönderildiğine dair inanç; alanı önemli bir hac ve ziyaret merkezi yapmıştır.',
    significance: 'Kaya mimarisi, inanç turizmi ve antik tarih açısından bölgenin en özgün çok katmanlı alanlarından biridir.',
    location: 'Hilvan İlçesi, Şanlıurfa',
    latitude: 37.5621,
    longitude: 39.0183,
    visiting_hours: 'Gündüz saatlerinde serbestçe ziyaret edilebilir',
    entrance_fee: 'Ücretsiz',
    tags: ['inanç turizmi', 'kaya mimarisi', 'peygamber makamı', 'antik', 'hilvan'],
    is_unesco: false,
    period: 'Roma-Bizans ve erken İslam dönemi',
  },
  {
    slug: 'nemrut-dag-ziyaret-noktasi',
    name: 'Nemrut Dağı Ziyaret Noktası (Şanlıurfa Güzergahı)',
    title: 'Nemrut Dağı — Kommagene Tanrı Heykelleri ve Gün Doğumu Turu',
    description: 'Şanlıurfa\'dan yaklaşık 3 saatlik mesafede yer alan Nemrut Dağı, UNESCO Dünya Mirası listesindeki Kommagene Krallığı anıtlarına ev sahipliği yapar. 2150 metre rakımdaki zirvedeki dev tanrı başları ve tümülüs, gün doğumu ile gün batımı manzarasıyla dünyanın en etkileyici arkeolojik alanlarından biridir. Şanlıurfa turlarının vazgeçilmez güzergahlarından biridir.',
    short_description: 'UNESCO listesindeki Kommagene Krallığı\'nın dev tanrı heykellerini barındıran 2150 metrelik dağ; gün doğumunda izlenen görüntüsüyle eşsiz bir deneyim sunar.',
    history: 'Kral I. Antiochos tarafından M.Ö. 62-32 yılları arasında inşa ettirilen bu tümülüs ve anıt alanı; Yunan, Pers ve Anadolu tanrılarının birleştiği senkretik bir inanç sistemini yansıtmaktadır. Dağın zirvesindeki büyük taş başlar; Zeus-Oromasdes, Apollon-Mithras ve Herakles-Artagnes gibi tanrıları temsil etmektedir.',
    significance: 'UNESCO Dünya Mirası; Kommagene uygarlığının en görsel ve etkileyici anıtı olup kültürel çeşitliliği simgeler.',
    location: 'Kahta, Adıyaman (Şanlıurfa güzergahında)',
    latitude: 37.9811,
    longitude: 38.7411,
    visiting_hours: 'Gün doğumu (05:00) - 19:00',
    entrance_fee: 'Ücretli (müze kartı geçerli)',
    tags: ['nemrut', 'kommagene', 'unesco', 'tanrı heykelleri', 'gün doğumu'],
    is_unesco: true,
    period: 'M.Ö. 62-32 (Kommagene Dönemi)',
  },
  {
    slug: 'birecik-kalesi',
    name: 'Birecik Kalesi',
    title: 'Birecik Kalesi — Fırat Kıyısının Tarihi Gözetleme Kalesi',
    description: 'Fırat Nehri\'nin sağ kıyısında, stratejik bir konumda yükselen Birecik Kalesi; Hitit, Roma, Bizans, Arap ve Osmanlı dönemlerinin izlerini bünyesinde barındıran çok katmanlı bir tarihi yapıdır. Fırat\'ın berrak suları üzerindeki nefes kesen manzarası ve binlerce yıllık geçmişiyle Birecik\'i ziyaret eden her konuğun ilk durağı olmaktadır. Kelaynak kuşlarının koruma merkezi de bu kale çevresinde yer almaktadır.',
    short_description: 'Fırat Nehri kıyısında yükselen, Hitit\'ten Osmanlı\'ya çok dönemli tarihi kale; kelaynak kuş koruma merkezi ve panoramik Fırat manzarasıyla öne çıkar.',
    history: 'Birecik Kalesi\'nin temelleri Hurriler ve Hititlere dek uzanmakta; ardından sırasıyla Roma, Bizans, Hamdaniler, Selçuklular ve Osmanlılar tarafından kullanılmıştır. Osmanlı döneminde Fırat geçişini kontrol eden stratejik bir askeri üs konumuna sahip olan kale, 19. yüzyılda restore edilmiştir.',
    significance: 'Çok uygarlıklı tarihi yapısıyla bölgenin en önemli kalelerinden biri; kelaynak kuşlarının koruma alanına yakınlığıyla da ekolojik bir değer taşımaktadır.',
    location: 'Birecik İlçesi, Şanlıurfa',
    latitude: 37.0248,
    longitude: 37.9776,
    visiting_hours: '08:00 - 19:00 (her gün)',
    entrance_fee: 'Ücretsiz',
    tags: ['birecik', 'kale', 'fırat', 'osmanlı', 'bizans', 'kelaynak'],
    is_unesco: false,
    period: 'Hitit - Osmanlı (çok dönemli)',
  },
  {
    slug: 'sogmatar-antik-kenti',
    name: 'Soğmatar Antik Kenti',
    title: 'Soğmatar — Gezegen Tanrılarına Adanmış Mistik Antik Kent',
    description: 'Soğmatar, Şanlıurfa\'nın Yardımcı ilçesine bağlı, MÖ 2-3. yüzyıllara tarihlenen ve yedi gezegen kültüne adanmış tapınaklarıyla bilinen mistik bir antik kenttir. Tepelerin üzerine inşa edilmiş yuvarlak tapınak platformları, antik Süryanice yazıtlar ve gizem dolu atmosferiyle bölgenin en özgün arkeolojik alanlarından birini oluşturmaktadır. Az ziyaretçiyle sakin bir keşif ortamı sunar.',
    short_description: 'MÖ 2-3. yüzyıldan kalma yedi gezegen tapınağı, Süryanice yazıtlar ve mistik atmosferiyle Şanlıurfa\'nın en özgün ve az bilinen antik kentidir.',
    history: 'Soğmatar, Asurlular\'ın Pazar günü güneş tanrısına, Pazartesi ay tanrısına adak sunduğu bir ibadet merkezi olarak bilinmektedir. Aynı dönemde astronomik gözlemler yapılan bu kutsal alan, Harran Akademisi\'nin yıldız bilimiyle bağlantılı görülmektedir.',
    significance: 'Antik dönemin gezegen ibadet kültünü yansıtan nadir alanlardan biri; Süryanice yazıtlarıyla arkeoloji ve dilbilim araştırmacıları için benzersiz bir kaynak oluşturur.',
    location: 'Yardımcı İlçesi, Şanlıurfa (merkeze 45 km)',
    latitude: 37.0563,
    longitude: 38.8742,
    visiting_hours: 'Gündüz saatlerinde serbestçe ziyaret edilebilir',
    entrance_fee: 'Ücretsiz',
    tags: ['soğmatar', 'antik kent', 'gezegen tapınağı', 'süryani', 'arkeoloji'],
    is_unesco: false,
    period: 'MÖ 2-3. yüzyıl (Part-Roma dönemi)',
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
  console.log('\n🏛️  Tarihi Yer Batch 2 (5 yeni yer)...\n');
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  let inserted = 0, skipped = 0;

  for (const s of SITES) {
    const res = await db.query(
      `INSERT INTO historical_sites
         (slug, name, title, description, short_description, history, significance,
          location, latitude, longitude, visiting_hours, entrance_fee,
          tags, is_unesco, period, status, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',false)
       ON CONFLICT (slug) DO NOTHING`,
      [
        s.slug, s.name, s.title, s.description, s.short_description,
        s.history, s.significance, s.location, s.latitude, s.longitude,
        s.visiting_hours, s.entrance_fee, s.tags, s.is_unesco, s.period,
      ]
    );
    if (res.rowCount > 0) {
      console.log(`  ✓ ${s.name}`);
      inserted++;
    } else {
      console.log(`  — ${s.name} (zaten var)`);
      skipped++;
    }
  }

  const { rows: [stats] } = await db.query(`SELECT COUNT(*) AS total FROM historical_sites WHERE status = 'published'`);

  await db.end(); server.close(); ssh.end();
  console.log(`\n✅ ${inserted} eklendi | ${skipped} atlandı`);
  console.log(`📊 Toplam tarihi yer: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
