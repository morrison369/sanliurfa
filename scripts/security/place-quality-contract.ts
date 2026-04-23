import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

const requiredFiles = [
  'src/lib/place-quality.ts',
  'src/pages/api/places/add.ts',
  'src/pages/api/places/[id]/update.ts',
  'src/pages/api/places/index.ts',
  'src/pages/api/admin/system/content-quality.ts',
  'src/pages/admin/places/add.astro',
  'src/pages/admin/places/edit/[id].astro',
];

for (const relativePath of requiredFiles) {
  const absolutePath = join(root, ...relativePath.split('/'));
  if (!existsSync(absolutePath)) {
    blockers.push(`missing required file: ${relativePath}`);
  }
}

const apiFiles = [
  'src/pages/api/places/add.ts',
  'src/pages/api/places/[id]/update.ts',
  'src/pages/api/places/index.ts',
];

for (const relativePath of apiFiles) {
  const absolutePath = join(root, ...relativePath.split('/'));
  if (!existsSync(absolutePath)) {
    continue;
  }
  const source = readFileSync(absolutePath, 'utf8');
  if (!source.includes('evaluatePlaceQuality')) {
    blockers.push(`${relativePath} must enforce evaluatePlaceQuality`);
  }
}

const addPagePath = join(root, 'src', 'pages', 'admin', 'places', 'add.astro');
if (existsSync(addPagePath)) {
  const source = readFileSync(addPagePath, 'utf8');
  if (!source.includes('name="gallery_images_urls"')) {
    blockers.push('src/pages/admin/places/add.astro must include gallery_images_urls field');
  }
}

const editPagePath = join(root, 'src', 'pages', 'admin', 'places', 'edit', '[id].astro');
if (existsSync(editPagePath)) {
  const source = readFileSync(editPagePath, 'utf8');
  if (!source.includes('name="gallery_images_urls"')) {
    blockers.push('src/pages/admin/places/edit/[id].astro must include gallery_images_urls field');
  }
}

if (blockers.length > 0) {
  console.error('[place-quality] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[place-quality] ok: active place publish quality threshold is locked');
