import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src', 'content');

const EXTERNAL_IMAGE_PATTERNS = [
  /https:\/\/images\.unsplash\.com/i,
  /https:\/\/images\.pexels\.com/i,
  /!\[[^\]]*]\(https?:\/\/[^)]+\)/i,
  /^image:\s*"https?:\/\/[^"]+"/i,
  /^thumb:\s*"https?:\/\/[^"]+"/i
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function main(): void {
  if (!existsSync(CONTENT_DIR)) {
    console.error('src/content directory not found');
    process.exit(1);
  }

  const files = walk(CONTENT_DIR);
  const violations: Array<{ file: string; line: number; text: string }> = [];

  for (const file of files) {
    const lines = readFileSync(file, 'utf-8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (EXTERNAL_IMAGE_PATTERNS.some((re) => re.test(line))) {
        violations.push({ file, line: i + 1, text: line.trim() });
      }
    });
  }

  if (violations.length > 0) {
    console.error('External image URL found in content:');
    for (const v of violations) {
      const rel = v.file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
      console.error(`- ${rel}:${v.line} -> ${v.text}`);
    }
    process.exit(1);
  }

  console.log(`No external content image URLs found (${files.length} files checked)`);
}

main();
