#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const requiredTemplates = [
  'src/components/templates/LandingTemplate.astro',
  'src/components/templates/ListingTemplate.astro',
  'src/components/templates/DetailTemplate.astro',
  'src/components/templates/EditorialTemplate.astro',
  'src/components/public/PublicPageIntro.astro',
  'src/components/public/PublicDetailHero.astro',
  'src/components/public/PublicCollectionHero.astro',
  'src/components/public/PublicCollectionBody.astro',
  'src/components/public/PublicDetailBody.astro',
  'src/components/public/PublicSidebarCard.astro',
  'src/components/public/PublicFaqList.astro',
  'src/components/public/PublicRelatedList.astro',
  'src/components/public/PublicRelatedGrid.astro',
  'src/components/public/PublicMetricGrid.astro',
  'src/components/public/PublicInfoGrid.astro',
  'src/components/public/PublicInfoRows.astro',
  'src/components/public/PublicMediaGallery.astro',
  'src/components/public/PublicReviewList.astro',
  'src/components/public/PublicCollectionList.astro',
  'src/components/public/PublicContentSection.astro',
  'src/components/public/PublicRichProse.astro',
];

for (const rel of requiredTemplates) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`page-template-system-gate: missing ${rel}`);
    process.exit(1);
  }
}

const policyDoc = path.join(root, 'docs/PAGE_TEMPLATE_SYSTEM.md');
if (!fs.existsSync(policyDoc)) {
  console.error('page-template-system-gate: missing docs/PAGE_TEMPLATE_SYSTEM.md');
  process.exit(1);
}

console.log('page-template-system-gate: PASS');
