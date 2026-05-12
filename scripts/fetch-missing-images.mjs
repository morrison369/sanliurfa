#!/usr/bin/env node
/**
 * image_url NULL olan 104 mekan için Pexels/Unsplash görseli çeker.
 * SQL UPDATE üretir → prod-sync.mjs --run-sql ile çalıştırılır.
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(scriptDir, '.env.scripts');

function loadEnv(fp) {
  if (!existsSync(fp)) return;
  for (const raw of readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(envFile);

const PEXELS_KEY = process.env.PEXELS_KEY;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!PEXELS_KEY && !UNSPLASH_KEY) {
  console.error('PEXELS_KEY veya UNSPLASH_ACCESS_KEY gerekli (.env.scripts)');
  process.exit(1);
}

// slug → Pexels arama sorgusu
const PLACES = [
  // Oteller
  { slug: 'urfa-buyuk-otel',                        query: 'hotel lobby turkish city' },
  { slug: 'abide-hotel-sanliurfa',                   query: 'boutique hotel modern lobby' },
  { slug: 'balikligol-hotel',                        query: 'hotel pool garden outdoor' },
  { slug: 'grand-urfa-hotel',                        query: 'grand hotel luxury interior' },
  { slug: 'ramotel-sanliurfa',                       query: 'hotel room comfortable modern' },
  { slug: 'urfa-apart-otel',                         query: 'apartment hotel studio room' },
  { slug: 'edessa-butik-otel',                       query: 'boutique hotel stone building' },
  { slug: 'tas-han-butik-otel',                      query: 'historic stone building hotel courtyard' },
  { slug: 'halfeti-misafirhanesi',                   query: 'guesthouse riverside view turkey' },
  { slug: 'zeugma-pansiyon',                         query: 'cozy guesthouse pension room' },
  { slug: 'gobeklitepe-panorama-bungalov',            query: 'bungalow nature landscape hill view' },

  // Bankalar
  { slug: 'garanti-bbva-sanliurfa',                  query: 'bank building modern glass facade' },
  { slug: 'ziraat-bankasi-sanliurfa-merkez',          query: 'bank branch interior teller' },

  // Camiler
  { slug: 'eyup-sultan-camii-sanliurfa',             query: 'mosque courtyard minaret turkey blue sky' },
  { slug: 'halilurrahman-camii',                     query: 'historic mosque stone architecture turkey' },
  { slug: 'hilvan-merkez-camii',                     query: 'small mosque minaret rural turkey' },
  { slug: 'suruc-eyup-sultan-camii',                 query: 'old mosque minaret courtyard' },
  { slug: 'ulu-cami-rizvaniye',                      query: 'grand mosque interior arch columns' },

  // Kültür / Müzik
  { slug: 'sira-gecesi-kultur-evi',                  query: 'traditional music performance folk evening' },
  { slug: 'urfa-evi-kultur-mekani',                  query: 'cultural center interior traditional decor' },
  { slug: 'sanliurfa-kultur-sanat-merkezi',           query: 'cultural art center stage hall' },
  { slug: 'sanliurfa-sehir-tiyatrosu',               query: 'theater stage performance hall' },

  // Çocuk / Eğlence
  { slug: 'balikligol-mini-golf-eglence-parki',      query: 'mini golf park outdoor family fun' },
  { slug: 'harran-cocuk-kultur-merkezi',              query: 'children activity center colorful play' },
  { slug: 'sanliurfa-hayvanat-bahcesi',              query: 'zoo animals outdoor enclosure' },
  { slug: 'urfa-cocuk-bilim-muzesi',                 query: 'science museum children interactive exhibit' },
  { slug: 'ataturk-parki-botanik-bahcesi',           query: 'botanical garden park flowers path' },
  { slug: 'ceylanpinar-sehir-parki',                 query: 'city park trees walkway bench green' },
  { slug: 'serinnaz-havuzu-viransehir',              query: 'outdoor swimming pool summer sun splash' },
  { slug: 'sanliurfa-olimpik-yuzme-havuzu',          query: 'olympic swimming pool indoor lanes' },
  { slug: 'balikligol-kunefecisi',                   query: 'kunefe dessert cheese sweet turkish' },

  // Hastaneler
  { slug: 'birecik-devlet-hastanesi',               query: 'hospital building entrance modern' },
  { slug: 'hilvan-ilce-devlet-hastanesi',            query: 'district hospital white building' },
  { slug: 'sanliurfa-egitim-arastirma-hastanesi',    query: 'large hospital medical center building' },
  { slug: 'ozel-sanliurfa-medikal-park',             query: 'private hospital modern clinic' },
  { slug: 'harran-universitesi-tip-hastanesi',       query: 'university hospital medical school' },

  // Eğitim
  { slug: 'harran-ingilizce-dil-kursu',              query: 'language school classroom english' },
  { slug: 'sanliurfa-anadolu-imam-hatip-lisesi',     query: 'high school building courtyard' },

  // Yiyecek / İçecek
  { slug: 'antep-usulu-dondurma',                   query: 'traditional ice cream dondurma turkish' },
  { slug: 'meshur-urfa-katmeri',                     query: 'katmer turkish pastry crispy dessert' },
  { slug: 'usta-katmercisi',                         query: 'pastry shop bakery turkish morning' },
  { slug: 'haci-mehmet-lahmacun',                    query: 'lahmacun turkish flatbread oven' },
  { slug: 'oz-urfa-lahmacuncusu',                   query: 'lahmacun restaurant traditional urfa' },
  { slug: 'selahattin-usta-kunefe',                  query: 'kunefe cheese dessert plate syrup' },
  { slug: 'mirra-evi',                               query: 'arabic coffee bitter mirra cup' },
  { slug: 'dicle-et-lokantasi',                      query: 'meat restaurant turkish grilled kebab' },
  { slug: 'urfa-pastanesi',                          query: 'pastry shop dessert display case' },
  { slug: 'firat-kiyisi-lokantasi-birecik',          query: 'riverside restaurant river view food' },
  { slug: 'harran-han-restoran',                     query: 'stone courtyard caravanserai restaurant' },
  { slug: 'suruc-sehir-lokantasi',                   query: 'local restaurant interior turkish food' },
  { slug: 'harran-cay-bahcesi',                      query: 'tea garden outdoor chairs tables' },
  { slug: 'gobeklitepe-cafe',                        query: 'outdoor cafe terrace archaeological view' },

  // Alışveriş / Çarşı
  { slug: 'bakırcilar-carsisi-sanliurfa',            query: 'copper bazaar artisan metalwork market' },
  { slug: 'sanliurfa-kapalicarsi',                   query: 'covered bazaar grand market turkey' },
  { slug: 'urfa-hal-sebze-meyve-pazari',             query: 'vegetable fruit market bazaar colorful' },
  { slug: 'urfa-hali-kilim-carsisi',                 query: 'carpet kilim rug market shop' },
  { slug: 'altin-carsisi-sanliurfa',                 query: 'gold jewelry shop market display' },
  { slug: 'piazza-sanliurfa-avm',                    query: 'shopping mall interior modern shops' },
  { slug: 'sanliurfa-teknoloji-carsisi',             query: 'electronics shop market computers phones' },

  // Spor / Fitness
  { slug: 'dovus-sporlari-akademisi-sanliurfa',      query: 'martial arts gym training combat' },
  { slug: 'mega-fitness-sanliurfa',                  query: 'gym fitness center equipment workout' },
  { slug: 'sanliurfa-sehir-stadyumu',                query: 'football stadium green field stands' },

  // Tarihi Yerler
  { slug: 'birecik-kalesi',                          query: 'ancient stone castle fortress turkey' },
  { slug: 'birecik-kelaynak-gozlem-alani',           query: 'bald ibis bird nature wildlife' },
  { slug: 'bozova-kalesi',                           query: 'hilltop castle ancient ruins landscape' },
  { slug: 'ceylanpinar-tarim-isletmesi',             query: 'wheat farm agricultural field harvest' },
  { slug: 'halfeti-tekne-turu',                      query: 'boat tour river canyon scenic green' },
  { slug: 'hilvan-kaplicalari',                      query: 'thermal hot spring pool mineral water' },
  { slug: 'rumkale-halfeti',                         query: 'castle cliff above river ruins' },
  { slug: 'suruc-kalesi',                            query: 'stone fortress walls ruins ancient' },
  { slug: 'viransehir-antik-kenti',                  query: 'roman archaeological ruins ancient city' },
  { slug: 'harran-konik-evleri-muzesi',              query: 'beehive mud brick houses harran' },
  { slug: 'hz-zulkuf-turbesi-viransehir',            query: 'islamic shrine tomb mausoleum' },
  { slug: 'mehmet-arap-medresesi',                   query: 'islamic school madrasah stone arch' },
  { slug: 'ataturk-baraji-seyir-noktasi',            query: 'large dam reservoir lake turkey' },
  { slug: 'hz-ibrahim-makam-sanliurfa',              query: 'sacred shrine pilgrimage ancient' },
  { slug: 'seyh-omer-turbesi',                       query: 'ottoman shrine tomb garden courtyard' },

  // Ulaşım / Altyapı
  { slug: 'gap-havalimani-sanliurfa',                query: 'airport terminal modern building' },
  { slug: 'sanliurfa-sehirlerarasi-otobus-terminali', query: 'bus terminal station intercity' },
  { slug: 'sanliurfa-tcdd-gari',                     query: 'train station building railway platform' },

  // Sanayi / İş
  { slug: 'gap-organize-sanayi-bolgesi',             query: 'industrial zone factory buildings' },
  { slug: 'sanliurfa-un-fabrikasi',                  query: 'flour mill factory industrial' },
  { slug: 'urfa-tekstil-fabrikasi',                  query: 'textile factory weaving production' },
  { slug: 'gap-tarim-urunleri-merkezi',              query: 'agricultural products warehouse farm' },
  { slug: 'sanliurfa-osb-insaat',                    query: 'construction industrial building site' },

  // Hizmetler
  { slug: 'cengiz-emlak-sanliurfa',                  query: 'real estate office property sign' },
  { slug: 'remax-sanliurfa',                         query: 'real estate agency modern office' },
  { slug: 'av-mehmet-kaya-hukuk-burosu',             query: 'law office desk books professional' },
  { slug: 'klima-teknik-sanliurfa',                  query: 'air conditioning technician service' },
  { slug: 'lastik-dunyasi-sanliurfa',                query: 'tire shop automotive service garage' },
  { slug: 'oto-ekspres-sanliurfa',                   query: 'car repair workshop automotive' },
  { slug: 'sanliurfa-toyota-galerisi',               query: 'car dealership showroom new cars' },
  { slug: 'urfa-nakliyat-sanliurfa',                 query: 'moving truck logistics transport' },
  { slug: 'sanliurfa-temizlik-hizmetleri',           query: 'cleaning service professional team' },
  { slug: 'guneydogu-veteriner-klinigi',             query: 'veterinary clinic animal care' },
  { slug: 'sanliurfa-tursab-btu',                    query: 'tourism office travel organization' },

  // Medya
  { slug: 'harran-tv-sanliurfa',                     query: 'television studio broadcast news' },
  { slug: 'urfa-fm-radyosu',                         query: 'radio studio microphone broadcast' },
  { slug: 'sanliurfa-gazetesi',                      query: 'newspaper printing press journalism' },

  // Diğer
  { slug: 'sanliurfa-il-halk-kutuphanesi',           query: 'public library books reading quiet' },
  { slug: 'sanliurfa-hayvan-pazari',                 query: 'livestock animal market rural turkey' },
  { slug: 'piazza-sinema-sanliurfa',                 query: 'cinema movie theater seats screen' },
  { slug: 'sanliurfa-buyuksehir-belediyesi-hizmet-binasi', query: 'municipal city hall government building' },
  { slug: 'sanliurfa-ptt-basmudurluğu',              query: 'post office government service building' },
];

async function searchPexels(query) {
  if (!PEXELS_KEY) return null;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) return null;
  const data = await res.json();
  // index 1 veya 2'yi tercih et — index 0 çok generik olabilir
  const photo = data.photos?.[1] || data.photos?.[0];
  return photo ? (photo.src.large2x || photo.src.large) : null;
}

async function searchUnsplash(query) {
  if (!UNSPLASH_KEY) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data.results?.[0];
  return photo ? photo.urls.regular : null;
}

async function getImage(query) {
  const url = await searchPexels(query);
  if (url) return url;
  return await searchUnsplash(query);
}

async function main() {
  const updates = [];
  let ok = 0, fail = 0;

  console.log(`Toplam: ${PLACES.length} mekan\n`);

  for (const { slug, query } of PLACES) {
    try {
      const url = await getImage(query);
      if (!url) {
        console.log(`✗ ${slug} — sonuç yok (query: "${query}")`);
        fail++;
      } else {
        console.log(`✓ ${slug}`);
        updates.push({ slug, url });
        ok++;
      }
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(`✗ ${slug} — ${e.message}`);
      fail++;
    }
  }

  if (updates.length === 0) {
    console.error('\nHiç görsel bulunamadı. API key kontrolü yap.');
    process.exit(1);
  }

  const sqlLines = [
    'BEGIN;',
    ...updates.map(({ slug, url }) =>
      `UPDATE places SET image_url = '${url.replace(/'/g, "''")}', thumbnail_url = '${url.replace(/'/g, "''")}', updated_at = NOW() WHERE slug = '${slug}' AND image_url IS NULL;`
    ),
    `SELECT slug, LEFT(image_url, 70) AS img FROM places WHERE slug IN (${updates.map(u => `'${u.slug}'`).join(',')}) ORDER BY slug;`,
    'COMMIT;',
  ];

  const outFile = resolve(scriptDir, 'update-missing-images.sql');
  writeFileSync(outFile, sqlLines.join('\n') + '\n');

  console.log(`\n${ok} görsel bulundu, ${fail} atlandı.`);
  console.log(`SQL → ${outFile}`);
  console.log('Uygula: node scripts/prod-sync.mjs --run-sql=scripts/update-missing-images.sql');
}

main().catch(e => { console.error(e.message); process.exit(1); });
