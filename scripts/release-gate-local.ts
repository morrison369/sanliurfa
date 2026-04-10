import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ENV_FILES = ['.env.production', '.env.local', '.env'];

function loadEnvFile(path: string): void {
  const content = readFileSync(path, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key]) {
      continue;
    }

    process.env[key] = value.replace(/^['"]|['"]$/g, '');
  }
}

function main(): void {
  const root = process.cwd();

  for (const file of ENV_FILES) {
    const path = resolve(root, file);
    if (existsSync(path)) {
      loadEnvFile(path);
    }
  }

  execSync('npm run release:gate', { stdio: 'inherit', env: process.env });
}

main();
