#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const draftsDir = path.join(docsDir, 'generated-blog-drafts');
const outJson = path.join(docsDir, 'blog-admin-publish-queue-report.json');
const outMd = path.join(docsDir, 'blog-admin-publish-queue-report.md');

function readJsonSafe(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function draftFiles() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs
    .readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json'))
    .filter((name) => !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => path.join(draftsDir, name));
}

const publishReadiness = readJsonSafe(path.join(docsDir, 'blog-publish-readiness-report.json'), {});
const quality = readJsonSafe(path.join(docsDir, 'blog-draft-quality-report.json'), {});
const richResults = readJsonSafe(path.join(docsDir, 'blog-draft-rich-results-report.json'), {});
const applySummary = readJsonSafe(path.join(draftsDir, 'apply-summary.json'), {});
const publishApply = readJsonSafe(path.join(docsDir, 'blog-publish-apply-report.json'), {});
const qualityBySlug = new Map((quality?.drafts || []).map((item) => [item.slug, item]));
const richBySlug = new Map((richResults?.results || []).map((item) => [item.slug, item]));
const publishedOrExistingSlugs = new Set([
  ...(Array.isArray(publishApply?.publishedSlugs) ? publishApply.publishedSlugs : []),
  ...(Array.isArray(publishApply?.updatedSlugs) ? publishApply.updatedSlugs : []),
  ...(Array.isArray(publishApply?.skipped) ? publishApply.skipped.map((item) => item.slug).filter(Boolean) : []),
]);

const drafts = draftFiles()
  .map((file) => {
    const draft = readJsonSafe(file, {});
    const slug = draft?.topic?.slug || path.basename(file, '.json');
    const html = String(draft.html || '');
    const sourceUrls = Array.isArray(draft.topic?.sourceUrls) ? draft.topic.sourceUrls : [];
    const internalLinks = Array.isArray(draft.topic?.internalLinks) ? draft.topic.internalLinks : [];
    const words = stripTags(html).split(/\s+/).filter(Boolean).length;
    const generatedAt = draft.generatedAt || null;
    const expandedAt = draft.expandedAt || null;
    const repairedAt = draft.repairedAt || null;
    return {
      slug,
      title: draft?.topic?.title || draft.title || slug,
      category: draft?.topic?.category || 'Blog',
      status: draft.status || 'unknown',
      wordCount: words,
      sourceUrlCount: sourceUrls.length,
      internalLinkCount: internalLinks.length,
      visibleSourceNote: /<h2[^>]*>\s*Kaynak ve Guncelleme Notu\s*<\/h2>/i.test(html),
      qualityStatus: qualityBySlug.get(slug)?.status || 'missing',
      richResultsStatus: richBySlug.get(slug)?.status || 'missing',
      generatedAt,
      expandedAt,
      repairedAt,
      publishUrl: `https://sanliurfa.com/blog/${slug}`,
      adminReviewChecklist: [
        'Kaynak ve tarih notu gorunur mu?',
        'Guncel saat/ucret/program iddialari resmi kaynakla uyumlu mu?',
        'Gorsel local storage alt text ile secildi mi?',
        'Yayin sonrasi sitemap ve GSC URL inspect calistirildi mi?',
      ],
    };
  })
  .sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return b.wordCount - a.wordCount;
  });

const issues = [];
const allDraftsPublishedOrExisting = drafts.length > 0 && drafts.every((draft) => publishedOrExistingSlugs.has(draft.slug));
if (!allDraftsPublishedOrExisting && publishReadiness?.status !== 'ready_for_admin_publish_review') issues.push('publish-readiness-not-ready');
if (!allDraftsPublishedOrExisting && (applySummary?.pendingBlogDrafts ?? 0) !== drafts.length) issues.push('db-apply-count-mismatch');
if (drafts.some((draft) => draft.status !== 'ready-for-admin-review')) issues.push('draft-status-not-ready');
if (drafts.some((draft) => draft.qualityStatus !== 'ok')) issues.push('quality-not-ok');
if (drafts.some((draft) => draft.richResultsStatus !== 'ok')) issues.push('rich-results-not-ok');
if (drafts.some((draft) => !draft.visibleSourceNote)) issues.push('visible-source-note-missing');
if (publishApply?.status && publishApply.status !== 'ok') issues.push('publish-apply-not-ok');
if (publishApply?.invalid > 0) issues.push('publish-invalid-drafts');

const report = {
  generatedAt: new Date().toISOString(),
  status: issues.length === 0
    ? allDraftsPublishedOrExisting
      ? 'published'
      : 'ready_for_admin_review'
    : 'review',
  policy: {
    autoPublish: false,
    adminApprovalRequired: true,
    localStorageOnly: true,
    indexingApiForBlogAllowed: false,
  },
  summary: {
    draftCount: drafts.length,
    pendingBlogDrafts: applySummary?.pendingBlogDrafts ?? 0,
    readyCount: drafts.filter((draft) => draft.status === 'ready-for-admin-review').length,
    qualityOk: drafts.filter((draft) => draft.qualityStatus === 'ok').length,
    richResultsOk: drafts.filter((draft) => draft.richResultsStatus === 'ok').length,
    publishedOrExisting: drafts.filter((draft) => publishedOrExistingSlugs.has(draft.slug)).length,
    publishApplyPublished: Number(publishApply?.published || 0),
    publishApplySkippedExisting: Number(publishApply?.skippedExisting || 0),
    minWords: Math.min(...drafts.map((draft) => draft.wordCount)),
    maxWords: Math.max(...drafts.map((draft) => draft.wordCount)),
  },
  issues,
  drafts,
  afterPublishCommands: [
    'npm run -s gsc:sitemap:submit',
    'npm run -s seo:llms-sitemap:gate',
    'npm run -s blog:publish:readiness',
  ],
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Blog Admin Publish Queue Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Drafts: ${report.summary.draftCount}`,
    `- Pending DB drafts: ${report.summary.pendingBlogDrafts}`,
    `- Quality OK: ${report.summary.qualityOk}`,
    `- Rich Results OK: ${report.summary.richResultsOk}`,
    `- Published/existing: ${report.summary.publishedOrExisting}`,
    `- Word range: ${report.summary.minWords}-${report.summary.maxWords}`,
    `- Issues: ${report.issues.join(', ') || '-'}`,
    '',
    '## Policy',
    '',
    '- Auto publish: false',
    '- Admin approval required: true',
    '- Blog post icin Google Indexing API kullanilmaz; sitemap submit + GSC URL inspect kullanilir.',
    '- CDN/object storage kullanilmaz; gorseller local storage uzerinden secilir.',
    '',
    '## Drafts',
    '',
    '| Slug | Status | Words | Quality | Rich Results | Sources |',
    '|---|---|---:|---|---|---:|',
    ...drafts.map(
      (draft) =>
        `| ${draft.slug} | ${draft.status} | ${draft.wordCount} | ${draft.qualityStatus} | ${draft.richResultsStatus} | ${draft.sourceUrlCount} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `blog-admin-publish-queue-report: ${report.status.toUpperCase()} drafts=${report.summary.draftCount} issues=${report.issues.length}`,
);
process.exit(['ready_for_admin_review', 'published'].includes(report.status) ? 0 : 1);
