#!/usr/bin/env node
import { PUBLIC_ROUTE_SMOKE_ROUTES } from '../smoke/public-route-smoke-routes.mjs';

const args = new Map();
for (const raw of process.argv.slice(2)) {
  if (!raw.startsWith('--') || !raw.includes('=')) continue;
  const [key, ...rest] = raw.slice(2).split('=');
  args.set(key, rest.join('='));
}

const mode = args.get('mode') || process.env.PUBLIC_ROUTE_PERF_MODE || 'prod';
const defaultBaseUrl = mode === 'prod' ? 'https://sanliurfa.com' : 'http://127.0.0.1:4321';
const baseUrl = new URL(args.get('base-url') || process.env.PUBLIC_ROUTE_PERF_BASE_URL || defaultBaseUrl);
const timeoutMs = Math.max(1000, Number(args.get('timeout-ms') || process.env.PUBLIC_ROUTE_PERF_TIMEOUT_MS || '45000'));
const maxRouteMs = Math.max(500, Number(args.get('max-route-ms') || process.env.PUBLIC_ROUTE_PERF_MAX_ROUTE_MS || '3000'));
const maxAverageMs = Math.max(500, Number(args.get('max-average-ms') || process.env.PUBLIC_ROUTE_PERF_MAX_AVERAGE_MS || '1200'));
const brandPattern = new RegExp(args.get('brand') || process.env.PUBLIC_ROUTE_PERF_BRAND_PATTERN || 'Şanlıurfa|sanliurfa\\.com', 'i');
const enforceFinalUrl =
  process.env.PUBLIC_ROUTE_PERF_STRICT_FINAL_URL === '1' ||
  (mode === 'prod' && process.env.PUBLIC_ROUTE_PERF_STRICT_FINAL_URL !== '0');
const verbose =
  args.get('verbose') === '1' ||
  process.env.PUBLIC_ROUTE_PERF_VERBOSE === '1';
const slowRetryCount = Math.max(
  0,
  Number(args.get('slow-retries') || process.env.PUBLIC_ROUTE_PERF_SLOW_RETRIES || '1'),
);

const routes = PUBLIC_ROUTE_SMOKE_ROUTES.map((route) =>
  typeof route === 'string'
    ? { path: route }
    : {
      path: route.path,
      expectedFinalPath: route.expectedFinalPath,
      allowRedirect: route.allowRedirect,
      timeoutMs: route.timeoutMs,
    },
);

function isSlowOnlyFailure(result) {
  return (
    result.status >= 200 &&
    result.status < 400 &&
    result.branded &&
    result.finalUrlOk &&
    result.durationMs > maxRouteMs
  );
}

function fail(message, details = []) {
  console.error(`[public-route-performance-gate] ${message}`);
  for (const detail of details) console.error(`- ${detail}`);
  process.exit(1);
}

function routeUrl(route) {
  return new URL(route.startsWith('/') ? route : `/${route}`, baseUrl);
}

