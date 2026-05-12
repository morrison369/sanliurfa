#!/usr/bin/env node
/**
 * Tarihi Yer Batch 2 — 20 yeni tarihi yer (20 → 40).
 * Karahantepe, Gürcütepe, Rumkale, Suruç Kalesi, vb.
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { getOllamaConfig, ollamaChat as _ollamaChat, SYSTEM_TR } from './ollama-lib.mjs';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;
if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function slugify(text) {
  const map = {ğ:'g',ü:'u',ş:'s',ı:'i',ö:'o',ç:'c',Ğ:'g',Ü:'u',Ş:'s',İ:'i',Ö:'o',Ç:'c'};
  return text.toLowerCase().replace(/[ğüşıöçĞÜŞİÖÇ]/g, c=>map[c]||c)
    .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}

// [name, period, location, lat, lon, is_featured, is_unesco, tags, significance_hint]
const SITES = [
  ['Karahantepe Arkeoloji Alanı', 'Neolitik Dönem (M.Ö. 9600-8000)', 'Tektek Dağları, Şanlıurfa', 37.2667, 38.9167,
   true, false, ['neolitik','arkeoloji','tasitepeler','gobeklitepe','kazi'],
   'Göbeklitepe ile aynı dönemde inşa edilmiş, Taş Tepeler projesinin en önemli alanlarından. İnsan yüzü kabartmaları ve fallik dikilitaşlarıyla benzersiz.'],

  ['Gürcütepe Arkeoloji Alanı', 'Neolitik Dönem (M.Ö. 9000-8500)', 'Tektek Dağları, Şanlıurfa', 37.2833, 38.9500,
   false, false, ['neolitik','arkeoloji','tasitepeler','kazi'],
   'Taş Tepeler projesinin ikinci önemli alanı. Göbeklitepe ile çağdaş, henüz kazıları devam eden prehistorik alan.'],

  ['Rumkale', 'Ortaçağ (Bizans-Haçlı Dönemi)', 'Halfeti İlçesi, Fırat Kıyısı', 37.2581, 37.8853,
   true, false, ['haci','haçlı','ortacag','kale','halfeti','fırat'],
   'Fırat Nehri\'nin üzerinde kayalık bir yarımadada konumlanan Ortaçağ kalesi. Ermeni, Bizans ve Haçlı dönemlerine ait katmanlar içeriyor.'],

  ['Suruç Kalesi', 'Geç Demir Çağı - Osmanlı Dönemi', 'Suruç İlçe Merkezi, Şanlıurfa', 36.9764, 38.4222,
   false, false, ['kale','suruc','osmanlı','tarih'],
   'Suruç ilçesinin merkezindeki tarihi kale kalıntıları. Demir Çağı\'ndan Osmanlı dönemine kadar stratejik öneme sahip bir askeri yapı.'],

  ['Nevali Çori Arkeoloji Alanı', 'Neolitik Dönem (M.Ö. 8500-8000)', 'Hilvan İlçesi yakınları (Atatürk Barajı altında)', 37.7000, 38.5000,
   false, false, ['neolitik','kazi','baraj','arkeoloji'],
   'Atatürk Barajı suları altında kalan önemli bir Neolitik yerleşim. Göbeklitepe öncesi dönemde bulunan heykeller bugün Şanlıurfa Müzesi\'nde sergileniyor.'],

  ['Harran Ulu Cami Harabeleri', 'Emevi Dönemi (M.S. 744)', 'Harran Antik Kenti, Şanlıurfa', 36.8645, 39.0289,
   false, false, ['emevi','cami','harran','islami','tarih'],
   'Emevi Halifesi II. Mervan döneminde inşa edilen ve Anadolu\'nun ilk camilerinden sayılan yapının kalıntıları. Dönemin mimari özelliklerini yansıtıyor.'],

  ['Birecik Kelaynak Doğal Yaşam Alanı', 'Doğal Miras', 'Birecik İlçesi, Fırat Kıyısı', 37.0247, 37.9742,
   false, false, ['kelaynak','kuş','birecik','dogal','miras'],
   'Nesli tükenmekte olan kelaynak kuşunun (Geronticus eremita) dünyadaki sayılı doğal yaşam alanlarından biri. Uluslararası koruma statüsüne sahip.'],

  ['Ayanlar Höyüğü', 'Kalkolitik-Tunç Çağı', 'Şanlıurfa Ovası', 37.1500, 38.7000,
   false, false, ['höyük','tunccagi','kalkolitik','arkeoloji'],
   'Şanlıurfa ovasındaki çok katmanlı höyük. Kalkolitik dönemden Geç Tunç Çağı\'na kadar kesintisiz yerleşim izleri tespit edilmiş.'],

  ['Titriş Höyük', 'Tunç Çağı (M.Ö. 2600-2000)', 'Bozova İlçesi yakınları', 37.3500, 38.5167,
   false, false, ['höyük','tuncagi','arkeoloji','kentlesmeme'],
   'Erken Tunç Çağı\'nın en büyük yerleşim merkezlerinden biri. Şehirleşmenin ilk örneklerini içeren bu höyük bölge arkeolojisinde önemli bir yere sahip.'],

  ['Ceylanpınar Arkeoloji Alanı', 'Demir Çağı - Osmanlı Dönemi', 'Ceylanpınar İlçesi', 36.8500, 40.0500,
   false, false, ['arkeoloji','demirage','ceylanpınar','tell'],
   'Suriye sınırına yakın bu alan, Asur ve Babil dönemlerine ait önemli bulgular barındırıyor. Tell Halaf kültürüyle bağlantılı katmanlar içeriyor.'],

  ['Halfeti Sualtı Köyleri', 'Modern Miras (1990-2000)', 'Halfeti, Fırat Nehri', 37.2556, 37.8856,
   true, false, ['halfeti','baraj','sualtı','fırat','korunma'],
   'Birecik Barajı\'nın dolması nedeniyle 1999-2000 yıllarında sular altında kalan köy ve mezra kalıntıları. Tekne turuyla suyun altındaki kalıntılar izlenebiliyor.'],

  ['Karacadağ Volkanik Alanı', 'Jeolojik - Tarihi (Volkanik)', 'Siverek İlçesi güneyi', 37.6833, 39.8167,
   false, false, ['volkan','jeoloji','karacadag','dogal','tarih'],
   'Güneydoğu Anadolu\'nun tek volkanik dağı. Sönmüş volkanın bazalt kayaları bölgede üretilen lav taşlarının kaynağı. Buğdayın ilk yetiştirildiği bölgelerden.'],

  ['Hz. Eyüp Makamı', 'İslami Dönem', 'Eyyüp Nebi, Şanlıurfa', 37.1200, 38.7800,
   false, false, ['makam','türbe','dini','islami','ziyaret'],
   'Hz. Eyüp Peygamber\'in Şanlıurfa\'ya bağlı ziyaret noktası. Hac mevsiminde yüksek ziyaretçi çeken dini miras alanı; bahçesi ve çevresiyle huzurlu bir atmosfere sahip.'],

  ['Şanlıurfa Taş Devri Müzesi (Göbeklitepe Müzesi)', 'Neolitik Miras Müzesi', 'Haliliye, Şanlıurfa', 37.1682, 38.7955,
   true, false, ['müze','neolitik','gobeklitepe','tasdevri','sergi'],
   'Göbeklitepe ve Taş Tepeler alanlarından çıkarılan bulguların korunduğu ve sergilendiği müze. T-şeklili dikilitaş replikaları ve Neolitik kültür eserleri.'],

  ['Seyyar Bey Camii ve Külliyesi', 'Osmanlı Dönemi (16. yüzyıl)', 'Şanlıurfa Merkez', 37.1568, 38.7921,
   false, false, ['osmanlı','cami','kulliye','16yuzyil'],
   '16. yüzyılda inşa edilen ve Osmanlı mimari geleneğinin Şanlıurfa\'daki erken örneklerinden sayılan külliye. Cami, medrese ve sebil bölümlerinden oluşuyor.'],

  ['Divan-ı Harplerin Yeri (Tarihsel Alan)', 'Milli Mücadele Dönemi', 'Şanlıurfa Merkez', 37.1570, 38.7940,
   false, false, ['millimücadele','tarih','kurtuluşsavaşı','şanlıurfa'],
   'Kurtuluş Savaşı döneminde Fransız işgaline karşı verilen Şanlıurfa direniş sürecinde tarihi önem taşıyan alan. Şehrin ulusal mücadeleye katkısını anlatıyor.'],

  ['Yaylak Kilisesi Kalıntıları', 'Bizans Dönemi (4-6. yüzyıl)', 'Şanlıurfa çevresi', 37.1800, 38.8200,
   false, false, ['bizans','kilise','hristiyan','erken-dönem','kalıntı'],
   'Erken Hristiyanlık dönemine ait bazilika tipi kilise kalıntıları. Şanlıurfa bölgesinin Bizans dönemine ait dini mimarisinin önemli tanıkları.'],

  ['Şuayb Şehri Arkeolojik Alanı', 'Geç Roma - Erken Bizans (M.S. 3-6. yy)', 'Şuayb Köyü, Harran Ovası', 36.9500, 39.2000,
   false, false, ['roma','bizans','şuayb','kilise','harran'],
   'Harran Ovası\'nda yer alan ve Roma-Bizans dönemine ait büyük bir yerleşim alanı. Hz. Şuayb\'la ilişkilendirilen kutsal makam ve çevresindeki antik kalıntılar.'],

  ['Kurban Höyük', 'Neolitik - Kalkolitik Dönem', 'Halfeti yakınları, Fırat Vadisi', 37.2200, 37.9000,
   false, false, ['höyük','neolitik','fırat','kalkolitik','arkeoloji'],
   'Fırat Vadisi\'ndeki bu höyük, Neolitik dönemden Kalkolitik\'e geçiş sürecine ait tabakalar içeriyor. Bölgenin tarih öncesi yerleşim sürekliğini belgeleyen önemli bir alan.'],

  ['Harran\'ın Tarihi Kervansarayları', 'Ortaçağ İslam Dönemi', 'Harran İlçesi', 36.8700, 39.0300,
   false, false, ['kervansaray','ticaret','harran','ortacag','ipek-yolu'],
   'İpek ve Baharat Yolu üzerindeki Harran\'da konumlanan Ortaçağ\'a ait kervansaray kalıntıları. Antik dönemdeki ticaret ve konaklama ağının somut kanıtları.'],
];

const LOCAL_TUNNEL_PORT = 15598;

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
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000, keepaliveCountMax: 60,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log(`\n🏛️  Tarihi Yer Batch 2 — ${SITES.length} yeni tarihi yer...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME || process.env.DB_USER,
  });
  await client.connect();

  let ok = 0, skip = 0, fail = 0;

  for (const [name, period, location, lat, lon, isFeatured, isUnesco, tags, sigHint] of SITES) {
    const slug = slugify(name);
    process.stdout.write(`  → ${name.slice(0,55).padEnd(55)}... `);

    const { rows: exists } = await client.query(
      'SELECT id FROM historical_sites WHERE slug=$1', [slug]
    );
    if (exists.length > 0) {
      console.log('⊘ zaten var');
      skip++;
      continue;
    }

    try {
      const seq = async (prompt) => {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const r = await ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: prompt }]);
            await sleep(800);
            return r;
          } catch (e) {
            if (attempt < 2) { await sleep(4000 * (attempt + 1)); }
            else throw e;
          }
        }
      };
      const description    = await seq(`Şanlıurfa şehir rehberi için tarihi yer sayfası yaz.\nTarihi Yer: "${name}"\nDönem: ${period}\nKonum: ${location}\nÖnem: ${sigHint}\n\nFormat: HTML (h2, p, ul, li), 600-800 kelime. Tarihi önemi, mimari özellikleri, ziyaret ipuçları içersin. Başlığı tekrarlama.`);
      const shortDesc      = await seq(`"${name}" için 1-2 cümle kısa tanıtım metni yaz. Sadece metin döndür, HTML kullanma.`);
      const history        = await seq(`"${name}" (${period}) hakkında 200-300 kelime tarihsel bilgi yaz. Dönem, inşa süreci, tarihi olaylar. Sadece metin paragrafı.`);
      const significance   = await seq(`"${name}" neden önemli? Önemi şu: ${sigHint}. 100-150 kelime açıklayıcı paragraf yaz.`);
      const tips           = await seq(`"${name}" ziyaretçilerine pratik 3-5 ipucu listesi yaz. Kısa maddeler, HTML ul/li kullan.`);
      const visitingHours  = await seq(`"${name}" için ziyaret saatleri bilgisi yaz. Tek satır, kısa. Örnek: "Her gün 08:00-18:00 (yaz), 08:00-17:00 (kış)". Bilmiyorsan "Gün boyunca erişilebilir" yaz.`);

      const coverImage = `/uploads/historical/${slug}.jpg`;

      await client.query(`
        INSERT INTO historical_sites
          (id, slug, name, title, description, short_description, history, significance,
           location, latitude, longitude, images, cover_image, gallery,
           visiting_hours, entrance_fee, tips, nearby_places, tags,
           is_unesco, is_featured, period, status, created_at, updated_at)
        VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,
                ARRAY[$11]::text[], $11, ARRAY[]::text[],
                $12, 'Ücretsiz', $13, ARRAY[]::uuid[], $14::text[],
                $15,$16,$17,'published',NOW(),NOW())
        ON CONFLICT (slug) DO NOTHING
      `, [
        randomUUID(), slug, name, description,
        shortDesc.slice(0, 300), history, significance,
        location, lat, lon,
        coverImage,
        visitingHours.trim(),
        tips, tags,
        isUnesco, isFeatured, period,
      ]);

      console.log('✓');
      ok++;
    } catch (err) {
      console.log(`✗ ${err.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(2000);
  }

  const { rows: [stats] } = await client.query(
    `SELECT COUNT(*) as total FROM historical_sites WHERE status='published'`
  );

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Batch 2: ${ok} yeni | ${skip} mevcut | ${fail} hata`);
  console.log(`🏛️  Toplam tarihi yer: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
