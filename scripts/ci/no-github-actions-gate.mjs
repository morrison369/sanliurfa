#!/usr/bin/env node
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const workflowsDir = path.join(process.cwd(), '.github', 'workflows');

if (existsSync(workflowsDir)) {
  const files = readdirSync(workflowsDir).filter((file) => /\.(ya?ml)$/i.test(file));
  if (files.length > 0) {
    console.error(`GitHub Actions yasak: .github/workflows içinde workflow var: ${files.join(', ')}`);
    process.exit(1);
  }
}

console.log('[no-github-actions-gate] ok');
