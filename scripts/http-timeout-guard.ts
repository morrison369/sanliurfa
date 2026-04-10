import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ALLOWLIST = new Set([
  'src/lib/http.ts',
]);

function listFiles(): string[] {
  const output = execSync('rg --files src/lib scripts', { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, '/'))
    .filter(Boolean)
    .filter((line) => !line.includes('__tests__'));
}

function main(): void {
  const findings: string[] = [];

  for (const file of listFiles()) {
    if (ALLOWLIST.has(file)) {
      continue;
    }

    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/\bfetch\s*\(/.test(line) && /\btimeout\s*:/.test(line)) {
        findings.push(`${file}:${index + 1} direct fetch timeout option is forbidden`);
      }

      if (/AbortController\s*\(/.test(line)) {
        findings.push(`${file}:${index + 1} use fetchWithTimeout instead of local AbortController`);
      }
    });
  }

  if (findings.length > 0) {
    console.error('http-timeout-guard: violations found:');
    findings.forEach((finding) => console.error(`  - ${finding}`));
    process.exit(1);
  }

  console.log('http-timeout-guard: OK');
}

main();
