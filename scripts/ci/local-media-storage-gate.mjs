#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'local-media-storage-gate.json');
const outMd = path.join(docsDir, 'local-media-storage-gate.md');
const liveBaseUrl = process.env.SITE_URL || process.env.PROD_BASE_URL || 'https://sanliurfa.com';

const checks = [
  {
    file: 'src/lib/security/security-headers.ts',
    patterns: [/cdn\.jsdelivr\.net/i],
  },
  {
    file: 'src/lib/security/xss.ts',
    patterns: [/unpkg\.com/i, /cdn\.quilljs\.com/i],
  },
  {
    file: 'src/layouts/Layout.astro',
    patterns: [/Remote image CDN/i],
  },
  {
    file: 'src/pages/api/admin/performance/summary.ts',
    patterns: [/CDN kontrol/i],
  },
  {
    file: 'src/lib/deployment/index.ts',
    patterns: [/CDN configuration/i],
  },
  {
    file: 'docs/CDN_CACHE_RULES.md',
    patterns: [/Cloudflare/i, /Edge TTL/i, /Page Rules/i],
  },
  {
    file: 'scripts/cache-warmup.sh',
    patterns: [/CF-Cache-Status/i, /Checking CDN cache status/i, /CDN Status:/i],
  },
  {
    file: 'scripts/deploy-client-chunks.mjs',
    patterns: [/self-hosted CDN/i],
  },
  {
    file: 'src/middleware.ts',
    patterns: [/self-hosted CDN/i],
  },
  {
    file: 'src/pages/llms-full.txt.ts',
    patterns: [/24h CDN/i],
  },
  {
    file: 'src/pages/og/[slug].png.ts',
    patterns: [/1 gun CDN/i],
  },
  {
    file: 'src/pages/api/docs/openapi.json.ts',
    patterns: [/CDN URL listesi/i],
  },
  {
    file: 'src/lib/audit/index.ts',
    patterns: [/file\/S3/i],
  },
];

const failures = [];

for (const check of checks) {
  const absolute = path.join(root, check.file);
  const text = fs.readFileSync(absolute, 'utf8');
  for (const pattern of check.patterns) {
    if (pattern.test(text)) {
      failures.push(`${check.file}: forbidden pattern ${pattern}`);
    }
  }
}

async function head(url) {
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
    return {
      url,
      status: response.status,
      ok: response.status >= 200 && response.status < 400,
      cacheControl: response.headers.get('cache-control'),
      contentType: response.headers.get('content-type'),
      server: response.headers.get('server'),
      source: 'live-head',
    };
  } catch (error) {
    return {
      url,
      status: null,
      ok: false,
      cacheControl: null,
      contentType: null,
      server: null,
      source: 'live-head',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const liveChecks = await Promise.all(
  [
    '/images/home/collage/balikligol.avif',
    '/images/home/collage/gobeklitepe.avif',
    '/images/home/collage/harran.avif',
    '/images/home/collage/halfeti.avif',
    '/uploads/recipes/kaburga-dolmasi.jpg',
  ].map((pathname) => head(new URL(pathname, liveBaseUrl).toString())),
);

const localPaths = [
  'public/images',
  'public/uploads',
  'dist/client/_astro',
  'dist/client/images',
].map((rel) => ({
  path: rel,
  exists: fs.existsSync(path.join(root, rel)),
}));

const liveResolvable = liveChecks.every((item) => item.ok || item.url.includes('/uploads/'));
const status = failures.length > 0 || !liveResolvable ? 'failed' : 'ok';
const report = {
  generatedAt: new Date().toISOString(),
  status,
  localStorageOnly: true,
  externalObjectStorageConfigured: false,
  policy: {
    cdnOrObjectStorageAllowed: false,
    mediaSourceOfTruth: ['public/images', 'public/uploads'],
    generatedAssets: ['dist/client/_astro', 'dist/client/images'],
    automaticDeleteAllowed: false,
  },
  scannedFiles: checks.map((check) => check.file),
  failures,
  localPaths,
  liveBaseUrl,
  liveChecks,
  notes: [
    'Medya dosyalari local filesystem kaynakli pathlerden servis edilir.',
    'Browser cache header degeri hosting/proxy katmaninda degisebilir; bu depolama modelini degistirmez.',
    'Dis nesne depolama veya ucuncu parti medya dagitim servisi kullanilmaz.',
  ],
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Local Media Storage Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Local storage only: ${report.localStorageOnly ? 'yes' : 'no'}`,
    `- External object storage configured: ${report.externalObjectStorageConfigured ? 'yes' : 'no'}`,
    '',
    '## Local Paths',
    '',
    '| Path | Exists |',
    '|---|---|',
    ...report.localPaths.map((item) => `| \`${item.path}\` | ${item.exists ? 'yes' : 'no'} |`),
    '',
    '## Live Checks',
    '',
    '| URL | Status | Cache-Control | Content-Type | Server |',
    '|---|---:|---|---|---|',
    ...report.liveChecks.map(
      (item) =>
        `| ${item.url} | ${item.status ?? 'n/a'} | ${item.cacheControl ?? ''} | ${item.contentType ?? ''} | ${item.server ?? ''} |`,
    ),
    '',
    '## Notes',
    '',
    ...report.notes.map((note) => `- ${note}`),
    '',
  ].join('\n'),
  'utf8',
);

if (failures.length > 0) {
  console.error('[local-media-storage-gate] FAILED');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

if (!liveResolvable) {
  console.error('[local-media-storage-gate] FAILED');
  console.error('- live local media path resolution failed');
  process.exit(1);
}

console.log(`[local-media-storage-gate] ${status}`);
