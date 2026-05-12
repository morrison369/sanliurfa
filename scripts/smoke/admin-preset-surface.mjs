import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const componentPath = path.join(repoRoot, 'src', 'components', 'admin', 'SiteContentManager.tsx');
const helperPath = path.join(repoRoot, 'src', 'lib', 'admin', 'preset-summary.ts');
const source = fs.readFileSync(componentPath, 'utf8');
const helper = fs.readFileSync(helperPath, 'utf8');

const requiredHelpers = [
  'getPresetCardScopeLabel',
  'getPresetKeyBreakdown',
  'getPresetScopeCounts',
  'getPresetScopeDescription',
  'getPresetScopeLabel',
  'presetMatchesScope',
];

const missingImports = requiredHelpers.filter((name) => !source.includes(name));
const missingHelperFunctions = requiredHelpers.filter(
  (name) => !helper.includes(`export function ${name}`),
);

console.log('admin preset surface smoke');
console.log(` - helper exports: ${requiredHelpers.length}`);

if (missingImports.length || missingHelperFunctions.length) {
  console.error(
    JSON.stringify(
      {
        missingImports,
        missingHelperFunctions,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log('OK: admin preset helper surface is wired');
