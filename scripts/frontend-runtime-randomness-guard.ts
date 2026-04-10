import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FILES = [
  'src/pages/500.astro',
  'src/pages/loading.astro',
  'src/components/admin/ExportButton.astro',
  'src/components/PlaceMap.astro',
  'src/components/Map.astro'
];

function main(): void {
  const root = process.cwd();
  const offenders: string[] = [];

  for (const relativePath of FILES) {
    const content = readFileSync(resolve(root, relativePath), 'utf8');
    if (/Math\.random\s*\(/.test(content)) {
      offenders.push(relativePath);
    }
  }

  if (offenders.length > 0) {
    throw new Error([
      `frontend runtime randomness detected (${offenders.length})`,
      ...offenders.map(file => `- ${file}`)
    ].join('\n'));
  }

  console.log(`frontend-runtime-randomness-guard: OK (files=${FILES.length})`);
}

main();
