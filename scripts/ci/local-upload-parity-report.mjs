#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const root = process.cwd();
const uploadsRoot = path.join(root, 'public', 'uploads');
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'local-upload-parity-report.json');
const outMd = path.join(docsDir, 'local-upload-parity-report.md');
const skipDb = process.argv.includes('--skip-db') || process.env.UPLOAD_PARITY_SKIP_DB === '1';
const uploadSoftLimitMb = Number.parseInt(process.env.LOCAL_UPLOAD_SOFT_LIMIT_MB || '512', 10);
const quotaAdvisoryPercent = Number.parseInt(process.env.LOCAL_UPLOAD_ADVISORY_PERCENT || '70', 10);
const quotaReviewPercent = Number.parseInt(process.env.LOCAL_UPLOAD_REVIEW_PERCENT || '85', 10);
const quotaBlockerPercent = Number.parseInt(process.env.LOCAL_UPLOAD_BLOCKER_PERCENT || '95', 10);

const bucketOwnership = {
  places: {
    owner: 'place media',
    sourceOfTruth: 'src/data place records and DB place media rows',
    reviewRule: 'Slug, route and DB media ownership must be verified before archive/delete.',
  },
  blog: {
    owner: 'blog content',
    sourceOfTruth: 'blog_posts and source page references',
    reviewRule: 'Blog body, OG image and schema references must be verified before archive/delete.',
  },
  blogs: {
    owner: 'blog content',
    sourceOfTruth: 'blog_posts, generated blog drafts and source page references',
    reviewRule: 'Blog body, OG image and schema references must be verified before archive/delete.',
  },
  events: {
    owner: 'event content',
    sourceOfTruth: 'events/event submissions and source page references',
    reviewRule: 'Event status and historical route references must be verified before archive/delete.',
  },
  recipes: {
    owner: 'recipe content',
    sourceOfTruth: 'recipe data and source page references',
    reviewRule: 'Recipe page, schema image and related content references must be verified before archive/delete.',
  },
  historical: {
    owner: 'city history content',
    sourceOfTruth: 'historical/city guide source references',
    reviewRule: 'City guide, district guide and OG references must be verified before archive/delete.',
  },
  root: {
    owner: 'shared uploads',
    sourceOfTruth: 'source references and DB media references',
    reviewRule: 'Root upload files need manual ownership classification before archive/delete.',
  },
};

const textExtensions = new Set([
  '.astro',
  '.css',
  '.cjs',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
]);

const localStorageConventionBuckets = new Set(['places', 'blogs', 'events', 'recipes', 'historical']);
const safeUploadSlugRe = /^[\p{Letter}\p{Number}][\p{Letter}\p{Number}-]*(?:-\d+)?$/u;

const excludedDirs = new Set([
  '.git',
  '.astro',
  '.vercel',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

function bytesToMb(bytes) {
  return Number((bytes / 1024 / 1024).toFixed(2));
}

function bytesToKb(bytes) {
  return Number((bytes / 1024).toFixed(0));
}

function toRel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function classifyUpload(filePath) {
  const parts = filePath.split('/');
  return parts[2] || 'root';
}

function conventionManagedSource(filePath) {
  const parts = filePath.split('/');
  const bucket = parts[2] || '';
  const fileName = parts.at(-1) || '';
  const ext = path.extname(fileName).toLowerCase();
  const slug = fileName.slice(0, -ext.length);
  if (!localStorageConventionBuckets.has(bucket)) return null;
  if (!['.avif', '.gif', '.jpg', '.jpeg', '.png', '.svg', '.webp'].includes(ext)) return null;
  if (!safeUploadSlugRe.test(slug)) return null;
  return `local-storage-convention:${bucket}/${slug}${ext}`;
}

function summarizeBy(files, keyFn, referenced) {
  const map = new Map();
  for (const file of files) {
    const key = keyFn(file);
    const current = map.get(key) || {
      key,
      fileCount: 0,
      totalBytes: 0,
      referencedCount: 0,
      candidateCount: 0,
    };
    current.fileCount += 1;
    current.totalBytes += file.sizeBytes;
    if (referenced.has(file.path)) current.referencedCount += 1;
    else current.candidateCount += 1;
    map.set(key, current);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      totalMb: bytesToMb(item.totalBytes),
    }))
    .sort((a, b) => b.totalBytes - a.totalBytes || a.key.localeCompare(b.key));
}

