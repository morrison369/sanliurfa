#!/usr/bin/env node
/**
 * Koordinatsız mekanları Nominatim (OpenStreetMap) ile geocode eder.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'ssh2';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envFile = readFileSync(join(__dirname, '.env.scripts'), 'utf8');
const env = Object.fromEntries(
  envFile.split('\n').filter(l => l.includes('=')).map(l => {
    const idx = l.indexOf('=');
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
  })
);

const SSH_CFG = {
  host: env.SSH_HOST, port: parseInt(env.SSH_PORT),
  username: env.SSH_USER, password: env.SSH_PASS,
};
const DB_HOST = env.DB_HOST || 'localhost';
const PSQL = `PGPASSWORD='${env.DB_PASS}' psql -h ${DB_HOST} -U ${env.DB_USER} -d ${env.DB_NAME}`;

function sshQuery(sql) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const cmd = `${PSQL} -t -A -F '|' -c "${sql.replace(/"/g, '\\"')}"`;
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) return reject(err);
        let out = '';
        stream.on('data', d => out += d);
        stream.on('close', () => { conn.end(); resolve(out.trim()); });
      });
    }).on('error', reject).connect(SSH_CFG);
  });
}

async function fetchPlaces() {
  const sql = 'SELECT id::text, name, address FROM app.places WHERE status = \'active\' AND (latitude IS NULL OR longitude IS NULL) ORDER BY name LIMIT 100';
  const out = await sshQuery(sql);
  return out.split('\n').filter(Boolean).map(line => {
    const [id, ...rest] = line.split('|');
    const name = rest[0] ? rest[0].trim() : '';
    const address = rest.slice(1).join('|').trim();
    return { id: id.trim(), name, address };
  });
}

async function geocode(place) {
  // Adres zaten tam: "Mahalle, Sokak No, Posta Şanlıurfa"
  const q = encodeURIComponent((place.address || place.name) + ', Turkey');
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=tr`;

  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'sanliurfa-com/1.0 (sanliurfa.com)' } });
    const data = await r.json();
    if (data && data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  } catch (e) { console.error(`  Hata: ${e.message}`); }

  // Fallback: sadece mekan adı + Şanlıurfa
  const q2 = encodeURIComponent(`${place.name}, Şanlıurfa, Turkey`);
  const url2 = `https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1&countrycodes=tr`;
  try {
    const r2 = await fetch(url2, { headers: { 'User-Agent': 'sanliurfa-com/1.0 (sanliurfa.com)' } });
    const data2 = await r2.json();
    if (data2 && data2.length > 0) return { lat: parseFloat(data2[0].lat), lon: parseFloat(data2[0].lon), fallback: true };
  } catch (e) {}

  return null;
}

async function main() {
  console.log('Koordinatsız mekanlar alınıyor...');
  const places = await fetchPlaces();
  console.log(`${places.length} mekan bulundu.\n`);

  const updates = [];
  const failed = [];

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    process.stdout.write(`[${i + 1}/${places.length}] ${p.name.substring(0, 40).padEnd(40)} `);

    const coords = await geocode(p);
    if (coords) {
      const flag = coords.fallback ? '[fb]' : '    ';
      console.log(`✓ ${flag} ${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}`);
      updates.push({ id: p.id, lat: coords.lat, lon: coords.lon });
    } else {
      console.log('✗');
      failed.push(p.name);
    }

    if (i < places.length - 1) await new Promise(r => setTimeout(r, 1100));
  }

  if (updates.length > 0) {
    const sql = updates.map(u =>
      `UPDATE app.places SET latitude = ${u.lat}, longitude = ${u.lon} WHERE id = '${u.id}';`
    ).join('\n');
    const outPath = join(__dirname, 'geocode-updates.sql');
    writeFileSync(outPath, sql);
    console.log(`\n✅ ${updates.length} koordinat kaydedildi → scripts/geocode-updates.sql`);
    console.log('Uygulamak için: node scripts/prod-sync.mjs --run-sql=scripts/geocode-updates.sql');
  }

  if (failed.length > 0) {
    console.log(`\n❌ ${failed.length} bulunamadı:`);
    failed.forEach(n => console.log(`  - ${n}`));
  }
  console.log(`\nSonuç: ${updates.length}/${places.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
