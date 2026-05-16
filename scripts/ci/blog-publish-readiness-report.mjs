#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'blog-publish-readiness-report.json');
const outMd = path.join(docsDir, 'blog-publish-readiness-report.md');

function readJsonSafe(rel, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

const applySummary = readJsonSafe('docs/generated-blog-drafts/apply-summary.json', {});
const publishApply = readJsonSafe('docs/blog-publish-apply-report.json', {});
const richResults = readJsonSafe('docs/blog-draft-rich-results-report.json', {});
const draftQuality = readJsonSafe('docs/blog-draft-quality-report.json', {});
const llmsSitemap = readJsonSafe('docs/llms-sitemap-auto-update-gate.json', {});
const keywordResearch = readJsonSafe('docs/blog-keyword-research-report.json', {});

const richOkSlugs = new Set(
  Array.isArray(richResults?.results)
    ? richResults.results.filter((item) => item.status === 'ok').map((item) => item.slug)
    : [],
);
const publishedOrExistingSlugs = new Set([
  ...(Array.isArray(publishApply?.publishedSlugs) ? publishApply.publishedSlugs : []),
  ...(Array.isArray(publishApply?.updatedSlugs) ? publishApply.updatedSlugs : []),
  ...(Array.isArray(publishApply?.skipped) ? publishApply.skipped.map((item) => item?.slug).filter(Boolean) : []),
]);
const selectedTopics = Array.isArray(keywordResearch?.selectedTopics) ? keywordResearch.selectedTopics : [];
const draftDir = path.join(root, 'docs', 'generated-blog-drafts');
const draftFiles = fs.existsSync(draftDir)
  ? fs.readdirSync(draftDir).filter((name) => name.endsWith('.json') && !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
  : [];

const drafts = draftFiles.map((name) => {
  const draft = readJsonSafe(path.join('docs', 'generated-blog-drafts', name), {});
  const slug = draft?.topic?.slug || name.replace(/\.json$/, '');
  return {
    slug,
    title: draft?.topic?.title || slug,
    wordCount: draft?.wordCount ?? 0,
    status: draft?.status || 'unknown',
    richResultsOk: richOkSlugs.has(slug),
    publishedOrExisting: publishedOrExistingSlugs.has(slug),
    autoPublish: draft?.freshness_payload?.autoPublish ?? false,
    adminReviewRequired: true,
    publishUrl: `https://sanliurfa.com/blog/${slug}`,
    gscAfterPublish: {
      sitemapSubmitCommand: 'npm run -s gsc:sitemap:submit',
      urlInspectCommand: `npm run -s gsc:url:inspect -- https://sanliurfa.com/blog/${slug}`,
      indexingApiAllowed: false,
      indexingApiReason: 'Google Indexing API sadece JobPosting/BroadcastEvent icin guvenli; blog post icin sitemap/GSC inspect kullanilmali.',
    },
  };
});

const issues = [];
const allDraftsPublishedOrExisting =
  drafts.length > 0 && drafts.every((draft) => publishedOrExistingSlugs.has(draft.slug));
if (!allDraftsPublishedOrExisting && (applySummary?.pendingBlogDrafts ?? 0) <= 0) {
  issues.push('no-pending-blog-drafts');
}
if (applySummary?.autoPublish !== false) issues.push('autopublish-not-false');
if (richResults?.status !== 'ok') issues.push('rich-results-not-ok');
if (draftQuality?.status !== 'ok') issues.push('draft-quality-not-ok');
if (llmsSitemap?.status !== 'ok') issues.push('llms-sitemap-not-ok');
if (drafts.some((draft) => !draft.richResultsOk)) issues.push('draft-rich-results-missing');
if (drafts.some((draft) => draft.wordCount < 1200)) issues.push('draft-word-count-under-1200');
if (
  publishApply?.status &&
  !['ok', 'dry-run'].includes(publishApply.status) &&
  !allDraftsPublishedOrExisting
) {
  issues.push('publish-apply-not-ok');
}
if (publishApply?.invalid && publishApply.invalid > 0) issues.push('publish-apply-invalid-drafts');

const status =
  issues.length === 0
    ? allDraftsPublishedOrExisting
      ? 'published'
      : 'ready_for_admin_publish_review'
    : 'review';

const report = {
  generatedAt: new Date().toISOString(),
  status,
  policy: {
    autoPublish: false,
    adminReviewRequired: true,
    localStorageOnly: true,
    indexingApiForBlogAllowed: false,
    sitemapAndLlmsAutoUpdateRequired: true,
  },
  summary: {
    pendingBlogDrafts: allDraftsPublishedOrExisting ? 0 : (applySummary?.pendingBlogDrafts ?? 0),
    sourcePendingBlogDrafts: applySummary?.pendingBlogDrafts ?? 0,
    appliedDrafts: applySummary?.applied ?? 0,
    localDraftFiles: drafts.length,
    publishedOrExisting: drafts.filter((draft) => draft.publishedOrExisting).length,
    publishApplyPublished: publishApply?.published ?? 0,
    publishApplyUpdated: publishApply?.updated ?? 0,
    publishApplySkippedExisting: publishApply?.skippedExisting ?? 0,
    publishApplyInvalid: publishApply?.invalid ?? 0,
    richResultsOk: richResults?.summary?.ok ?? 0,
    draftQualityOk: draftQuality?.summary?.ok ?? 0,
    selectedTopics: selectedTopics.length,
    llmsSitemapStatus: llmsSitemap?.status ?? 'not-run',
  },
  issues,
  drafts,
  publishChecklist: [
    'Admin editor icerigi ve kaynak notlarini kontrol eder.',
    'Gorsel/alt text ve local storage referanslari kontrol edilir.',
    'Publish sonrasi /sitemap-blog.xml, /sitemap.xml, /llms.txt ve /llms-full.txt dinamik olarak yansir.',
    'Publish sonrasi GSC sitemap submit ve URL inspect kullanilir.',
    'Blog postlar icin Google Indexing API kullanilmaz.',
  ],
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Blog Publish Readiness Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Pending blog drafts: ${report.summary.pendingBlogDrafts}`,
    `- Local draft files: ${report.summary.localDraftFiles}`,
    `- Published or existing: ${report.summary.publishedOrExisting}`,
    `- Publish apply: published=${report.summary.publishApplyPublished}, updated=${report.summary.publishApplyUpdated}, skipped-existing=${report.summary.publishApplySkippedExisting}, invalid=${report.summary.publishApplyInvalid}`,
    `- Rich results OK: ${report.summary.richResultsOk}`,
    `- Draft quality OK: ${report.summary.draftQualityOk}`,
    `- LLMS/Sitemap: ${report.summary.llmsSitemapStatus}`,
    '',
    '## Policy',
    '',
    '- Auto publish: false',
    '- Admin review required: true',
    '- Blog post için Google Indexing API kullanılmaz; sitemap submit + URL inspect kullanılır.',
    '',
    '## Drafts',
    '',
    '| Slug | Status | Words | Rich Results | Published/Existing |',
    '|---|---|---:|---|---|',
    ...drafts.map((draft) => `| ${draft.slug} | ${draft.status} | ${draft.wordCount} | ${draft.richResultsOk ? 'ok' : 'review'} | ${draft.publishedOrExisting ? 'yes' : 'no'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`blog-publish-readiness-report: ${report.status.toUpperCase()} drafts=${drafts.length} issues=${issues.length}`);
process.exit(['ready_for_admin_publish_review', 'published'].includes(report.status) ? 0 : 1);
