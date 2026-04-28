#!/usr/bin/env node
/**
 * Companion script to codemod-safe-int-param.mjs.
 * Scans api/ for files using `safeIntParam(...)` without import, adds it.
 * Idempotent — safe to re-run.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'src', 'pages', 'api');
const API_PATH = path.resolve(__dirname, '..', 'src', 'lib', 'api');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

let fixed = 0;
for (const f of walk(ROOT)) {
  let s = fs.readFileSync(f, 'utf8');
  if (!/safeIntParam\(/.test(s)) continue;
  if (/import\s*\{[^}]*\bsafeIntParam\b[^}]*\}\s*from/.test(s)) continue;

  const apiImportRe = /import\s*\{([^}]+)\}\s*from\s*(['"])([^'"]*\/lib\/api)\2;/;
  const m = s.match(apiImportRe);
  if (m) {
    const imports = m[1].split(',').map(x => x.trim()).filter(Boolean);
    if (!imports.includes('safeIntParam')) {
      imports.push('safeIntParam');
      const replacement = `import { ${imports.join(', ')} } from '${m[3]}';`;
      s = s.replace(apiImportRe, replacement);
    }
  } else {
    const dir = path.dirname(f);
    let rel = path.relative(dir, API_PATH).split(path.sep).join('/');
    if (!rel.startsWith('.')) rel = './' + rel;
    const lines = s.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i])) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, `import { safeIntParam } from '${rel}';`);
      s = lines.join('\n');
    } else {
      s = `import { safeIntParam } from '${rel}';\n` + s;
    }
  }

  fs.writeFileSync(f, s, 'utf8');
  fixed++;
}
console.log(`Fixed imports in ${fixed} files`);
