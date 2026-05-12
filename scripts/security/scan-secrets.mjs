#!/usr/bin/env node
import fs from 'node:fs';
import process from 'node:process';
import { execSync } from 'node:child_process';
import path from 'node:path';

const ignoreFiles = new Set([
  '.env.example',
  'package-lock.json',
  'lighthouse-report.json',
]);

const ignoreDirs = new Set([
  '.astro',
  '.git',
  '.idea',
  '.next',
  '.vscode',
  'backups',
  'certs',
  'coverage',
  'dist',
  'logs',
  'node_modules',
  'ssl',
  'tmp',
  'uploads',
]);

const detectors = [
  { name: 'unsplash_access_key', regex: /\bUNSPLASH_ACCESS_KEY\s*=\s*([^\s#]+)/g, envLike: true },
  { name: 'unsplash_secret_key', regex: /\bUNSPLASH_SECRET_KEY\s*=\s*([^\s#]+)/g, envLike: true },
  { name: 'pexels_api_key', regex: /\bPEXELS_API_KEY\s*=\s*([^\s#]+)/g, envLike: true },
  {
    name: 'postgres_url_password',
    regex: /\b(?:DATABASE_URL|SUPABASE_URL)\s*=\s*postgres(?:ql)?:\/\/[^:\s]+:([^@\s]+)@/g,
  },
  { name: 'db_password', regex: /\b(?:DB_PASSWORD|PGPASSWORD)\s*=\s*([^\s#]+)/g, envLike: true },
  {
    name: 'python_ssh_password_literal',
    regex: /\b(?:PASS|PASSWORD)\s*=\s*['"]([^'"]{8,})['"]/g,
  },
  {
    name: 'paramiko_password_literal',
    regex: /\b(?:ssh|client)\.connect\([^)]*\bpassword\s*=\s*['"]([^'"]{8,})['"]/g,
  },
  { name: 'stripe_test_secret', regex: /\bsk_test_[0-9A-Za-z]{20,}\b/g },
  { name: 'stripe_live_secret', regex: /\bsk_live_[0-9A-Za-z]{20,}\b/g },
  { name: 'stripe_webhook_secret', regex: /\bwhsec_[0-9A-Za-z]{20,}\b/g },
  { name: 'generic_private_key_block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

const safePlaceholder = (raw) => {
  const value = String(raw).trim().replace(/^['"]|['"]$/g, '');
  return value === ''
    || value.includes('CHANGE_ME')
    || value.includes('YOUR_')
    || value.includes('STRONG_PASSWORD')
    || value.includes('SIFRENIZ')
    || value.includes('{DB_PASS}')
    || value.includes('{DB_PASSWORD}')
    || value.includes('PASSWORD_HERE')
    || value === 'postgres'
    || value === 'pass'
    || value === 'user:pass'
    || value === 'xxx'
    || value === 'yyy'
    || value.startsWith('test-')
    || value.startsWith('change-this-')
    || value.startsWith('another-secure-random-string');
};

function shouldIgnore(relPath) {
  const normalizedPath = relPath.replace(/\\/g, '/');
  const baseName = path.posix.basename(normalizedPath);
  if (ignoreFiles.has(relPath)) return true;
  if (/^\.env(?:$|\.)/i.test(baseName) && !/(example|template)/i.test(baseName)) return true;
  return normalizedPath.endsWith('.png')
    || normalizedPath.endsWith('.jpg')
    || normalizedPath.endsWith('.jpeg')
    || normalizedPath.endsWith('.webp')
    || normalizedPath.endsWith('.gif')
    || normalizedPath.endsWith('.ico')
    || normalizedPath.endsWith('.woff')
    || normalizedPath.endsWith('.woff2')
    || normalizedPath.endsWith('.zip')
    || normalizedPath.endsWith('.pdf')
    || normalizedPath.endsWith('.pyc');
}

function walkFiles(dir, root = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      files.push(...walkFiles(fullPath, root));
      continue;
    }
    const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
    if (!shouldIgnore(relPath)) files.push(relPath);
  }
  return files;
}

function getCandidateFiles() {
  try {
    return execSync('git ls-files', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((relPath) => !shouldIgnore(relPath));
  } catch {
    return walkFiles(process.cwd());
  }
}

const trackedFiles = getCandidateFiles();

const envLikeFile = (relPath) =>
  /(^|\/)\.env(\.|$)|\.(ya?ml|json|toml|ini|cfg|conf)$/i.test(relPath);

const findings = [];
for (const rel of trackedFiles) {
  let content = '';
  try {
    content = fs.readFileSync(rel, 'utf8');
  } catch {
    continue;
  }

  for (const detector of detectors) {
    if (detector.envLike && !envLikeFile(rel)) continue;
    const matches = [...content.matchAll(detector.regex)];
    if (matches.length === 0) continue;
    for (const match of matches.slice(0, 5)) {
      const raw = match[1] || match[0];
      if (raw.includes('your_') || raw.includes('example') || raw.includes('placeholder')) {
        continue;
      }
      if (safePlaceholder(raw)) continue;
      if (/^(x+|y+|z+|\.{3,})$/i.test(raw)) continue;
      findings.push({
        detector: detector.name,
        file: rel,
        sample: `${raw.slice(0, 6)}...${raw.slice(-4)}`,
      });
    }
  }
}

if (findings.length > 0) {
  console.error('Potential secret leakage detected:');
  for (const item of findings) {
    console.error(` - [${item.detector}] ${item.file} :: ${item.sample}`);
  }
  process.exit(1);
}

console.log('No high-risk secrets detected.');
