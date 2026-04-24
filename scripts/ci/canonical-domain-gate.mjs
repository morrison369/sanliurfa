#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function assertContains(content, needle, file, errors) {
  if (!content.includes(needle)) {
    errors.push(`${file}: missing "${needle}"`);
  }
}

function assertAnyContains(content, needles, file, errors) {
  if (!needles.some((needle) => content.includes(needle))) {
    errors.push(`${file}: missing one of [${needles.join(', ')}]`);
  }
}

const errors = [];

const middleware = read('src/middleware.ts');
assertAnyContains(
  middleware,
  ["const canonicalHost = 'sanliurfa.com';", 'const canonicalHost = getCanonicalDomain();'],
  'src/middleware.ts',
  errors,
);
assertContains(middleware, 'x-forwarded-proto', 'src/middleware.ts', errors);
assertContains(middleware, 'shouldHttpsRedirect', 'src/middleware.ts', errors);
assertContains(middleware, 'target.protocol = \'https:\';', 'src/middleware.ts', errors);

const config = read('src/lib/config/config.ts');
assertContains(config, "['https://sanliurfa.com']", 'src/lib/config/config.ts', errors);
if (config.includes("allowedOrigins: ['*']")) {
  errors.push("src/lib/config/config.ts: wildcard allowedOrigins is not allowed");
}

const hardening = read('src/lib/security/hardening.ts');
assertContains(hardening, "origins: [publicAppUrl]", 'src/lib/security/hardening.ts', errors);

if (errors.length > 0) {
  console.error('[canonical-domain-gate] FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('[canonical-domain-gate] ok');
