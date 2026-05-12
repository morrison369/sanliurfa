#!/usr/bin/env node
/**
 * Yeni mekanlar için Pexels API üzerinden görsel URL'si alır,
 * UPDATE SQL üretir → prod-sync.mjs --run-sql ile çalıştırılır.
 */
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envFile = resolve(scriptDir, '.env.scripts');

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const raw of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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
if (!PEXELS_KEY) { console.error('PEXELS_KEY eksik'); process.exit(1); }

const PLACES = [
  { slug: 'birecik-kalesi',                 query: 'ancient stone castle ruins turkey' },
  { slug: 'birecik-kelaynak-gozlem-alani',  query: 'bald ibis bird nature flock' },
  { slug: 'firat-kiyisi-lokantasi-birecik', query: 'riverside restaurant turkish food' },
  { slug: 'bozova-kalesi',                  query: 'hilltop castle ruins ancient turkey' },
  { slug: 'ataturk-baraji-seyir-noktasi',   query: 'large dam lake turkey landscape' },
  { slug: 'ceylanpinar-tarim-isletmesi',    query: 'wheat fields farm agricultural turkey' },
  { slug: 'ceylanpinar-sehir-parki',        query: 'city park trees walkway green' },
  { slug: 'hilvan-kaplicalari',             query: 'thermal hot spring pool outdoor' },
  { slug: 'hilvan-merkez-camii',            query: 'mosque minaret turkey blue sky' },
  { slug: 'suruc-kalesi',                   query: 'stone castle ruins ancient anatolian' },
  { slug: 'suruc-eyup-sultan-camii',        query: 'historic mosque courtyard turkey' },
  { slug: 'suruc-sehir-lokantasi',          query: 'traditional turkish local restaurant food' },
  { slug: 'viransehir-antik-kenti',         query: 'roman ruins archaeological site turkey' },
  { slug: 'hz-zulkuf-turbesi-viransehir',   query: 'ottoman mausoleum shrine tomb turkey' },
  { slug: 'serinnaz-havuzu-viransehir',     query: 'outdoor swimming pool summer fun' },
  { slug: 'rumkale-halfeti',               query: 'castle on cliff above river turkey' },
  { slug: 'halfeti-tekne-turu',            query: 'boat tour river green scenic turkey' },
  { slug: 'halfeti-misafirhanesi',         query: 'boutique guesthouse river view turkey' },
  { slug: 'harran-konik-evleri-muzesi',    query: 'harran beehive houses ancient mud brick' },
  { slug: 'harran-han-restoran',           query: 'stone building courtyard restaurant turkey' },
];

async function searchPexels(query) {
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_KEY } });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status}`);
  const data = await res.json();
  const photo = data.photos?.[0];
  if (!photo) return null;
  // medium boyut (1200px) — Image.astro destekli
  return photo.src.large || photo.src.medium;
}

async function main() {
  const updates = [];
  let ok = 0, fail = 0;

  for (const { slug, query } of PLACES) {
    try {
      const url = await searchPexels(query);
      if (!url) { console.log(`✗ ${slug} — sonuç yok`); fail++; continue; }
      console.log(`✓ ${slug}`);
      updates.push({ slug, url });
      ok++;
      await new Promise(r => setTimeout(r, 200)); // rate limit
    } catch (e) {
      console.log(`✗ ${slug} — ${e.message}`);
      fail++;
    }
  }

  // SQL UPDATE dosyası oluştur
  const sqlLines = updates.map(({ slug, url }) =>
    `UPDATE places SET thumbnail_url = '${url.replace(/'/g, "''")}' WHERE slug = '${slug}';`
  );
  sqlLines.push(`SELECT slug, LEFT(thumbnail_url,60) AS url FROM places WHERE slug IN (${updates.map(u=>`'${u.slug}'`).join(',')}) ORDER BY slug;`);

  const outFile = resolve(scriptDir, 'update-place-thumbnails.sql');
  writeFileSync(outFile, sqlLines.join('\n') + '\n');

  console.log(`\n${ok} görsel bulundu, ${fail} atlandı.`);
  console.log(`SQL → ${outFile}`);
  console.log('Şimdi çalıştır: node scripts/prod-sync.mjs --run-sql=scripts/update-place-thumbnails.sql');
}

main().catch(e => { console.error(e.message); process.exit(1); });
