#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';

const files = [
  'public/images/places/image-manifest.json',
  'public/images/blog/image-manifest.json',
  'public/images/image-manifest.json',
];

const slugLike = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const violations = [];

for (const f of files) {
  if (!existsSync(f)) continue;
  let data;
  try {
    data = JSON.parse(readFileSync(f, 'utf8'));
  } catch {
    violations.push(`${f}: invalid JSON`);
    continue;
  }
  const entries = Array.isArray(data) ? data : Array.isArray(data.images) ? data.images : [];
  for (const item of entries) {
    const path = String(item?.path || item?.image || item?.url || '');
    if (!path) continue;
    const name = basename(path, extname(path)).replace(/-thumb$/, '');
    if (!slugLike.test(name)) {
      violations.push(`${f}: ${path}`);
    }
  }
}

if (violations.length) {
  console.error('[images-slug-gate] Non-slug image names detected:');
  for (const v of violations.slice(0, 200)) console.error(` - ${v}`);
  process.exit(1);
}

console.log('[images-slug-gate] ok: image names follow slug convention');
