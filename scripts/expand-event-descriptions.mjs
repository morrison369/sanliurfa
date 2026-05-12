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

const LOCAL_PORT = 15622;

// Keys are first-8-char UUID prefixes (matched with LIKE in DB query)
const EXPANSIONS = {
  '3b8475e9': `Karacadağ'ın eşsiz volkanik platosu, baharın ilk günleriyle birlikte rengarenk çiçeklerle kaplanır. Bu özel doğa turunda rehber eşliğinde yürüyüş yaparak bölgenin nadir bitki örtüsünü, kuş türlerini ve Güneydoğu Anadolu'nun panoramik manzarasını keşfedeceksiniz. Fotoğraf severler için de benzersiz bir deneyim sunan tur, piknik molasıyla taçlandırılmaktadır.`,

  '70108c15': `Şanlıurfa'nın tarihi mekanlarında gerçekleştirilen kış konser serisinde, klasikten halk müziğine uzanan geniş bir repertuvar sahneye taşınmaktadır. Her Cumartesi akşamı farklı bir sanatçı ya da toplulukla düzenlenen bu konserler, soğuk kış gecelerine sıcak bir kültür atmosferi katmaktadır. Biletler sınırlı sayıda olup önceden rezervasyon önerilir.`,

  'fdc4a89c': `Geleneksel ebru sanatının inceliklerini öğrenmek isteyenler için özel olarak düzenlenen bu atölye, hem başlangıç hem de orta seviye katılımcılara hitap etmektedir. Uzman eğitmenler eşliğinde marbelize kağıt üretimi, hat sanatı ve geleneksel Türk süsleme teknikleri uygulamalı olarak öğretilecektir. Katılımcılar çalışmalarını yanlarında götürebilecektir.`,

  '9f705ac8': `Baharın coşkusunu müzikle kutlamak isteyenler için Şanlıurfa Bahar Müzik Festivali, şehrin en büyük açık hava sahnelerinde kapılarını açıyor. Türkiye'nin dört bir yanından gelen sanatçılar ve yerel müzisyenler; türkü, pop ve dünya müziği yorumlarıyla seyircileri büyüleyecek. Festival boyunca yöresel lezzetler sunan stantlar ve el sanatları sergisi de yer alacak.`,

  '783e6f8d': `Şanlıurfa sokaklarını açık hava galerisine dönüştüren bu festival, duvar resmi, performans sanatı ve interaktif enstalasyonlardan oluşuyor. Yerli ve yabancı sanatçıların bir araya geldiği etkinlikte sanat severler atölyeler, söyleşiler ve canlı performanslarla buluşacak. Şehrin tarihi dokusuyla iç içe geçen bu sanatsal deneyim, Mart boyunca her hafta sonu sürecek.`,

  'f017f66c': `Kış aylarının soğuğunu müziğin sıcaklığıyla ısıtmayı hedefleyen bu konser serisi, Ocak ayı boyunca her hafta farklı bir sanatçıyla sahneye taşınmaktadır. Klasik Türk müziğinden modern yorumlara uzanan geniş programıyla hem müzik tutkunlarına hem de yeni dinleyicilere hitap eden seri, Şanlıurfa'nın kültür hayatına değerli bir katkı sunmaktadır.`,

  'ba740323': `Şanlıurfa'nın kış sezonunda spor tutkunlarını bir araya getiren bu etkinlik; koşu, bisiklet, masa tenisi ve geleneksel güreş branşlarında yarışmalar sunuyor. Hem amatör hem de profesyonel sporcuların katılabildiği oyunlarda kupa ve ödüller dağıtılacak. Etkinlik aynı zamanda şehrin aktif yaşam kültürünü ön plana çıkarmayı amaçlıyor.`,

  'a17e644b': `Balıklıgöl ve çevresindeki tarihi yapıları bisikletle keşfetmek için eşsiz bir fırsat sunan bu tur, her yaştan katılımcıya uygun tempoda düzenlenecek. Yol boyunca Hz. İbrahim'in Doğduğu Mağara, Halilürrahman Camii ve Gölbaşı bölgesindeki parklar ziyaret edilecek. Profesyonel rehberler tarihi ve kültürel bilgileri aktaracak.`,

  'e7362f1c': `Halfeti'nin mistik sular altındaki sokaklarına kış mevsiminde yapılacak tekne turu, dört mevsimden farklı bir deneyim yaşatıyor. Su seviyesinin yüksek olduğu ocak ayında Halfeti'nin büyülü silüeti daha da dramatik bir görünüm kazanıyor. Rehber eşliğinde gerçekleşen tur, bölge tarihi ve Fırat Nehri ekolojisi hakkında kapsamlı bilgi sunmaktadır.`,

  'db65a692': `Dünyanın en eski tapınak kompleksi Göbeklitepe'yi kış aylarında ziyaret etmek, yazın kalabalıklarından uzak, daha dingin ve derinlikli bir deneyim sunuyor. Uzman arkeolog rehberler eşliğinde gerçekleşen bu özel turda T-şeklindeki dikilitaşlar, hayvan kabartmaları ve neolitik çağın sırları ilk elden aktarılacak. Tur kapsamında bölgenin tarihsel arka planını anlatan belgesel gösterimi de yer almaktadır.`,

  '83abbef3': `Kış aylarında bambaşka bir güzelliğe bürünen Halfeti, şubat turumuzda ziyaretçilerini sımsıcak karşılıyor. Fırat Nehri boyunca uzanan kayalık vadiler, yarı su altındaki evler ve nar bahçeleri bu mevsimde görülmeye değer. Yerel rehberlerle gerçekleşen yarım günlük tur, Türkiye'nin en özgün destinasyonlarından birini keşfetmek için ideal bir fırsattır.`,

  '4a2e27a9': `UNESCO Dünya Mirası listesine aday Göbeklitepe'yi kış programıyla deneyimlemek isteyenler için özel rehberli tur düzenleniyor. Yüksek sezonda göremeyeceğiniz detayları uzman arkeologlarla keşfedeceğiniz bu turda, neolitik toplulukların gizemli ritüelleri ve Göbeklitepe'nin küresel önemi ele alınacak. Tur sonrası yakın çevredeki Karahantepe alanları da ziyaret kapsamına dahil edilecektir.`,

  'bc34690e': `Nisan ayının gelişiyle birlikte Şanlıurfa konser sezonunu şenlikli bir programla açıyor. Açık hava sahnelerinde ve kültür merkezlerinde gerçekleşecek konserler, Türk halk müziğinden caz yorumlarına geniş bir yelpazede seçenekler sunuyor. Bahar havasının tadını çıkarırken kaliteli müzik dinlemek isteyenler için nisan konser serisi kaçırılmaması gereken bir deneyimdir.`,

  'd12db29b': `Şanlıurfa'nın ilçelerini ve doğal güzelliklerini bisikletle keşfetmek isteyenler için Karacadağ bisiklet turu düzenlenecek. Volkanik arazinin kendine özgü manzaralarında pedal çevirirken bölgenin flora ve fauna zenginlikleri deneyimlenecek. Başlangıç ve ileri seviye güzergahlarıyla her deneyim düzeyine uygun olan turda katılımcılara su ve atıştırmalık ikram edilmektedir.`,

  '6b7546d5': `Şanlıurfa semalarını rengarenk uçurtmalarla dolduracak bu festival, hem çocuklar hem de yetişkinler için eğlenceli bir etkinlik sunuyor. Kendi uçurtmanızla katılabileceğiniz festivalde atölyeler, gösteriler ve yarışmalar yer alacak. Gökyüzünü renklerle süslerken geleneksel uçurtma yapım sanatını öğrenmek de mümkün olacak. Tüm aile için unutulmaz bir bahar deneyimi yaşatacak bu festival, şehrin en sevilen yıllık etkinliklerinden biridir.`,

  '66212161': `Harran Ovası'nın bereketli topraklarından gelen kuru meyve, baharat ve yerel tarım ürünlerinin bir araya geldiği bu kış pazarı, bölge üreticileriyle doğrudan buluşma imkanı sunuyor. İncir, üzüm, antepfıstığı ve isot biberi gibi yöresel lezzetlerin yanı sıra geleneksel dokuma ve el sanatları da satışa sunulacak. Hem alışveriş hem de kültür deneyimi arayanlar için vazgeçilmez bir etkinliktir.`,

  'c909be22': `Tarihi Gümrük Hanı'nın görkemli avlusunda, ramazan ayının manevi atmosferinde düzenlenen bu iftar sofrası, yüzlerce kişiyi bir araya getiriyor. Yöresel lezzetlerle hazırlanan iftar menüsü, canlı müzik ve Kuran-ı Kerim tilaveti eşliğinde ikram ediliyor. Kentin farklı mahallelerinden gelen misafirlerin buluştuğu bu etkinlik, dayanışma ve kardeşlik ruhunu pekiştiriyor.`,

  '204c3cb8': `Harran'ın tarihi koni evleri çevresindeki ovada kurulan geleneksel kış pazarında, 2027 yılı programıyla birlikte daha fazla üretici ve daha zengin bir ürün yelpazesi yer alacak. Organik tarım ürünleri, şifalı bitkiler, ev yapımı pekmez ve tahin gibi Güneydoğu Anadolu'nun geleneksel lezzetleri bu pazarda bulunabiliyor. Yerel ekonomiyi desteklemek ve yöre halkıyla tanışmak için güzel bir fırsattır.`,

  'd28f640b': `Hz. İbrahim ile özdeşleşen kutsal Balıklıgöl çevresinde gerçekleştirilecek bu kültür turu, inanç ve tarih tutkunlarına özel hazırlanmış bir program sunuyor. Halilürrahman Camii, Aynzeliha Gölü, Rızvaniye Vakfı ve tarihi bazalt taş yapıları ziyaret edilecek. Uzman rehberler Şanlıurfa'nın Hz. İbrahim ile bağlantılı efsanelerini ve bölgenin arkeolojik değerini aktaracaktır.`,
};

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
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  console.log('\n📝 Etkinlik açıklaması genişletme (<200c)...\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const db = new pg.Client({
    host: '127.0.0.1', port: LOCAL_PORT,
    user: process.env.DB_USER || 'sanliur_sanliurfa',
    password: process.env.DB_PASS,
    database: process.env.DB_NAME || 'sanliur_sanliurfa',
  });
  await db.connect();

  const { rows: thin } = await db.query(
    `SELECT id, title, length(description) AS len FROM events WHERE status = 'published' AND length(description) < 200 ORDER BY title`
  );
  console.log(`Güncellenmeden önce ince etkinlik sayısı: ${thin.length}\n`);
  for (const r of thin) console.log(`  ${r.id.slice(0,8)} (${r.len}c) — ${r.title.slice(0,50)}`);
  console.log('');

  let updated = 0, skipped = 0;

  for (const [id, desc] of Object.entries(EXPANSIONS)) {
    const { rows } = await db.query(
      `SELECT id, title FROM events WHERE id::text LIKE $1`,
      [id + '%']
    );
    if (!rows.length) { console.log(`  ✗ ${id} — bulunamadı`); skipped++; continue; }
    const ev = rows[0];
    await db.query(
      `UPDATE events SET description = $1 WHERE id = $2`,
      [desc.trim(), ev.id]
    );
    console.log(`  ✓ ${ev.title.slice(0,50)}`);
    updated++;
  }

  const { rows: [stats] } = await db.query(
    `SELECT COUNT(*) AS total,
            COUNT(*) FILTER (WHERE length(description) < 200) AS thin
     FROM events WHERE status = 'published'`
  );

  await db.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${updated} güncellendi | ${skipped} atlandı`);
  console.log(`📊 Toplam yayınlanan etkinlik: ${stats.total} | İnce (<200c): ${stats.thin}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
