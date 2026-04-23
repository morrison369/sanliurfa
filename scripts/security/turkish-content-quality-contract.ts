import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];
const scanRoots = ['src/pages', 'src/components', 'src/data', 'docs'];
const allowedExtensions = ['.astro', '.ts', '.tsx', '.md', '.json'];
const mojibakePattern = /Ã|Ä|Å|\uFFFD/;
const suspiciousControlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/;

for (const scanRoot of scanRoots) {
  const absoluteRoot = join(root, ...scanRoot.split('/'));
  for (const filePath of walkFiles(absoluteRoot)) {
    const source = readFileSync(filePath, 'utf8');
    const relPath = relative(root, filePath);
    const lines = source.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (mojibakePattern.test(line)) {
        blockers.push(`${relPath}:${i + 1} contains UTF-8 corruption pattern`);
      }
      if (suspiciousControlPattern.test(line)) {
        blockers.push(`${relPath}:${i + 1} contains suspicious control characters`);
      }
    }
  }
}

if (blockers.length > 0) {
  console.error('[turkish-content-quality] BLOCKED');
  for (const blocker of blockers.slice(0, 60)) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[turkish-content-quality] ok: UTF-8 and Turkish content quality contract is locked');

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsDirectory(dir)) {
    return files;
  }

  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === 'archive') {
      continue;
    }

    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }

    if (allowedExtensions.some((ext) => fullPath.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function existsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
