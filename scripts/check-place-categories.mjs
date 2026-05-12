#!/usr/bin/env node
/**
 * Mekan kategori eksikliklerini raporlar ve düzeltebilir.
 * Sadece rapor için: node scripts/check-place-categories.mjs
 * Auto-fix için:     node scripts/check-place-categories.mjs --fix
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

const LOCAL_TUNNEL_PORT = 15550;
const DO_FIX = process.argv.includes('--fix');

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
          keepaliveInterval: 10000,
          keepaliveCountMax: 30,
        });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  console.log('\n🔍 Mekan Kategori Analizi\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1',
    port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  await client.connect();

  // 1. Kategorisiz mekanlar
  const { rows: noCat } = await client.query(`
    SELECT p.id, p.name, p.slug, p.category, p.address
    FROM app.places p
    WHERE p.status = 'active'
      AND p.category_id IS NULL
    ORDER BY p.name ASC
  `);

  // 2. Geçersiz category_id (categories tablosunda yok)
  const { rows: invalidCat } = await client.query(`
    SELECT p.id, p.name, p.slug, p.category_id, p.category
    FROM app.places p
    WHERE p.status = 'active'
      AND p.category_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM app.categories c WHERE c.id = p.category_id)
    ORDER BY p.name ASC
  `);

  // 3. Genel kategori istatistikleri
  const { rows: catStats } = await client.query(`
    SELECT
      COALESCE(c.name, '(kategorisiz)') AS category,
      c.slug,
      COUNT(p.id)::int AS place_count
    FROM app.places p
    LEFT JOIN app.categories c ON c.id = p.category_id
    WHERE p.status = 'active'
    GROUP BY c.id, c.name, c.slug
    ORDER BY COUNT(p.id) DESC
    LIMIT 30
  `);

  // 4. Boş category (eski text field)
  const { rows: legacyCat } = await client.query(`
    SELECT
      COALESCE(p.category, '(boş)') AS legacy_cat,
      COUNT(*)::int AS count
    FROM app.places p
    WHERE p.status = 'active'
      AND p.category_id IS NULL
    GROUP BY p.category
    ORDER BY COUNT(*) DESC
    LIMIT 20
  `);

  // 5. Kategorilerin listesi
  const { rows: allCats } = await client.query(`
    SELECT id, name, slug, parent_id FROM app.categories ORDER BY parent_id NULLS FIRST, name ASC LIMIT 50
  `);

  console.log(`\n=== KATEGORİSİZ MEKANLAR (category_id IS NULL): ${noCat.length} ===`);
  if (noCat.length === 0) {
    console.log('✅ Tüm mekanların category_id atanmış!');
  } else {
    for (const p of noCat.slice(0, 30)) {
      console.log(`  ${p.name} (${p.category || 'category yok'}) — ${p.address || ''}`);
    }
    if (noCat.length > 30) console.log(`  ... ve ${noCat.length - 30} mekan daha`);
  }

  if (invalidCat.length > 0) {
    console.log(`\n=== GEÇERSİZ CATEGORY_ID: ${invalidCat.length} ===`);
    for (const p of invalidCat) {
      console.log(`  ${p.name} → category_id=${p.category_id} (mevcut değil)`);
    }
  }

  console.log(`\n=== KATEGORİ DAĞILIMI (TOP 30) ===`);
  for (const s of catStats) {
    const bar = '█'.repeat(Math.min(30, Math.ceil(s.place_count / 3)));
    console.log(`  ${bar} ${s.place_count.toString().padStart(3)} — ${s.category} (${s.slug || ''})`);
  }

  if (legacyCat.length > 0) {
    console.log(`\n=== LEGACY category ALANLARI (kategorisiz mekanlar) ===`);
    for (const l of legacyCat) {
      console.log(`  ${l.count}x "${l.legacy_cat}"`);
    }
  }

  // 6. Otomatik düzeltme: legacy category → category_id eşleştirmesi
  if (DO_FIX && noCat.length > 0) {
    console.log('\n🔧 Otomatik eşleştirme başlıyor...\n');

    const categoryKeywords = {
      'restaurant': ['yeme-icme', 'yeme', 'restoran', 'lokanta', 'restaurant'],
      'hotel': ['konaklama', 'otel'],
      'cafe': ['kafe', 'cafe', 'kahvalti'],
      'shopping': ['alisveris', 'market'],
      'health': ['saglik', 'hastane', 'eczane'],
      'education': ['egitim', 'okul'],
      'transport': ['ulasim', 'otogar', 'havalimaní'],
      'historical': ['tarihi', 'muzesi', 'antik'],
      'religion': ['dini', 'cami', 'kilise'],
      'service': ['hizmet', 'bank', 'posta'],
    };

    const catSlugMap = {};
    for (const c of allCats) catSlugMap[c.slug] = c.id;

    let fixed = 0;
    for (const p of noCat) {
      const cat = (p.category || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const combined = `${cat} ${name}`;

      let targetSlug = null;
      if (/restoran|kebap|lokanta|yemek|ciğer|döner|lahmacun|pide|cafe|kafe|kahvaltı/.test(combined)) targetSlug = 'yeme-icme';
      else if (/otel|hotel|pansiyon|konaklama/.test(combined)) targetSlug = 'konaklama';
      else if (/eczane/.test(combined)) targetSlug = 'saglik';
      else if (/market|süpermarket|bakkal/.test(combined)) targetSlug = 'alisveris';
      else if (/cami|camii|kilise|dini|mevlid/.test(combined)) targetSlug = 'dini-ve-kulturel-yerler';
      else if (/müze|muze|tarihi|arkeoloji|antik|kale|harran|göbeklitepe/.test(combined)) targetSlug = 'turizm-ve-gezilecek-yerler';
      else if (/okul|üniversite|universite|eğitim|egitim/.test(combined)) targetSlug = 'egitim';
      else if (/bank|banka|atm/.test(combined)) targetSlug = 'hukuk-ve-finans';
      else if (/otogar|otobüs|havalimanı|taksi|ulaşım/.test(combined)) targetSlug = 'ulasim';

      if (!targetSlug) continue;
      const catId = catSlugMap[targetSlug];
      if (!catId) continue;

      process.stdout.write(`  ${p.name} → ${targetSlug}... `);
      try {
        await client.query(
          `UPDATE app.places SET category_id = $1, updated_at = NOW() WHERE id = $2`,
          [catId, p.id]
        );
        console.log('✓');
        fixed++;
      } catch (e) {
        console.log(`✗ ${e.message.slice(0, 60)}`);
      }
    }
    console.log(`\n✅ ${fixed} mekan otomatik kategori aldı`);
  }

  // Final özet
  const { rows: [final] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='active') AS total,
      COUNT(*) FILTER (WHERE status='active' AND category_id IS NULL) AS no_cat
    FROM app.places
  `);

  await client.end(); server.close(); ssh.end();

  console.log(`\n📊 Özet: ${final.total} aktif mekan | Kategorisiz: ${final.no_cat}`);
  if (parseInt(final.no_cat) > 0 && !DO_FIX) {
    console.log('💡 Otomatik düzeltme için: node scripts/check-place-categories.mjs --fix');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
