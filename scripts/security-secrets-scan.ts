import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const BLOCK_PATTERNS = [
  /PASSWORD\s*=\s*['"][^'"]+['"]/,
  /DB_PASS\s*=\s*['"][^'"]+['"]/,
  /REDACTED_PUBLIC_READINESS_SECRET/i,
  /CHANGE_ME_CWP_SSH_PASSWORD/i
];

function listScriptFiles(): string[] {
  const output = execSync('rg --files scripts', { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^scripts[\\/]+archive[\\/]/.test(line))
    .filter((line) => !/^scripts[\\/]security-secrets-scan\.ts$/.test(line));
}

function main(): void {
  const files = listScriptFiles();
  const findings: string[] = [];

  for (const file of files) {
    let text = '';
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of BLOCK_PATTERNS) {
        if (pattern.test(line)) {
          findings.push(`${file}:${index + 1}`);
          break;
        }
      }
    });
  }

  if (findings.length > 0) {
    console.error('security-secrets-scan: hardcoded secret patterns found:');
    findings.forEach((item) => console.error(`  - ${item}`));
    process.exit(1);
  }

  console.log(`security-secrets-scan: OK (scanned=${files.length})`);
}

main();
