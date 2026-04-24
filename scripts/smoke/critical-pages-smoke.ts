import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

const requiredPageFiles = [
  'src/pages/index.astro',
  'src/pages/saglik/nobetci-eczaneler.astro',
  'src/pages/ulasim/otobus-saatleri.astro',
  'src/pages/ulasim/ucak-saatleri.astro',
  'src/pages/mekanlar/index.astro',
  'src/pages/places/[slug].astro',
  'src/pages/admin/site-content.astro',
];

const requiredContentBuckets = ['places', 'blog', 'tarihi-yerler'];

function checkRequiredFiles(errors: string[]) {
  for (const rel of requiredPageFiles) {
    const full = join(ROOT, rel);
    if (!existsSync(full)) {
      errors.push(`Eksik sayfa dosyası: ${rel}`);
    }
  }
}

function checkContentBuckets(errors: string[]) {
  for (const bucket of requiredContentBuckets) {
    const dir = join(ROOT, 'src', 'content', bucket);
    if (!existsSync(dir)) {
      errors.push(`Eksik content bucket: src/content/${bucket}`);
      continue;
    }
    const mdCount = readdirSync(dir).filter((f) => f.endsWith('.md')).length;
    if (mdCount === 0) {
      errors.push(`Boş content bucket: src/content/${bucket}`);
    }
  }
}

function checkImageManifest(errors: string[]) {
  const manifest = join(ROOT, 'public', 'images', 'image-manifest.json');
  if (!existsSync(manifest)) {
    errors.push('Eksik görsel manifest: public/images/image-manifest.json');
  }
}

function main() {
  const errors: string[] = [];
  checkRequiredFiles(errors);
  checkContentBuckets(errors);
  checkImageManifest(errors);

  if (errors.length > 0) {
    console.error('Critical pages smoke failed:');
    for (const err of errors) console.error(`- ${err}`);
    process.exit(1);
  }

  console.log('Critical pages smoke passed');
}

main();
