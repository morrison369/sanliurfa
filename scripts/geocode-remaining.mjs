#!/usr/bin/env node
/**
 * Kalan koordinatsız mekanları adres parse + Nominatim ile geocode eder.
 * Nominatim bulamazsa mahalle/ilçe merkez koordinatı atar.
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

// Mahalle/ilçe bazlı yaklaşık koordinatlar (Şanlıurfa)
const AREA_COORDS = {
  'ceylanpinar': [36.860, 40.037],
  'ceylanpınar': [36.860, 40.037],
  'akcakale': [36.715, 38.946],
  'akçakale': [36.715, 38.946],
  'halfeti': [37.247, 37.869],
  'bozova': [37.372, 38.523],
  'birecik': [37.028, 37.980],
  'siverek': [37.752, 39.314],
  'hilvan': [37.576, 38.975],
  'viransehir': [37.234, 39.763],
  'viranşehir': [37.234, 39.763],
  'karakopru': [37.220, 38.771],
  'karaköprü': [37.220, 38.771],
  'eyyubiye': [37.164, 38.792],
  'eyyübiye': [37.164, 38.792],
  'karsiyaka': [37.165, 38.830],
  'karşıyaka': [37.165, 38.830],
  'camikebir': [37.158, 38.795],
  'camii kebir': [37.158, 38.795],
  'bamyasuyu': [37.168, 38.805],
  'yenisehir': [37.175, 38.785],
  'yenişehir': [37.175, 38.785],
  'bahce': [37.160, 38.820],
  'bahçe': [37.160, 38.820],
  'haliliye': [37.158, 38.793],
  'merkez': [37.158, 38.793],
  'sanliurfa': [37.158, 38.793],
  'şanlıurfa': [37.158, 38.793],
};

function parseAreaCoords(address) {
  if (!address) return null;
  const lower = address.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove diacritics
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
    .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u');

  for (const [area, coords] of Object.entries(AREA_COORDS)) {
    const areaLower = area.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ş/g, 's')
      .replace(/ç/g, 'c').replace(/ö/g, 'o').replace(/ü/g, 'u');
    if (lower.includes(areaLower)) {
      // Small random offset so they don't all stack on same point
      const jitter = () => (Math.random() - 0.5) * 0.004;
      return [coords[0] + jitter(), coords[1] + jitter()];
    }
  }
  // Default: Şanlıurfa merkez
  const jitter = () => (Math.random() - 0.5) * 0.01;
  return [37.158 + jitter(), 38.793 + jitter()];
}

async function nominatimTry(query) {
  const q = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=tr`;
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'sanliurfa-com/1.0 (sanliurfa.com)' } });
    const text = await r.text();
    if (!text.startsWith('[') && !text.startsWith('{')) return null;
    const data = JSON.parse(text);
    if (data && data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch (e) {}
  return null;
}

async function main() {
  const sql = 'SELECT id::text, name, address FROM app.places WHERE status = \'active\' AND (latitude IS NULL OR longitude IS NULL) ORDER BY name';
  const out = await sshQuery(sql);
  const places = out.split('\n').filter(Boolean).map(line => {
    const [id, ...rest] = line.split('|');
    return { id: id.trim(), name: (rest[0] || '').trim(), address: rest.slice(1).join('|').trim() };
  });

  console.log(`${places.length} koordinatsız mekan.\n`);
  const updates = [];

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    process.stdout.write(`[${i+1}/${places.length}] ${p.name.substring(0, 38).padEnd(38)} `);

    // Try Nominatim with simplified address (just last parts of address)
    const addrParts = p.address.split(',').map(s => s.trim());
    const simplifiedAddr = addrParts.slice(-3).join(', ');
    let coords = await nominatimTry(simplifiedAddr + ', Turkey');

    if (!coords) {
      // Try name + Şanlıurfa
      coords = await nominatimTry(`${p.name} Şanlıurfa Turkey`);
    }

    if (coords) {
      console.log(`✓ nom  ${coords[0].toFixed(5)}, ${coords[1].toFixed(5)}`);
      updates.push({ id: p.id, lat: coords[0], lon: coords[1] });
    } else {
      // Fallback: area-based approximate
      const approx = parseAreaCoords(p.address + ' ' + p.name);
      console.log(`~ area ${approx[0].toFixed(5)}, ${approx[1].toFixed(5)}`);
      updates.push({ id: p.id, lat: approx[0], lon: approx[1] });
    }

    if (i < places.length - 1) await new Promise(r => setTimeout(r, 1100));
  }

  const sql2 = updates.map(u =>
    `UPDATE app.places SET latitude = ${u.lat}, longitude = ${u.lon} WHERE id = '${u.id}';`
  ).join('\n');
  const outPath = join(__dirname, 'geocode-updates-2.sql');
  writeFileSync(outPath, sql2);
  console.log(`\n✅ ${updates.length} koordinat → scripts/geocode-updates-2.sql`);
  console.log('Uygulamak için: node scripts/prod-sync.mjs --run-sql=scripts/geocode-updates-2.sql');
}

main().catch(err => { console.error(err); process.exit(1); });
