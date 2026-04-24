import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { pool, query } from '../../src/lib/postgres';

type UrlGroup = {
  mekanlar: string[];
  yemeIcme: string[];
  gezilecekYerler: string[];
  diger: string[];
};

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'tr'));
}

function parseRequiredUrls(txtContent: string): UrlGroup {
  const lines = txtContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('/'));

  const mekanlar: string[] = [];
  const yemeIcme: string[] = [];
  const gezilecekYerler: string[] = [];
  const diger: string[] = [];

  for (const line of lines) {
    const clean = line.replace(/\/+$/, '');
    const parts = clean.split('/').filter(Boolean);
    const root = parts[0];
    const slug = parts[1];

    if (root === 'mekanlar' && slug) {
      mekanlar.push(slug);
      continue;
    }
    if (root === 'yeme-icme' && slug) {
      yemeIcme.push(slug);
      continue;
    }
    if (root === 'gezilecek-yerler' && slug) {
      gezilecekYerler.push(slug);
      continue;
    }

    diger.push(clean);
  }

  return {
    mekanlar: uniqueSorted(mekanlar),
    yemeIcme: uniqueSorted(yemeIcme),
    gezilecekYerler: uniqueSorted(gezilecekYerler),
    diger: uniqueSorted(diger),
  };
}

async function getActiveCategorySlugs(): Promise<string[]> {
  const result = await query<{ slug: string }>(
    'SELECT slug FROM categories WHERE is_active = true ORDER BY slug'
  );
  return uniqueSorted(result.rows.map((r) => r.slug).filter(Boolean));
}

async function main() {
  const repoRoot = process.cwd();
  const txtPath = path.resolve(repoRoot, '..', 'kategoriler.txt');
  const docsDir = path.resolve(repoRoot, 'docs');
  const outputPath = path.resolve(docsDir, 'category-gap-report.json');

  const txtContent = await readFile(txtPath, 'utf-8');
  const required = parseRequiredUrls(txtContent);

  let activeCategorySlugs: string[] = [];
  let dbError: string | null = null;

  try {
    activeCategorySlugs = await getActiveCategorySlugs();
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
  }

  const missingMekanSlugsInDb = required.mekanlar.filter(
    (slug) => !activeCategorySlugs.includes(slug)
  );

  const homepageQuickCategorySlugs = [
    'kebapcilar',
    'cigerciler',
    'lahmacuncular',
    'pideciler',
    'cig-kofteciler',
    'yoresel-yemekler',
    'kahvalti-mekanlari',
    'tatlicilar',
    'firinlar',
    'pastaneler',
    'kafeler',
    'cay-bahceleri',
    'balik-restoranlari',
  ];

  const missingOnHomepageQuick = required.mekanlar.filter(
    (slug) => !homepageQuickCategorySlugs.includes(slug)
  );

  const report = {
    generatedAt: new Date().toISOString(),
    source: {
      txtPath,
      totalRequiredMekan: required.mekanlar.length,
      totalRequiredYemeIcme: required.yemeIcme.length,
      totalRequiredGezilecekYerler: required.gezilecekYerler.length,
    },
    required,
    homepageQuickCategorySlugs,
    gaps: {
      missingMekanSlugsInDb,
      missingOnHomepageQuick,
    },
    database: {
      available: !dbError,
      activeCategoryCount: activeCategorySlugs.length,
      error: dbError,
    },
  };

  await mkdir(docsDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

  console.log('Kategori gap raporu üretildi:');
  console.log(`- Kaynak: ${txtPath}`);
  console.log(`- Çıktı: ${outputPath}`);
  console.log(`- Mekan slug (txt): ${required.mekanlar.length}`);
  console.log(`- DB aktif kategori: ${activeCategorySlugs.length}`);
  console.log(`- DB eksik slug: ${missingMekanSlugsInDb.length}`);
  console.log(`- Ana sayfa quick eksik slug: ${missingOnHomepageQuick.length}`);
  if (dbError) {
    console.log(`- DB notu: ${dbError}`);
  }
}

main()
  .catch((error) => {
    console.error('Kategori gap raporu üretilemedi:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
