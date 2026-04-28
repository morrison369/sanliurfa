import { existsSync, readdirSync, readFileSync } from 'fs';
import { basename, join } from 'path';

const ROOT = process.cwd();
const CONTENT_DIR = join(ROOT, 'src', 'content');
const PUBLIC_DIR = join(ROOT, 'public');

function parseFrontmatter(content: string): string | null {
  const normalized = content.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) return null;
  const end = normalized.indexOf('\n---\n', 4);
  if (end === -1) return null;
  return normalized.slice(4, end);
}

function extractField(frontmatter: string, key: string): string | null {
  const m = frontmatter.match(new RegExp(`^${key}:\\s*"([^"]+)"`, 'm'));
  return m?.[1] || null;
}

function getCategories(): string[] {
  if (!existsSync(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

function validateCategoryImageDirectory(
  category: string,
  allowedSlugs: Set<string>,
  notices: string[]
): void {
  const categoryImageDir = join(PUBLIC_DIR, 'images', category);
  if (!existsSync(categoryImageDir)) return;

  const files = readdirSync(categoryImageDir).filter((f) => f.toLowerCase().endsWith('.jpg'));
  for (const filename of files) {
    const base = filename.replace(/\.jpg$/i, '');
    if (base === 'image-manifest') continue;

    const isThumb = base.endsWith('-thumb');
    const slug = isThumb ? base.slice(0, -6) : base;
    if (!allowedSlugs.has(slug)) {
      notices.push(
        `${category}: non-slug jpg file detected "${filename}" (expected <slug>.jpg or <slug>-thumb.jpg)`
      );
    }
  }
}

function main(): void {
  if (!existsSync(CONTENT_DIR)) {
    console.error('src/content directory not found');
    process.exit(1);
  }

  const categories = getCategories();
  const errors: string[] = [];
  const notices: string[] = [];
  let totalFiles = 0;

  for (const category of categories) {
    const categoryDir = join(CONTENT_DIR, category);
    const files = readdirSync(categoryDir).filter((f) => f.endsWith('.md'));
    totalFiles += files.length;
    const allowedSlugs = new Set<string>();

    for (const file of files) {
      const filePath = join(categoryDir, file);
      const fileLabel = `${category}/${file}`;
      const content = readFileSync(filePath, 'utf-8');
      const frontmatter = parseFrontmatter(content);
      if (!frontmatter) {
        errors.push(`${fileLabel}: frontmatter missing`);
        continue;
      }

      const frontmatterSlug = extractField(frontmatter, 'slug');
      const slug = frontmatterSlug || basename(file, '.md');
      allowedSlugs.add(slug);
      const image = extractField(frontmatter, 'image');
      const thumb = extractField(frontmatter, 'thumb');
      const expectedImage = `/images/${category}/${slug}.jpg`;
      const expectedThumb = `/images/${category}/${slug}-thumb.jpg`;

      if (image !== expectedImage) {
        errors.push(`${fileLabel}: image must be "${expectedImage}" (actual: ${image || 'missing'})`);
      }

      const imageFs = join(PUBLIC_DIR, expectedImage.replace(/^\//, ''));
      if (!existsSync(imageFs)) {
        errors.push(`${fileLabel}: missing image file ${expectedImage}`);
      }

      if (thumb !== null) {
        if (thumb !== expectedThumb) {
          errors.push(`${fileLabel}: thumb must be "${expectedThumb}" (actual: ${thumb})`);
        }
        const thumbFs = join(PUBLIC_DIR, expectedThumb.replace(/^\//, ''));
        if (!existsSync(thumbFs)) {
          errors.push(`${fileLabel}: missing thumb file ${expectedThumb}`);
        }
      }

      const refs = [...content.matchAll(/!\[[^\]]*]\((\/images\/[^)]+)\)/g)].map((m) => m[1]);
      for (const ref of refs) {
        const fsPath = join(PUBLIC_DIR, ref.replace(/^\//, ''));
        if (!existsSync(fsPath)) {
          errors.push(`${fileLabel}: missing referenced image ${ref}`);
        }

        const categoryPrefix = `/images/${category}/`;
        if (ref.startsWith(categoryPrefix) && ref.toLowerCase().endsWith('.jpg')) {
          const base = basename(ref).replace(/\.jpg$/i, '');
          const normalized = base.endsWith('-thumb') ? base.slice(0, -6) : base;
          if (normalized) allowedSlugs.add(normalized);
        }
      }
    }

    validateCategoryImageDirectory(category, allowedSlugs, notices);
  }

  if (errors.length > 0) {
    console.error('Content image validation failed:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  if (notices.length > 0) {
    console.log('Image validation notices (non-blocking):');
    for (const notice of notices) console.log(`- ${notice}`);
  }

  console.log(`Image validation passed (categories: ${categories.length}, files: ${totalFiles})`);
}

main();
