#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { BLOG_KEYWORD_OPPORTUNITIES } from '../data/blog-keyword-opportunities.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'blog-keyword-research-report.json');
const outMd = path.join(docsDir, 'blog-keyword-research-report.md');
const topicOut = path.join(root, 'scripts', 'blog-keyword-topics.json');
const prodInventoryPath = path.join(docsDir, 'prod-blog-inventory.json');
const generatedDraftsDir = path.join(docsDir, 'generated-blog-drafts');

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

function readJsonSafe(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function runOutput(command) {
  try {
    return execSync(command, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    }).trim();
  } catch (error) {
    return `${error.stdout || ''}\n${error.stderr || ''}`.trim();
  }
}

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('tr-TR')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(a, b) {
  const left = new Set(normalize(a).split(' ').filter(Boolean));
  const right = new Set(normalize(b).split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;
  let common = 0;
  for (const token of left) if (right.has(token)) common++;
  return common / Math.max(left.size, right.size);
}

const prodInventory = readJsonSafe(prodInventoryPath, { rows: [] });
const existingRows = Array.isArray(prodInventory?.rows) ? prodInventory.rows : [];
function generatedDraftRows() {
  if (!fs.existsSync(generatedDraftsDir)) return [];
  return fs.readdirSync(generatedDraftsDir)
    .filter((name) => name.endsWith('.json') && !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => readJsonSafe(path.join(generatedDraftsDir, name), null))
    .filter((draft) => draft?.topic?.slug)
    .map((draft) => ({
      slug: draft.topic.slug,
      title: draft.topic.title,
      status: draft.status || 'generated-draft',
    }));
}

const draftRows = generatedDraftRows();
const comparableRows = [...existingRows, ...draftRows];
const existingSlugs = new Set(comparableRows.map((row) => String(row.slug || '')));

const deduped = BLOG_KEYWORD_OPPORTUNITIES.map((topic) => {
  const exactSlug = existingSlugs.has(topic.slug);
  const closest = comparableRows
    .map((row) => ({
      slug: row.slug,
      title: row.title,
      score: Math.max(similarity(topic.title, row.title), similarity(topic.focusKeyword, row.title)),
    }))
    .sort((a, b) => b.score - a.score)[0] || null;

  const duplicateRisk = exactSlug || Number(closest?.score || 0) >= 0.72;
  return {
    ...topic,
    duplicateRisk,
    duplicateReason: exactSlug
      ? 'exact-slug'
      : duplicateRisk
        ? `near-title:${closest?.slug || 'unknown'}`
        : null,
    closestExisting: closest,
  };
});

const selectedTopics = deduped
  .filter((topic) => !topic.duplicateRisk)
  .sort((a, b) => b.priority - a.priority);

const gcloudVersion = runOutput('gcloud --version');
const activeProject = runOutput('gcloud config get-value project');
const enabledServicesRaw = runOutput('gcloud services list --enabled --project=sanliurfa-com-2026 --format="value(config.name)"');
const enabledServices = enabledServicesRaw.split(/\r?\n/).filter(Boolean);
const requiredServices = [
  'googleads.googleapis.com',
  'customsearch.googleapis.com',
  'searchconsole.googleapis.com',
  'pagespeedonline.googleapis.com',
  'siteverification.googleapis.com',
  'indexing.googleapis.com',
  'analytics.googleapis.com',
  'analyticsdata.googleapis.com',
];

const googleAdsEnv = {
  developerToken: Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
  customerId: Boolean(process.env.GOOGLE_ADS_CUSTOMER_ID),
  loginCustomerId: Boolean(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID),
  clientId: Boolean(process.env.GOOGLE_ADS_CLIENT_ID),
  clientSecret: Boolean(process.env.GOOGLE_ADS_CLIENT_SECRET),
  refreshToken: Boolean(process.env.GOOGLE_ADS_REFRESH_TOKEN),
};
const googleAdsReady = Object.values(googleAdsEnv).every(Boolean);
const coverageComplete = selectedTopics.length === 0 && deduped.length > 0 && deduped.every((topic) => topic.duplicateRisk);

const report = {
  generatedAt: new Date().toISOString(),
  status: selectedTopics.length > 0 || coverageComplete ? 'ok' : 'review',
  sourcePolicy: {
    language: 'tr',
    noDuplicateProdBlogs: true,
    autoPublish: false,
    exactSearchVolumeRequiresGoogleAdsApi: true,
    volumeFallback: googleAdsReady ? 'google-ads-api-ready' : 'intent-priority-and-coverage-gap',
  },
  googleCloud: {
    gcloudInstalled: /Google Cloud SDK/i.test(gcloudVersion),
    activeProject,
    targetProject: 'sanliurfa-com-2026',
    requiredServices: Object.fromEntries(requiredServices.map((service) => [service, enabledServices.includes(service)])),
  },
  googleAds: {
    ready: googleAdsReady,
    env: googleAdsEnv,
    note: googleAdsReady
      ? 'Google Ads KeywordPlanIdeaService ile hacim entegrasyonu hazır değişkenlere sahip.'
      : 'Arama hacmi için Google Ads developer token, customer id ve OAuth bilgileri gerekir; Google Cloud CLI tek başına hacim vermez.',
  },
    prodBlogInventory: {
    path: 'docs/prod-blog-inventory.json',
    total: Number(prodInventory?.total || existingRows.length || 0),
    loadedRows: existingRows.length,
  },
  generatedDraftInventory: {
    path: 'docs/generated-blog-drafts',
    total: draftRows.length,
    loadedRows: draftRows.length,
  },
  summary: {
    totalCandidates: BLOG_KEYWORD_OPPORTUNITIES.length,
    selected: selectedTopics.length,
    duplicateRisk: deduped.filter((topic) => topic.duplicateRisk).length,
    coverageComplete,
  },
  selectedTopics,
  skippedTopics: deduped.filter((topic) => topic.duplicateRisk),
};

const md = [
  '# Blog Keyword Research Report',
  '',
  `- Status: ${report.status}`,
  `- Generated: ${report.generatedAt}`,
  `- Prod published total: ${report.prodBlogInventory.total}`,
  `- Candidate topics: ${report.summary.totalCandidates}`,
  `- Selected topics: ${report.summary.selected}`,
  `- Duplicate-risk skipped: ${report.summary.duplicateRisk}`,
  `- Google Cloud project: ${report.googleCloud.activeProject}`,
  `- Google Ads volume ready: ${report.googleAds.ready ? 'yes' : 'no'}`,
  '',
  '## Selected Topics',
  '',
  ...selectedTopics.map((topic, index) => [
    `### ${index + 1}. ${topic.title}`,
    `- Priority: ${topic.priority}`,
    `- Focus keyword: ${topic.focusKeyword}`,
    `- Intent: ${topic.intent}`,
    `- Internal links: ${topic.internalLinks.join(', ')}`,
    `- Sources: ${topic.sourceUrls.join(', ')}`,
    '',
  ].join('\n')),
  '## Google Ads / Keyword Volume Note',
  '',
  'Google Ads API KeywordPlanIdeaService hacim ve historical metrics döndürebilir; bunun için Google Ads developer token, customer id ve OAuth refresh token gerekir. Bu rapor, bu bilgiler yoksa hacim yerine intent önceliği + prod coverage gap kullanır.',
  '',
].join('\n');

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(outMd, md, 'utf8');
fs.writeFileSync(topicOut, `${JSON.stringify(selectedTopics, null, 2)}\n`, 'utf8');

console.log(`blog-keyword-research-report: ${report.status.toUpperCase()} selected=${selectedTopics.length} skipped=${report.summary.duplicateRisk}`);
