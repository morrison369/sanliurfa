import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ENV_FILES = ['.env', '.env.local'];

export function loadLocalEnv(cwd: string = process.cwd()): void {
  const candidateDirs = [cwd, path.resolve(cwd, '..')];
  const scanned = new Set<string>();

  for (const dir of candidateDirs) {
    const normalizedDir = path.resolve(dir);
    if (scanned.has(normalizedDir)) {
      continue;
    }
    scanned.add(normalizedDir);

    for (const file of ENV_FILES) {
      const envPath = path.join(normalizedDir, file);
      if (!existsSync(envPath)) {
        continue;
      }

      const content = readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || !line.includes('=')) {
          continue;
        }

        const idx = line.indexOf('=');
        const key = line.slice(0, idx).trim();
        if (!key || process.env[key] !== undefined) {
          continue;
        }

        let value = line.slice(idx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }

        process.env[key] = value;
      }
    }
  }
}
