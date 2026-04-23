#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const repo = 'morrison369/sanliurfa';
const blockers = [];

const run = (cmd, args) =>
  execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

const runAllowFail = (cmd, args) => {
  try {
    return { ok: true, stdout: run(cmd, args), stderr: '' };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error.stdout || '').trim(),
      stderr: String(error.stderr || '').trim(),
    };
  }
};

const trackedFiles = run('git', ['ls-files'])
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean);

for (const forbidden of ['.env', '.env.production', '.env.staging', 'deploy_key']) {
  if (trackedFiles.includes(forbidden)) {
    blockers.push(`tracked forbidden file: ${forbidden}`);
  }
}

const currentSecretScan = runAllowFail(process.execPath, ['scripts/security/scan-secrets.mjs']);
if (!currentSecretScan.ok) {
  blockers.push(`current tree secret scan failed:\n${currentSecretScan.stderr || currentSecretScan.stdout}`);
}

const publicDiscoveryContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/public-discovery-contract.ts',
]);
if (!publicDiscoveryContract.ok) {
  blockers.push(
    `public discovery contract failed:\n${publicDiscoveryContract.stderr || publicDiscoveryContract.stdout}`,
  );
}

const sitemapIndexabilityContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/sitemap-indexability-contract.ts',
]);
if (!sitemapIndexabilityContract.ok) {
  blockers.push(
    `sitemap indexability contract failed:\n${sitemapIndexabilityContract.stderr || sitemapIndexabilityContract.stdout}`,
  );
}

const rssOutputContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/rss-output-contract.ts',
]);
if (!rssOutputContract.ok) {
  blockers.push(
    `rss output contract failed:\n${rssOutputContract.stderr || rssOutputContract.stdout}`,
  );
}

const envAccessContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/env-access-contract.ts',
]);
if (!envAccessContract.ok) {
  blockers.push(
    `env access contract failed:\n${envAccessContract.stderr || envAccessContract.stdout}`,
  );
}

const canonicalOriginContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/canonical-origin-contract.ts',
]);
if (!canonicalOriginContract.ok) {
  blockers.push(
    `canonical origin contract failed:\n${canonicalOriginContract.stderr || canonicalOriginContract.stdout}`,
  );
}

const turkishOnlyContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/turkish-only-contract.ts',
]);
if (!turkishOnlyContract.ok) {
  blockers.push(
    `turkish-only contract failed:\n${turkishOnlyContract.stderr || turkishOnlyContract.stdout}`,
  );
}

const releaseDefinitionContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/release-definition-contract.ts',
]);
if (!releaseDefinitionContract.ok) {
  blockers.push(
    `release definition contract failed:\n${
      releaseDefinitionContract.stderr || releaseDefinitionContract.stdout
    }`,
  );
}

const socialCapabilityContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/social-capability-contract.ts',
]);
if (!socialCapabilityContract.ok) {
  blockers.push(
    `social capability contract failed:\n${
      socialCapabilityContract.stderr || socialCapabilityContract.stdout
    }`,
  );
}

const adminHomepageContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/admin-homepage-contract.ts',
]);
if (!adminHomepageContract.ok) {
  blockers.push(
    `admin homepage contract failed:\n${adminHomepageContract.stderr || adminHomepageContract.stdout}`,
  );
}

const secretsRotationContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/secrets-rotation-contract.ts',
]);
if (!secretsRotationContract.ok) {
  blockers.push(
    `secrets rotation contract failed:\n${
      secretsRotationContract.stderr || secretsRotationContract.stdout
    }`,
  );
}

const seoTemplateContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/seo-template-contract.ts',
]);
if (!seoTemplateContract.ok) {
  blockers.push(
    `seo template contract failed:\n${seoTemplateContract.stderr || seoTemplateContract.stdout}`,
  );
}

const turkishContentQualityContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/turkish-content-quality-contract.ts',
]);
if (!turkishContentQualityContract.ok) {
  blockers.push(
    `turkish content quality contract failed:\n${
      turkishContentQualityContract.stderr || turkishContentQualityContract.stdout
    }`,
  );
}

const imageSlugContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/image-slug-contract.ts',
]);
if (!imageSlugContract.ok) {
  blockers.push(
    `image slug contract failed:\n${imageSlugContract.stderr || imageSlugContract.stdout}`,
  );
}

const portLockContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/port-lock-contract.ts',
]);
if (!portLockContract.ok) {
  blockers.push(
    `port lock contract failed:\n${portLockContract.stderr || portLockContract.stdout}`,
  );
}

const imageProviderSecretContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/image-provider-secret-contract.ts',
]);
if (!imageProviderSecretContract.ok) {
  blockers.push(
    `image provider secret contract failed:\n${
      imageProviderSecretContract.stderr || imageProviderSecretContract.stdout
    }`,
  );
}

const envTemplateContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/env-template-contract.ts',
]);
if (!envTemplateContract.ok) {
  blockers.push(
    `env template contract failed:\n${envTemplateContract.stderr || envTemplateContract.stdout}`,
  );
}

const redisIsolationContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/redis-isolation-contract.ts',
]);
if (!redisIsolationContract.ok) {
  blockers.push(
    `redis isolation contract failed:\n${redisIsolationContract.stderr || redisIsolationContract.stdout}`,
  );
}

const rateLimitResilienceContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/rate-limit-resilience-contract.ts',
]);
if (!rateLimitResilienceContract.ok) {
  blockers.push(
    `rate limit resilience contract failed:\n${
      rateLimitResilienceContract.stderr || rateLimitResilienceContract.stdout
    }`,
  );
}

const astroTypesEntrypointContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/astro-types-entrypoint-contract.ts',
]);
if (!astroTypesEntrypointContract.ok) {
  blockers.push(
    `astro types entrypoint contract failed:\n${
      astroTypesEntrypointContract.stderr || astroTypesEntrypointContract.stdout
    }`,
  );
}

const runtimeLoggingContract = runAllowFail(process.execPath, [
  'node_modules/tsx/dist/cli.mjs',
  'scripts/security/runtime-logging-contract.ts',
]);
if (!runtimeLoggingContract.ok) {
  blockers.push(
    `runtime logging contract failed:\n${runtimeLoggingContract.stderr || runtimeLoggingContract.stdout}`,
  );
}

const historyDeployKey = runAllowFail('git', ['log', '--all', '--name-only', '--', 'deploy_key']);
if ((historyDeployKey.stdout || '').includes('deploy_key')) {
  blockers.push('git history contains deploy_key; rotate keys and clean history before public visibility');
}

const historySecretPatterns = [
  String.raw`postgres(?:ql)?:\/\/[^:\s'"<>]+:[^@\s'"<>]+@`,
  String.raw`\b(?:PASS|PASSWORD|DB_PASS|DB_PASSWORD)\s*=\s*['"][^'"]{8,}['"]`,
  String.raw`\bPGPASSWORD\s*=\s*['"]?[^'"\s]{8,}`,
  String.raw`\bsk_live_[0-9A-Za-z]{10,}\b`,
  String.raw`\bwhsec_[0-9A-Za-z]{10,}\b`,
];

const isSafeHistoryLine = (line) =>
  [
    'CHANGE_ME',
    'PLACEHOLDER',
    'YOUR_',
    'STRONG_PASSWORD',
    'SIFRENIZ',
    '{DB_PASS}',
    '{DB_PASSWORD}',
    'PASSWORD_HERE',
    'postgres:postgres',
    'user:pass',
    'test-',
    'change-this-',
  ].some((token) => line.includes(token));

const historyFindings = [];
for (const pattern of historySecretPatterns) {
  const candidateLog = runAllowFail('git', ['log', '--all', '--format=%H', '-G', pattern, '--']);
  const commits = [...new Set(candidateLog.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
  for (const commit of commits) {
    const grep = runAllowFail('git', [
      'grep',
      '-n',
      '-I',
      '-E',
      pattern,
      commit,
      '--',
      '.',
      ':(exclude)package-lock.json',
      ':(exclude)node_modules',
    ]);
    if (!grep.stdout) continue;
    for (const line of grep.stdout.split(/\r?\n/)) {
      if (!line || isSafeHistoryLine(line)) continue;
      historyFindings.push(line);
      if (historyFindings.length >= 10) break;
    }
    if (historyFindings.length >= 10) break;
  }
  if (historyFindings.length >= 10) break;
}

if (historyFindings.length > 0) {
  blockers.push(
    `git history contains credential-shaped literals; rotate credentials and clean history before public visibility:\n${historyFindings
      .slice(0, 10)
      .map((line) => `   ${line}`)
      .join('\n')}`,
  );
}

const visibility = runAllowFail('gh', ['repo', 'view', repo, '--json', 'visibility', '-q', '.visibility']);
if (!visibility.ok) {
  blockers.push(`GitHub visibility check failed: ${visibility.stderr || visibility.stdout}`);
} else if (visibility.stdout !== 'PRIVATE') {
  console.log(`[public-readiness] repo visibility is already ${visibility.stdout}`);
}

if (blockers.length > 0) {
  console.error('[public-readiness] BLOCKED: repository is not safe to make public');
  for (const blocker of blockers) {
    console.error(` - ${blocker}`);
  }
  console.error('\nRun only after blockers are closed:');
  console.error(`gh repo edit ${repo} --visibility public --accept-visibility-change-consequences`);
  process.exit(1);
}

console.log('[public-readiness] ok: current tree and tracked files are ready for public visibility');