function quotaStatus(usedPercent) {
  if (usedPercent >= quotaBlockerPercent) return 'blocker';
  if (usedPercent >= quotaReviewPercent) return 'review';
  if (usedPercent >= quotaAdvisoryPercent) return 'advisory';
  return 'ok';
}

function reportStatus(missingRefCount, quota) {
  if (missingRefCount > 0 || quota.status === 'blocker') return 'blocked';
  if (quota.status === 'review' || quota.status === 'advisory') return 'review';
  return 'ok';
}

function listFiles(dir, bucket = []) {
  if (!fs.existsSync(dir)) return bucket;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(absolute, bucket);
      continue;
    }
    if (entry.isFile()) bucket.push(absolute);
  }
  return bucket;
}

function walkTextFiles(dir, bucket = []) {
  if (!fs.existsSync(dir)) return bucket;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excludedDirs.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    const normalized = absolute.replace(/\\/g, '/');
    if (absolute.startsWith(uploadsRoot)) continue;
    if (normalized.includes('/__tests__/') || /\.test\.[cm]?[tj]sx?$/i.test(entry.name)) continue;
    if (entry.isDirectory()) {
      walkTextFiles(absolute, bucket);
      continue;
    }
    if (entry.isFile() && textExtensions.has(path.extname(entry.name).toLowerCase())) {
      bucket.push(absolute);
    }
  }
  return bucket;
}

