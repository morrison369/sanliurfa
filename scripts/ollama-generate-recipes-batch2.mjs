#!/usr/bin/env node
/**
 * 25 yeni Şanlıurfa tarifi ekler (batch 2)
 * Mevcut 41 tarifte olmayan yeni tarifler
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

const ollamaCfg = getOllamaConfig();
const MODEL = ollamaCfg.MODEL;
const LOCAL_TUNNEL_PORT = 15577;

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
        .connect({
          host: process.env.SSH_HOST,
          port: parseInt(process.env.SSH_PORT || '77'),
          username: process.env.SSH_USER,
          password: process.env.SSH_PASS,
          keepaliveInterval: 10000,
        });
    });
    ssh.on('error', reject);
  });
}

// Pexels API ile görsel getir
async function fetchPexelsImage(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    const d = await r.json();
    const photos = d.photos || [];
    if (!photos.length) return null;
    const photo = photos[Math.floor(Math.random() * photos.length)];
    return photo.src?.large || photo.src?.original || null;
  } catch { return null; }
}

// Görsel indir
async function downloadImage(url, destPath) {
  try {
    const r = await fetch(url);
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, buf);
    return true;
  } catch { return false; }
}

const RECIPES = [
  {
    slug: 'tandir-kebabi', name: 'Tandır Kebabı',
    difficulty: 'hard', prep_time: 60, cook_time: 240, servings: 6,
    is_spicy: false, is_vegetarian: false, is_featured: true,
    pexels: 'lamb kebab turkish oven',
  },
  {
    slug: 'sirikli-kebabi', name: 'Sırıklı Kebabı',
    difficulty: 'medium', prep_time: 30, cook_time: 45, servings: 4,
    is_spicy: true, is_vegetarian: false, is_featured: false,
    pexels: 'grilled meat skewer turkish',
  },
  {
    slug: 'sanliurfa-pidesi', name: 'Şanlıurfa Pidesi',
    difficulty: 'medium', prep_time: 40, cook_time: 25, servings: 4,
    is_spicy: false, is_vegetarian: false, is_featured: true,
    pexels: 'turkish pide flatbread baked',
  },
  {
    slug: 'eksili-kofte', name: 'Ekşili Köfte',
    difficulty: 'medium', prep_time: 30, cook_time: 40, servings: 4,
    is_spicy: false, is_vegetarian: false, is_featured: false,
    pexels: 'turkish meatball soup sour',
  },
  {
    slug: 'tarhana-corbasi', name: 'Tarhana Çorbası',
    difficulty: 'easy', prep_time: 10, cook_time: 20, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'turkish tarhana soup traditional',
  },
  {
    slug: 'sanliurfa-baklavasi', name: 'Şanlıurfa Baklavası',
    difficulty: 'hard', prep_time: 90, cook_time: 45, servings: 12,
    is_spicy: false, is_vegetarian: true, is_featured: true,
    pexels: 'baklava turkish dessert pastry pistachio',
  },
  {
    slug: 'kunefe', name: 'Künefe',
    difficulty: 'medium', prep_time: 20, cook_time: 15, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: true,
    pexels: 'kunefe turkish cheese dessert sweet',
  },
  {
    slug: 'kete', name: 'Kete',
    difficulty: 'medium', prep_time: 30, cook_time: 30, servings: 8,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'turkish pastry bread butter',
  },
  {
    slug: 'kisir', name: 'Kısır',
    difficulty: 'easy', prep_time: 20, cook_time: 10, servings: 6,
    is_spicy: true, is_vegetarian: true, is_featured: false,
    pexels: 'bulgur wheat salad turkish kisir',
  },
  {
    slug: 'cacik', name: 'Cacık',
    difficulty: 'easy', prep_time: 15, cook_time: 0, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'turkish yogurt cucumber dip tzatziki',
  },
  {
    slug: 'semizotu-kavurmasi', name: 'Semizotu Kavurması',
    difficulty: 'easy', prep_time: 15, cook_time: 20, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'purslane vegetable saute herbs',
  },
  {
    slug: 'haydari', name: 'Haydari',
    difficulty: 'easy', prep_time: 15, cook_time: 0, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'turkish yogurt dip garlic herb',
  },
  {
    slug: 'patlican-salatasi', name: 'Patlıcan Salatası',
    difficulty: 'easy', prep_time: 15, cook_time: 30, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'eggplant roasted salad turkish',
  },
  {
    slug: 'mercimek-salatasi', name: 'Mercimek Salatası',
    difficulty: 'easy', prep_time: 15, cook_time: 25, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'lentil salad healthy turkish',
  },
  {
    slug: 'tepsi-koftesi', name: 'Tepsi Köftesi',
    difficulty: 'medium', prep_time: 30, cook_time: 40, servings: 6,
    is_spicy: false, is_vegetarian: false, is_featured: false,
    pexels: 'turkish baked meatball tray',
  },
  {
    slug: 'urfa-salatasi', name: 'Urfa Salatası',
    difficulty: 'easy', prep_time: 15, cook_time: 0, servings: 4,
    is_spicy: true, is_vegetarian: true, is_featured: false,
    pexels: 'turkish salad tomato pepper onion',
  },
  {
    slug: 'cig-kofte-durum', name: 'Çiğ Köfte Dürüm',
    difficulty: 'easy', prep_time: 30, cook_time: 0, servings: 4,
    is_spicy: true, is_vegetarian: true, is_featured: true,
    pexels: 'turkish raw meatball wrap bulgur',
  },
  {
    slug: 'simit', name: 'Simit',
    difficulty: 'medium', prep_time: 90, cook_time: 20, servings: 8,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'turkish simit sesame bread ring',
  },
  {
    slug: 'tarhana', name: 'Tarhana (Hazırlama)',
    difficulty: 'hard', prep_time: 60, cook_time: 0, servings: 20,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'fermented food drying traditional turkish',
  },
  {
    slug: 'perde-pilavi-sarmasi', name: 'Perde Pilavı Sarması',
    difficulty: 'hard', prep_time: 60, cook_time: 50, servings: 8,
    is_spicy: false, is_vegetarian: false, is_featured: true,
    pexels: 'turkish rice pilaf wrapped pastry special',
  },
  {
    slug: 'kome-tatlisi', name: 'Köme Tatlısı',
    difficulty: 'medium', prep_time: 30, cook_time: 20, servings: 6,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'walnut honey dessert traditional sweet',
  },
  {
    slug: 'salgam-tursusu', name: 'Şalgam Turşusu',
    difficulty: 'hard', prep_time: 60, cook_time: 0, servings: 10,
    is_spicy: true, is_vegetarian: true, is_featured: false,
    pexels: 'fermented turnip drink red beverage traditional',
  },
  {
    slug: 'fistikli-katmer', name: 'Fıstıklı Katmer',
    difficulty: 'medium', prep_time: 30, cook_time: 15, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: true,
    pexels: 'pistachio flatbread crispy turkish sweet',
  },
  {
    slug: 'urfa-cikitmasi', name: 'Urfa Çıktması',
    difficulty: 'medium', prep_time: 20, cook_time: 25, servings: 4,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'turkish fried pastry dough dessert',
  },
  {
    slug: 'cevizli-sarma', name: 'Cevizli Sarma',
    difficulty: 'medium', prep_time: 40, cook_time: 30, servings: 6,
    is_spicy: false, is_vegetarian: true, is_featured: false,
    pexels: 'walnut stuffed grape leaves turkish dolma',
  },
];

async function generateRecipe(r) {
  const spicyNote = r.is_spicy ? ' (baharatlı/acılı)' : '';
  const vegNote = r.is_vegetarian ? ' (vejetaryen)' : '';

  const descPrompt = `Şanlıurfa'nın geleneksel yemeği "${r.name}" için açıklama yaz.
KURALLAR:
- 200-300 karakter, 2-3 cümle
- Tarihçe + lezzet özelliği + nerede yenilir/ne zaman
- Türkçe, akıcı, iştah açıcı${spicyNote}${vegNote}
- Sadece açıklamayı yaz`;

  const ingPrompt = `"${r.name}" tarifi için malzeme listesi yaz.
FORMAT: Her malzeme ayrı satırda, miktar+birim+malzeme (örn: "500 gram kuzu eti")
8-14 malzeme, Türkçe, pratik ev ölçüleri. Sadece listeyi yaz, başlık ekleme.`;

  const instPrompt = `"${r.name}" tarifi için pişirme adımları yaz.
FORMAT: Her adım ayrı satırda, numara veya tire ile başlat
6-10 adım, açık ve anlaşılır Türkçe talimatlar. Sadece adımları yaz.`;

  const [desc, ingRaw, instRaw] = await Promise.all([
    ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: descPrompt }]),
    ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: ingPrompt }]),
    ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: instPrompt }]),
  ]);

  const clean = s => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  const ingredients = ingRaw.split(/\n/).map(l => clean(l.replace(/^[-•*\d.]+\s*/, ''))).filter(l => l.length > 3);
  const instructions = instRaw.split(/\n/).map(l => clean(l.replace(/^[-•*\d.]+\s*/, ''))).filter(l => l.length > 5);

  return {
    description: clean(desc).slice(0, 400),
    ingredients,
    instructions,
  };
}

