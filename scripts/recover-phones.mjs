#!/usr/bin/env node
/**
 * Accidental phone deletion recovery.
 * Parses all seed SQL files to extract (slug, phone) pairs,
 * then runs UPDATE app.places SET phone = $1 WHERE slug = $2 AND phone IS NULL
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');

function loadEnv(fp) {
  if (!fs.existsSync(fp)) return;
  for (const raw of fs.readFileSync(fp, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_TUNNEL_PORT = 15553;

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
          keepaliveInterval: 10000, keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

function parseInsertPhones(sql) {
  const pairs = [];
  const insertRe = /INSERT INTO (?:app\.)?places\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?)(?:ON CONFLICT|;|$)/gi;
  let im;
  while ((im = insertRe.exec(sql)) !== null) {
    const cols = im[1].split(',').map(c => c.trim().toLowerCase());
    const slugIdx = cols.indexOf('slug');
    const phoneIdx = cols.indexOf('phone');
    if (slugIdx < 0 || phoneIdx < 0) continue;

    const valuesBlock = im[2];
    const tupleRe = /\(([^)]*(?:\([^)]*\)[^)]*)*)\)/g;
    let tm;
    while ((tm = tupleRe.exec(valuesBlock)) !== null) {
      const vals = splitValues(tm[1]);
      if (vals.length <= Math.max(slugIdx, phoneIdx)) continue;
      const slug = unquote(vals[slugIdx]);
      const phone = unquote(vals[phoneIdx]);
      if (slug && phone && phone !== 'NULL' && phone !== 'null' && phone.length > 4) {
        pairs.push({ slug, phone });
      }
    }
  }
  return pairs;
}

function splitValues(raw) {
  const vals = [];
  let depth = 0;
  let cur = '';
  for (const ch of raw) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      vals.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) vals.push(cur.trim());
  return vals;
}

function unquote(s) {
  if (!s) return '';
  s = s.trim();
  if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1).replace(/''/g, "'");
  return s;
}

function parseUpdatePhones(sql) {
  const pairs = [];
  const re = /UPDATE (?:app\.)?places\s+SET\s+phone\s*=\s*'([^']+)'[^;]*?WHERE\s+slug\s*=\s*'([^']+)'/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    pairs.push({ phone: m[1], slug: m[2] });
  }
  return pairs;
}

/**
 * Parse TypeScript/JS files for { slug: 'x', phone: 'y' } object patterns.
 * Handles both single-line and multi-line objects.
 */
function parseTsPhones(src) {
  const pairs = [];
  const slugRe = /slug\s*:\s*'([^']+)'/g;
  let sm;
  while ((sm = slugRe.exec(src)) !== null) {
    const slug = sm[1];
    // Start AFTER the slug match to avoid matching slug: itself in the between check
    const afterSlug = src.slice(sm.index + sm[0].length, sm.index + sm[0].length + 800);
    const pm = /phone\s*:\s*'([^']+)'/.exec(afterSlug);
    if (pm) {
      // Make sure there's no other slug between this slug and the phone
      const between = afterSlug.slice(0, pm.index);
      const anotherSlug = /slug\s*:\s*'/.test(between);
      if (!anotherSlug) {
        pairs.push({ slug, phone: pm[1] });
      }
    }
  }
  return pairs;
}

const SQL_SEED_FILES = [
  path.join(projectRoot, 'src/db/seeds/0004_extended_places.sql'),
  path.join(projectRoot, 'src/db/seeds/0006_saglik_egitim_ulasim_places.sql'),
  path.join(projectRoot, 'src/db/seeds/0008_egitim_hizmetler_places.sql'),
  path.join(projectRoot, 'src/db/seeds/2026_guncel_mekanlar.sql'),
  path.join(projectRoot, 'scripts/seed-thin-categories.sql'),
  path.join(projectRoot, 'scripts/seed-remaining-categories.sql'),
  path.join(projectRoot, 'scripts/seed-empty-categories.sql'),
  path.join(projectRoot, 'scripts/seed-food-places.sql'),
  path.join(projectRoot, 'scripts/seed-district-places.sql'),
  path.join(projectRoot, 'scripts/seed-more-accommodation.sql'),
  path.join(projectRoot, 'scripts/seed-dini-kulturel.sql'),
  path.join(projectRoot, 'scripts/seed-alisveris-egitim.sql'),
  path.join(projectRoot, 'scripts/seed-phones.sql'),
];

const TS_SEED_FILES = [
  path.join(projectRoot, 'scripts/seed-content.ts'),
  path.join(projectRoot, 'scripts/seed-2026-data.ts'),
];

async function main() {
  console.log('\n🔧 Telefon kurtarma scripti\n');

  const allPairs = new Map();
  for (const fp of SQL_SEED_FILES) {
    if (!fs.existsSync(fp)) continue;
    const sql = fs.readFileSync(fp, 'utf8');
    const inserts = parseInsertPhones(sql);
    const updates = parseUpdatePhones(sql);
    for (const p of [...inserts, ...updates]) {
      if (!allPairs.has(p.slug)) allPairs.set(p.slug, p.phone);
    }
    console.log(`  ${path.basename(fp)}: ${inserts.length} INSERT + ${updates.length} UPDATE phones`);
  }
  for (const fp of TS_SEED_FILES) {
    if (!fs.existsSync(fp)) continue;
    const src = fs.readFileSync(fp, 'utf8');
    const tsPairs = parseTsPhones(src);
    for (const p of tsPairs) {
      if (!allPairs.has(p.slug)) allPairs.set(p.slug, p.phone);
    }
    console.log(`  ${path.basename(fp)}: ${tsPairs.length} TS object phones`);
  }

  console.log(`\n📋 Toplam ${allPairs.size} benzersiz slug+phone çifti bulundu\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  const { rows: [before] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NULL) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NOT NULL) AS has_phone
    FROM app.places
  `);
  console.log(`📊 Mevcut: Toplam=${before.total} | Telefonlu=${before.has_phone} | Telefonsuz=${before.no_phone}\n`);

  let updated = 0, notFound = 0, skipped = 0;
  for (const [slug, phone] of allPairs) {
    // Skip clearly invalid phone values (too long, or didn't parse correctly)
    if (phone.length > 20) {
      console.log(`  ⚠ SKIP ${slug} → "${phone}" (${phone.length}c > 20)`);
      skipped++;
      continue;
    }
    try {
      const res = await client.query(
        `UPDATE app.places SET phone = $1, updated_at = NOW()
         WHERE slug = $2 AND (phone IS NULL OR phone = '') AND status = 'active'`,
        [phone, slug]
      );
      if (res.rowCount > 0) {
        console.log(`  ✓ ${slug} → ${phone}`);
        updated++;
      } else {
        notFound++;
      }
    } catch (e) {
      console.log(`  ✗ ${slug} → "${phone}" ERR: ${e.message.slice(0, 60)}`);
      skipped++;
    }
  }

  const { rows: [after] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NULL) AS no_phone,
      COUNT(*) FILTER (WHERE status='active' AND phone IS NOT NULL) AS has_phone
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n✅ ${updated} telefon geri yüklendi (${notFound} slug bulunamadı/zaten var, ${skipped} skip)`);
  console.log(`📊 Sonuç: Toplam=${after.total} | Telefonlu=${after.has_phone} | Telefonsuz=${after.no_phone}`);
}

main().catch(e => { console.error(e); process.exit(1); });