async function fetchRoute(route, phase) {
  const routePath = typeof route === 'string' ? route : route.path;
  const url = routeUrl(routePath);
  const expectedFinalPath = typeof route === 'string'
    ? `${url.pathname}${url.search}`
    : route.expectedFinalPath || `${url.pathname}${url.search}`;
  const routeTimeoutMs = typeof route === 'string'
    ? timeoutMs
    : Math.max(1000, Number(route.timeoutMs || timeoutMs));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), routeTimeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.5',
        'Cache-Control': 'no-cache',
        'User-Agent': 'Sanliurfa.com public route performance gate (+https://sanliurfa.com)',
      },
      redirect: 'follow',
    });
    const body = await response.text();
    const finalUrl = new URL(response.url);
    const finalPath = `${finalUrl.pathname}${finalUrl.search}`;
    return {
      phase,
      route: routePath,
      status: response.status,
      durationMs: Date.now() - startedAt,
      timeoutMs: routeTimeoutMs,
      branded: brandPattern.test(body) || brandPattern.test(response.url),
      finalUrlOk: !enforceFinalUrl || (typeof route !== 'string' && route.allowRedirect === true) || finalPath === expectedFinalPath,
      finalPath,
      expectedFinalPath,
      sample: body.replace(/\s+/g, ' ').slice(0, 160),
    };
  } catch (error) {
    return {
      phase,
      route: routePath,
      status: 0,
      durationMs: Date.now() - startedAt,
      timeoutMs: routeTimeoutMs,
      branded: false,
      finalUrlOk: false,
      finalPath: '',
      expectedFinalPath,
      sample: '',
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

console.log(`public-route-performance-gate: warming ${routes.length} routes (${baseUrl.origin})`);
const warmupResults = [];
for (const route of routes) {
  const result = await fetchRoute(route, 'warmup');
  warmupResults.push(result);
}

if (verbose) {
  for (const result of warmupResults) {
    const marker = result.status >= 200 && result.status < 400 && result.branded && result.finalUrlOk ? 'ok' : 'fail';
    console.log(`${marker} warmup ${result.status} ${result.route} ${result.durationMs}ms`);
  }
} else {
  const warmupMax = warmupResults.length > 0 ? Math.max(...warmupResults.map((result) => result.durationMs)) : 0;
  const warmupAvg = warmupResults.length > 0
    ? Math.round(warmupResults.reduce((total, result) => total + result.durationMs, 0) / warmupResults.length)
    : 0;
  const warmupFailures = warmupResults.filter(
    (result) =>
      result.status < 200 ||
      result.status >= 400 ||
      !result.branded ||
      !result.finalUrlOk,
  );
  console.log(
    `public-route-performance-gate: warmup complete (count=${warmupResults.length}, ok=${warmupResults.length - warmupFailures.length}, fail=${warmupFailures.length}, max=${warmupMax}ms, avg=${warmupAvg}ms)`,
  );
  for (const result of warmupFailures) {
    console.log(
      `fail warmup ${result.status} ${result.route} ${result.durationMs}ms timeout=${result.timeoutMs}ms error=${result.error || 'none'}`,
    );
  }
}

const measured = [];
for (const route of routes) {
  measured.push(await fetchRoute(route, 'run'));
}

for (let index = 0; index < measured.length; index += 1) {
  const current = measured[index];
  if (!isSlowOnlyFailure(current)) continue;

  let bestResult = current;
  let retriesUsed = 0;
  while (retriesUsed < slowRetryCount && isSlowOnlyFailure(bestResult)) {
    const retried = await fetchRoute(routes[index], `retry-${retriesUsed + 1}`);
    retriesUsed += 1;
    if (retried.durationMs <= bestResult.durationMs) {
      bestResult = retried;
    }
    if (verbose) {
      const marker = retried.durationMs <= maxRouteMs ? 'ok' : 'fail';
      console.log(
        `${marker} ${retried.phase} ${retried.status} ${retried.route} ${retried.durationMs}ms/${maxRouteMs}ms`,
      );
    }
  }

  if (retriesUsed > 0) {
    measured[index] = {
      ...bestResult,
      retried: true,
      retryCount: retriesUsed,
      initialDurationMs: current.durationMs,
    };
  }
}

if (verbose) {
  for (const result of measured) {
    const marker = result.status >= 200 && result.status < 400 && result.branded && result.finalUrlOk && result.durationMs <= maxRouteMs
      ? 'ok'
      : 'fail';
    console.log(`${marker} run ${result.status} ${result.route} ${result.durationMs}ms/${maxRouteMs}ms`);
  }
} else {
  const retriedSlowRoutes = measured.filter((result) => result.retried === true);
  for (const result of retriedSlowRoutes) {
    console.log(
      `public-route-performance-gate: retried ${result.route} (${result.initialDurationMs}ms -> ${result.durationMs}ms, retries=${result.retryCount})`,
    );
  }
}

const failures = measured.filter(
  (result) =>
    result.status < 200 ||
    result.status >= 400 ||
    !result.branded ||
    !result.finalUrlOk ||
    result.durationMs > maxRouteMs,
);

if (failures.length > 0) {
  fail('public route performans eşiği başarısız', failures.map((result) =>
    `${result.route}: status=${result.status}, branded=${result.branded}, finalUrlOk=${result.finalUrlOk}, final=${result.finalPath}, expected=${result.expectedFinalPath}, duration=${result.durationMs}ms, timeout=${result.timeoutMs}ms, error=${result.error || 'none'}, sample=${result.sample}`,
  ));
}

const averageMs = Math.round(
  measured.reduce((total, result) => total + result.durationMs, 0) / measured.length,
);
const maxMeasuredMs = Math.max(...measured.map((result) => result.durationMs));

if (averageMs > maxAverageMs) {
  fail('public route ortalama performans eşiği başarısız', [
    `average=${averageMs}ms`,
    `threshold=${maxAverageMs}ms`,
    `max=${maxMeasuredMs}ms`,
  ]);
}

console.log(
  `public-route-performance-gate: PASS (${mode}, routes=${measured.length}, max=${maxMeasuredMs}ms, avg=${averageMs}ms, maxRoute=${maxRouteMs}ms, maxAvg=${maxAverageMs}ms)`,
);
