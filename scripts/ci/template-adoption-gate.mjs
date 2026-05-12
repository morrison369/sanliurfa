#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [
  {
    file: 'src/pages/index.astro',
    mustInclude: "import LandingTemplate from '../components/templates/LandingTemplate.astro';",
  },
  {
    file: 'src/pages/mekanlar/index.astro',
    mustInclude: "import ListingTemplate from '../../components/templates/ListingTemplate.astro';",
  },
  {
    file: 'src/pages/gezilecek-yerler/index.astro',
    mustInclude: "import ListingTemplate from '../../components/templates/ListingTemplate.astro';",
  },
  {
    file: 'src/pages/isletme/index.astro',
    mustInclude: "import ListingTemplate from '../../components/templates/ListingTemplate.astro';",
  },
  {
    file: 'src/pages/isletme/[slug].astro',
    mustInclude: "import DetailTemplate from '../../components/templates/DetailTemplate.astro';",
  },
  {
    file: 'src/pages/isletme/[slug].astro',
    mustInclude: "import PublicDetailHero from '../../components/public/PublicDetailHero.astro';",
  },
  {
    file: 'src/pages/isletme/[slug].astro',
    mustInclude: "import PublicInfoRows from '../../components/public/PublicInfoRows.astro';",
  },
  {
    file: 'src/pages/isletme/[slug].astro',
    mustInclude: "import PublicMediaGallery from '../../components/public/PublicMediaGallery.astro';",
  },
  {
    file: 'src/pages/isletme/[slug].astro',
    mustInclude: "import PublicReviewList from '../../components/public/PublicReviewList.astro';",
  },
  {
    file: 'src/pages/gezilecek-yerler/[slug].astro',
    mustInclude: "import DetailTemplate from '../../components/templates/DetailTemplate.astro';",
  },
  {
    file: 'src/pages/blog/[slug].astro',
    mustInclude: "import EditorialTemplate from '../../components/templates/EditorialTemplate.astro';",
  },
  {
    file: 'src/pages/blog/[slug].astro',
    mustInclude: '<EditorialTemplate seo={seo}>',
  },
  {
    file: 'src/pages/blog/index.astro',
    mustInclude: "import PublicPageIntro from '../../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/etkinlikler/index.astro',
    mustInclude: "import PublicPageIntro from '../../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/etkinlikler/index.astro',
    mustInclude: "import PublicCollectionList from '../../components/public/PublicCollectionList.astro';",
  },
  {
    file: 'src/pages/ilceler/index.astro',
    mustInclude: "import PublicPageIntro from '../../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/yemek-tarifleri/index.astro',
    mustInclude: "import PublicPageIntro from '../../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/tarihi-yerler/index.astro',
    mustInclude: "import PublicPageIntro from '../../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/sanliurfada-ne-yenir.astro',
    mustInclude: "import PublicPageIntro from '../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/oneriler.astro',
    mustInclude: "import PublicPageIntro from '../components/public/PublicPageIntro.astro';",
  },
  {
    file: 'src/pages/blog/[slug].astro',
    mustInclude: "import PublicDetailHero from '../../components/public/PublicDetailHero.astro';",
  },
  {
    file: 'src/pages/blog/[slug].astro',
    mustInclude: "import PublicContentSection from '../../components/public/PublicContentSection.astro';",
  },
  {
    file: 'src/pages/blog/[slug].astro',
    mustInclude: "import PublicRichProse from '../../components/public/PublicRichProse.astro';",
  },
  {
    file: 'src/pages/tarihi-yerler/[slug].astro',
    mustInclude: "import PublicDetailHero from '../../components/public/PublicDetailHero.astro';",
  },
  {
    file: 'src/pages/tarihi-yerler/[slug].astro',
    mustInclude: "import PublicInfoRows from '../../components/public/PublicInfoRows.astro';",
  },
  {
    file: 'src/pages/tarihi-yerler/[slug].astro',
    mustInclude: "import PublicMediaGallery from '../../components/public/PublicMediaGallery.astro';",
  },
  {
    file: 'src/pages/yemek-tarifleri/[slug].astro',
    mustInclude: "import PublicDetailHero from '../../components/public/PublicDetailHero.astro';",
  },
  {
    file: 'src/pages/yemek-tarifleri/[slug].astro',
    mustInclude: "import PublicDetailBody from '../../components/public/PublicDetailBody.astro';",
  },
  {
    file: 'src/pages/yemek-tarifleri/[slug].astro',
    mustInclude: "import PublicContentSection from '../../components/public/PublicContentSection.astro';",
  },
  {
    file: 'src/pages/etkinlikler/[slug].astro',
    mustInclude: "import PublicDetailHero from '../../components/public/PublicDetailHero.astro';",
  },
  {
    file: 'src/pages/gezilecek-yerler/[slug].astro',
    mustInclude: "import PublicDetailHero from '../../components/public/PublicDetailHero.astro';",
  },
  {
    file: 'src/pages/gezilecek-yerler/[slug].astro',
    mustInclude: "import PublicDetailBody from '../../components/public/PublicDetailBody.astro';",
  },
  {
    file: 'src/pages/gezilecek-yerler/[slug].astro',
    mustInclude: "import PublicContentSection from '../../components/public/PublicContentSection.astro';",
  },
  {
    file: 'src/pages/gezilecek-yerler/[slug].astro',
    mustInclude: "import PublicRichProse from '../../components/public/PublicRichProse.astro';",
  },
  {
    file: 'src/pages/mekanlar/[kategori].astro',
    mustInclude: "import PublicCollectionHero from '../../components/public/PublicCollectionHero.astro';",
  },
  {
    file: 'src/pages/mekanlar/[kategori].astro',
    mustInclude: "import PublicCollectionBody from '../../components/public/PublicCollectionBody.astro';",
  },
  {
    file: 'src/pages/ilceler/[ilce]/index.astro',
    mustInclude: "import PublicCollectionHero from '../../../components/public/PublicCollectionHero.astro';",
  },
  {
    file: 'src/pages/ilceler/[ilce]/index.astro',
    mustInclude: "import PublicCollectionBody from '../../../components/public/PublicCollectionBody.astro';",
  },
  {
    file: 'src/pages/ilceler/[ilce]/[kategori].astro',
    mustInclude: "import PublicCollectionHero from '../../../components/public/PublicCollectionHero.astro';",
  },
  {
    file: 'src/pages/ilceler/[ilce]/[kategori].astro',
    mustInclude: "import PublicCollectionBody from '../../../components/public/PublicCollectionBody.astro';",
  },
  {
    file: 'src/pages/etkinlikler/[slug].astro',
    mustInclude: "import PublicCollectionHero from '../../components/public/PublicCollectionHero.astro';",
  },
  {
    file: 'src/pages/etkinlikler/[slug].astro',
    mustInclude: "import PublicCollectionBody from '../../components/public/PublicCollectionBody.astro';",
  },
  {
    file: 'src/pages/etkinlikler/[slug].astro',
    mustInclude: "import PublicDetailBody from '../../components/public/PublicDetailBody.astro';",
  },
];

for (const check of checks) {
  const full = path.join(root, check.file);
  if (!fs.existsSync(full)) {
    console.error(`template-adoption-gate: missing file ${check.file}`);
    process.exit(1);
  }
  const raw = fs.readFileSync(full, 'utf8');
  if (!raw.includes(check.mustInclude)) {
    console.error(`template-adoption-gate: ${check.file} missing required template import`);
    process.exit(1);
  }
}

console.log('template-adoption-gate: PASS');
