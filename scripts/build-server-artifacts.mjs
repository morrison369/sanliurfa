#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const astroCli = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
const distUploadsDir = path.join(root, 'dist', 'client', 'uploads');
const shouldPrune = process.env.PRUNE_DIST_UPLOADS !== '0';

const result = spawnSync(process.execPath, [astroCli, 'build', ...process.argv.slice(2)], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
});

if ((result.status ?? 1) !== 0) {
  process.exit(result.status ?? 1);
}

if (!shouldPrune) {
  console.log('build-server-artifacts: dist/client/uploads prune skipped (PRUNE_DIST_UPLOADS=0)');
  process.exit(0);
}

if (existsSync(distUploadsDir)) {
  rmSync(distUploadsDir, { recursive: true, force: true });
  console.log('build-server-artifacts: pruned dist/client/uploads');
} else {
  console.log('build-server-artifacts: dist/client/uploads already absent');
}
