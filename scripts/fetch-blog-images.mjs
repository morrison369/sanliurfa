#!/usr/bin/env node
/**
 * Blog yazıları için Pexels + Unsplash görsel çekici.
 * Kullanım: node scripts/fetch-blog-images.mjs
 */
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import SftpClient from 'ssh2-sftp-client';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS;
const REMOTE_DIR = process.env.REMOTE_APP_DIR || '/home/sanliur/public_html';

// Slug → Pexels/Unsplash arama terimi (İngilizce daha iyi sonuç verir)
const BLOGS = [
  ['ekimde-sanliurfa-sonbahar-gezi-rehberi', 'turkey autumn travel historic city landscape'],
  ['sanliurfa-baklava-en-iyi-adresler', 'turkish baklava pistachio pastry dessert tray'],
  ['sanliurfa-en-guzel-camileri-tarihi', 'historic mosque stone architecture minaret turkey'],
  ['karahantepe-rehberi-gobeklitepe-kardes-kazisi', 'archaeological site ancient stone pillars excavation'],
  ['sanliurfa-pazar-rehberi-hangi-gun-nerede', 'traditional turkish bazaar market spices colorful'],
  ['kis-gunu-gobeklitepe-ziyaret-rehberi', 'ancient stone temple winter landscape archaeology'],
  ['sanliurfa-geleneksel-kahvalti-rehberi', 'turkish breakfast spread eggs olive cheese honey'],
  ['sanliurfa-2-gunluk-kis-gezi-plani', 'historic city winter travel mosque ancient'],
  ['sanliurfa-geleneksel-icecekler-mirra-salgam', 'traditional turkish drinks coffee bitter herbs'],
  ['urfa-isotu-dunya-en-aromatik-biber', 'dried red pepper spice market dark aromatic'],
  ['yeni-yilda-sanliurfa-kis-tatili-10-neden', 'new year winter travel turkey ancient city lights'],
  ['halfeti-balikcilik-firat-mutfagi', 'fishing river freshwater fish Turkey riverside'],
  ['sanliurfa-muzeleri-hangi-muze-ne-zaman', 'archaeological museum ancient artifacts display'],
  ['sanliurfa-romantik-mekanlar-sevgililer-rehberi', 'romantic travel couple historic city sunset'],
  ['sanliurfa-ilkbahar-mart-mayis-gezi-rehberi', 'spring travel turkey flowers ancient ruins'],
  ['halfeti-siyah-gulleri-dunya-tek-dogal-siyah-gul', 'rare black rose dark flower bloom garden'],
  ['sanliurfa-bir-hafta-gezi-plani', 'turkey week travel itinerary historic landscape'],
  ['gobeklitepeye-nasil-gidilir-ulasim-rehberi', 'archaeological site neolithic stone pillars gobekli'],
  ['urfa-usulu-lahmacun-pide-tarif', 'turkish lahmacun flatbread minced meat spices'],
  ['sanliurfa-cocuklarla-gezi-aile-rehberi', 'family travel historic city children museum'],
  ['sanliurfa-tarihi-carsilari-alisveris-rehberi', 'covered bazaar traditional market copper crafts'],
  ['harran-dunyanin-ilk-universite-sehrinin-hikayesi', 'harran beehive house ancient ruins turkey'],
  ['sanliurfa-yaz-sicagindan-korunma-rehberi', 'summer turkey heat travel tips shade courtyard'],
  ['sanliurfa-el-sanatlari-bakir-kilim-deri', 'turkish handicraft copper kilim weaving traditional'],
  ['eylulde-sanliurfa-sonbahar-ziyaret-rehberi', 'september autumn turkey travel golden light historic'],
  ['halfeti-tekne-turu-rehberi', 'boat tour river halfeti turkey scenic water'],
  ['sanliurfa-ne-yenir-mutlaka-tatmaniz-gereken-lezzetler', 'turkish food mezze kebab traditional feast spread'],
  ['balikligol-ziyaret-rehberi', 'sacred fish lake pond mosque reflection turkey'],
  ['sanliurfa-harran-gunubirlik-tur', 'harran ruins beehive mud brick houses turkey'],
  ['sanliurfa-ciger-kebabi-rehberi', 'turkish liver kebab grilled meat restaurant'],
  ['sanliurfa-ne-alinir-hediyelik-yerel-urun-rehberi', 'turkish souvenir spice copper craft market'],
  ['gobeklitepe-ziyaret-rehberi-2026', 'gobekli tepe stone pillars neolithic turkey'],
  ['sanliurfa-yaz-tatili-temmuz-agustos-gezi', 'summer turkey travel hot pool courtyard'],
  ['sanliurfa-isotu-hikayesi-rehberi', 'urfa pepper dark red spice harvest field'],
  ['halfeti-birecik-firat-kiyisi-gezi-guzergahi', 'euphrates river scenic route boat cliff'],
  ['sanliurfa-gastronomi-turu-2-gun', 'turkish cuisine kebab baklava gastronomy food tour'],
  ['sanliurfa-tarihi-hanlar-gumruk-hani', 'caravanserai historic han stone courtyard turkey'],
  ['halfeti-siyah-gulu-tam-rehberi-2027', 'black rose flower rare dark bloom halfeti'],
  ['nisan-gobeklitepe-bahar-ziyaret-rehberi-2027', 'spring archaeology ancient site flowers green'],
  ['sanliurfa-bahar-yuruyus-rotalari-2027', 'spring hiking nature trail ancient landscape turkey'],
  ['harran-dogru-gezmek-kumbet-evler-rehberi-2027', 'beehive mud brick houses village harran turkey'],
  ['halfeti-tekne-turu-tam-rehber-2027', 'river boat tour scenic halfeti water cliffs'],
  ['sanliurfa-mayis-5-gunluk-gezi-plani-2027', 'turkey travel itinerary historic ruins spring'],
  ['sanliurfa-sabah-kahvaltisi-rehberi-en-iyi-adresler-2027', 'turkish breakfast table morning spread traditional'],
  ['sanliurfa-fotografcilar-icin-rehber-altin-saatler-2027', 'photographer golden hour historic city minaret sunrise'],
  ['gobeklitepe-karahantepe-harran-arkeoloji-ucgeni-2027', 'archaeological triangle ancient neolithic stone site'],
  ['halfeti-birecik-firat-nehri-gezi-rotasi-2027', 'euphrates boat river scenic route turkey'],
  ['sanliurfa-sira-gecesi-rehberi-2027', 'turkish music evening dinner baglama saz traditional'],
  ['temmuzda-sanliurfa-kapali-mekan-rehberi-2027', 'cool indoor museum bazaar covered market turkey'],
  ['halfeti-gunbatimi-fotograf-rehberi-2027', 'sunset river halfeti boat reflection golden hour'],
  ['sanliurfa-yaz-icecekleri-koruk-serbeti-demirhindi-mirra-2027', 'turkish summer drinks herbs tamarind refreshing'],
  ['gobeklitepe-tam-ziyaretci-rehberi-2027', 'gobekli tepe ancient temple stone columns sunrise'],
  ['halfeti-su-sporlari-tekne-aktiviteleri-yaz-2027', 'water sports boat kayak river summer turkey'],
  ['harran-gece-yildiz-gozlemi-kumbet-evler-2027', 'night sky stars village ancient ruins turkey'],
  ['sanliurfa-tarihi-carsi-el-sanatlari-rehberi-2027', 'turkish bazaar craft copper weaving artisan'],
  ['birecik-kelaynak-agustos-sezon-kapanisi-2027', 'bald ibis rare bird nature Turkey conservation'],
  ['eylulde-sanliurfa-sonbahar-baslangi-avantajlari-2027', 'september turkey autumn warm city historic'],
  ['karahantepe-2027-kazi-sezonu-yeni-bulgular', 'archaeological excavation stone neolithic discovery'],
  ['halfeti-sonbahar-balik-sezonu-firat-sazan-2027', 'fishing autumn river Turkey carp freshwater'],
  ['urfa-ev-yemekleri-kavut-cilbir-sirik-kebabi-2027', 'turkish home cooking traditional food spread'],
  ['ekim-halfeti-sonbahar-renkleri-2027', 'october autumn colors river landscape turkey'],
  ['sanliurfa-tarihi-dini-mekanlar-camii-turbe-2027', 'mosque shrine sacred site historic turkey stone'],
  ['urfa-hediyelik-alisveris-tam-rehber-2027', 'turkish market souvenir crafts spice herbs'],
  ['gobeklitepe-kis-ziyaret-aralik-en-iyi-ay-2027', 'ancient site winter empty quiet dawn archaeology'],
  ['halfeti-kis-sessiz-firat-balikci-2027', 'winter river quiet fisherman boat fog turkey'],
  ['sanliurfa-kis-lezzetleri-corba-kaburga-2027', 'turkish winter soup stew lamb warm food'],
  ['sanliurfa-aile-gezisi-cocuklar-2027', 'family museum children history travel turkey'],
  ['aralikta-sanliurfa-kis-tatili-plani-2027', 'december winter travel turkey historic city warm'],
  ['harran-astronomi-bilim-tarihi-mirasi-2027', 'ancient observatory astronomy night sky ruins'],
  ['urfa-mutfagi-tarihi-mezopotamyadan-gunumuze-2027', 'mesopotamia ancient food culture history turkey'],
  ['sanliurfa-2027-yil-sonu-ozeti-2028-bakis', 'year review highlights turkey travel tourism'],
  ['birecik-gezi-rehberi', 'euphrates river historic castle turkey scenic cliff'],
  ['viransehir-rehberi', 'anatolian steppe village turkey landscape dry grass'],
  ['bozova-ataturk-baraji-rehberi', 'dam lake reservoir turkey blue water boat'],
  ['siverek-gezi-rehberi', 'ancient castle stone hilltop turkey historic ruins'],
  ['suruc-gezi-rehberi', 'anatolian village wheat fields turkey rural landscape'],
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function apiGet(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.headers.location) {
        return apiGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { reject(new Error('json parse')); } });
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadBinary(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const get = u => {
      https.get(u, res => {
        if (res.statusCode >= 300 && res.headers.location) return get(res.headers.location);
        res.on('data', c => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }).on('error', reject).setTimeout(20000, function() { this.destroy(); reject(new Error('dl timeout')); });
    };
    get(url);
  });
}

