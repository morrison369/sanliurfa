import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const imagesRoot = join(root, 'public', 'images');
const blockers: string[] = [];

if (!existsDirectory(imagesRoot)) {
  blockers.push('public/images directory is missing');
} else {
  for (const filePath of walkFiles(imagesRoot)) {
    const rel = relative(root, filePath).replace(/\\/g, '/');
    const fileName = rel.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const baseName = fileName.slice(0, fileName.lastIndexOf('.'));

    if (!['jpg', 'jpeg', 'png', 'webp', 'avif', 'svg'].includes(extension)) {
      blockers.push(`${rel} has unsupported extension: .${extension}`);
    }

    if (!/^[a-z0-9][a-z0-9-_]*$/.test(baseName)) {
      blockers.push(`${rel} filename must be slug-compatible (lowercase alnum/hyphen/underscore)`);
    }

    if (baseName.includes('--')) {
      blockers.push(`${rel} filename contains duplicate hyphen (--), normalize slug`);
    }
  }
}

if (blockers.length > 0) {
  console.error('[image-slug] BLOCKED');
  for (const blocker of blockers.slice(0, 60)) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[image-slug] ok: image filenames follow slug naming contract');

function walkFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    files.push(fullPath);
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
