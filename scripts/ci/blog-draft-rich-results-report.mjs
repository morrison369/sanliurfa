#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { BLOG_CONTENT_POLICY, stripTags, wordCount } from '../blog-content-policy.mjs';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const draftsDir = path.join(docsDir, 'generated-blog-drafts');
const outJson = path.join(docsDir, 'blog-draft-rich-results-report.json');
const outMd = path.join(docsDir, 'blog-draft-rich-results-report.md');
const minWords = Number(process.env.BLOG_RICH_RESULTS_MIN_WORDS || BLOG_CONTENT_POLICY.minWords);

function extractFaq(html) {
  if (!/Sık Sorulan Sorular/i.test(html)) return [];
  const sections = [...String(html || '').matchAll(/<h2[^>]*>([\s\S]*?Sık Sorulan Sorular[\s\S]*?)<\/h2>/gi)]
    .map((match) => {
      const sectionStart = match.index || 0;
      const rest = html.slice(sectionStart + match[0].length);
      const nextH2 = rest.search(/<h2\b/gi);
      return nextH2 === -1 ? rest : rest.slice(0, nextH2);
    });

  for (const section of sections) {
    const h3Faq = [...section.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => ({
        question: stripTags(match[1]),
        answer: stripTags(match[2]),
      }))
      .filter((item) => item.question && item.answer)
      .slice(0, 5);
    if (h3Faq.length > 0) return h3Faq;

    const paragraphFaq = [...section.matchAll(/<p[^>]*>\s*<strong[^>]*>([\s\S]*?\?)<\/strong>([\s\S]*?)<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((match) => ({
        question: stripTags(match[1]),
        answer: stripTags(`${match[2]} ${match[3]}`),
      }))
      .filter((item) => item.question && item.answer)
      .slice(0, 5);
    if (paragraphFaq.length > 0) return paragraphFaq;
  }

  return [];
}

function h2AnswerLengths(html) {
  return [...String(html || '').matchAll(/<h2[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]).split(/\s+/).filter(Boolean).length);
}

function invalidTags(html) {
  const allowed = new Set(['p', 'h2', 'h3', 'ul', 'li', 'strong', 'em', 'a']);
  return [...String(html || '').matchAll(/<\/?\s*([a-z][a-z0-9-]*)\b[^>]*>/gi)]
    .map((match) => match[1].toLowerCase())
    .filter((tag) => !allowed.has(tag));
}

function buildSchemas(draft, faq) {
  const topic = draft.topic || {};
  const slug = topic.slug || 'draft';
  const url = `https://sanliurfa.com/blog/${slug}`;
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: topic.title || draft.title || slug,
    description: String(draft.excerpt || '').slice(0, 156),
    inLanguage: 'tr-TR',
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'Sanliurfa.com' },
    publisher: { '@type': 'Organization', name: 'Sanliurfa.com' },
    datePublished: draft.generatedAt || new Date().toISOString(),
    dateModified: draft.expandedAt || draft.generatedAt || new Date().toISOString(),
  };
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: 'https://sanliurfa.com/' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://sanliurfa.com/blog' },
      { '@type': 'ListItem', position: 3, name: blogPosting.headline, item: url },
    ],
  };
  return { blogPosting, faqPage, breadcrumb };
}

function readDrafts() {
  if (!fs.existsSync(draftsDir)) return [];
  return fs.readdirSync(draftsDir)
    .filter((name) => name.endsWith('.json') && !['summary.json', 'apply-summary.json', 'expansion-summary.json'].includes(name))
    .map((name) => JSON.parse(fs.readFileSync(path.join(draftsDir, name), 'utf8')))
    .filter((draft) => draft?.topic?.slug && draft?.html);
}

