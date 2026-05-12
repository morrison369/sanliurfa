#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Client } from 'ssh2';

const root = process.cwd();
const envFile = path.join(root, 'scripts', '.env.scripts');
const docsJsonPath = path.join(root, 'docs', 'legacy-route-usage-report.json');
const docsMdPath = path.join(root, 'docs', 'legacy-route-usage-report.md');
const generatedDocArtifacts = new Set([
  'docs/legacy-route-usage-report.md',
  'docs/access-log-probe.md',
]);

const runtimeDirs = [
  'src/pages',
  'src/components',
  'src/layouts',
  'src/lib',
];

const docsDirs = [
  'docs',
];

const allowedExtensions = new Set(['.astro', '.ts', '.tsx', '.js', '.mjs', '.md']);

const aliases = [
  {
    key: 'places-root',
    label: '/places',
    regex: /(?<![A-Za-z0-9])\/places(?=$|[/?'"`\s}<])/g,
    kind: 'exact',
    canonical: '/mekanlar',
    sunsetClass: 'remove-when-zero',
  },
  {
    key: 'places-prefix',
    label: '/places/*',
    regex: /(?<![A-Za-z0-9])\/places\/[^\s"'`}<]*/g,
    kind: 'prefix',
    canonical: '/isletme/*',
    sunsetClass: 'remove-when-zero',
  },
  {
    key: 'vendor-dashboard',
    label: '/vendor/dashboard',
    regex: /(?<![A-Za-z0-9])\/vendor\/dashboard(?=$|[/?'"`\s}<])/g,
    kind: 'exact',
    canonical: '/isletme/panel',
    sunsetClass: 'compatibility-registry',
  },
  {
    key: 'vendor-analytics',
    label: '/vendor/analytics',
    regex: /(?<![A-Za-z0-9])\/vendor\/analytics(?=$|[/?'"`\s}<])/g,
    kind: 'exact',
    canonical: '/isletme/analytics',
    sunsetClass: 'compatibility-registry',
  },
  {
    key: 'messages',
    label: '/messages',
    regex: /(?<![A-Za-z0-9])\/messages(?=$|[/?'"`\s}<])/g,
    kind: 'exact',
    canonical: '/mesajlar',
    sunsetClass: 'remove-when-zero',
  },
  {
    key: 'notifications',
    label: '/notifications',
    regex: /(?<![A-Za-z0-9])\/notifications(?=$|[/?'"`\s}<])/g,
    kind: 'exact',
    canonical: '/bildirimler',
    sunsetClass: 'remove-when-zero',
  },
  {
    key: 'profile',
    label: '/profile',
    regex: /(?<![A-Za-z0-9])\/profile(?=$|[/?'"`\s}<])/g,
    kind: 'exact',
    canonical: '/profil',
    sunsetClass: 'remove-when-zero',
  },
  {
    key: 'isletme-unicode',
    label: '/işletme/*',
    regex: /(?<![A-Za-z0-9])\/işletme(?:\/[^\s"'`}<]*)?/gu,
    kind: 'prefix',
    canonical: '/isletme/*',
    sunsetClass: 'remove-when-zero',
  },
  {
    key: 'kullanici-unicode',
    label: '/kullanıcı/*',
    regex: /(?<![A-Za-z0-9])\/kullanıcı(?:\/[^\s"'`}<]*)?/gu,
    kind: 'prefix',
    canonical: '/kullanici/*',
    sunsetClass: 'remove-when-zero',
  },
];

const ignoredHits = [
  {
    aliasKey: 'messages',
    file: 'src/lib/message/index.ts',
    reason: 'relative import, public route degil',
  },
  {
    aliasKey: 'profile',
    file: 'src/components/UserPublicProfile.tsx',
    reason: 'API endpoint suffix, public route degil',
  },
  {
    aliasKey: 'vendor-dashboard',
    file: 'src/lib/routes.ts',
    reason: 'compatibility registry icindeki bilincli vendor alias',
  },
  {
    aliasKey: 'vendor-analytics',
    file: 'src/lib/routes.ts',
    reason: 'compatibility registry icindeki bilincli vendor alias',
  },
];

const sunsetPolicy = {
  reviewCadence: 'monthly',
  requiredZeroWindows: 3,
  requiredLogType: 'access',
  note: 'application log tek basina kaldirma karari icin yeterli degil',
};

function loadEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;

  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && value) env[key] = value;
  }

  return env;
}

function parseArgs(argv) {
  return {
    tailLines: Number(
      argv.find((arg) => arg.startsWith('--tail-lines='))?.split('=')[1] || '25000',
    ),
    write: !argv.includes('--no-write'),
    remote: !argv.includes('--no-remote'),
  };
}

function normalizeRel(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function shouldSkip(relPath) {
  return (
    relPath.includes('node_modules/') ||
    relPath.includes('dist/') ||
    relPath.includes('src/pages/api/') ||
    relPath.includes('src/lib/__tests__/') ||
    generatedDocArtifacts.has(relPath)
  );
}

function walkFiles(baseDir) {
  const absDir = path.join(root, baseDir);
  const files = [];
  if (!fs.existsSync(absDir)) return files;

  const stack = [absDir];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!allowedExtensions.has(path.extname(entry.name))) continue;
      const relPath = normalizeRel(fullPath);
      if (shouldSkip(relPath)) continue;
      files.push(fullPath);
    }
  }

  return files;
}

function createEmptyCounters() {
  return Object.fromEntries(
    aliases.map((alias) => [
      alias.key,
      { hits: 0, files: new Map() },
    ]),
  );
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function scanFiles(baseDirs) {
  const counters = createEmptyCounters();
  const allFiles = baseDirs.flatMap((dir) => walkFiles(dir));

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = normalizeRel(filePath);

    for (const alias of aliases) {
      const hits = countMatches(content, alias.regex);
      if (hits === 0) continue;
      counters[alias.key].hits += hits;
      counters[alias.key].files.set(relPath, (counters[alias.key].files.get(relPath) || 0) + hits);
    }
  }

  return counters;
}

function applyIgnoredHits(counters) {
  for (const rule of ignoredHits) {
    const counter = counters[rule.aliasKey];
    if (!counter) continue;
    const current = counter.files.get(rule.file) || 0;
    if (current <= 0) continue;
    counter.hits -= current;
    counter.files.delete(rule.file);
  }
}

function summarizeFiles(counter) {
  return [...counter.files.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr'))
    .slice(0, 5)
    .map(([file, hits]) => ({ file, hits }));
}

function buildRemoteCommand(tailLines) {
  const logDir = '$HOME/public_html/logs';
  return [
    `cd ${logDir} &&`,
    'for f in combined.log out.log err.log; do',
    '  [ -f "$f" ] || continue;',
    '  echo "__FILE__:$f";',
    `  tail -n ${tailLines} "$f";`,
    'done',
  ].join(' ');
}

async function runRemoteTail(tailLines, env) {
  const host = (env.SSH_HOST || '').trim();
  const port = Number((env.SSH_PORT || '77').trim());
  const username = (env.SSH_USER || '').trim();
  const password = (env.SSH_PASS || '').trim();

  if (!host || !username || !password) {
    return {
      enabled: false,
      error: 'scripts/.env.scripts içinde SSH bilgileri bulunamadı.',
    };
  }

  const command = buildRemoteCommand(tailLines);
  const sections = {};

  return await new Promise((resolve) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(command, (error, stream) => {
        if (error) {
          conn.end();
          resolve({ enabled: true, error: String(error) });
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', () => {
          conn.end();
          if (stderr.trim()) {
            resolve({ enabled: true, error: stderr.trim() });
            return;
          }

          let currentFile = null;
          for (const line of stdout.split(/\r?\n/)) {
            if (line.startsWith('__FILE__:')) {
              currentFile = line.replace('__FILE__:', '').trim();
              sections[currentFile] = '';
              continue;
            }
            if (!currentFile) continue;
            sections[currentFile] += `${line}\n`;
          }

          resolve({ enabled: true, files: sections, tailLines });
        });

        stream.on('data', (chunk) => {
          stdout += chunk.toString();
        });

        stream.stderr.on('data', (chunk) => {
          stderr += chunk.toString();
        });
      });
    });

    conn.on('error', (error) => {
      resolve({ enabled: true, error: String(error) });
    });

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

function scanRemoteLogs(remoteResult) {
  const counts = Object.fromEntries(
    aliases.map((alias) => [alias.key, { totalHits: 0, files: [] }]),
  );

  if (!remoteResult.files) return counts;

  for (const [file, content] of Object.entries(remoteResult.files)) {
    for (const alias of aliases) {
      const hits = countMatches(content, alias.regex);
      if (hits === 0) continue;
      counts[alias.key].totalHits += hits;
      counts[alias.key].files.push({ file, hits });
    }
  }

  for (const alias of aliases) {
    counts[alias.key].files.sort((a, b) => b.hits - a.hits || a.file.localeCompare(b.file, 'tr'));
  }

  return counts;
}

function summarizeRemoteMeta(remoteResult) {
  if (!remoteResult.enabled) {
    return { enabled: false };
  }

  if (remoteResult.error) {
    return {
      enabled: true,
      error: remoteResult.error,
    };
  }

  const fileNames = Object.keys(remoteResult.files || {});
  const preview = fileNames
    .map((file) => (remoteResult.files?.[file] || '').split(/\r?\n/).find(Boolean) || '')
    .join('\n');
  const looksLikeAccessLog =
    /"(GET|POST|PUT|PATCH|DELETE|HEAD)\s+\//.test(preview) ||
    /\b(GET|POST|PUT|PATCH|DELETE|HEAD)\s+\//.test(preview);

  return {
    enabled: true,
    tailLines: remoteResult.tailLines,
    fileNames,
    logType: looksLikeAccessLog ? 'access' : 'application',
    accessLogAvailable: looksLikeAccessLog,
    blocker: looksLikeAccessLog
      ? null
      : 'Prod shell tarafinda okunabilir access log bulunamadi; remote sinyal application log fallback ile sinirli.',
  };
}

function decideStatus(alias, runtimeHits, remoteHits, remoteLogType, accessLogAvailable) {
  if (runtimeHits > 0) return 'repo cleanup gerekli';
  if (remoteHits > 0) return 'uyumluluk katmanı korunmalı';
  if (alias.sunsetClass === 'compatibility-registry') {
    return remoteLogType === 'access'
      ? 'sunset kararı için izleniyor'
      : 'uyumluluk katmanı korunmalı';
  }
  if (!accessLogAvailable) return 'access log teyidi bekleniyor';
  return 'örnekleme bazlı silme adayı';
}

function buildReport(runtimeCounters, docsCounters, remoteCounters, remoteSummary) {
  const generatedAt = new Date().toISOString();
  const items = aliases.map((alias) => {
    const runtime = runtimeCounters[alias.key];
    const docs = docsCounters[alias.key];
    const remote = remoteCounters[alias.key];
    const runtimeTopFiles = summarizeFiles(runtime);
    const docsTopFiles = summarizeFiles(docs);
    const remoteTopFiles = remote.files.slice(0, 3);

    return {
      key: alias.key,
      label: alias.label,
      kind: alias.kind,
      canonical: alias.canonical,
      sunsetClass: alias.sunsetClass,
      runtimeHits: runtime.hits,
      docsHits: docs.hits,
      remoteHits: remote.totalHits,
      status: decideStatus(
        alias,
        runtime.hits,
        remote.totalHits,
        remoteSummary.logType,
        remoteSummary.accessLogAvailable,
      ),
      sunsetPolicy,
      runtimeTopFiles,
      docsTopFiles,
      remoteTopFiles,
    };
  });

  return {
    generatedAt,
    sampledRemoteLogs: remoteSummary,
    blockers: remoteSummary.accessLogAvailable
      ? []
      : [remoteSummary.blocker].filter(Boolean),
    items,
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push('# Legacy Route Usage Report', '');
  lines.push(`- Oluşturulma: \`${report.generatedAt}\``);
  if (report.sampledRemoteLogs?.enabled && !report.sampledRemoteLogs?.error) {
    lines.push(`- Remote log örneklemi: son \`${report.sampledRemoteLogs.tailLines}\` satır`);
    lines.push(`- Remote log tipi: \`${report.sampledRemoteLogs.logType}\``);
    lines.push(`- Taranan log dosyaları: ${(report.sampledRemoteLogs.fileNames || []).map((f) => `\`${f}\``).join(', ') || 'yok'}`);
    if (report.sampledRemoteLogs.blocker) {
      lines.push(`- Bloker: ${report.sampledRemoteLogs.blocker}`);
    }
  } else if (report.sampledRemoteLogs?.error) {
    lines.push(`- Remote log örneklemi: başarısız (\`${report.sampledRemoteLogs.error}\`)`);
  } else {
    lines.push('- Remote log örneklemi: kapalı');
  }
  lines.push('');
  if ((report.blockers || []).length > 0) {
    lines.push('## Blokerler', '');
    for (const blocker of report.blockers) {
      lines.push(`- ${blocker}`);
    }
    lines.push('');
  }
  lines.push('| Legacy | Canonical | Runtime | Docs | Remote | Durum |');
  lines.push('|---|---|---:|---:|---:|---|');
  for (const item of report.items) {
    lines.push(`| \`${item.label}\` | \`${item.canonical}\` | ${item.runtimeHits} | ${item.docsHits} | ${item.remoteHits} | ${item.status} |`);
  }
  lines.push('');

  for (const item of report.items) {
    lines.push(`## ${item.label}`, '');
    lines.push(`- Canonical: \`${item.canonical}\``);
    lines.push(`- Durum: ${item.status}`);
    lines.push(`- Sunset sınıfı: ${item.sunsetClass}`);
    lines.push(`- Runtime hit: ${item.runtimeHits}`);
    lines.push(`- Docs hit: ${item.docsHits}`);
    lines.push(`- Remote hit: ${item.remoteHits}`);
    lines.push(`- Sunset kuralı: ${item.sunsetPolicy.requiredZeroWindows} ardışık ${item.sunsetPolicy.reviewCadence} raporda sıfır hit ve ${item.sunsetPolicy.requiredLogType} log teyidi`);
    if (item.runtimeTopFiles.length > 0) {
      lines.push('- Runtime örnek dosyalar:');
      for (const entry of item.runtimeTopFiles) {
        lines.push(`  - \`${entry.file}\` (${entry.hits})`);
      }
    }
    if (item.docsTopFiles.length > 0) {
      lines.push('- Docs örnek dosyalar:');
      for (const entry of item.docsTopFiles) {
        lines.push(`  - \`${entry.file}\` (${entry.hits})`);
      }
    }
    if (item.remoteTopFiles.length > 0) {
      lines.push('- Remote örnek loglar:');
      for (const entry of item.remoteTopFiles) {
        lines.push(`  - \`${entry.file}\` (${entry.hits})`);
      }
    }
    lines.push('');
  }

  lines.push('## Not', '');
  lines.push('- Bu rapor full access log geçmişi değil, örneklenmiş son log satırları üzerinden üretilir.');
  lines.push('- `örnekleme bazlı silme adayı` kararı otomatik silme anlamına gelmez; daha uzun dönem log teyidi gerekir.');
  lines.push('- `access log teyidi bekleniyor` durumu, repo temiz olsa bile erişim logu bağlanmadan silme kararı verilmemesi gerektiğini gösterir.');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = loadEnvFile(envFile);
  const runtimeCounters = scanFiles(runtimeDirs);
  const docsCounters = scanFiles(docsDirs);
  applyIgnoredHits(runtimeCounters);
  const remoteMeta = options.remote
    ? await runRemoteTail(options.tailLines, env)
    : { enabled: false };
  const remoteCounters = scanRemoteLogs(remoteMeta);
  const remoteSummary = summarizeRemoteMeta(remoteMeta);
  const report = buildReport(runtimeCounters, docsCounters, remoteCounters, remoteSummary);

  if (options.write) {
    fs.writeFileSync(docsJsonPath, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(docsMdPath, `${toMarkdown(report)}\n`);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
