import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildReactSurfaceAuditMarkdown,
  summarizeReactSurfaceAudit,
} from '../src/lib/react-surface-audit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(repoRoot, 'src');
const reportJsonPath = path.join(repoRoot, 'docs', 'reports', 'react-surface-audit.json');
const reportMdPath = path.join(repoRoot, 'docs', 'reports', 'react-surface-audit.md');

const walk = (dir: string, files: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
};

const toRepoPath = (filePath: string) => path.relative(repoRoot, filePath).replace(/\\/g, '/');
const sourceFiles = walk(srcRoot).filter((file) => /\.(astro|ts|tsx|js|mjs|cjs)$/.test(file));
const tsxFiles = sourceFiles.filter((file) => file.endsWith('.tsx')).map(toRepoPath);
const hookFiles = sourceFiles
  .filter((file) => file.endsWith('.ts'))
  .filter((file) => /src\\(hooks|lib)\\/.test(file))
  .filter((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return text.includes("from 'react'") || text.includes('from "react"');
  })
  .map(toRepoPath)
  .sort();
const runtimeUsageCandidates = [...sourceFiles, path.join(repoRoot, 'astro.config.mjs')];
const runtimeUsages = runtimeUsageCandidates
  .filter((file) => fs.existsSync(file))
  .filter((file) => !file.endsWith('.tsx'))
  .filter((file) => !/\.test\.ts$/.test(file))
  .filter((file) => !/react-surface-audit\.(ts|md|json)$/.test(file.replace(/\\/g, '/')))
  .filter((file) => {
    const text = fs.readFileSync(file, 'utf8');
    return text.includes('@astrojs/react')
      || text.includes('client:only="react"')
      || text.includes("client:only='react'")
      || text.includes('client:only={React}')
      || text.includes('client:load') && text.includes('.tsx');
  })
  .map(toRepoPath)
  .sort();

const report = summarizeReactSurfaceAudit({
  tsxFiles,
  hookFiles,
  runtimeUsages,
});

fs.writeFileSync(reportJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(reportMdPath, buildReactSurfaceAuditMarkdown(report), 'utf8');

console.log(
  `react-surface-audit: OK (tsx=${report.tsxCount}, hooks=${report.hookCount}, runtime_usages=${report.runtimeUsageCount}, remove_astro_react=${report.canRemoveAstroReactIntegration}, remove_packages=${report.canRemoveReactPackages})`,
);
