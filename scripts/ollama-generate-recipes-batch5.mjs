#!/usr/bin/env node
/**
 * Recipe Batch 5 — 32 yeni Şanlıurfa tarifi (88→120)
 * Et/kebap ağırlıklı, yöresel yemekler, çorbalar ve tatlılar
 */
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { createRequire } from 'node:module';
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
const LOCAL_TUNNEL_PORT = 15602;

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (msgs) => _ollamaChat(msgs, MODEL, ollamaCfg);

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT||'77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject); server.on('error', reject);
  });
}

// [name, slug, difficulty, spicy, vegetarian, prep_min, cook_min, servings]
const RECIPES = [
  // Et / Kebap ağırlıklı
  ['Kaburga Dolması',        'kaburga-dolmasi',         'Zor',   false, false, 40, 180, 6],
  ['Bıçak Arası Kebabı',     'bicak-arasi-kebabi',      'Orta',  true,  false, 20, 30,  6],
  ['Küşleme Kebabı',         'kusleme-kebabi',          'Orta',  false, false, 15, 25,  4],
  ['Et Sote',                'et-sote',                 'Kolay', false, false, 15, 35,  4],
  ['Mumbar Dolması',         'mumbar-dolmasi',          'Zor',   false, false, 60, 120, 8],
  ['Böbrek Sote',            'bobrek-sote',             'Kolay', true,  false, 10, 20,  3],
  ['Fıstıklı Kebap',         'fistikli-kebap',          'Orta',  false, false, 20, 25,  5],
  ['Testi Kebabı',           'testi-kebabi',            'Zor',   false, false, 30, 120, 4],
  ['Kuzu Haşlama',           'kuzu-haslama',            'Kolay', false, false, 15, 120, 6],
  ['İnce Kıyma Kebabı',      'ince-kiyma-kebabi',       'Orta',  true,  false, 25, 20,  5],
  ['Tandır Kebabı',          'tandir-kebabi',           'Zor',   false, false, 30, 240, 8],

  // Çorbalar
  ['Tarhana Çorbası',        'tarhana-corbasi',         'Kolay', false, true,  10, 20,  6],
  ['Toyga Çorbası',          'toyga-corbasi',           'Kolay', false, true,  15, 30,  6],
  ['Döğme Çorbası',          'dogme-corbasi',           'Orta',  false, false, 15, 60,  6],
  ['Şehriye Çorbası',        'sehriye-corbasi',         'Kolay', false, false, 10, 20,  4],
  ['Pazı Çorbası',           'pazi-corbasi',            'Kolay', false, true,  10, 25,  6],

  // Yöresel Yemekler
  ['Lahmacun',               'lahmacun',                'Orta',  true,  false, 30, 15,  8],
  ['Patlıcan Musakka',       'patlican-musakka',        'Orta',  false, false, 25, 45,  6],
  ['İçli Köfte',             'icli-kofte',              'Zor',   false, false, 60, 30,  8],
  ['Kete',                   'kete',                    'Orta',  false, true,  30, 25,  8],
  ['Öcce',                   'occe',                    'Kolay', false, true,  20, 20,  6],
  ['Kuru Köfte',             'kuru-kofte',              'Kolay', true,  false, 20, 20,  5],
  ['Hummus',                 'hummus',                  'Kolay', false, true,  10, 0,   6],
  ['Patlıcan Közlemesi',     'patlican-kozlemesi',      'Kolay', false, true,  10, 20,  4],
  ['Nohutlu Pirinç Pilavı',  'nohutlu-pirinc-pilavi',   'Kolay', false, true,  15, 25,  6],
  ['Peynirli Bazlama',       'peynirli-bazlama',        'Kolay', false, true,  20, 15,  6],

  // Tatlılar / Diğer
  ['Çekme Helva',            'cekme-helva',             'Zor',   false, true,  10, 40,  8],
  ['Kadayıf Dolması',        'kadayif-dolmasi',         'Zor',   false, true,  30, 30,  8],
  ['Fıstık Ezmesi',          'fistik-ezmesi',           'Kolay', false, true,  10, 0,   6],
  ['Pestil',                 'pestil',                  'Orta',  false, true,  20, 60,  10],
  ['Kuru Üzüm Helvası',      'kuru-uzum-helvasi',       'Kolay', false, true,  10, 20,  6],
  ['Tahin Pekmez',           'tahin-pekmez',            'Kolay', false, true,  5,  0,   4],
];

async function generateRecipe(recipe, client) {
  const [name, slug, diff, spicy, veg, prep, cook, servings] = recipe;

  const prompt = `Şanlıurfa yöresel yemeği "${name}" için Türkçe tarif yaz.

Şu formatta JSON döndür (başka hiçbir şey yazma):
{
  "description": "200-250 kelime, yemeğin tarihi ve kültürel önemi hakkında paragraf",
  "ingredients": "madde madde liste, her malzeme ayrı satırda (- ile başlayarak), yaklaşık ${servings} kişilik",
  "instructions": "numaralı adımlar (1., 2., vs.), her adım net ve açık, toplam 8-12 adım",
  "meta_description": "120-160 karakter SEO açıklaması"
}`;

  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: prompt }]);
      break;
    } catch (e) {
      if (attempt < 2) { await sleep(5000 * (attempt + 1)); }
      else throw e;
    }
  }

  let data;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON bulunamadı');
    data = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error(`  JSON parse hatası: ${e.message}`);
    return false;
  }

  if (!data.description || !data.ingredients || !data.instructions) {
    console.error('  Eksik alanlar');
    return false;
  }

  const ingredientsArr = String(data.ingredients).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const instructionsArr = String(data.instructions).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const coverImage = `/uploads/recipes/${slug}.jpg`;

  try {
    await client.query(
      `INSERT INTO recipes (id, slug, name, description, ingredients, instructions, cover_image, prep_time, cook_time, servings, difficulty, is_spicy, is_vegetarian, is_featured, rating, view_count, status, meta_description, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, 4.2, 0, 'published', $13, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [slug, name, data.description, ingredientsArr, instructionsArr, coverImage,
       prep, cook, servings, diff, spicy, veg,
       data.meta_description || `${name} tarifi ve yapılışı. Şanlıurfa mutfağından özgün lezzet.`]
    );
    return true;
  } catch (e) {
    console.error(`  DB hatası: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log(`\n🍽️  Tarif Batch 5 — ${RECIPES.length} yeni tarif...\n`);

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS,
    database: process.env.DB_NAME || process.env.DB_USER,
  });
  await client.connect();

  let added = 0, skipped = 0, failed = 0;

  for (const recipe of RECIPES) {
    const [name, slug] = recipe;
    process.stdout.write(`  → ${name.slice(0,40).padEnd(40)}... `);

    const existing = await client.query('SELECT id FROM recipes WHERE slug = $1', [slug]);
    if (existing.rows.length > 0) {
      console.log('⊘ mevcut');
      skipped++;
      continue;
    }

    try {
      const ok = await generateRecipe(recipe, client);
      if (ok) { console.log('✓'); added++; }
      else { console.log('✗ üretim hatası'); failed++; }
    } catch (e) {
      console.log(`✗ ${String(e.message).slice(0, 50)}`);
      failed++;
    }
    await sleep(1500);
  }

  const { rows: [stats] } = await client.query(
    `SELECT COUNT(*) as total FROM recipes WHERE status='published'`
  );

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ Batch 5: ${added} yeni | ${skipped} mevcut | ${failed} hata`);
  console.log(`🍽️  Toplam tarif: ${stats.total}`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
