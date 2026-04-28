#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function loadEnvFile(name) {
  const envPath = join(process.cwd(), name);
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || !line.includes('=')) continue;
    const idx = line.indexOf('=');
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const unsplash = (process.env.UNSPLASH_ACCESS_KEY || '').trim();
const pexels = (process.env.PEXELS_API_KEY || '').trim();

if (!unsplash && !pexels) {
  console.error('Image API key missing: UNSPLASH_ACCESS_KEY veya PEXELS_API_KEY gereklidir.');
  process.exit(1);
}

const keyStatus = (v) => (v ? 'configured' : 'missing');
console.log(`Image keys ready | UNSPLASH=${keyStatus(unsplash)} | PEXELS=${keyStatus(pexels)}`);
