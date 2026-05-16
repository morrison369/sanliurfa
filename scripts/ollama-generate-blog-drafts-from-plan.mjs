#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import pg from 'pg';
import { createRequire } from 'node:module';
import { getOllamaConfig, ollamaChat, SYSTEM_SEO } from './ollama-lib.mjs';
import { BLOG_CONTENT_POLICY, stripTags, validateBlogHeadingPolicy } from './blog-content-policy.mjs';

const require = createRequire(import.meta.url);
const { Client: SshClient } = require('ssh2');

const root = process.cwd();
const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('=') || '1');
}

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

const topicsFile = path.resolve(root, args.get('topics') || 'scripts/blog-keyword-topics.json');
const outDir = path.resolve(root, args.get('out-dir') || 'docs/generated-blog-drafts');
const limit = Math.max(1, Math.min(25, Number(args.get('limit') || process.env.BLOG_DRAFT_LIMIT || 5)));
const applyDb = args.has('apply-db');
const applyProdSsh = args.has('apply-prod-ssh');
const missingOnly = args.has('missing-only');
const cfg = getOllamaConfig();

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function excerptFromHtml(html) {
  const firstP = String(html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const text = stripTags(firstP?.[1] || html);
  return text.slice(0, 220);
}

function normalizeHtml(html) {
  return String(html || '')
    .replace(/```html|```/gi, '')
    .replace(/<\/?(html|body|article|main)[^>]*>/gi, '')
    .trim();
}

function validateDraft(topic, html) {
  const failures = [];
  const text = stripTags(html);
  const policyResult = validateBlogHeadingPolicy(html, { minWords: 900 });
  failures.push(...policyResult.failures);
  if (!/Sık Sorulan Sorular/i.test(html)) failures.push('faq-section-missing');
  if (!text.toLocaleLowerCase('tr-TR').includes(topic.focusKeyword.toLocaleLowerCase('tr-TR').split(' ')[0])) {
    failures.push('focus-keyword-context-missing');
  }
  return failures;
}

function buildPrompt(topic) {
  return [
    `"${topic.title}" başlıklı kapsamlı Türkçe blog yazısı yaz.`,
    '',
    `Odak anahtar kelime: ${topic.focusKeyword}`,
    `İkincil anahtar kelimeler: ${topic.secondaryKeywords.join(', ')}`,
    `Arama niyeti: ${topic.intent}`,
    `Kategori: ${topic.category}`,
    `Kullanılacak iç linkler: ${topic.internalLinks.join(', ')}`,
    `Araştırma kaynakları: ${topic.sourceUrls.join(', ')}`,
    '',
    'Kurallar:',
    '- Aynı konuda prod blog yazısı varsa kopyalama; bu başlığı bağımsız, özgün ve 2026 güncel rehber olarak yaz.',
    '- Uydurma fiyat, saat, telefon, yorum, işletme puanı veya resmi karar yazma.',
    '- Kaynaklardan emin olmadığın güncel bilgiler için "gitmeden önce resmi kaynaktan kontrol edin" notu ekle.',
    '- İlk üretimde eksiksiz taslak hedefle; sonraki genişletme adımı içeriği bölüm bölüm büyütecek, bu yüzden yüzeysel dolgu yapma.',
    `- ${BLOG_CONTENT_POLICY.targetMinWords}-${BLOG_CONTENT_POLICY.targetMaxWords} kelime arası yaz; Google için sihirli kelime sayısı yok, amaç arama niyetini eksiksiz karşılamak.`,
    '- Yalnızca HTML döndür: <p>, <h2>, <h3>, <ul>, <li>, <strong>, <em>. H1/H4/H5/H6 kullanma.',
    '- İlk paragraf 80-140 kelime olsun ve odak anahtar kelime doğal geçsin.',
    '- Her H2 altında 30-60 kelimelik doğrudan cevap paragrafı olsun.',
    `- H2 sayısı ${BLOG_CONTENT_POLICY.h2Min}-${BLOG_CONTENT_POLICY.h2Max} aralığında kalsın; H3 sayısı ${BLOG_CONTENT_POLICY.h3Min}-${BLOG_CONTENT_POLICY.h3Max} aralığında kalsın; toplam H2+H3 ${BLOG_CONTENT_POLICY.totalHeadingMax} sınırını aşmasın.`,
    '- FAQ için 2-4 gerçek kullanıcı sorusu yeterli; dekoratif başlık veya anahtar kelime tekrar başlığı üretme.',
    '- Son bölümde ilgili Sanliurfa.com iç linklerini doğal anchor metinle öner.',
  ].join('\n');
}

async function upsertDbDraft(topic, html, validationFailures) {
  const tunnel = applyProdSsh ? await openProdSshTunnel() : null;
  const databaseUrl = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
  if (!databaseUrl && !tunnel) throw new Error('DATABASE_URL/PROD_DATABASE_URL veya --apply-prod-ssh gerekli');
  const client = tunnel
    ? new pg.Client({
        host: '127.0.0.1',
        port: tunnel.localPort,
        user: process.env.DB_USER || 'sanliur_sanliurfa',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sanliur_sanliurfa',
        connectionTimeoutMillis: 10000,
        application_name: 'sanliurfa-ollama-blog-drafts',
      })
    : new pg.Client({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 10000,
        application_name: 'sanliurfa-ollama-blog-drafts',
      });
  await client.connect();
  try {
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
        topic.sourceUrls[0] || null,
        JSON.stringify({
          html,
          excerpt: excerptFromHtml(html),
          category: topic.category,
          internalLinks: topic.internalLinks,
          sourceUrls: topic.sourceUrls,
          requiredReview: true,
          validationFailures,
        }),
        JSON.stringify({
          focusKeyword: topic.focusKeyword,
          secondaryKeywords: topic.secondaryKeywords,
          title: topic.title,
          slug: topic.slug,
          description: excerptFromHtml(html).slice(0, 156),
          schemaType: 'BlogPosting',
        }),
        JSON.stringify({
          generatedAt: new Date().toISOString(),
          sourcePolicy: 'internet_research_plus_admin_review',
          autoPublish: false,
          model: cfg.MODEL,
        }),
      ],
    );
  } finally {
    await client.end();
    if (tunnel) {
      tunnel.server.close();
      tunnel.ssh.end();
    }
  }
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

