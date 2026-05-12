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

const PORT = 15540;

function openSshTunnel() {
  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer(sock => {
      ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, stream) => {
        if (err) { sock.destroy(); return; }
        sock.pipe(stream); stream.pipe(sock);
      });
    });
    server.listen(PORT, '127.0.0.1', () => {
      ssh.on('ready', () => resolve({ ssh, server }))
        .connect({ host: process.env.SSH_HOST, port: parseInt(process.env.SSH_PORT), username: process.env.SSH_USER, password: process.env.SSH_PASS, keepaliveInterval: 10000, keepaliveCountMax: 30 });
    });
    ssh.on('error', reject);
  });
}

async function main() {
  const { ssh, server } = await openSshTunnel();
  const client = new pg.Client({ host: '127.0.0.1', port: PORT, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
  await client.connect();

  // Total counts
  const { rows: [counts] } = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM places WHERE status='active') AS places,
      (SELECT COUNT(*) FROM blog_posts WHERE status='published') AS blogs,
      (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL) AS main_cats,
      (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) AS sub_cats
  `);
  console.log('\n📊 GENEL DURUM');
  console.log(`  Mekan: ${counts.places} | Blog: ${counts.blogs} | Ana Kat: ${counts.main_cats} | Alt Kat: ${counts.sub_cats}\n`);

  // Empty subcategories grouped by parent
  const { rows: empty } = await client.query(`
    SELECT p.name AS parent_name, p.slug AS parent_slug, c.id, c.name, c.slug
    FROM categories c
    JOIN categories p ON p.id = c.parent_id
    WHERE c.parent_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM places pl WHERE pl.category_id = c.id AND pl.status = 'active'
      )
    ORDER BY p.name, c.name
  `);
  console.log(`⚠️  BOŞ ALT KATEGORİLER: ${empty.length}\n`);
  let lastParent = '';
  for (const r of empty) {
    if (r.parent_name !== lastParent) { console.log(`  [${r.parent_name}]`); lastParent = r.parent_name; }
    console.log(`    id=${r.id} | ${r.name} (${r.slug})`);
  }

  // Non-empty subcats for reference
  const { rows: nonEmpty } = await client.query(`
    SELECT p.name AS parent_name, c.name, COUNT(pl.id) AS cnt
    FROM categories c
    JOIN categories p ON p.id = c.parent_id
    LEFT JOIN places pl ON pl.category_id = c.id AND pl.status='active'
    WHERE c.parent_id IS NOT NULL
    GROUP BY p.name, c.name
    HAVING COUNT(pl.id) > 0
    ORDER BY COUNT(pl.id) DESC
    LIMIT 20
  `);
  console.log(`\n✅ EN DOLU ALT KATEGORİLER (top 20):`);
  for (const r of nonEmpty) console.log(`  ${r.cnt} mekan | [${r.parent_name}] ${r.name}`);

  await client.end();
  server.close();
  ssh.end();
}

main().catch(e => { console.error(e); process.exit(1); });
