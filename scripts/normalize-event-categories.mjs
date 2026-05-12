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

const LOCAL_TUNNEL_PORT = 15541;

async function main() {
  const ssh = new SshClient();
  const server = net.createServer(sock => {
    ssh.forwardOut('127.0.0.1', LOCAL_TUNNEL_PORT, '127.0.0.1', 5432, (err, stream) => {
      if (err) { sock.destroy(); return; }
      sock.pipe(stream); stream.pipe(sock);
    });
  });

  await new Promise((resolve, reject) => {
    server.listen(LOCAL_TUNNEL_PORT, '127.0.0.1', () => {
      ssh.on('ready', resolve).on('error', reject).connect({
        host: process.env.SSH_HOST,
        port: parseInt(process.env.SSH_PORT || '77'),
        username: process.env.SSH_USER,
        password: process.env.SSH_PASS,
      });
    });
  });

  const client = new pg.Client({
    host: '127.0.0.1', port: LOCAL_TUNNEL_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  await client.connect();

  console.log('\n🏷️  Event kategori normalizasyonu...\n');

  // Lowercase ve bileşik kategorileri standart forma çevir
  const normalizations = [
    { from: 'kultur',              to: 'Kültür' },
    { from: 'turizm',              to: 'Turizm' },
    { from: 'aile',                to: 'Çocuk & Aile' },
    { from: 'tarim',               to: 'Gastronomi' },
    { from: 'muzik',               to: 'Müzik' },
    { from: 'gastronomi',          to: 'Gastronomi' },
    { from: 'Kültür & Sanat',      to: 'Sanat' },
    { from: 'Kültür & Eğlence',    to: 'Kültür' },
    { from: 'Kültür & Festival',   to: 'Festival' },
    { from: 'Turizm & Kültür',     to: 'Turizm' },
    { from: 'Turizm & Doğa',       to: 'Turizm' },
    { from: 'El Sanatları & Kültür', to: 'Kültür' },
    { from: 'Eğitim & Bilim',      to: 'Akademi' },
  ];

  let total = 0;
  for (const n of normalizations) {
    const { rowCount } = await client.query(
      `UPDATE app.events SET category = $1 WHERE category = $2`,
      [n.to, n.from]
    );
    if (rowCount > 0) {
      console.log(`  ✓ "${n.from}" → "${n.to}" (${rowCount} kayıt)`);
      total += rowCount;
    }
  }

  // Show final distribution
  const { rows } = await client.query(`
    SELECT category, COUNT(*) as count
    FROM app.events WHERE status = 'published'
    GROUP BY category ORDER BY count DESC
  `);
  console.log(`\n✅ ${total} event kategorisi güncellendi\n\nGüncel dağılım:`);
  rows.forEach(r => console.log(`  ${r.category}: ${r.count}`));

  await client.end();
  server.close();
  ssh.end();
}

main().catch(e => { console.error(e); process.exit(1); });
