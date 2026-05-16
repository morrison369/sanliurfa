#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const sourcePath = path.join(docsDir, 'blog-keyword-research-report.json');
const outJson = path.join(docsDir, 'blog-duplicate-risk-gate.json');
const outMd = path.join(docsDir, 'blog-duplicate-risk-gate.md');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

const research = readJsonSafe(sourcePath);
const selectedTopics = Array.isArray(research?.selectedTopics) ? research.selectedTopics : [];
const skippedTopics = Array.isArray(research?.skippedTopics) ? research.skippedTopics : [];
const selectedDuplicateRisk = selectedTopics.filter((topic) => topic?.duplicateRisk === true);
const skippedDuplicateRisk = skippedTopics.filter((topic) => topic?.duplicateRisk === true);
const status = research && selectedDuplicateRisk.length === 0 ? 'ok' : 'blocked';

const report = {
  generatedAt: new Date().toISOString(),
  status,
  policy: {
    noDuplicateProdBlogs: true,
    autoPublish: false,
    requiresProdInventory: true,
    blockerWhenSelectedTopicHasDuplicateRisk: true,
  },
  source: path.relative(root, sourcePath).replaceAll('\\', '/'),
  summary: {
    selected: selectedTopics.length,
    selectedDuplicateRisk: selectedDuplicateRisk.length,
    skippedDuplicateRisk: skippedDuplicateRisk.length,
    prodBlogInventoryTotal: research?.prodBlogInventory?.total ?? 0,
  },
  selectedDuplicateRisk: selectedDuplicateRisk.map((topic) => ({
    slug: topic.slug ?? '',
    title: topic.title ?? '',
    duplicateReason: topic.duplicateReason ?? '',
    closestExisting: topic.closestExisting?.slug ?? null,
  })),
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# Blog Duplicate Risk Gate',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Selected topics: ${report.summary.selected}`,
    `- Selected duplicate risk: ${report.summary.selectedDuplicateRisk}`,
    `- Skipped duplicate risk: ${report.summary.skippedDuplicateRisk}`,
    `- Auto publish: ${report.policy.autoPublish ? 'yes' : 'no'}`,
    '',
    '| Slug | Title | Reason | Existing |',
    '|---|---|---|---|',
    ...report.selectedDuplicateRisk.map(
      (topic) =>
        `| ${topic.slug} | ${String(topic.title).replaceAll('|', '\\|')} | ${topic.duplicateReason} | ${topic.closestExisting ?? ''} |`,
    ),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `blog-duplicate-risk-gate: ${report.status.toUpperCase()} (${report.summary.selectedDuplicateRisk} selected duplicate-risk)`,
);
process.exit(status === 'ok' ? 0 : 1);
