#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'ssh2';

const root = process.cwd();
const envFile = path.join(root, 'scripts', '.env.scripts');
const docsJsonPath = path.join(root, 'docs', 'access-log-probe.json');
const docsMdPath = path.join(root, 'docs', 'access-log-probe.md');

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value) env[key] = value;
  }

  return env;
}

function parseArgs(argv) {
  return {
    write: !argv.includes('--no-write'),
  };
}

async function runRemoteProbe(env) {
  const host = (env.SSH_HOST || '').trim();
  const port = Number((env.SSH_PORT || '77').trim());
  const username = (env.SSH_USER || '').trim();
  const password = (env.SSH_PASS || '').trim();

  const candidates = [
    '/usr/local/apache/domlogs/sanliurfa.com',
    '/usr/local/apache/domlogs/www.sanliurfa.com',
    '/var/log/nginx/access.log',
    '/var/log/httpd/access_log',
    '$HOME/access-logs',
    '$HOME/logs',
    '$HOME/public_html/logs',
  ];

  const command = [
    'for p in',
    ...candidates,
    '; do',
    '  if [ -e "$p" ]; then',
    '    echo "__PATH__:$p";',
    '    if [ -f "$p" ]; then',
    '      echo "__TYPE__:file";',
    '      head -n 2 "$p" 2>/dev/null || true;',
    '    elif [ -d "$p" ]; then',
    '      echo "__TYPE__:dir";',
    '      for f in "$p"/*; do [ -f "$f" ] || continue; echo "__FILE__:$f"; head -n 1 "$f" 2>/dev/null || true; done;',
    '    fi;',
    '  fi;',
    'done',
  ].join(' ');

  return await new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(command, (error, stream) => {
        if (error) {
          conn.end();
          reject(error);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', () => {
          conn.end();
          if (stderr.trim()) {
            reject(new Error(stderr.trim()));
            return;
          }
          resolve(stdout);
        });

        stream.on('data', (chunk) => {
          stdout += chunk.toString();
        });

        stream.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
      });
    });

    conn.on('error', reject);
    conn.connect({
      host,
      port,
      username,
      password,
      readyTimeout: 20000,
      tryKeyboard: false,
    });
  });
}

function resolveCandidatePath(candidate) {
  if (candidate.startsWith('$HOME/')) {
    return path.join(process.env.HOME || '', candidate.slice('$HOME/'.length));
  }
  return candidate;
}

function readFirstLine(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split(/\r?\n/).find((line) => line.trim()) || '';
  } catch {
    return '';
  }
}

function runLocalProbe() {
  const candidates = [
    '/usr/local/apache/domlogs/sanliurfa.com',
    '/usr/local/apache/domlogs/www.sanliurfa.com',
    '/var/log/nginx/access.log',
    '/var/log/httpd/access_log',
    '$HOME/access-logs',
    '$HOME/logs',
    '$HOME/public_html/logs',
  ];

  const lines = [];
  for (const candidate of candidates) {
    const resolved = resolveCandidatePath(candidate);
    if (!resolved || !fs.existsSync(resolved)) continue;

    lines.push(`__PATH__:${resolved}`);
    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
      lines.push('__TYPE__:file');
      const line = readFirstLine(resolved);
      if (line) lines.push(line);
      continue;
    }

    if (stat.isDirectory()) {
      lines.push('__TYPE__:dir');
      for (const entry of fs.readdirSync(resolved, { withFileTypes: true })) {
        if (!entry.isFile()) continue;
        const filePath = path.join(resolved, entry.name);
        lines.push(`__FILE__:${filePath}`);
        const line = readFirstLine(filePath);
        if (line) lines.push(line);
      }
    }
  }

  return lines.join('\n');
}

function parseProbeOutput(stdout) {
  const lines = stdout.split(/\r?\n/);
  const paths = [];
  let current = null;

  for (const line of lines) {
    if (line.startsWith('__PATH__:')) {
      current = {
        path: line.replace('__PATH__:', '').trim(),
        type: 'unknown',
        sample: [],
      };
      paths.push(current);
      continue;
    }
    if (!current) continue;
    if (line.startsWith('__TYPE__:')) {
      current.type = line.replace('__TYPE__:', '').trim();
      continue;
    }
    if (line.startsWith('__FILE__:')) {
      current.sample.push(line.replace('__FILE__:', '').trim());
      continue;
    }
    if (line.trim()) {
      current.sample.push(line.trim());
    }
  }

  const accessLike = paths.filter((entry) =>
    entry.sample.some((line) => /"(GET|POST|PUT|PATCH|DELETE|HEAD)\s+\//.test(line)),
  );

  const accessLogAvailable = accessLike.length > 0;

  return {
    generatedAt: new Date().toISOString(),
    readablePaths: paths,
    readablePathsCount: paths.length,
    accessLogAvailable,
    accessLikePaths: accessLike.map((entry) => entry.path),
    accessLikePathsCount: accessLike.length,
    blocker: accessLogAvailable
      ? null
      : 'Domain kullanıcısı shell erişiminde access log görünmüyor; yalnızca application log benzeri dosyalar okunabiliyor.',
  };
}

function toMarkdown(result) {
  const lines = [];
  lines.push('# Access Log Probe', '');
  lines.push(`- Oluşturulma: \`${result.generatedAt}\``);
  lines.push(`- Access log erişimi: \`${result.accessLogAvailable ? 'var' : 'yok'}\``);
  lines.push('');

  if (result.accessLogAvailable) {
    lines.push('## Access-Like Yollar', '');
    for (const entry of result.accessLikePaths) {
      lines.push(`- \`${entry}\``);
    }
    lines.push('');
  } else {
    lines.push('## Bloker', '');
    lines.push('- Domain kullanıcısı shell erişiminde access log görünmüyor; yalnızca application log benzeri dosyalar okunabiliyor.');
    lines.push('');
  }

  lines.push('## Okunabilen Yollar', '');
  for (const entry of result.readablePaths) {
    lines.push(`- \`${entry.path}\` (${entry.type})`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = loadEnvFile(envFile);
  const hasSshCreds = Boolean(env.SSH_HOST && env.SSH_USER && env.SSH_PASS);
  const stdout = hasSshCreds ? await runRemoteProbe(env) : runLocalProbe();
  const result = parseProbeOutput(String(stdout));
  if (options.write) {
    fs.writeFileSync(docsJsonPath, `${JSON.stringify(result, null, 2)}\n`);
    fs.writeFileSync(docsMdPath, `${toMarkdown(result)}\n`);
  }
  console.log(JSON.stringify(result, null, 2));
  if (!result.accessLogAvailable) {
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
