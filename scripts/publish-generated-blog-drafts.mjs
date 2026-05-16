#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import pg from 'pg';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let SshClient;

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const valueArg = (name, fallback) => {
  const found = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1) : fallback;
};
const draftsDir = path.resolve(root, valueArg('--dir', 'docs/generated-blog-drafts'));
const reportJson = path.join(root, 'docs/blog-publish-apply-report.json');
const reportMd = path.join(root, 'docs/blog-publish-apply-report.md');
const dryRun = args.has('--dry-run') || !args.has('--apply');
const useProdSsh = args.has('--apply-prod-ssh') || args.has('--prod-ssh');
const markDraftsApproved = args.has('--mark-drafts-approved');
const updateExisting = args.has('--update-existing');

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
  path.join(root, '.env'),
  path.join(root, '.env.local'),
  path.join(root, '.env.production'),
  path.join(root, 'scripts/.env.scripts'),
]) {
  loadEnv(file);
}

function safeConnectionLabel(url) {
  if (!url) return null;
  return url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}

function openProdSshTunnel() {
  SshClient ||= require('ssh2').Client;
  const localPort = Number(process.env.BLOG_PUBLISH_TUNNEL_PORT || 15437);
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
  return fs
    .readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json'))
    .filter((name) => !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => {
      const draft = JSON.parse(fs.readFileSync(path.join(draftsDir, name), 'utf8'));
      return { ...draft, fileName: name };
    })
    .filter((draft) => draft?.topic?.slug && draft?.topic?.title && draft?.html);
}

