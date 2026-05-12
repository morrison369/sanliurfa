#!/usr/bin/env node
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
    const line = raw.trim(); if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('='); if (sep < 0) continue;
    const k = line.slice(0, sep).trim(), v = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const LOCAL_TUNNEL_PORT = 15710;

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
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT || '77'), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000 });
    });
    ssh.on('error', reject);
    server.on('error', reject);
  });
}

async function main() {
  const { ssh, server } = await openSshTunnel();
  const db = new pg.Client({ host: '127.0.0.1', port: LOCAL_TUNNEL_PORT, user: process.env.DB_USER || 'sanliur_sanliurfa', password: process.env.DB_PASS, database: process.env.DB_NAME || 'sanliur_sanliurfa' });
  await db.connect();

  // 1. Thin recipe — find it
  console.log('\n=== 1. İNCE TARİF (<300c) ===');
  const thin = await db.query(`SELECT slug, name, char_length(description) AS len FROM recipes WHERE char_length(description) < 300 ORDER BY len`);
  if (thin.rows.length === 0) {
    console.log('  ✓ İnce tarif yok!');
  } else {
    for (const r of thin.rows) console.log(`  → ${r.slug} (${r.len}c) — ${r.name}`);
  }

  // 2. Difficulty normalize
  console.log('\n=== 2. DIFFICULTY NORMALIZE ===');
  const diffBefore = await db.query(`SELECT difficulty, COUNT(*) FROM recipes GROUP BY difficulty ORDER BY difficulty`);
  console.log('  Önce:', diffBefore.rows.map(r => `${r.difficulty}:${r.count}`).join(' | '));
  const diffResult = await db.query(`UPDATE recipes SET difficulty = LOWER(difficulty) WHERE difficulty != LOWER(difficulty)`);
  console.log(`  ✓ ${diffResult.rowCount} tarif güncellendi`);
  const diffAfter = await db.query(`SELECT difficulty, COUNT(*) FROM recipes GROUP BY difficulty ORDER BY difficulty`);
  console.log('  Sonra:', diffAfter.rows.map(r => `${r.difficulty}:${r.count}`).join(' | '));

  // 3. Unpublished events
  console.log('\n=== 3. YAYINLANMAMIŞ ETKİNLİKLER ===');
  const unpub = await db.query(`SELECT id, title, status, start_date FROM events WHERE status != 'published' ORDER BY start_date`);
  console.log(`  Toplam yayınlanmamış: ${unpub.rows.length}`);
  for (const e of unpub.rows) console.log(`    ${e.status.padEnd(12)} | ${String(e.start_date).slice(0,10)} | ${e.title}`);

  if (unpub.rows.length > 0) {
    const fix = await db.query(`UPDATE events SET status = 'published' WHERE status != 'published'`);
    console.log(`  ✓ ${fix.rowCount} etkinlik published yapıldı`);
  }

  // Final check
  console.log('\n=== ÖZET ===');
  const r1 = await db.query(`SELECT COUNT(*) FROM recipes WHERE char_length(description) < 300`);
  const r2 = await db.query(`SELECT COUNT(*) FROM events WHERE status != 'published'`);
  const r3 = await db.query(`SELECT COUNT(*) FROM recipes WHERE difficulty != LOWER(difficulty)`);
  console.log(`  İnce tarif kalan: ${r1.rows[0].count}`);
  console.log(`  Yayınlanmamış event kalan: ${r2.rows[0].count}`);
  console.log(`  Mixed-case difficulty kalan: ${r3.rows[0].count}`);

  await db.end(); server.close(); ssh.end();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