async function main() {
  console.log('\n🍽️  Şanlıurfa Tarif Batch 2 — 25 yeni tarif\n');

  const { ssh, server } = await openSshTunnel();
  console.log('SSH tünel ✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  // Mevcut slug'ları kontrol et
  const { rows: existing } = await client.query('SELECT slug FROM app.recipes');
  const existingSlugs = new Set(existing.map(r => r.slug));

  const toInsert = RECIPES.filter(r => !existingSlugs.has(r.slug));
  console.log(`📋 ${toInsert.length} yeni tarif eklenecek (${RECIPES.length - toInsert.length} zaten mevcut)\n`);

  let ok = 0, fail = 0;

  for (const recipe of toInsert) {
    process.stdout.write(`  → ${recipe.name}... `);

    try {
      const { description, ingredients, instructions } = await generateRecipe(recipe);

      if (description.length < 80 || ingredients.length < 4 || instructions.length < 4) {
        console.log(`✗ yetersiz içerik (desc:${description.length}c ing:${ingredients.length} inst:${instructions.length})`);
        fail++;
        await sleep(2000);
        continue;
      }

      // Görsel
      let coverImage = `/uploads/recipes/${recipe.slug}.jpg`;
      const imgUrl = await fetchPexelsImage(recipe.pexels);
      if (imgUrl) {
        const destPath = path.join(projectRoot, 'public', 'uploads', 'recipes', `${recipe.slug}.jpg`);
        const saved = await downloadImage(imgUrl, destPath);
        if (!saved) coverImage = '/uploads/recipes/default-recipe.jpg';
      } else {
        coverImage = '/uploads/recipes/default-recipe.jpg';
      }

      const meta_title = `${recipe.name} Tarifi | Şanlıurfa Mutfağı`;
      const meta_description = description.slice(0, 160);

      await client.query(`
        INSERT INTO app.recipes
          (slug, name, description, ingredients, instructions, cover_image,
           prep_time, cook_time, servings, difficulty,
           is_spicy, is_vegetarian, is_featured,
           status, meta_title, meta_description,
           rating, view_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'published',$14,$15,4.5,0)
        ON CONFLICT (slug) DO NOTHING
      `, [
        recipe.slug, recipe.name, description, ingredients, instructions, coverImage,
        recipe.prep_time, recipe.cook_time, recipe.servings, recipe.difficulty,
        recipe.is_spicy, recipe.is_vegetarian, recipe.is_featured,
        meta_title, meta_description,
      ]);

      console.log(`✓ desc:${description.length}c ing:${ingredients.length} inst:${instructions.length}`);
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message.slice(0, 60)}`);
      fail++;
    }
    await sleep(1500);
  }

  const { rows: [stats] } = await client.query(`
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER(WHERE status='published') AS published,
      COUNT(*) FILTER(WHERE is_featured) AS featured,
      COUNT(*) FILTER(WHERE is_vegetarian) AS vegetarian,
      COUNT(*) FILTER(WHERE is_spicy) AS spicy
    FROM app.recipes
  `);

  await client.end();
  server.close();
  ssh.end();

  console.log(`\n✅ ${ok} eklendi | ${fail} başarısız`);
  console.log(`📊 Toplam: ${stats.total} | Published: ${stats.published} | Öne Çıkan: ${stats.featured}`);
  console.log(`   Vejetaryen: ${stats.vegetarian} | Baharatlı: ${stats.spicy}`);
}

main().catch(e => { console.error(e); process.exit(1); });
