#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outJson = path.join(root, 'docs', 'env-doctor-report.json');
const outMd = path.join(root, 'docs', 'env-doctor-report.md');
const strict = process.argv.includes('--strict');

function loadEnvFile(name) {
  const envPath = path.join(root, name);
  if (!existsSync(envPath)) return;
  for (const rawLine of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const index = line.indexOf('=');
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const checks = [
  { id: 'DATABASE_URL', required: false },
  { id: 'JWT_SECRET', required: false, minLength: 32 },
  { id: 'REDIS_URL', required: false },
  { id: 'PEXELS_API_KEY', required: false },
  { id: 'UNSPLASH_ACCESS_KEY', required: false },
  { id: 'STRIPE_SECRET_KEY', required: false },
  { id: 'RESEND_API_KEY', required: false },
];

const results = checks.map((check) => {
  const value = String(process.env[check.id] || '').trim();
  const configured = value.length > 0;
  const lengthOk = !check.minLength || value.length >= check.minLength;
  return {
    id: check.id,
    status: configured && lengthOk ? 'configured' : check.required ? 'missing' : 'optional_missing',
    required: check.required,
  };
});

const imageProviders = ['PEXELS_API_KEY', 'UNSPLASH_ACCESS_KEY'].some((key) => {
  return String(process.env[key] || '').trim().length > 0;
});
results.push({
  id: 'IMAGE_PROVIDER',
  status: imageProviders ? 'configured' : existsSync(path.join(root, 'public', 'images', 'image-manifest.json')) ? 'offline_manifest' : 'missing',
  required: false,
});

const blockers = results.filter((item) => item.status === 'missing');
const report = {
  generatedAt: new Date().toISOString(),
  status: blockers.length > 0 ? 'advisory' : 'ok',
  checks: results,
  note: 'Secret degerleri loglanmaz; sadece configured/missing durumu raporlanir.',
};

mkdirSync(path.dirname(outJson), { recursive: true });
writeFileSync(outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const lines = [
  '# Env Doctor Report',
  '',
  `- Generated At: ${report.generatedAt}`,
  `- Status: ${report.status}`,
  '',
  '| Key | Status | Required |',
  '|---|---|---:|',
  ...results.map((item) => `| ${item.id} | ${item.status} | ${item.required ? 'yes' : 'no'} |`),
  '',
  report.note,
];
writeFileSync(outMd, `${lines.join('\n')}\n`, 'utf8');

console.log(`Env doctor written: ${outJson}`);
console.log(`Env doctor written: ${outMd}`);
if (blockers.length > 0) {
  console.error(`Env doctor advisory: ${blockers.map((item) => item.id).join(', ')}`);
  if (strict) process.exit(1);
}
