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
    const k = line.slice(0, sep).trim();
    const v = line.slice(sep+1).trim().replace(/^['"]|['"]$/g,'');
    if (k && v && !process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(scriptDir, '.env.scripts'));
loadEnv(path.join(projectRoot, '.env'));

const PORT = 15543;
async function main() {
  const ssh = new SshClient();
  const server = net.createServer(sock => {
    ssh.forwardOut('127.0.0.1', PORT, '127.0.0.1', 5432, (err, st) => { if(err){sock.destroy();return;} sock.pipe(st);st.pipe(sock); });
  });
  await new Promise((res,rej) => {
    server.listen(PORT,'127.0.0.1', () => {
      ssh.on('ready',res).on('error',rej).connect({ host:process.env.SSH_HOST, port:parseInt(process.env.SSH_PORT||'77'), username:process.env.SSH_USER, password:process.env.SSH_PASS });
    });
  });
  const client = new pg.Client({ host:'127.0.0.1', port:PORT, user:process.env.DB_USER, password:process.env.DB_PASS, database:process.env.DB_NAME });
  await client.connect();

  const { rows } = await client.query(`SELECT id, email, role FROM app.users WHERE role='admin' LIMIT 3`);
  console.log('Admin kullanıcılar:');
  rows.forEach(r => console.log(`  [${r.id}] ${r.email} (${r.role})`));

  // Also check blog_posts author_id column
  const { rows: sample } = await client.query(`SELECT id, author_id FROM app.blog_posts LIMIT 3`);
  console.log('\nSample blog_posts author_id:');
  sample.forEach(r => console.log(`  ${r.id}: author_id=${r.author_id}`));

  await client.end(); server.close(); ssh.end();
}
main().catch(e => { console.error(e); process.exit(1); });
