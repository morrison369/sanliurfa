import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const componentPath = path.join(repoRoot, 'src', 'components', 'admin', 'SiteContentManager.tsx');
const source = fs.readFileSync(componentPath, 'utf8');

const quickBlock = source.match(/const adminQuickSections = \[([\s\S]*?)\];/);
if (!quickBlock) {
  console.error('admin quick nav smoke failed: adminQuickSections block not found');
  process.exit(1);
}

const quickSections = [...quickBlock[1].matchAll(/'([^']+)'/g)].map((match) => match[1]);
const formTitles = [...source.matchAll(/<FormEditorCard title="([^"]+)"/g)].map((match) => match[1]);
const manualAnchors = [...source.matchAll(/createAdminAnchorId\('([^']+)'\)/g)].map((match) => match[1]);
const targetTitles = new Set([...formTitles, ...manualAnchors]);

const missingTargets = quickSections.filter((title) => !targetTitles.has(title));
const missingQuickLinks = formTitles.filter((title) => !quickSections.includes(title));
const duplicateQuickLinks = quickSections.filter((title, index) => quickSections.indexOf(title) !== index);

const summary = {
  quickCount: quickSections.length,
  formCount: formTitles.length,
  manualAnchorCount: manualAnchors.length,
  missingTargets,
  missingQuickLinks,
  duplicateQuickLinks,
};

console.log('admin quick nav integrity smoke');
console.log(` - quick links: ${summary.quickCount}`);
console.log(` - form cards: ${summary.formCount}`);
console.log(` - manual anchors: ${summary.manualAnchorCount}`);

if (missingTargets.length || missingQuickLinks.length || duplicateQuickLinks.length) {
  console.error(JSON.stringify(summary, null, 2));
  process.exit(1);
}

console.log('OK: admin quick nav targets are complete');
