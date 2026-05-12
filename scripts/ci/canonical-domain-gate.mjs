#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function readIfExists(rel) {
  const path = resolve(root, rel);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
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

const corsConfig =
  readIfExists('src/lib/config/config.ts') ||
  readIfExists('src/middleware/cors.ts') ||
  readIfExists('src/middleware/security.ts');
assertAnyContains(
  corsConfig,
  ["'https://sanliurfa.com'", 'canonicalOrigin', 'getPublicAppUrl()'],
  'canonical CORS config',
  errors,
);
if (corsConfig.includes("allowedOrigins: ['*']")) {
  errors.push("canonical CORS config: wildcard allowedOrigins is not allowed");
}

const hardening = read('src/lib/security/hardening.ts');
assertAnyContains(
  hardening,
  ["origins: [publicAppUrl]", "const publicAppUrl = 'https://sanliurfa.com'"],
  'src/lib/security/hardening.ts',
  errors,
);

if (errors.length > 0) {
  console.error('[canonical-domain-gate] FAILED');
  for (const e of errors) console.error(`- ${e}`);
  process.exit(1);
}

console.log('[canonical-domain-gate] ok');
