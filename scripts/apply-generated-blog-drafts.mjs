#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import pg from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');
const root = process.cwd();
const draftsDir = path.resolve(root, process.argv.find((arg) => arg.startsWith('--dir='))?.slice(6) || 'docs/generated-blog-drafts');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').replace(/\\n/g, '\n').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf('=');
    if (sep < 0) continue;
    const key = line.slice(0, sep).trim();
    const value = line.slice(sep + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value && !process.env[key]) process.env[key] = value;
  }
}

for (const file of [
  path.join(root, 'scripts/.env.scripts'),
  path.join(root, '.env.production'),
  path.join(root, '.env.local'),
  path.join(root, '.env'),
]) {
  loadEnv(file);
}

function openProdSshTunnel() {
  const localPort = Number(process.env.BLOG_DRAFT_TUNNEL_PORT || 15436);
  const host = process.env.SSH_HOST || '168.119.79.238';
  const port = Number(process.env.SSH_PORT || 77);
  const username = process.env.SSH_USER || 'sanliur';
  const password = process.env.SSH_PASS || '';
  if (!password) throw new Error('SSH_PASS eksik');
  if (!(process.env.DB_PASS || process.env.DB_PASSWORD)) throw new Error('DB_PASS eksik');

  return new Promise((resolve, reject) => {
    const ssh = new SshClient();
    const server = net.createServer((sock) => {
      ssh.forwardOut('127.0.0.1', localPort, '127.0.0.1', 5432, (error, stream) => {
        if (error) {
          sock.destroy();
          return;
        }
        sock.pipe(stream);
        stream.pipe(sock);
      });
    });
    server.on('error', reject);
    server.listen(localPort, '127.0.0.1', () => {
      ssh
        .on('ready', () => resolve({ ssh, server, localPort }))
        .on('error', reject)
        .connect({ host, port, username, password, readyTimeout: 20000 });
    });
  });
}

function readDrafts() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs.readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json') && name !== 'summary.json')
    .map((name) => JSON.parse(fs.readFileSync(path.join(draftsDir, name), 'utf8')))
    .filter((draft) => draft?.topic?.slug && draft?.html);
}

const drafts = readDrafts();
if (drafts.length === 0) {
  console.error(`generated blog draft bulunamadı: ${draftsDir}`);
  process.exit(1);
}

const tunnel = await openProdSshTunnel();
const client = new pg.Client({
  host: '127.0.0.1',
  port: tunnel.localPort,
  user: process.env.DB_USER || 'sanliur_sanliurfa',
  password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sanliur_sanliurfa',
  connectionTimeoutMillis: 10000,
  application_name: 'sanliurfa-apply-generated-blog-drafts',
});

let applied = 0;
let pendingBlogDrafts = 0;
try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS city_content_drafts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      draft_type TEXT NOT NULL,
      entity_key TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      source_key TEXT,
      source_url TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      seo_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      freshness_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      admin_notes TEXT,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT city_content_drafts_entity_unique UNIQUE (draft_type, entity_key)
    )
  `);

  for (const draft of drafts) {
    const topic = draft.topic;
    await client.query(
      `INSERT INTO city_content_drafts (
         draft_type, entity_key, title, slug, source_key, source_url, payload, seo_payload, freshness_payload, updated_at
       )
       VALUES ('blog-draft', $1, $2, $3, 'internet-keyword-research', $4, $5::jsonb, $6::jsonb, $7::jsonb, NOW())
       ON CONFLICT (draft_type, entity_key)
       DO UPDATE SET
         title = EXCLUDED.title,
         slug = EXCLUDED.slug,
         source_key = EXCLUDED.source_key,
         source_url = EXCLUDED.source_url,
         status = 'pending',
         payload = EXCLUDED.payload,
         seo_payload = EXCLUDED.seo_payload,
         freshness_payload = EXCLUDED.freshness_payload,
         updated_at = NOW()`,
      [
        topic.slug,
        topic.title,
        topic.slug,
        topic.sourceUrls?.[0] || null,
        JSON.stringify({
          html: draft.html,
          excerpt: draft.excerpt,
          wordCount: draft.wordCount,
          category: topic.category,
          internalLinks: topic.internalLinks,
          sourceUrls: topic.sourceUrls,
          requiredReview: true,
          validationFailures: draft.validationFailures || [],
        }),
        JSON.stringify({
          focusKeyword: topic.focusKeyword,
          secondaryKeywords: topic.secondaryKeywords,
          title: topic.title,
          slug: topic.slug,
          description: String(draft.excerpt || '').slice(0, 156),
          schemaType: 'BlogPosting',
        }),
        JSON.stringify({
          generatedAt: draft.generatedAt || new Date().toISOString(),
          sourcePolicy: 'internet_research_plus_admin_review',
          autoPublish: false,
          model: draft.model || 'ollama-cloud',
        }),
      ],
    );
    applied++;
  }
  const countResult = await client.query(
    `SELECT COUNT(*)::int AS count FROM city_content_drafts WHERE draft_type = 'blog-draft' AND status = 'pending'`,
  );
  pendingBlogDrafts = Number(countResult.rows[0]?.count || 0);
} finally {
  await client.end().catch(() => {});
  tunnel.server.close();
  tunnel.ssh.end();
}

fs.writeFileSync(
  path.join(draftsDir, 'apply-summary.json'),
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    applied,
    pendingBlogDrafts,
    autoPublish: false,
  }, null, 2)}\n`,
  'utf8',
);
console.log(`generated-blog-drafts-apply: OK applied=${applied}`);
