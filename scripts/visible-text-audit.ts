import fs from 'node:fs';
import path from 'node:path';

import { analyzeVisibleText, summarizeFindings } from '../src/lib/copy-hygiene';

const ROOTS = ['src/lib', 'src/components', 'src/pages'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.astro']);

function walk(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (fullPath.includes('__tests__')) {
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function run(): number {
  const results: string[] = [];

  for (const root of ROOTS) {
    if (!fs.existsSync(root)) continue;
    for (const file of walk(root)) {
      const content = fs.readFileSync(file, 'utf8');
      const findings = analyzeVisibleText(content);
      if (findings.length === 0) continue;
      for (const finding of findings) {
        results.push(`${file}:${finding.line} ${finding.text}`);
      }
    }
  }

  if (results.length === 0) {
    console.log('Visible text audit: temiz');
    return 0;
  }

  console.log(summarizeFindings(results.map((item, index) => ({ line: index + 1, pattern: 'mixed', text: item }))));
  for (const line of results) {
    console.log(line);
  }
  return 1;
}

process.exitCode = run();