async function fetchPexels(query) {
  if (!PEXELS_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await apiGet(url, { Authorization: PEXELS_KEY });
  if (!res.photos?.length) return null;
  const p = res.photos[0];
  return { url: p.src.large2x || p.src.large, source: 'pexels', id: p.id };
}

async function fetchUnsplash(query) {
  if (!UNSPLASH_KEY) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await apiGet(url, { Authorization: `Client-ID ${UNSPLASH_KEY}` });
  if (!res.results?.length) return null;
  const p = res.results[0];
  return { url: p.urls.regular, source: 'unsplash', id: p.id };
}

async function getImage(query) {
  try {
    const pexels = await fetchPexels(query);
    if (pexels) return pexels;
  } catch {}
  try {
    return await fetchUnsplash(query);
  } catch { return null; }
}

async function main() {
  if (!SSH_PASS) { console.error('SSH_PASS eksik'); process.exit(1); }
  console.log(`Pexels: ${PEXELS_KEY ? '✓' : '✗'} | Unsplash: ${UNSPLASH_KEY ? '✓' : '✗'}`);

  const sftp = new SftpClient();
  await sftp.connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });

  const remoteUploads = `${REMOTE_DIR}/public/uploads/blogs`;
  const tmpDir = path.join(projectRoot, 'dist', '_blog_img_tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Ensure remote dir exists
  try { await sftp.mkdir(remoteUploads, true); } catch {}

  const sqlUpdates = [];
  let done = 0, skipped = 0, failed = 0;

  for (const [slug, query] of BLOGS) {
    let exists = false;
    for (const ext of ['.jpg', '.webp', '.jpeg']) {
      try { await sftp.stat(`${remoteUploads}/${slug}${ext}`); exists = true; break; } catch {}
    }
    if (exists) {
      console.log(`  skip: ${slug}`);
      skipped++;
      continue;
    }

    try {
      const img = await getImage(query);
      if (!img) { console.log(`  no image: ${slug}`); failed++; continue; }

      const buf = await downloadBinary(img.url);
      const localPath = path.join(tmpDir, `${slug}.jpg`);
      fs.writeFileSync(localPath, buf);

      const remotePath = `${remoteUploads}/${slug}.jpg`;
      await sftp.put(localPath, remotePath);
      fs.unlinkSync(localPath);

      const dbUrl = `/uploads/blogs/${slug}.jpg`;
      sqlUpdates.push(
        `UPDATE blog_posts SET featured_image = '${dbUrl}', cover_image = '${dbUrl}' WHERE slug = '${slug}';`
      );
      console.log(`  ✓ ${slug} [${img.source}]`);
      done++;
    } catch (e) {
      console.log(`  ✗ ${slug}: ${e.message.slice(0, 60)}`);
      failed++;
    }
    await sleep(1000);
  }

  if (sqlUpdates.length > 0) {
    const sqlPath = path.join(scriptDir, 'update_blog_images.sql');
    fs.writeFileSync(sqlPath, sqlUpdates.join('\n') + '\n', 'utf8');
    console.log(`\nSQL yazıldı: ${sqlPath}`);
    console.log('Şimdi çalıştır: node scripts/prod-sync.mjs --run-sql=scripts/update_blog_images.sql');
  }

  await sftp.end();
  try { fs.rmSync(tmpDir, { recursive: true }); } catch {}
  console.log(`\n✓ Tamamlandı: ${done} görsel, ${skipped} atlandı, ${failed} başarısız`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
