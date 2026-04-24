#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const apiDir = path.join(root, 'src', 'pages', 'api');
const baselinePath = path.join(root, 'docs', 'problem-json-baseline.json');
const reportPath = path.join(root, 'docs', 'problem-json-report.json');
const writeBaseline = process.argv.includes('--write-baseline');
const requireZero = process.argv.includes('--require-zero') || process.env.PROBLEM_JSON_REQUIRE_ZERO === '1';

function listTsFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(p));
    else if (entry.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

const files = listTsFiles(apiDir);
const offenders = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const hasLegacyError = /new Response\(\s*JSON\.stringify\(\s*\{\s*(success:\s*false|error:)/m.test(text);
  const usesProblemJson = /\bproblemJson\(/.test(text);
  if (hasLegacyError && !usesProblemJson) offenders.push(path.relative(root, file).replace(/\\/g, '/'));
}

const report = {
  generatedAt: new Date().toISOString(),
  totalApiFiles: files.length,
  offendersCount: offenders.length,
  offenders,
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

if (writeBaseline) {
  fs.writeFileSync(
    baselinePath,
    JSON.stringify({ generatedAt: report.generatedAt, offendersCount: report.offendersCount }, null, 2),
    'utf8',
  );
  console.log(`problem json baseline written: ${baselinePath}`);
  process.exit(0);
}

let baselineCount = report.offendersCount;
if (fs.existsSync(baselinePath)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    baselineCount = Number(parsed.offendersCount || baselineCount);
  } catch {
    // ignore
  }
}

console.log(`problem json report: ${reportPath}`);
console.log(` - offenders: ${report.offendersCount}`);
console.log(` - baseline: ${baselineCount}`);
if (requireZero && report.offendersCount > 0) {
  console.error('FAILED: strict mode requires zero problem+json offenders');
  process.exit(1);
}
if (report.offendersCount > baselineCount) {
  console.error('FAILED: problem+json offender count regressed');
  process.exit(1);
}
console.log('OK: no regression on problem+json adoption');
