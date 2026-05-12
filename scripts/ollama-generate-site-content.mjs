#!/usr/bin/env node
/**
 * Tarihi mekanlar (description + history) ve etkinlik açıklamalarını üret.
 * Kullanım: node scripts/ollama-generate-site-content.mjs [--dry-run]
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
const MODEL     = ollamaCfg.MODEL;

const SSH_HOST = process.env.SSH_HOST || '168.119.79.238';
const SSH_PORT = parseInt(process.env.SSH_PORT || '77');
const SSH_USER = process.env.SSH_USER || 'sanliur';
const SSH_PASS = process.env.SSH_PASS || '';
const DB_USER  = process.env.DB_USER  || 'sanliur_sanliurfa';
const DB_NAME  = process.env.DB_NAME  || 'sanliur_sanliurfa';
const DB_PASS  = process.env.DB_PASS  || '';
const LOCAL_TUNNEL_PORT = 15446;

const DRY = process.argv.includes('--dry-run');

if (!ollamaCfg.KEY) { console.error('OLLAMA_API_KEY eksik'); process.exit(1); }
if (!SSH_PASS)      { console.error('SSH_PASS eksik'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ollamaChat = (messages) => _ollamaChat(messages, MODEL, ollamaCfg);

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
        .connect({ host: SSH_HOST, port: SSH_PORT, username: SSH_USER, password: SSH_PASS });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  process.stdout.write('SSH tünel açılıyor... ');
  const { ssh, server } = await openSshTunnel();
  console.log('✓\n');

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: DB_USER, password: DB_PASS, database: DB_NAME,
  });
  await client.connect();

  // ──────────────────────────────────────────
  // TARİHİ MEKANLAR
  // ──────────────────────────────────────────
  const { rows: sites } = await client.query(`
    SELECT id, name, period, location, short_description
    FROM historical_sites
    WHERE description IS NULL OR length(description) < 100
    ORDER BY name
  `);

  console.log(`🏛️  ${sites.length} tarihi mekan için içerik üretilecek\n`);
  let sOk = 0, sFail = 0;

  for (const site of sites) {
    process.stdout.write(`  → ${site.name.slice(0, 50)} ... `);
    const locationInfo = site.location ? `Konum: ${site.location}.` : '';
    const periodInfo   = site.period   ? `Dönem: ${site.period}.` : '';
    const shortDesc    = site.short_description || '';

    const descPrompt = `"${site.name}" tarihi mekânı için kapsamlı bir Türkçe açıklama yaz. ${locationInfo} ${periodInfo}
Mevcut kısa açıklama: "${shortDesc}"
Yaz: 3-4 paragraf HTML açıklama (<p> etiketleri), ziyaretçilere mekanın önemi, tarihi, görülecek yerler ve pratik bilgiler.
Yalnızca HTML içeriği yaz (<p>, <ul>, <li> kullanabilirsin), başka açıklama ekleme.`;

    const histPrompt = `"${site.name}" tarihi mekânının tarihsel sürecini anlatan 2 paragraf yaz. ${periodInfo} ${locationInfo}
HTML formatında yaz (<p> etiketleri). Kronolojik, akademik ama anlaşılır Türkçe. Sadece HTML yaz.`;

    try {
      const [description, history] = await Promise.all([
        ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: descPrompt }]),
        ollamaChat([{ role: 'system', content: SYSTEM_TR }, { role: 'user', content: histPrompt }]),
      ]);

      if (DRY) {
        console.log(`\n    [DRY] desc:${description.length}k hist:${history.length}k`);
      } else {
        await client.query(
          'UPDATE historical_sites SET description=$1, history=$2 WHERE id=$3',
          [description, history, site.id]
        );
        console.log(`✓ (desc:${description.length} hist:${history.length})`);
      }
      sOk++;
      await sleep(2500);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      sFail++;
      await sleep(1000);
    }
  }

  // ──────────────────────────────────────────
  // ETKİNLİKLER
  // ──────────────────────────────────────────
  const { rows: events } = await client.query(`
    SELECT id, title, category, location
    FROM events
    WHERE description IS NULL OR length(description) < 50
    ORDER BY start_date
  `);

  console.log(`\n🎉 ${events.length} etkinlik için açıklama üretilecek\n`);
  let eOk = 0, eFail = 0;

  for (const evt of events) {
    process.stdout.write(`  → ${evt.title.slice(0, 55)} ... `);
    const catInfo = evt.category ? `Kategori: ${evt.category}.` : '';
    const locInfo = evt.location ? `Konum: ${evt.location}.` : '';

    const prompt = `"${evt.title}" etkinliği için kısa ve ilgi çekici Türkçe açıklama yaz. ${catInfo} ${locInfo}
Açıklama: 2-3 cümle, HTML kullanma, sade metin. Sadece açıklama metnini yaz.`;

    try {
      const desc = await ollamaChat([
        { role: 'system', content: SYSTEM_TR },
        { role: 'user', content: prompt },
      ]);

      if (DRY) {
        console.log(`\n    [DRY] ${desc.slice(0, 80)}...`);
      } else {
        await client.query(
          'UPDATE events SET description=$1 WHERE id=$2',
          [desc.slice(0, 1000), evt.id]
        );
        console.log(`✓ (${desc.length} karakter)`);
      }
      eOk++;
      await sleep(1500);
    } catch (err) {
      console.log(`✗ ${err.message}`);
      eFail++;
      await sleep(1000);
    }
  }

  await client.end();
  server.close();
  ssh.end();
  console.log(`\n✅ Tamamlandı:`);
  console.log(`   Tarihi mekan: ${sOk} başarılı, ${sFail} hata`);
  console.log(`   Etkinlik: ${eOk} başarılı, ${eFail} hata${DRY ? ' (DRY RUN)' : ''}`);
}

main().catch(e => { console.error(e); process.exit(1); });
