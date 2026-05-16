#!/usr/bin/env node
const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--') || !raw.includes('=')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('='));
}

const mode = args.get('mode') || process.env.HOMEPAGE_PERF_MODE || 'prod';
const defaultBaseUrl = mode === 'prod' ? 'https://sanliurfa.com' : 'http://127.0.0.1:4321';
const baseUrl = new URL(args.get('base-url') || process.env.HOMEPAGE_PERF_BASE_URL || defaultBaseUrl);
const url = new URL('/', baseUrl);
const warmupCount = Math.max(0, Number(args.get('warmups') || process.env.HOMEPAGE_PERF_WARMUPS || '1'));
const measuredCount = Math.max(1, Number(args.get('runs') || process.env.HOMEPAGE_PERF_RUNS || '3'));
const timeoutMs = Math.max(1000, Number(args.get('timeout-ms') || process.env.HOMEPAGE_PERF_TIMEOUT_MS || '45000'));
const maxWarmMs = Math.max(1000, Number(args.get('max-warm-ms') || process.env.HOMEPAGE_PERF_MAX_WARM_MS || '8000'));
const brandPattern = /Şanlıurfa|sanliurfa\.com/i;
const verbose =
  args.get('verbose') === '1' ||
  process.env.HOMEPAGE_PERF_VERBOSE === '1';

function fail(message, details = []) {
  console.error(`[homepage-performance-gate] ${message}`);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}

async function fetchHomepage(label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Sanliurfa.com homepage performance gate (+https://sanliurfa.com)',
      },
    });
    const body = await response.text();
    return {
      label,
      status: response.status,
      durationMs: Date.now() - startedAt,
      branded: brandPattern.test(body) || brandPattern.test(response.url),
      sample: body.replace(/\s+/g, ' ').slice(0, 160),
    };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (let i = 0; i < warmupCount; i += 1) {
  results.push(await fetchHomepage(`warmup-${i + 1}`));
}
for (let i = 0; i < measuredCount; i += 1) {
  results.push(await fetchHomepage(`run-${i + 1}`));
}

const warmups = results.filter((result) => result.label.startsWith('warmup-'));
const measured = results.filter((result) => result.label.startsWith('run-'));

if (verbose) {
  for (const result of results) {
    const marker = result.status >= 200 && result.status < 400 && result.branded ? 'ok' : 'fail';
    console.log(`${marker} ${result.label} ${result.status} ${result.durationMs}ms -> ${url.href}`);
  }
} else {
  const warmupMax = warmups.length > 0 ? Math.max(...warmups.map((result) => result.durationMs)) : 0;
  const warmupAvg = warmups.length > 0
    ? Math.round(warmups.reduce((total, result) => total + result.durationMs, 0) / warmups.length)
    : 0;
  if (warmups.length > 0) {
    console.log(
      `homepage-performance-gate: warmup complete (${mode}, count=${warmups.length}, max=${warmupMax}ms, avg=${warmupAvg}ms)`,
    );
  }
}

const failures = results.filter(
  (result) => result.status < 200 || result.status >= 400 || !result.branded,
);
if (failures.length > 0) {
  fail(
    'homepage yanıt veya marka kontrolü başarısız',
    failures.map((result) =>
      `${result.label}: status=${result.status}, branded=${result.branded}, sample=${result.sample}`,
    ),
  );
}

const maxMeasured = Math.max(...measured.map((result) => result.durationMs));
const avgMeasured = Math.round(
  measured.reduce((total, result) => total + result.durationMs, 0) / measured.length,
);

if (maxMeasured > maxWarmMs) {
  fail('homepage sıcak yanıt süresi eşiği aştı', [
    `max=${maxMeasured}ms`,
    `avg=${avgMeasured}ms`,
    `threshold=${maxWarmMs}ms`,
  ]);
}

console.log(
  `homepage-performance-gate: PASS (${mode}, warmups=${warmupCount}, runs=${measuredCount}, max=${maxMeasured}ms, avg=${avgMeasured}ms, threshold=${maxWarmMs}ms)`,
);