function normalizeUploadReference(raw) {
  const cleaned = String(raw || '')
    .replace(/\\/g, '/')
    .replace(/^https?:\/\/[^/]+/i, '')
    .replace(/^public\//, '')
    .replace(/^\/+/, '')
    .replace(/[)"'`,.;\]]+$/g, '');
  const index = cleaned.indexOf('uploads/');
  if (index === -1) return null;
  const ref = `public/${cleaned.slice(index)}`;
  if (!/\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(ref)) return null;
  return ref;
}

function extractUploadReferences(text) {
  const refs = new Set();
  const patterns = [
    /(?:public\/uploads|\/uploads|uploads)\/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]+\.(?:avif|gif|jpe?g|png|svg|webp)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const ref = normalizeUploadReference(match[0].split(/[?#]/)[0]);
      if (ref) refs.add(ref);
    }
  }
  return refs;
}

function scanSourceReferences() {
  const refs = new Map();
  for (const file of walkTextFiles(path.join(root, 'src'))) {
    let text = '';
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const ref of extractUploadReferences(text)) {
      const current = refs.get(ref) || [];
      current.push(toRel(file));
      refs.set(ref, current);
    }
  }
  return refs;
}

const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'sanliurfa'}`;

async function scanDbReferences() {
  if (skipDb) {
    return { status: 'skipped', detail: 'UPLOAD_PARITY_SKIP_DB=1 or --skip-db', refs: new Map() };
  }

  const refs = new Map();
  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 1,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: true,
  });

  try {
    const columns = await pool.query(`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('text', 'character varying', 'json', 'jsonb')
      ORDER BY table_name, column_name
    `);

    for (const column of columns.rows) {
      const sql = `
        SELECT ${JSON.stringify(column.column_name)}::text AS value
        FROM ${JSON.stringify(column.table_schema)}.${JSON.stringify(column.table_name)}
        WHERE ${JSON.stringify(column.column_name)}::text LIKE '%uploads/%'
        LIMIT 500
      `.replaceAll('"', '"');
      let rows = [];
      try {
        rows = (await pool.query(sql)).rows;
      } catch {
        continue;
      }
      for (const row of rows) {
        for (const ref of extractUploadReferences(row.value || '')) {
          const current = refs.get(ref) || [];
          current.push(`${column.table_schema}.${column.table_name}.${column.column_name}`);
          refs.set(ref, current);
        }
      }
    }

    return { status: 'ok', detail: '', refs };
  } catch (error) {
    return {
      status: 'unavailable',
      detail: error instanceof Error ? error.message : String(error),
      refs,
    };
  } finally {
    await pool.end().catch(() => null);
  }
}

function writeReport(report) {
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const lines = [
    '# Local Upload Parity Report',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- DB scan: ${report.db.status}${report.db.detail ? ` (${report.db.detail})` : ''}`,
    `- Upload files: ${report.summary.uploadFileCount}`,
    `- Upload total: ${report.summary.uploadTotalMb} MB`,
    `- Upload soft limit: ${report.quota.softLimitMb} MB (${report.quota.status}, ${report.quota.usedPercent}%)`,
    `- Quota thresholds: advisory ${report.quota.thresholds.advisoryPercent}%, review ${report.quota.thresholds.reviewPercent}%, blocker ${report.quota.thresholds.blockerPercent}%`,
    `- Source referenced files: ${report.summary.sourceReferencedFileCount}`,
    `- DB referenced files: ${report.summary.dbReferencedFileCount}`,
    `- Local storage convention managed files: ${report.summary.conventionManagedFileCount}`,
    `- Unreferenced candidate files: ${report.summary.unreferencedCandidateCount}`,
    `- Missing referenced files: ${report.summary.missingReferencedFileCount}`,
    '',
    '## Missing Referenced Files',
    '',
    '| Path | Sources |',
    '|---|---|',
    ...report.missingReferencedFiles.map((item) => `| \`${item.path}\` | ${item.sources.join(', ')} |`),
    '',
    '## Unreferenced Candidate Sample',
    '',
    '| Path | Size KB |',
    '|---|---:|',
    ...report.unreferencedCandidates.map((item) => `| \`${item.path}\` | ${item.sizeKb} |`),
    '',
    '## Candidate Summary By Bucket',
    '',
    '| Bucket | Total MB | Files | Referenced | Candidates |',
    '|---|---:|---:|---:|---:|',
    ...report.byBucket.map((item) => `| ${item.key} | ${item.totalMb} | ${item.fileCount} | ${item.referencedCount} | ${item.candidateCount} |`),
    '',
    '## Bucket Ownership Model',
    '',
    '| Bucket | Owner | Source of truth | Review rule |',
    '|---|---|---|---|',
    ...report.ownershipModel.map((item) => `| ${item.bucket} | ${item.owner} | ${item.sourceOfTruth} | ${item.reviewRule} |`),
    '',
    '## Candidate Summary By Extension',
    '',
    '| Extension | Total MB | Files | Referenced | Candidates |',
    '|---|---:|---:|---:|---:|',
    ...report.byExtension.map((item) => `| ${item.key} | ${item.totalMb} | ${item.fileCount} | ${item.referencedCount} | ${item.candidateCount} |`),
    '',
    '## Largest Upload Files',
    '',
    '| Path | Size MB | Referenced |',
    '|---|---:|---|',
    ...report.largestFiles.map((item) => `| \`${item.path}\` | ${item.sizeMb} | ${item.referenced ? 'yes' : 'candidate'} |`),
    '',
    'Not: Bu rapor dosya silmez. Unreferenced candidate dosyalar DB ve kaynak referanslarıyla ek gözlem sonrası arşiv/silme adayına alınır.',
    '',
  ];

  fs.writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');
}

const uploadFiles = listFiles(uploadsRoot).map((filePath) => {
  const stat = fs.statSync(filePath);
  return {
    path: toRel(filePath),
    sizeBytes: stat.size,
    sizeKb: Number((stat.size / 1024).toFixed(0)),
    sizeMb: bytesToMb(stat.size),
  };
});
const uploadPathSet = new Set(uploadFiles.map((file) => file.path));
const sourceRefs = scanSourceReferences();
const dbScan = await scanDbReferences();
const allRefs = new Map();

for (const [ref, sources] of sourceRefs) {
  allRefs.set(ref, [...(allRefs.get(ref) || []), ...sources.map((source) => `source:${source}`)]);
}
for (const [ref, sources] of dbScan.refs) {
  allRefs.set(ref, [...(allRefs.get(ref) || []), ...sources.map((source) => `db:${source}`)]);
}