const topics = readJson(topicsFile, []);
if (!Array.isArray(topics) || topics.length === 0) {
  console.error(`blog draft topics missing: ${topicsFile}`);
  process.exit(1);
}
if (cfg.IS_CLOUD && !cfg.KEY) {
  console.error('OLLAMA_API_KEY eksik');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const candidateTopics = missingOnly
  ? topics.filter((topic) => {
      const file = path.join(outDir, `${topic.slug}.json`);
      if (!fs.existsSync(file)) return true;
      const draft = readJson(file, null);
      return !draft?.html || draft.status === 'failed';
    })
  : topics;
const selected = candidateTopics.slice(0, limit);
const results = [];

for (const [index, topic] of selected.entries()) {
  process.stdout.write(`[${index + 1}/${selected.length}] ${topic.slug} `);
  try {
    const html = normalizeHtml(await ollamaChat([
      { role: 'system', content: SYSTEM_SEO },
      { role: 'user', content: buildPrompt(topic) },
    ], cfg.MODEL, cfg));
    const validationFailures = validateDraft(topic, html);
    const draft = {
      generatedAt: new Date().toISOString(),
      model: cfg.MODEL,
      status: validationFailures.length ? 'review' : 'ready-for-admin-review',
      topic,
      excerpt: excerptFromHtml(html),
      wordCount: stripTags(html).split(/\s+/).filter(Boolean).length,
      validationFailures,
      html,
    };
    const file = path.join(outDir, `${topic.slug}.json`);
    fs.writeFileSync(file, `${JSON.stringify(draft, null, 2)}\n`, 'utf8');
    if (applyDb) await upsertDbDraft(topic, html, validationFailures);
    results.push({ slug: topic.slug, status: draft.status, wordCount: draft.wordCount, file });
    console.log(`ok (${draft.wordCount} kelime, ${draft.status})`);
    await new Promise((resolve) => setTimeout(resolve, 2200));
  } catch (error) {
    results.push({ slug: topic.slug, status: 'failed', error: error.message });
    console.log(`failed: ${error.message}`);
  }
}

const summary = {
  generatedAt: new Date().toISOString(),
  applyDb,
  applyProdSsh,
  missingOnly,
  total: results.length,
  ok: results.filter((result) => result.status !== 'failed').length,
  failed: results.filter((result) => result.status === 'failed').length,
  results,
};
fs.writeFileSync(path.join(outDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`ollama-blog-drafts: completed ok=${summary.ok} failed=${summary.failed} applyDb=${applyDb}`);
