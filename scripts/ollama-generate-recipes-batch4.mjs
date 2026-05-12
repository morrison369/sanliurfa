#!/usr/bin/env node
/**
 * Recipe Batch 4 — 10 yeni Şanlıurfa tarifi
 * Buryan, Saç Kavurma, Çiğ Börek, Yüksük Çorbası, Analı Kızlı,
 * Nohut Kebabı, İpek Helvası, Döğme Aşı, Kelek Salatası, Gavurdağı Salatası
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
const LOCAL_TUNNEL_PORT = 15585;

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

const RECIPES = [
  { name: 'Buryan Kebabı',       slug: 'buryan-kebabi',      diff: 'Zor',  spicy: false, veg: false, prep: 30, cook: 240, servings: 8 },
  { name: 'Saç Kavurma',         slug: 'sac-kavurma',        diff: 'Kolay', spicy: false, veg: false, prep: 15, cook: 25, servings: 4 },
  { name: 'Çiğ Börek',           slug: 'cig-borek',          diff: 'Orta', spicy: false, veg: true,  prep: 40, cook: 15, servings: 6 },
  { name: 'Yüksük Çorbası',      slug: 'yuksuk-corbasi',     diff: 'Orta', spicy: false, veg: false, prep: 20, cook: 50, servings: 6 },
  { name: 'Analı Kızlı Çorbası', slug: 'anali-kizli-corbasi',diff: 'Orta', spicy: false, veg: false, prep: 30, cook: 60, servings: 6 },
  { name: 'Nohut Kebabı',        slug: 'nohut-kebabi',       diff: 'Kolay', spicy: false, veg: true,  prep: 10, cook: 30, servings: 4 },
  { name: 'İpek Helvası',        slug: 'ipek-helvasi',       diff: 'Orta', spicy: false, veg: true,  prep: 15, cook: 30, servings: 8 },
  { name: 'Döğme Aşı',           slug: 'dogme-asi',          diff: 'Orta', spicy: false, veg: false, prep: 20, cook: 90, servings: 6 },
  { name: 'Kelek Salatası',      slug: 'kelek-salatasi',     diff: 'Kolay', spicy: true,  veg: true,  prep: 15, cook: 0,  servings: 4 },
  { name: 'Gavurdağı Salatası',  slug: 'gavurdagi-salatasi', diff: 'Kolay', spicy: false, veg: true,  prep: 15, cook: 0,  servings: 4 },
];

async function generateRecipe(recipe, pool) {
  console.log(`\n[${recipe.name}] üretiliyor...`);

  const prompt = `Şanlıurfa yöresel yemeği "${recipe.name}" için Türkçe tarif yaz.

Şu formatta JSON döndür (başka hiçbir şey yazma):
{
  "description": "200-250 kelime, yemeğin tarihi ve kültürel önemi hakkında paragraf",
  "ingredients": "madde madde liste, her malzeme ayrı satırda (- ile başlayarak), yaklaşık ${recipe.servings} kişilik",
  "instructions": "numaralı adımlar (1., 2., vs.), her adım net ve açık, toplam 8-12 adım",
  "meta_description": "120-160 karakter SEO açıklaması"
}`;

  const response = await ollamaChat([
    { role: 'system', content: SYSTEM_TR },
    { role: 'user', content: prompt },
  ]);

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
  const coverImage = `/uploads/recipes/${recipe.slug}.jpg`;

  try {
    await pool.query(
      `INSERT INTO recipes (id, slug, name, description, ingredients, instructions, cover_image, prep_time, cook_time, servings, difficulty, is_spicy, is_vegetarian, is_featured, rating, view_count, status, meta_description, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, 4.2, 0, 'published', $13, NOW(), NOW())
       ON CONFLICT (slug) DO NOTHING`,
      [recipe.slug, recipe.name, data.description, ingredientsArr, instructionsArr, coverImage,
       recipe.prep, recipe.cook, recipe.servings, recipe.diff, recipe.spicy, recipe.veg,
       data.meta_description || `${recipe.name} tarifi ve yapılışı. Şanlıurfa mutfağından özgün lezzet.`]
    );
    console.log(`  ✓ ${recipe.name} eklendi`);
    return true;
  } catch (e) {
    console.error(`  DB hatası: ${e.message}`);
    return false;
  }
}

async function main() {
  const { ssh, server } = await openSshTunnel();
  const pool = new pg.Pool({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, database: process.env.DB_USER, user: process.env.DB_USER, password: process.env.DB_PASS });

  let added = 0;
  for (const recipe of RECIPES) {
    const existing = await pool.query('SELECT id FROM recipes WHERE slug = $1', [recipe.slug]);
    if (existing.rows.length > 0) { console.log(`[${recipe.name}] zaten mevcut, atlandı`); continue; }
    const ok = await generateRecipe(recipe, pool);
    if (ok) added++;
    await sleep(1500);
  }

  console.log(`\n✓ ${added}/${RECIPES.length} yeni tarif eklendi`);
  await pool.end(); server.close(); ssh.end(); process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
