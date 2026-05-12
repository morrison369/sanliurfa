#!/usr/bin/env node
/**
 * 55 ince tarif açıklamasını Ollama ile genişletir.
 * Mevcut açıklamayı baz alarak 600-800 karaktere çıkarır.
 * Slug, name, ingredients, instructions DOKUNULMAZ — sadece description UPDATE.
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
const LOCAL_TUNNEL_PORT = 15592;
const MIN_LEN = 400;

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

async function expandDescription(name, currentDesc) {
  const prompt = `Şanlıurfa yöresel yemeği "${name}" için mevcut kısa açıklamayı genişlet.

Mevcut açıklama:
${currentDesc}

Bu açıklamayı temel alarak 600-800 karakter uzunluğunda yeni bir paragraf yaz.
Yemeğin tarihi kökenini, Şanlıurfa kültüründeki önemini, servis şeklini ve lezzet profilini anlat.
Sadece düz metin döndür, JSON veya başlık kullanma.`;

  const response = await ollamaChat([
    { role: 'system', content: SYSTEM_TR },
    { role: 'user', content: prompt },
  ]);

  return response.trim();
}

async function main() {
  console.log('\n📝 Tarif açıklamaları genişletiliyor...\n');
  const { ssh, server } = await openSshTunnel();
  const pool = new pg.Pool({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, database: process.env.DB_USER, user: process.env.DB_USER, password: process.env.DB_PASS });

  const res = await pool.query(
    `SELECT id, name, slug, description FROM recipes
     WHERE status='published' AND LENGTH(COALESCE(description,'')) < $1
     ORDER BY name`,
    [MIN_LEN]
  );

  console.log(`📋 ${res.rows.length} ince açıklama bulundu (< ${MIN_LEN} karakter)\n`);

  let updated = 0, failed = 0;

  for (const row of res.rows) {
    const currentLen = (row.description || '').length;
    process.stdout.write(`  [${row.name}] (${currentLen}c) → `);

    try {
      const newDesc = await expandDescription(row.name, row.description || '');

      if (!newDesc || newDesc.length < 300) {
        process.stdout.write(`✗ çok kısa (${newDesc?.length || 0}c)\n`);
        failed++;
        await sleep(500);
        continue;
      }

      await pool.query(
        'UPDATE recipes SET description = $1, updated_at = NOW() WHERE id = $2',
        [newDesc, row.id]
      );

      process.stdout.write(`✓ ${newDesc.length}c\n`);
      updated++;
    } catch (err) {
      process.stdout.write(`✗ ${err.message.slice(0, 60)}\n`);
      failed++;
    }

    await sleep(800);
  }

  console.log(`\n✅ ${updated} güncellendi, ${failed} hata`);

  // Kontrol
  const check = await pool.query(
    `SELECT COUNT(*) thin FROM recipes WHERE status='published' AND LENGTH(COALESCE(description,'')) < ${MIN_LEN}`
  );
  console.log(`📊 Kalan ince tarif (<${MIN_LEN}c): ${check.rows[0].thin}`);

  await pool.end(); server.close(); ssh.end(); process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
