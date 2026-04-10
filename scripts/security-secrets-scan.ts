import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const BLOCK_PATTERNS = [
  /PASSWORD\s*=\s*['"][^'"]+['"]/,
  /DB_PASS\s*=\s*['"][^'"]+['"]/,
  /REDACTED_PUBLIC_READINESS_SECRET/i,
  /CHANGE_ME_CWP_SSH_PASSWORD/i
];

type AllowlistConfig = {
  entries?: Array<{
    path: string;
    reason?: string;
  }>;
};

function listScriptFiles(): string[] {
  const output = execSync('rg --files scripts', { encoding: 'utf8' });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\\/g, '/'))
    .filter((line) => line.length > 0)
    .filter((line) => !/^scripts[\\/]+archive[\\/]/.test(line))
    .filter((line) => !/^scripts[\\/]+archive[\\/]/.test(line));
}

function loadAllowlist(): Set<string> {
  try {
    const configPath = resolve(process.cwd(), 'config', 'security-secrets-allowlist.json');
    const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as AllowlistConfig;
    return new Set((parsed.entries || []).map((entry) => entry.path.replace(/\\/g, '/')));
  } catch {
    return new Set();
  }
}

function main(): void {
  const files = listScriptFiles();
  const allowlist = loadAllowlist();
  const findings: string[] = [];

  for (const file of files) {
    if (allowlist.has(file)) {
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
