#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = ['e2e/home.visual.spec.ts', 'playwright.config.ts'];
const specPath = path.join(root, 'e2e/home.visual.spec.ts');

for (const rel of required) {
  if (!fs.existsSync(path.join(root, rel))) {
    console.error(`visual-regression-gate: missing ${rel}`);
    process.exit(1);
  }
}

const spec = fs.readFileSync(specPath, 'utf8');
const hasScreenshotAssertion =
  /toHaveScreenshot\s*\(/.test(spec) || /expect\s*\(\s*.*screenshot/i.test(spec);
const hasDesktopOrMobileProject =
  /project\s*:\s*['"`](chromium|mobile|desktop)['"`]/i.test(spec) ||
  /devices\./.test(spec) ||
  /test\.use\s*\(\s*\{[^}]*viewport/i.test(spec) ||
  /setViewportSize\s*\(/.test(spec);

if (!hasScreenshotAssertion) {
  console.error(
    'visual-regression-gate: e2e/home.visual.spec.ts must include screenshot assertion (toHaveScreenshot)',
  );
  process.exit(1);
}

if (!hasDesktopOrMobileProject) {
  console.error(
    'visual-regression-gate: e2e/home.visual.spec.ts should include desktop/mobile visual context (project/device/viewport)',
  );
  process.exit(1);
}

console.log('visual-regression-gate: PASS (visual assertion presence verified)');
