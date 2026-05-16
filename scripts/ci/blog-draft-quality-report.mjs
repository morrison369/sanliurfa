#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BLOG_CONTENT_POLICY, headingCounts, stripTags, validateBlogHeadingPolicy, wordCount } from '../blog-content-policy.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const draftsDir = path.join(docsDir, 'generated-blog-drafts');
const outJson = path.join(docsDir, 'blog-draft-quality-report.json');
const outMd = path.join(docsDir, 'blog-draft-quality-report.md');
const minWords = Number(process.env.BLOG_DRAFT_QUALITY_MIN_WORDS || BLOG_CONTENT_POLICY.minWords);

function readDraftFiles() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs
    .readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json'))
    .filter((name) => !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => path.join(draftsDir, name));
}

function countMatches(html, regex) {
  return (String(html || '').match(regex) || []).length;
}

function hasVisibleSourceNote(html) {
  return /<h2[^>]*>\s*Kaynak ve Guncelleme Notu\s*<\/h2>/i.test(String(html || ''));
}

function sourceLinksVisible(draft) {
  const sourceUrls = Array.isArray(draft.topic?.sourceUrls) ? draft.topic.sourceUrls : [];
  const html = String(draft.html || '');
  return sourceUrls.length > 0 && sourceUrls.every((url) => html.includes(url));
}

function focusKeywordVisible(draft) {
  const keyword = String(draft.topic?.focusKeyword || '').trim().toLocaleLowerCase('tr-TR');
  if (!keyword) return false;
  const firstParagraph = String(draft.html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
  return stripTags(firstParagraph).toLocaleLowerCase('tr-TR').includes(keyword.split(/\s+/)[0]);
}

function riskyClaims(html) {
  const text = stripTags(html).toLocaleLowerCase('tr-TR');
  const patterns = [
    'belediye tarafından organize edilen ücretsiz ring',
    'ücretsiz ring servisleri',
    'oluşturulacaktır',
    'kurulacaktır',
    'kesinlikle ücretsiz',
    'garanti',
    'rezervasyon zorunludur',
  ];
  return patterns.filter((pattern) => text.includes(pattern));
}

function answerBlockLengths(html) {
  return [...String(html || '').matchAll(/<h2[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)].map(
    (match) => wordCount(match[1]),
  );
}

const drafts = readDraftFiles().map((file) => {
  const draft = JSON.parse(fs.readFileSync(file, 'utf8'));
  const words = wordCount(draft.html);
  const headings = headingCounts(draft.html);
  const h2Count = headings.h2;
  const h3Count = headings.h3;
  const internalLinks = Array.isArray(draft.topic?.internalLinks) ? draft.topic.internalLinks : [];
  const sourceUrls = Array.isArray(draft.topic?.sourceUrls) ? draft.topic.sourceUrls : [];
  const answers = answerBlockLengths(draft.html);
  const claims = riskyClaims(draft.html);
  const issues = [];

  if (draft.status !== 'ready-for-admin-review') issues.push('status-not-ready-for-admin-review');
  if (draft.freshness_payload?.autoPublish === true) issues.push('autopublish-enabled');
  issues.push(...validateBlogHeadingPolicy(draft.html, { minWords }).failures);
  if (internalLinks.length < 3) issues.push('internal-links-under-3');
  if (sourceUrls.length < 1) issues.push('source-url-missing');
  if (!hasVisibleSourceNote(draft.html)) issues.push('visible-source-note-missing');
  if (!sourceLinksVisible(draft)) issues.push('source-link-visible-parity-failed');
  if (!focusKeywordVisible(draft)) issues.push('focus-keyword-not-visible-in-first-paragraph');
  if (answers.some((count) => count < 18 || count > 110)) issues.push('h2-answer-block-outside-18-110-words');
  for (const claim of claims) issues.push(`risky-claim:${claim}`);

  return {
    slug: draft.topic?.slug || path.basename(file, '.json'),
    title: draft.topic?.title || draft.title || path.basename(file, '.json'),
    status: issues.length === 0 ? 'ok' : 'review',
    wordCount: words,
    h2Count,
    h3Count,
    internalLinkCount: internalLinks.length,
    sourceUrlCount: sourceUrls.length,
    visibleSourceNote: hasVisibleSourceNote(draft.html),
    sourceLinksVisible: sourceLinksVisible(draft),
    focusKeywordVisible: focusKeywordVisible(draft),
    answerBlockWordCounts: answers,
    issues,
  };
});

const review = drafts.filter((draft) => draft.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: drafts.length > 0 && review.length === 0 ? 'ok' : 'review',
  policy: {
    minWords,
    adminReviewRequired: true,
    autoPublishAllowed: false,
    visibleSourceNoteRequired: true,
    sourceLinkParityRequired: true,
    h2Range: `${BLOG_CONTENT_POLICY.h2Min}-${BLOG_CONTENT_POLICY.h2Max}`,
    h3Range: `${BLOG_CONTENT_POLICY.h3Min}-${BLOG_CONTENT_POLICY.h3Max}`,
    totalHeadingMax: BLOG_CONTENT_POLICY.totalHeadingMax,
    localStorageOnly: true,
  },
  summary: {
    drafts: drafts.length,
    ok: drafts.filter((draft) => draft.status === 'ok').length,
    review: review.length,
  },
  drafts,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Blog Draft Quality Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Drafts: ${report.summary.drafts}`,
    `- OK: ${report.summary.ok}`,
    `- Review: ${report.summary.review}`,
    `- Min words: ${report.policy.minWords}`,
    '',
    '## Policy',
    '',
    '- Auto publish disabled; admin review required.',
    '- Visible source/update note and source URL parity required.',
    '- Risky future claims are blocked until rewritten as official-source checks.',
    '',
    '## Drafts',
    '',
    '| Slug | Status | Words | H2 | H3 | Sources | Issues |',
    '|---|---|---:|---:|---:|---:|---|',
    ...drafts.map(
      (draft) =>
        `| ${draft.slug} | ${draft.status} | ${draft.wordCount} | ${draft.h2Count} | ${draft.h3Count} | ${draft.sourceUrlCount} | ${draft.issues.join(', ') || '-'} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`blog-draft-quality-report: ${report.status.toUpperCase()} ok=${report.summary.ok} review=${report.summary.review}`);
process.exit(report.status === 'ok' ? 0 : 1);
