import { existsSync, readFileSync } from 'node:fs';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function main(): void {
  const sitemapIndexPath = 'dist/client/sitemap-index.xml';
  assert(existsSync(sitemapIndexPath), `Missing sitemap index: ${sitemapIndexPath}`);

  const sitemapIndexContent = readFileSync(sitemapIndexPath, 'utf8');
  assert(
    sitemapIndexContent.includes('<sitemapindex') && sitemapIndexContent.includes('</sitemapindex>'),
    'Invalid sitemap index XML structure'
  );

  const seoComponentPath = 'src/components/SEOHead.astro';
  assert(existsSync(seoComponentPath), `Missing SEO component: ${seoComponentPath}`);

  const seoContent = readFileSync(seoComponentPath, 'utf8');
  assert(
    seoContent.includes('application/ld+json') || seoContent.includes('schema.org'),
    'SEO structured data marker not found in SEOHead.astro'
  );

  console.log('seo-artifact-check: OK');
}

main();
