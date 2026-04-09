import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

function getTrackedSourceFiles(): string[] {
  const output = execSync('rg --files src', {
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.ts') || line.endsWith('.tsx') || line.endsWith('.astro'));
}

function isIgnoredFile(path: string): boolean {
  const normalized = path.replaceAll('\\', '/');

  if (normalized === 'src/lib/governance/index.ts' || normalized === 'src/lib/index.ts') {
    return true;
  }
  if (normalized.includes('src/lib/__tests__/')) {
    return true;
  }
  if (normalized.includes('/migrations/')) {
    return true;
  }
  return false;
}

function hasForbiddenImport(source: string): boolean {
  return /from\s+['"][^'"]*governance-[^'"]*-v\d+['"]/.test(source);
}

function main(): void {
  const files = getTrackedSourceFiles().filter((path) => !isIgnoredFile(path));
  const offenders: string[] = [];

  for (const path of files) {
    const content = readFileSync(path, 'utf8');
    if (hasForbiddenImport(content)) {
      offenders.push(path);
    }
  }

  if (offenders.length > 0) {
    console.error('governance-import-guard: FAIL');
    console.error('Do not import versioned governance modules directly. Use src/lib/governance/index.ts');
    for (const path of offenders) {
      console.error(`- ${path}`);
    }
    process.exit(1);
  }

  console.log('governance-import-guard: OK');
}

main();
