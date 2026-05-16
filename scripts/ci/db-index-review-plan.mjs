#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const outJson = path.join(docsDir, 'db-index-review-plan.json');
const outMd = path.join(docsDir, 'db-index-review-plan.md');

function readJsonSafe(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch {
    return null;
  }
}

const highRiskTablePatterns = [
  /^users?$/,
  /^user_/,
  /^sessions?$/,
  /^api_/,
  /^audit_/,
  /^security_/,
  /^roles?$/,
  /^permissions$/,
  /^payments?$/,
  /^subscriptions?$/,
  /^direct_messages$/,
  /^messages?$/,
  /^conversations?$/,
  /^notifications?$/,
  /^social_/,
  /^followers?$/,
  /^follows$/,
  /^places?$/,
  /^place_/,
  /^reviews?$/,
  /^review_/,
  /^blog_/,
  /^city_content_/,
];

const highRiskIndexPatterns = [
  /email/i,
  /token/i,
  /session/i,
  /user/i,
  /conversation/i,
  /message/i,
  /sender/i,
  /recipient/i,
  /unread/i,
  /status/i,
  /created/i,
  /published/i,
  /slug/i,
  /search/i,
  /tenant/i,
  /owner/i,
  /admin/i,
  /role/i,
  /permission/i,
  /payment/i,
  /subscription/i,
  /webhook/i,
];

const lowRiskTablePatterns = [
  /^analytics_/,
  /^client_performance_metrics$/,
  /^ssr_perf_metrics$/,
  /^heatmap_/,
  /^funnel_/,
  /^cohort_/,
  /^trend/,
  /^warehouse_/,
  /^olap_/,
  /^dim_/,
  /^fact_/,
  /^campaign_/,
  /^segment_/,
  /^page_views$/,
];

function matches(name, patterns) {
  return patterns.some((pattern) => pattern.test(name));
}

function classifyIndex(index) {
  const table = String(index.table || '');
  const name = String(index.index || '');
  if (matches(table, highRiskTablePatterns) || highRiskIndexPatterns.some((pattern) => pattern.test(name))) {
    return {
      risk: 'high',
      action: 'keep_until_explain_review',
      reason: 'Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir.',
    };
  }
  if (matches(table, lowRiskTablePatterns)) {
    return {
      risk: 'medium',
      action: 'observe_and_explain_review',
      reason: 'Analytics/ops agirlikli index; 14 gun production gozlemi ve EXPLAIN sonrasi manuel PR ile degerlendirilebilir.',
    };
  }
  return {
    risk: 'medium',
    action: 'manual_ownership_review',
    reason: 'Owner/source ve query plan kaniti olmadan drop yapilmaz.',
  };
}

const usage = readJsonSafe('docs/db-usage-audit.json');
const retirement = readJsonSafe('docs/db-retirement-observation-report.json');
const indexes = usage?.unusedIndexInventory || usage?.unusedIndexes || [];
const classified = indexes.map((index) => ({
  ...index,
  ...classifyIndex(index),
}));

const byRisk = classified.reduce((acc, item) => {
  acc[item.risk] = (acc[item.risk] || 0) + 1;
  return acc;
}, {});
const byAction = classified.reduce((acc, item) => {
  acc[item.action] = (acc[item.action] || 0) + 1;
  return acc;
}, {});
const tableCounts = classified.reduce((acc, item) => {
  acc[item.table] = (acc[item.table] || 0) + 1;
  return acc;
}, {});
const largestTables = Object.entries(tableCounts)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, 25)
  .map(([table, count]) => ({ table, count }));

const report = {
  generatedAt: new Date().toISOString(),
  status: usage?.status === 'ok' ? 'advisory' : 'unavailable',
  destructiveActionsAllowed: false,
  automaticIndexDropAllowed: false,
  source: 'docs/db-usage-audit.json',
  policy: {
    observationDays: retirement?.policy?.observationDays ?? 14,
    earliestActionAt: retirement?.policy?.earliestActionAt ?? null,
    requiredEvidence: [
      '14 gun production pg_stat_user_indexes gozlemi',
      'EXPLAIN / query plan review',
      'runtime source reference review',
      'rollback migration veya restore plani',
      'manuel DBA/owner onayi',
    ],
  },
  summary: {
    reviewableIndexCount: classified.length,
    highRiskCount: byRisk.high || 0,
    mediumRiskCount: byRisk.medium || 0,
    lowRiskCount: byRisk.low || 0,
    keepUntilExplainReviewCount: byAction.keep_until_explain_review || 0,
    observeAndExplainReviewCount: byAction.observe_and_explain_review || 0,
    manualOwnershipReviewCount: byAction.manual_ownership_review || 0,
  },
  largestTables,
  highRiskSample: classified.filter((item) => item.risk === 'high').slice(0, 30),
  mediumRiskSample: classified.filter((item) => item.risk === 'medium').slice(0, 30),
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(
  outMd,
  [
    '# DB Index Review Plan',
    '',
    `- Generated at: ${report.generatedAt}`,
    `- Status: ${report.status}`,
    `- Reviewable indexes: ${report.summary.reviewableIndexCount}`,
    `- High risk keep/review: ${report.summary.highRiskCount}`,
    `- Medium risk review: ${report.summary.mediumRiskCount}`,
    `- Automatic index drop allowed: ${report.automaticIndexDropAllowed}`,
    `- Earliest action after: ${report.policy.earliestActionAt || 'unknown'}`,
    '',
    '## Policy',
    '',
    '- idx_scan=0 tek basina drop karari degildir.',
    '- Unique/constraint indexler bu plana zaten dahil edilmez.',
    '- High risk indexler EXPLAIN ve owner onayi olmadan drop adayi sayilmaz.',
    '',
    '## Largest Candidate Tables',
    '',
    '| Table | Candidate Count |',
    '|---|---:|',
    ...largestTables.map((item) => `| ${item.table} | ${item.count} |`),
    '',
    '## High Risk Sample',
    '',
    '| Table | Index | Size MB | Action | Reason |',
    '|---|---|---:|---|---|',
    ...report.highRiskSample.map((item) => `| ${item.table} | ${item.index} | ${item.sizeMb} | ${item.action} | ${item.reason} |`),
    '',
    '## Medium Risk Sample',
    '',
    '| Table | Index | Size MB | Action | Reason |',
    '|---|---|---:|---|---|',
    ...report.mediumRiskSample.map((item) => `| ${item.table} | ${item.index} | ${item.sizeMb} | ${item.action} | ${item.reason} |`),
    '',
  ].join('\n'),
  'utf8',
);

console.log(
  `db-index-review-plan: ${report.status.toUpperCase()} (${report.summary.reviewableIndexCount} candidates, high=${report.summary.highRiskCount})`,
);
