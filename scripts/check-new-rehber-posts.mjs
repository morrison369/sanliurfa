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
const PORT = 15544;

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

  // Check new rehber posts
  const { rows } = await client.query(`
    SELECT slug, title, length(content) as clen,
      (content ILIKE '%Sık Sorulan Sorular%') as has_faq,
      (meta_title IS NOT NULL AND length(meta_title) >= 10) as has_meta_title,
      (meta_description IS NOT NULL AND length(meta_description) >= 10) as has_meta_desc,
      featured_image IS NOT NULL as has_image,
      read_time_minutes
    FROM app.blog_posts
    WHERE category = 'rehber' AND status = 'published'
    ORDER BY created_at DESC LIMIT 10
  `);

  console.log('=== rehber kategorisi (son 10) ===');
  rows.forEach(r => {
    const status = [
      r.has_faq ? 'FAQ✓' : 'FAQ✗',
      r.has_meta_title ? 'MT✓' : 'MT✗',
      r.has_meta_desc ? 'MD✓' : 'MD✗',
      r.has_image ? 'IMG✓' : 'IMG✗',
    ].join(' ');
    console.log(`  ${status} | ${r.clen}c | ${r.read_time_minutes}dk | ${r.slug}`);
  });

  // Overall blog quality check
  const { rows: [overall] } = await client.query(`
    SELECT
      COUNT(*) FILTER (WHERE status='published') as total,
      COUNT(*) FILTER (WHERE status='published' AND content NOT ILIKE '%Sık Sorulan Sorular%') as no_faq,
      COUNT(*) FILTER (WHERE status='published' AND (meta_title IS NULL OR length(meta_title)<10)) as no_meta_title,
      COUNT(*) FILTER (WHERE status='published' AND (featured_image IS NULL OR featured_image='')) as no_image,
      COUNT(*) FILTER (WHERE status='published' AND (read_time_minutes IS NULL OR read_time_minutes=0)) as no_read_time
    FROM app.blog_posts
  `);
  console.log(`\n=== Genel Blog Kalite Durumu ===`);
  console.log(`  Toplam: ${overall.total}`);
  console.log(`  FAQsız: ${overall.no_faq}`);
  console.log(`  MetaTitlesiz: ${overall.no_meta_title}`);
  console.log(`  Görselsiz: ${overall.no_image}`);
  console.log(`  ReadTimesiz: ${overall.no_read_time}`);

  await client.end(); server.close(); ssh.end();
}
main().catch(e => { console.error(e); process.exit(1); });
