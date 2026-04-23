import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

const runbookPath = join(root, 'docs', 'SECRETS_ROTATION_RUNBOOK.md');
const envExamplePath = join(root, '.env.example');
const envProdTemplatePath = join(root, '.env.production.template');

if (!existsSync(runbookPath)) {
  blockers.push('missing secrets runbook: docs/SECRETS_ROTATION_RUNBOOK.md');
}

const envExample = existsSync(envExamplePath) ? readFileSync(envExamplePath, 'utf8') : '';
const envProd = existsSync(envProdTemplatePath) ? readFileSync(envProdTemplatePath, 'utf8') : '';

if (!envExample) {
  blockers.push('missing .env.example');
}
if (!envProd) {
  blockers.push('missing .env.production.template');
}

const placeholderChecks: Array<[string, string, string]> = [
  ['.env.example', envExample, 'PEXELS_API_KEY=your_pexels_api_key'],
  ['.env.example', envExample, 'UNSPLASH_ACCESS_KEY=your_unsplash_access_key'],
  ['.env.example', envExample, 'UNSPLASH_SECRET_KEY=your_unsplash_secret_key'],
  ['.env.production.template', envProd, 'PEXELS_API_KEY=your_pexels_api_key'],
  ['.env.production.template', envProd, 'UNSPLASH_ACCESS_KEY=your_unsplash_access_key'],
  ['.env.production.template', envProd, 'UNSPLASH_SECRET_KEY=your_unsplash_secret_key'],
];

for (const [label, source, token] of placeholderChecks) {
  if (!source.includes(token)) {
    blockers.push(`${label} missing required placeholder: ${token}`);
  }
}

validateNoRealKeyLiteral('.env.example', envExample, 'PEXELS_API_KEY');
validateNoRealKeyLiteral('.env.example', envExample, 'UNSPLASH_ACCESS_KEY');
validateNoRealKeyLiteral('.env.example', envExample, 'UNSPLASH_SECRET_KEY');
validateNoRealKeyLiteral('.env.production.template', envProd, 'PEXELS_API_KEY');
validateNoRealKeyLiteral('.env.production.template', envProd, 'UNSPLASH_ACCESS_KEY');
validateNoRealKeyLiteral('.env.production.template', envProd, 'UNSPLASH_SECRET_KEY');

if (blockers.length > 0) {
  console.error('[secrets-rotation] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[secrets-rotation] ok: rotation runbook and env placeholders are locked');

function validateNoRealKeyLiteral(fileLabel: string, source: string, key: string): void {
  const regex = new RegExp(`\\b${key}\\s*=\\s*([^\\r\\n]+)`, 'm');
  const match = source.match(regex);
  if (!match) {
    return;
  }

  const value = match[1].trim();
  const normalized = value.toLowerCase();
  const looksLikeReal = /^[A-Za-z0-9_-]{24,}$/.test(value);
  const looksLikePlaceholder =
    normalized.includes('your_') ||
    normalized.includes('placeholder') ||
    normalized.includes('change_me');

  if (looksLikeReal && !looksLikePlaceholder) {
    blockers.push(`${fileLabel} contains key-shaped literal value for ${key}`);
  }
}
