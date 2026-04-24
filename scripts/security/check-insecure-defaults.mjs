#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const checks = [
  {
    file: 'src/lib/auth.ts',
    forbidden: ['dev-jwt-secret-key-minimum-32-characters-long'],
  },
  {
    file: 'src/lib/config/env-validator.ts',
    forbidden: ["'default-secret'"],
  },
  {
    file: 'src/lib/two-factor-auth.ts',
    forbidden: ["|| 'secret'"],
  },
  {
    file: 'src/lib/blog/blog-webhooks.ts',
    forbidden: ["|| 'default-secret'"],
  },
];

const violations = [];

for (const item of checks) {
  const content = readFileSync(item.file, 'utf8');
  for (const token of item.forbidden) {
    if (content.includes(token)) {
      violations.push(`${item.file} -> ${token}`);
    }
  }
}

if (violations.length) {
  console.error('[security-defaults-gate] Insecure default fallback detected:');
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}

console.log('[security-defaults-gate] ok: insecure default fallbacks not found');
