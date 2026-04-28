#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const jsonPath = path.join(root, 'docs', 'ops-last-run.json');
const mdPath = path.join(root, 'docs', 'ops-last-run.md');

const report = existsSync(jsonPath)
  ? JSON.parse(readFileSync(jsonPath, 'utf8'))
  : { generatedAt: new Date().toISOString(), status: 'not_run', results: [] };

function minutes(start, end) {
  if (!start || !end) return '-';
  const delta = Math.max(0, new Date(end).getTime() - new Date(start).getTime());
  return `${(delta / 60000).toFixed(2)} dk`;
}

const lines = [
  '# Ops Last Run',
  '',
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  '',
  '| Step | Status | Duration | Cleanup |',
  '|---|---|---:|---:|',
  ...(report.results || []).map((item) => `| \`${item.step}\` | ${item.status} | ${minutes(item.startedAt, item.finishedAt)} | ${item.cleanup ? 'yes' : 'no'} |`),
  '',
];

writeFileSync(mdPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`Ops markdown written: ${mdPath}`);
