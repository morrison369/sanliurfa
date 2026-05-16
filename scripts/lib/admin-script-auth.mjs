import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const scriptsDir = path.resolve(scriptDir, '..');
const projectRoot = path.resolve(scriptsDir, '..');

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '');

    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

let envLoaded = false;

export function initScriptEnv() {
  if (envLoaded) return;
  loadEnv(path.join(scriptsDir, '.env.scripts'));
  loadEnv(path.join(projectRoot, '.env'));
  envLoaded = true;
}

export function readRequiredEnv(name, helpText) {
  initScriptEnv();

  const value = (process.env[name] || '').trim();
  if (value) {
    return value;
  }

  console.error(`❌ ${name} tanımlı değil.`);
  if (helpText) {
    console.error(helpText);
  }
  process.exit(1);
}

export function getAdminCredentials() {
  return {
    email: readRequiredEnv(
      'ADMIN_EMAIL',
      'scripts/.env.scripts veya process env içinde admin e-posta adresini tanımlayın.'
    ),
    password: readRequiredEnv(
      'ADMIN_PASSWORD',
      'scripts/.env.scripts veya process env içinde ADMIN_PASSWORD tanımlayın.'
    ),
  };
}
