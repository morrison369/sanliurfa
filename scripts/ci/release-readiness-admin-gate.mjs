#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const adminIndex = path.join(root, 'src', 'pages', 'admin', 'index.astro');
const adminReadiness = path.join(root, 'src', 'pages', 'admin', 'release-readiness.astro');

if (!fs.existsSync(adminIndex) || !fs.existsSync(adminReadiness)) {
  console.error('release-readiness-admin-gate: required admin readiness files missing');
  process.exit(1);
}

const raw = fs.readFileSync(adminIndex, 'utf8');
if (!raw.includes('/admin/release-readiness')) {
  console.error('release-readiness-admin-gate: admin index missing /admin/release-readiness link');
  process.exit(1);
}

console.log('release-readiness-admin-gate: PASS');
