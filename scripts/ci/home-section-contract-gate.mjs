#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const homeDir = path.join(root, 'src', 'components', 'home');
const contractPath = path.join(homeDir, 'section-contract.ts');

if (!fs.existsSync(contractPath)) {
  console.error('home-section-contract-gate: missing src/components/home/section-contract.ts');
  process.exit(1);
}

const shouldUseContract = fs
  .readdirSync(homeDir)
  .filter((f) => /Section\.astro$/.test(f));
const offenders = [];
const legacySectionBaseline = new Set([
  // Baseline debt: pre-contract agency/static sections. New Section.astro files must import the contract.
  'AgencyBlogSection.astro',
  'AgencyDistrictsSection.astro',
  'AgencyFeaturedPlacesSection.astro',
  'AgencyHeroSection.astro',
  'AgencyHistoricalSitesSection.astro',
  'AgencyMainCategoriesSection.astro',
  'AgencyRecipesSection.astro',
  'LandingCtaSection.astro',
  'LiveCityDataSection.astro',
]);

for (const file of shouldUseContract) {
  if (legacySectionBaseline.has(file)) continue;
  const raw = fs.readFileSync(path.join(homeDir, file), 'utf8');
  const hasContractImport = raw.includes("from './section-contract'") || raw.includes('from "./section-contract"');
  if (!hasContractImport) offenders.push(file);
}

if (offenders.length > 0) {
  console.error('home-section-contract-gate: these files do not import section-contract:');
  for (const o of offenders) console.error(` - ${o}`);
  process.exit(1);
}

console.log('home-section-contract-gate: PASS');
