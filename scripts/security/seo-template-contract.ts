import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const blockers: string[] = [];

interface FileContract {
  path: string;
  requiredTokens: string[];
}

const contracts: FileContract[] = [
  {
    path: 'src/pages/index.astro',
    requiredTokens: ['<Layout seo={seo}>', 'schemaMode: "replace" as const', 'canonicalUrl'],
  },
  {
    path: 'src/pages/places/[slug].astro',
    requiredTokens: ['<Layout seo={seo}>', 'buildPlaceRichSnippet', 'buildBreadcrumbSchema', 'canonicalUrl'],
  },
  {
    path: 'src/pages/blog/[slug].astro',
    requiredTokens: ['<Layout seo={seo}>', 'buildArticleRichSnippet', 'buildBreadcrumbSchema', 'canonicalUrl'],
  },
  {
    path: 'src/pages/etkinlikler/[slug].astro',
    requiredTokens: ['<Layout seo={seo}>', 'buildEventRichSnippet', 'buildBreadcrumbSchema', 'canonicalUrl'],
  },
];

for (const contract of contracts) {
  const absolutePath = join(root, ...contract.path.split('/'));
  if (!existsSync(absolutePath)) {
    blockers.push(`missing required SEO page: ${contract.path}`);
    continue;
  }

  const source = readFileSync(absolutePath, 'utf8');
  for (const token of contract.requiredTokens) {
    if (!source.includes(token)) {
      blockers.push(`${contract.path} missing SEO token: ${token}`);
    }
  }
}

if (blockers.length > 0) {
  console.error('[seo-template] BLOCKED');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  process.exit(1);
}

console.log('[seo-template] ok: critical page SEO template contract is locked');