function slugifyTr(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function clamp(value, max) {
  return String(value || '').trim().slice(0, max);
}

function buildExcerpt(draft) {
  const excerpt = String(draft.excerpt || '').replace(/\s+/g, ' ').trim();
  if (excerpt.length >= 90) return clamp(excerpt, 280);
  return clamp(stripHtml(draft.html), 280);
}

function buildTags(topic) {
  const tags = [
    topic.focusKeyword,
    ...(Array.isArray(topic.secondaryKeywords) ? topic.secondaryKeywords : []),
    topic.category,
    'Şanlıurfa',
  ]
    .map((tag) => String(tag || '').trim())
    .filter(Boolean);
  return [...new Set(tags)].slice(0, 10);
}

function buildClient(tunnel) {
  if (useProdSsh) {
    return {
      label: `ssh://${process.env.SSH_USER || 'sanliur'}@${process.env.SSH_HOST || '168.119.79.238'}:${process.env.SSH_PORT || 77} -> 127.0.0.1:${tunnel.localPort}`,
      client: new pg.Client({
        host: '127.0.0.1',
        port: tunnel.localPort,
        user: process.env.DB_USER || 'sanliur_sanliurfa',
        password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'sanliur_sanliurfa',
        connectionTimeoutMillis: 10000,
        application_name: 'sanliurfa-publish-generated-blog-drafts',
      }),
    };
  }

  const connectionString = process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL veya PROD_DATABASE_URL eksik');
  return {
    label: safeConnectionLabel(connectionString),
    client: new pg.Client({
      connectionString,
      connectionTimeoutMillis: 10000,
      application_name: 'sanliurfa-publish-generated-blog-drafts',
    }),
  };
}

async function getColumns(client, tableName) {
  const result = await client.query(
    `SELECT column_name, data_type, udt_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = current_schema() AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName],
  );
  return new Map(result.rows.map((row) => [row.column_name, row]));
}

async function resolveAuthorId(client) {
  if (process.env.BLOG_PUBLISH_AUTHOR_ID) return process.env.BLOG_PUBLISH_AUTHOR_ID;
  const result = await client.query(
    `SELECT id
     FROM users
     WHERE COALESCE(status, 'active') = 'active'
     ORDER BY CASE WHEN role IN ('admin', 'super_admin') THEN 0 ELSE 1 END, created_at ASC
     LIMIT 1`,
  );
  const id = result.rows[0]?.id;
  if (!id) throw new Error('blog_posts.author_id zorunlu fakat users tablosunda uygun yazar yok');
  return id;
}

async function resolveCategory(client, categoryName) {
  const name = String(categoryName || 'Rehberler').trim() || 'Rehberler';
  const slug = slugifyTr(name);
  const existing = await client.query('SELECT id, name, slug FROM blog_categories WHERE slug = $1 LIMIT 1', [slug]);
  if (existing.rows[0]) return existing.rows[0];
  return { id: null, name, slug };
}

function buildPostData(draft, authorId, category) {
  const topic = draft.topic;
  const text = stripHtml(draft.html);
  const readMinutes = Math.max(1, Math.ceil(text.split(/\s+/).filter(Boolean).length / 200));
  const tags = buildTags(topic);
  const seoDescription = clamp(buildExcerpt(draft), 156);
  const image = '/og-image.png';
  return {
    title: topic.title,
    slug: topic.slug,
    content: draft.html,
    content_html: draft.html,
    excerpt: buildExcerpt(draft),
    featured_image: image,
    cover_image: image,
    thumbnail: image,
    author_id: authorId,
    author_name: 'Şanlıurfa Rehberi',
    status: 'published',
    published: true,
    published_at: new Date(),
    updated_at: new Date(),
    category_id: category.id,
    category: category.name || topic.category || 'Rehberler',
    category_slug: category.slug || slugifyTr(topic.category || 'Rehberler'),
    is_featured: false,
    is_pinned: false,
    view_count: 0,
    like_count: 0,
    comment_count: 0,
    read_time_minutes: readMinutes,
    reading_time: readMinutes,
    seo_title: clamp(topic.title, 70),
    meta_title: clamp(topic.title, 70),
    seo_description: seoDescription,
    meta_description: seoDescription,
    seo_keywords: tags.join(', '),
    tags,
  };
}

function filteredData(data, columns) {
  const out = {};
  for (const [key, value] of Object.entries(data)) {
    if (!columns.has(key)) continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

async function insertPost(client, data) {
  const keys = Object.keys(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`);
  const values = keys.map((key) => data[key]);
  const sql = `INSERT INTO blog_posts (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id, slug`;
  const result = await client.query(sql, values);
  return result.rows[0];
}

async function updatePost(client, data, slug) {
  const keys = Object.keys(data).filter((key) => !['slug', 'created_at'].includes(key));
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`);
  const values = keys.map((key) => data[key]);
  values.push(slug);
  const sql = `UPDATE blog_posts SET ${assignments.join(', ')} WHERE slug = $${values.length} RETURNING id, slug`;
  const result = await client.query(sql, values);
  return result.rows[0];
}

function writeReport(report) {
  fs.writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    reportMd,
    [
      '# Blog Publish Apply Report',
      '',
      `- Status: ${report.status}`,
      `- Mode: ${report.dryRun ? 'dry-run' : 'apply'}`,
      `- Target: ${report.target}`,
      `- Drafts: ${report.totalDrafts}`,
      `- Published: ${report.published}`,
      `- Updated: ${report.updated}`,
      `- Skipped existing: ${report.skippedExisting}`,
      `- Invalid: ${report.invalid}`,
      `- Drafts marked approved: ${report.markedApproved}`,
      '',
      '## Published Slugs',
      ...report.publishedSlugs.map((slug) => `- ${slug}`),
      '',
      '## Skipped',
      ...report.skipped.map((item) => `- ${item.slug}: ${item.reason}`),
      '',
    ].join('\n'),
    'utf8',
  );
}

const drafts = readDrafts();
if (drafts.length === 0) throw new Error(`generated blog draft bulunamadı: ${draftsDir}`);

let tunnel = null;
let client;
let target;
const report = {
  generatedAt: new Date().toISOString(),
  status: 'blocked',
  dryRun,
  target: null,
  totalDrafts: drafts.length,
  published: 0,
  updated: 0,
  skippedExisting: 0,
  invalid: 0,
  markedApproved: 0,
  publishedSlugs: [],
  updatedSlugs: [],
  skipped: [],
};

try {
  if (useProdSsh) tunnel = await openProdSshTunnel();
  const built = buildClient(tunnel);
  client = built.client;
  target = built.label;
  report.target = target;
  await client.connect();
  const columns = await getColumns(client, 'blog_posts');
  const draftColumns = await getColumns(client, 'city_content_drafts');
  const authorId = await resolveAuthorId(client);

  await client.query('BEGIN');
  for (const draft of drafts) {
    const slug = draft.topic.slug;
    if (draft.status !== 'ready-for-admin-review' || draft.validationFailures?.length) {
      report.invalid++;
      report.skipped.push({ slug, reason: 'ready-for-admin-review degil veya validationFailures var' });
      continue;
    }

    const existing = await client.query('SELECT id, slug FROM blog_posts WHERE slug = $1 LIMIT 1', [slug]);
    const category = await resolveCategory(client, draft.topic.category);
    const data = filteredData(buildPostData(draft, authorId, category), columns);

    if (existing.rows[0] && !updateExisting) {
      report.skippedExisting++;
      report.skipped.push({ slug, reason: 'blog_posts icinde zaten var; uzerine yazilmadi' });
    } else if (existing.rows[0]) {
      if (!dryRun) await updatePost(client, data, slug);
      report.updated++;
      report.updatedSlugs.push(slug);
    } else {
      if (!dryRun) await insertPost(client, data);
      report.published++;
      report.publishedSlugs.push(slug);
    }

    if (!dryRun && markDraftsApproved && draftColumns.size > 0) {
      const payload = {
        html: draft.html,
        excerpt: buildExcerpt(draft),
        wordCount: stripHtml(draft.html).split(/\s+/).filter(Boolean).length,
        category: draft.topic.category,
        internalLinks: draft.topic.internalLinks,
        sourceUrls: draft.topic.sourceUrls,
        requiredReview: true,
        validationFailures: draft.validationFailures || [],
      };
      const seoPayload = {
        focusKeyword: draft.topic.focusKeyword,
        secondaryKeywords: draft.topic.secondaryKeywords,
        title: draft.topic.title,
        slug,
        description: buildExcerpt(draft).slice(0, 156),
        schemaType: 'BlogPosting',
      };
      const freshnessPayload = {
        generatedAt: draft.generatedAt || new Date().toISOString(),
        sourcePolicy: 'internet_research_plus_admin_review',
        autoPublish: false,
        model: draft.model || 'ollama-cloud',
        publishedAt: new Date().toISOString(),
      };
      const upsert = await client.query(
        `INSERT INTO city_content_drafts (
           draft_type, entity_key, title, slug, source_key, source_url, status,
           payload, seo_payload, freshness_payload, admin_notes, approved_at, updated_at
         )
         VALUES (
           'blog-draft', $1, $2, $3, 'internet-keyword-research', $4, 'approved',
           $5::jsonb, $6::jsonb, $7::jsonb, $8::text, NOW(), NOW()
         )
         ON CONFLICT (draft_type, entity_key)
         DO UPDATE SET
           title = EXCLUDED.title,
           slug = EXCLUDED.slug,
           source_key = EXCLUDED.source_key,
           source_url = EXCLUDED.source_url,
           status = 'approved',
           payload = EXCLUDED.payload,
           seo_payload = EXCLUDED.seo_payload,
           freshness_payload = EXCLUDED.freshness_payload,
           approved_at = COALESCE(city_content_drafts.approved_at, NOW()),
           updated_at = NOW(),
           admin_notes = CONCAT(COALESCE(city_content_drafts.admin_notes, ''), CASE WHEN COALESCE(city_content_drafts.admin_notes, '') = '' THEN '' ELSE E'\n' END, EXCLUDED.admin_notes)
         RETURNING id`,
        [
          slug,
          draft.topic.title,
          slug,
          draft.topic.sourceUrls?.[0] || null,
          JSON.stringify(payload),
          JSON.stringify(seoPayload),
          JSON.stringify(freshnessPayload),
          `blog_posts tablosuna yayinlandi: ${new Date().toISOString()}`,
        ],
      );
      report.markedApproved += upsert.rowCount || 0;
    }
  }

  if (dryRun) {
    await client.query('ROLLBACK');
  } else {
    await client.query('COMMIT');
  }

  report.status = report.invalid > 0 ? 'review_required' : 'ok';
} catch (error) {
  if (client) await client.query('ROLLBACK').catch(() => {});
  report.status = 'failed';
  report.error = error instanceof Error ? error.message : String(error);
  writeReport(report);
  throw error;
} finally {
  if (client) await client.end().catch(() => {});
  if (tunnel) {
    tunnel.server.close();
    tunnel.ssh.end();
  }
}

writeReport(report);
console.log(
  `blog-publish-generated-drafts: ${report.status} mode=${dryRun ? 'dry-run' : 'apply'} published=${report.published} updated=${report.updated} skippedExisting=${report.skippedExisting} invalid=${report.invalid}`,
);
