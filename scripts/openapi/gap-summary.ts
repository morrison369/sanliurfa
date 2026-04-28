#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const baselinePath = path.join(process.cwd(), 'docs', 'openapi-route-gap-baseline.json');
if (!fs.existsSync(baselinePath)) {
  console.error('Baseline file not found:', baselinePath);
  process.exit(1);
}

const raw = fs.readFileSync(baselinePath, 'utf8');
const parsed = JSON.parse(raw) as { generatedAt?: string; missingInSpec?: string[] };
const routes = parsed.missingInSpec ?? [];

const byDomain = new Map<string, number>();
for (const route of routes) {
  const segments = route.split('/').filter(Boolean);
  const domain = segments[0] ?? 'root';
  byDomain.set(domain, (byDomain.get(domain) ?? 0) + 1);
}

const sorted = [...byDomain.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

console.log('OpenAPI Gap Summary');
console.log(`Generated at: ${parsed.generatedAt ?? 'n/a'}`);
console.log(`Total missing routes: ${routes.length}`);
for (const [domain, count] of sorted) {
  console.log(` - ${domain}: ${count}`);
}

