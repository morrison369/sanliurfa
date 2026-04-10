import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const LEGACY_REF_REGEX = /scripts[\\/]+archive[\\/]+legacy-insecure[\\/]+/i;
const SELF_PATH = 'scripts/legacy-insecure-usage-guard.ts';

function getTrackedFiles(): string[] {
  const output = execSync('git ls-files', { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isSkippable(filePath: string): boolean {
  if (filePath.startsWith('scripts/archive/legacy-insecure/')) return true;
  if (filePath === SELF_PATH) return true;
  if (filePath.endsWith('.md')) return true;
  return false;
}

function findViolations(files: string[]): string[] {
  const violations: string[] = [];

  for (const filePath of files) {
    if (isSkippable(filePath)) continue;

    let content = '';
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (LEGACY_REF_REGEX.test(line)) {
        violations.push(`${filePath}:${index + 1}`);
      }
    }
  }

  return violations;
}

function main(): void {
  const files = getTrackedFiles();
  const violations = findViolations(files);

  if (violations.length > 0) {
    console.error('legacy-insecure-usage-guard: FAIL');
    for (const violation of violations) {
      console.error(` - ${violation}`);
    }
    process.exit(1);
  }

  console.log('legacy-insecure-usage-guard: OK');
}

main();