const sourceReferenced = new Set([...sourceRefs.keys()].filter((ref) => uploadPathSet.has(ref)));
const dbReferenced = new Set([...dbScan.refs.keys()].filter((ref) => uploadPathSet.has(ref)));
const conventionManaged = new Set();
for (const file of uploadFiles) {
  const source = conventionManagedSource(file.path);
  if (!source) continue;
  conventionManaged.add(file.path);
  allRefs.set(file.path, [...(allRefs.get(file.path) || []), source]);
}
const referenced = new Set([...sourceReferenced, ...dbReferenced, ...conventionManaged]);
const missingReferencedFiles = [...allRefs.entries()]
  .filter(([ref]) => !uploadPathSet.has(ref))
  .map(([ref, sources]) => ({ path: ref, sources: [...new Set(sources)].slice(0, 10) }))
  .sort((a, b) => a.path.localeCompare(b.path))
  .slice(0, 50);
const unreferencedCandidates = uploadFiles
  .filter((file) => !referenced.has(file.path))
  .sort((a, b) => b.sizeBytes - a.sizeBytes)
  .slice(0, 50);
const unreferencedCandidateInventory = uploadFiles
  .filter((file) => !referenced.has(file.path))
  .sort((a, b) => b.sizeBytes - a.sizeBytes || a.path.localeCompare(b.path));
const byBucket = summarizeBy(uploadFiles, (file) => classifyUpload(file.path), referenced);
const byExtension = summarizeBy(
  uploadFiles,
  (file) => path.extname(file.path).toLowerCase() || '(none)',
  referenced,
);
const uploadTotalBytes = uploadFiles.reduce((sum, file) => sum + file.sizeBytes, 0);
const usedMb = bytesToMb(uploadTotalBytes);
const usedPercent = Number(((uploadTotalBytes / 1024 / 1024 / uploadSoftLimitMb) * 100).toFixed(1));
const quota = {
  softLimitMb: uploadSoftLimitMb,
  usedMb,
  usedPercent,
  status: quotaStatus(usedPercent),
  withinSoftLimit: usedMb <= uploadSoftLimitMb,
  thresholds: {
    advisoryPercent: quotaAdvisoryPercent,
    reviewPercent: quotaReviewPercent,
    blockerPercent: quotaBlockerPercent,
  },
};

const report = {
  generatedAt: new Date().toISOString(),
  status: reportStatus(missingReferencedFiles.length, quota),
  db: {
    status: dbScan.status,
    detail: dbScan.detail,
    referencedFileCount: dbReferenced.size,
  },
  summary: {
    uploadFileCount: uploadFiles.length,
    uploadTotalMb: usedMb,
    uploadTotalKb: bytesToKb(uploadTotalBytes),
    sourceReferencedFileCount: sourceReferenced.size,
    dbReferencedFileCount: dbReferenced.size,
    conventionManagedFileCount: conventionManaged.size,
    unreferencedCandidateCount: uploadFiles.length - referenced.size,
    missingReferencedFileCount: missingReferencedFiles.length,
  },
  quota,
  missingReferencedFiles,
  unreferencedCandidates,
  unreferencedCandidateInventory,
  byBucket,
  byExtension,
  ownershipModel: byBucket.map((bucket) => ({
    bucket: bucket.key,
    ...(bucketOwnership[bucket.key] || {
      owner: 'unclassified local upload bucket',
      sourceOfTruth: 'source references and DB media references',
      reviewRule: 'Classify ownership before archive/delete; automatic deletion is not allowed.',
    }),
    totalMb: bucket.totalMb,
    fileCount: bucket.fileCount,
    candidateCount: bucket.candidateCount,
  })),
  largestFiles: uploadFiles
    .slice()
    .sort((a, b) => b.sizeBytes - a.sizeBytes)
    .slice(0, 25)
    .map((file) => ({
      path: file.path,
      sizeMb: file.sizeMb,
      referenced: referenced.has(file.path),
    })),
};

writeReport(report);

console.log(
  `local-upload-parity-report: ${report.status.toUpperCase()} (${report.summary.uploadFileCount} files, ${report.summary.missingReferencedFileCount} missing refs, ${report.summary.unreferencedCandidateCount} unreferenced candidates)`,
);
