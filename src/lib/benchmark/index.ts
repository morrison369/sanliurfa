/**
 * Performance Benchmark Suite
 * Task 150: Load Testing & Benchmarks
 */

import { performance } from 'perf_hooks';

export interface BenchmarkConfig {
  name: string;
  iterations: number;
  concurrency: number;
  warmup?: number;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  errors: number;
}

/**
 * Run benchmark
 */
export async function runBenchmark<T>(
  config: BenchmarkConfig,
  fn: () => Promise<T>
): Promise<BenchmarkResult> {
  const times: number[] = [];
  let errors = 0;

  // Warmup
  if (config.warmup) {
    for (let i = 0; i < config.warmup; i++) {
      await fn();
    }
  }

  const startTime = performance.now();

  // Run iterations
  for (let i = 0; i < config.iterations; i++) {
    const iterStart = performance.now();
    
    try {
      await fn();
    } catch (error) {
      errors++;
    }
    
    times.push(performance.now() - iterStart);
  }

  const totalTime = performance.now() - startTime;

  // Calculate percentiles
  times.sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];

  return {
    name: config.name,
    iterations: config.iterations,
    totalTime,
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: times[0],
    maxTime: times[times.length - 1],
    p50,
    p95,
    p99,
    throughput: (config.iterations / totalTime) * 1000,
    errors,
  };
}

/**
 * Load test endpoint
 */
export async function loadTestEndpoint(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    requests: number;
    concurrency: number;
  }
): Promise<{
  totalRequests: number;
  successful: number;
  failed: number;
  avgLatency: number;
  rps: number;
}> {
  const results: { success: boolean; latency: number }[] = [];
  const startTime = performance.now();

  async function makeRequest(): Promise<void> {
    const reqStart = performance.now();
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      results.push({
        success: response.ok,
        latency: performance.now() - reqStart,
      });
    } catch {
      results.push({ success: false, latency: performance.now() - reqStart });
    }
  }

  // Run requests with concurrency limit
  const queue = Array(options.requests).fill(makeRequest);
  const running: Promise<void>[] = [];

  for (const task of queue) {
    if (running.length >= options.concurrency) {
      await Promise.race(running);
    }
    const promise = task().then(() => {
      running.splice(running.indexOf(promise), 1);
    });
    running.push(promise);
  }

  await Promise.all(running);

  const totalTime = performance.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const avgLatency = results.reduce((a, r) => a + r.latency, 0) / results.length;

  return {
    totalRequests: options.requests,
    successful,
    failed: options.requests - successful,
    avgLatency,
    rps: (options.requests / totalTime) * 1000,
  };
}

/**
 * Memory benchmark
 */
export async function benchmarkMemory(
  fn: () => void,
  iterations: number = 1000
): Promise<{
  heapUsed: number;
  heapTotal: number;
  external: number;
}> {
  const before = process.memoryUsage();
  
  for (let i = 0; i < iterations; i++) {
    fn();
  }

  global.gc && global.gc(); // Force GC if available

  const after = process.memoryUsage();

  return {
    heapUsed: after.heapUsed - before.heapUsed,
    heapTotal: after.heapTotal - before.heapTotal,
    external: after.external - before.external,
  };
}

/**
 * Run full benchmark suite
 */
export async function runFullBenchmark(): Promise<Record<string, BenchmarkResult>> {
  const results: Record<string, BenchmarkResult> = {};

  // Database benchmark
  results.database = await runBenchmark({
    name: 'Database Query',
    iterations: 1000,
    concurrency: 10,
    warmup: 100,
  }, async () => {
    // Simulated DB query
    await new Promise(r => setTimeout(r, Math.random() * 10));
  });

  // API benchmark
  results.api = await runBenchmark({
    name: 'API Response',
    iterations: 500,
    concurrency: 50,
  }, async () => {
    // Simulated API call
    await new Promise(r => setTimeout(r, Math.random() * 50));
  });

  // JSON serialization
  results.json = await runBenchmark({
    name: 'JSON Serialization',
    iterations: 10000,
    concurrency: 1,
  }, async () => {
    const data = { id: 1, name: 'test', nested: { value: 123 } };
    JSON.stringify(data);
  });

  return results;
}

/**
 * Performance regression test
 */
export async function checkRegression(
  baseline: BenchmarkResult,
  current: BenchmarkResult,
  threshold: number = 0.1 // 10% regression threshold
): Promise<{
  passed: boolean;
  regressions: string[];
}> {
  const regressions: string[] = [];

  if (current.avgTime > baseline.avgTime * (1 + threshold)) {
    regressions.push(`Avg time regressed by ${((current.avgTime / baseline.avgTime - 1) * 100).toFixed(1)}%`);
  }

  if (current.p95 > baseline.p95 * (1 + threshold)) {
    regressions.push(`P95 regressed by ${((current.p95 / baseline.p95 - 1) * 100).toFixed(1)}%`);
  }

  if (current.throughput < baseline.throughput * (1 - threshold)) {
    regressions.push(`Throughput dropped by ${((1 - current.throughput / baseline.throughput) * 100).toFixed(1)}%`);
  }

  return {
    passed: regressions.length === 0,
    regressions,
  };
}
