import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { basename, join } from 'path';

type ManifestRecord = {
  slug: string;
  bucket: string;
  localPath: string;
  thumbnailPath: string;
};

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'public', 'images', 'image-manifest.json');
const CONTENT_DIR = join(ROOT, 'src', 'content');

function readManifest(): ManifestRecord[] {
  if (!existsSync(MANIFEST_PATH)) return [];
  const raw = readFileSync(MANIFEST_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function splitFrontmatter(content: string): { frontmatter: string; body: string } | null {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return {
    frontmatter: normalized.slice(4, end),
    body: normalized.slice(end + 5)
  };
}

function replaceOrInsertField(frontmatter: string, key: string, value: string): string {
  const re = new RegExp(`^${key}:.*$`, 'm');
  const line = `${key}: "${value}"`;
  if (re.test(frontmatter)) {
    return frontmatter.replace(re, line);
  }
  return `${frontmatter}\n${line}`;
}

function updateFileFrontmatter(
  filePath: string,
  updater: (frontmatter: string, body: string) => { frontmatter: string; body: string }
): boolean {
  const original = readFileSync(filePath, 'utf-8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  const parts = splitFrontmatter(original);
  if (!parts) return false;

  const updated = updater(parts.frontmatter, parts.body);
  const next = `---${eol}${updated.frontmatter}${eol}---${eol}${updated.body.replace(/\n/g, eol)}`;
  if (next !== original) {
    writeFileSync(filePath, next, 'utf-8');
    return true;
  }
  return false;
}

function getMdFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f: string) => f.endsWith('.md'))
    .map((f: string) => join(dir, f));
}

function getContentCategories(): string[] {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function updateCategory(category: string, manifest: ManifestRecord[]): number {
  const categoryDir = join(CONTENT_DIR, category);
  const bySlug = new Map(manifest.filter((m) => m.bucket === category).map((m) => [m.slug, m]));
  let changed = 0;

  for (const filePath of getMdFiles(categoryDir)) {
    const fileSlug = basename(filePath, '.md');
    const fileChanged = updateFileFrontmatter(filePath, (frontmatter, body) => {
      const slugMatch = frontmatter.match(/^slug:\s*"([^"]+)"/m);
      const slug = slugMatch?.[1] || fileSlug;
      const image = bySlug.get(slug);
      if (!image) {
        return { frontmatter, body };
      }

      let nextFrontmatter = replaceOrInsertField(frontmatter, 'image', image.localPath);
      if (/^thumb:\s*["'][^"']+["']\s*$/m.test(frontmatter) || category === 'places') {
        nextFrontmatter = replaceOrInsertField(nextFrontmatter, 'thumb', image.thumbnailPath);
      }

      let nextBody = body;
      if (category === 'places') {
        nextBody = nextBody.replace(
          /!\[([^\]]*)\]\((\/images\/[^)]+|https?:\/\/[^)]+)\)/,
          `![$1](${image.localPath})`
        );
      }

      for (const [mappedSlug, record] of bySlug.entries()) {
        const exactJpg = new RegExp(`/images/${category}/${mappedSlug}\\.jpg`, 'g');
        const exactWebp = new RegExp(`/images/${category}/${mappedSlug}\\.webp`, 'g');
        nextBody = nextBody.replace(exactJpg, record.localPath).replace(exactWebp, record.localPath);
      }

      return { frontmatter: nextFrontmatter, body: nextBody };
    });

    if (fileChanged) changed++;
  }

  return changed;
}

function main(): void {
  const manifest = readManifest();
  if (manifest.length === 0) {
    console.error('No manifest records found. Run images:download first.');
    process.exit(1);
  }

  const categories = getContentCategories();
  const results = categories.map((category) => ({
    category,
    changed: updateCategory(category, manifest)
  }));

  const total = results.reduce((sum, item) => sum + item.changed, 0);
  for (const result of results) {
    console.log(`${result.category} files updated: ${result.changed}`);
  }
  console.log(`Total updated files: ${total}`);
}

main();