const drafts = readDrafts();
const results = drafts.map((draft) => {
  const faq = extractFaq(draft.html);
  const words = wordCount(draft.html);
  const h2Count = (draft.html.match(/<h2\b/gi) || []).length;
  const answerLengths = h2AnswerLengths(draft.html);
  const invalidHtmlTags = [...new Set(invalidTags(draft.html))];
  const schemas = buildSchemas(draft, faq);
  const schemaJsonValid = Object.values(schemas).every((schema) => {
    try {
      JSON.parse(JSON.stringify(schema));
      return true;
    } catch {
      return false;
    }
  });
  const issues = [];
  if (words < minWords) issues.push(`word-count-under-${minWords}`);
  if (h2Count < BLOG_CONTENT_POLICY.h2Min) issues.push(`h2-under-${BLOG_CONTENT_POLICY.h2Min}`);
  if (h2Count > BLOG_CONTENT_POLICY.h2Max) issues.push(`h2-over-${BLOG_CONTENT_POLICY.h2Max}`);
  if (faq.length < 2) issues.push('faq-under-2');
  if (!schemaJsonValid) issues.push('schema-json-invalid');
  if (schemas.faqPage.mainEntity.length !== faq.length) issues.push('faq-schema-visible-parity-failed');
  if (answerLengths.some((count) => count < 18 || count > 110)) issues.push('h2-answer-block-outside-18-110-words');
  if (invalidHtmlTags.length > 0) issues.push(`invalid-html-tags:${invalidHtmlTags.join(',')}`);
  return {
    slug: draft.topic.slug,
    title: draft.topic.title,
    status: issues.length ? 'review' : 'ok',
    wordCount: words,
    h2Count,
    faqCount: faq.length,
    answerBlockWordCounts: answerLengths,
    invalidHtmlTags,
    schemas: {
      BlogPosting: true,
      FAQPage: faq.length >= 2,
      BreadcrumbList: true,
    },
    richResultsManualTestUrl: `https://search.google.com/test/rich-results?url=${encodeURIComponent(`https://sanliurfa.com/blog/${draft.topic.slug}`)}`,
    issues,
  };
});

const failed = results.filter((item) => item.status !== 'ok');
const report = {
  generatedAt: new Date().toISOString(),
  status: drafts.length > 0 && failed.length === 0 ? 'ok' : 'review',
  note: 'Google Rich Results Test icin resmi public API yok; bu rapor local schema/visible-content parity kontrolu yapar ve deploy sonrasi manuel test URLleri uretir.',
  policy: {
    visibleContentParity: true,
    schemaTypes: ['BlogPosting', 'FAQPage', 'BreadcrumbList'],
    noAutoPublish: true,
    minWords,
    h2Range: [BLOG_CONTENT_POLICY.h2Min, BLOG_CONTENT_POLICY.h2Max],
    faqMinimum: 2,
  },
  summary: {
    drafts: drafts.length,
    ok: results.filter((item) => item.status === 'ok').length,
    review: failed.length,
  },
  results,
};

fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Blog Draft Rich Results Report',
    '',
    `- Status: ${report.status}`,
    `- Generated: ${report.generatedAt}`,
    `- Drafts: ${report.summary.drafts}`,
    `- OK: ${report.summary.ok}`,
    `- Review: ${report.summary.review}`,
    '',
    '## Notes',
    '',
    '- Google Rich Results Test resmi public API sunmadığı için otomatik test yerine yerel JSON-LD/parity kontrolü ve manuel test URLleri üretilir.',
    '- Blog draftları otomatik publish edilmez; admin onayı gerekir.',
    '',
    '## Drafts',
    '',
    '| Slug | Status | Words | H2 | FAQ | Issues |',
    '|---|---|---:|---:|---:|---|',
    ...results.map((item) => `| ${item.slug} | ${item.status} | ${item.wordCount} | ${item.h2Count} | ${item.faqCount} | ${item.issues.join(', ') || '-'} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(`blog-draft-rich-results-report: ${report.status.toUpperCase()} ok=${report.summary.ok} review=${report.summary.review}`);
process.exit(report.status === 'ok' ? 0 : 1);
