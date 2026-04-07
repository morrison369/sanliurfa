/**
 * Performance benchmarking and load testing utilities
 * Measures response times, throughput, and resource usage
 */

import { logger } from './logging';

export interface BenchmarkResult {
  name: string;
  samples: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
  throughput: number; // operations per second
}

export interface LoadTestConfig {
  duration: number; // milliseconds
  concurrency: number; // concurrent requests
  rampUp?: number; // milliseconds to reach full concurrency
  targetRps?: number; // target requests per second
}

/**
 * Benchmark runner
 */
export class Benchmark {
  private measurements: number[] = [];
  private name: string;
  private startTime?: number;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Start timing
   */
  start(): () => void {
    this.startTime = performance.now();

    return () => {
      this.end();
    };
  }

  /**
   * End timing and record measurement
   */
  end(): number {
    if (!this.startTime) {
      throw new Error('Benchmark not started');
    }

    const duration = performance.now() - this.startTime;
    this.measurements.push(duration);

    return duration;
  }

  /**
   * Run function multiple times and measure
   */
  async run<T>(
    fn: () => Promise<T> | T,
    iterations: number = 100
  ): Promise<BenchmarkResult> {
    for (let i = 0; i < iterations; i++) {
      const end = this.start();

      try {
        await fn();
      } catch (error) {
        logger.error('Benchmark function error', error instanceof Error ? error : new Error(String(error)), {
          name: this.name,
          iteration: i
        });
      }

      end();
    }

    return this.getResults();
  }

  /**
   * Get results
   */
  getResults(): BenchmarkResult {
    const sorted = this.measurements.slice().sort((a, b) => a - b);
    const n = sorted.length;

    // Calculate statistics
    const min = sorted[0];
    const max = sorted[n - 1];
    const mean = this.measurements.reduce((a, b) => a + b, 0) / n;
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
    const p95 = sorted[Math.floor(n * 0.95)];
    const p99 = sorted[Math.floor(n * 0.99)];

    // Standard deviation
    const variance = this.measurements.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    // Throughput (operations per second)
    const totalTimeSeconds = this.measurements.reduce((a, b) => a + b, 0) / 1000;
    const throughput = n / totalTimeSeconds;

    return {
      name: this.name,
      samples: n,
      min,
      max,
      mean,
      median,
      p95,
      p99,
      stdDev,
      throughput
    };
  }

  /**
   * Format results for display
   */
  formatResults(): string {
    const results = this.getResults();

    return `
Benchmark: ${results.name}
Samples: ${results.samples}
Min: ${results.min.toFixed(2)}ms
Max: ${results.max.toFixed(2)}ms
Mean: ${results.mean.toFixed(2)}ms
Median: ${results.median.toFixed(2)}ms
P95: ${results.p95.toFixed(2)}ms
P99: ${results.p99.toFixed(2)}ms
Std Dev: ${results.stdDev.toFixed(2)}ms
Throughput: ${results.throughput.toFixed(2)} ops/sec
    `.trim();
  }
}

/**
 * Load test runner
 */
export class LoadTester {
  private config: LoadTestConfig;
  private results: number[] = [];
  private errors: number = 0;
  private startTime?: number;

  constructor(config: LoadTestConfig) {
    this.config = config;
  }

  /**
   * Run load test
   */
  async run(
    requestFn: () => Promise<void>
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
    errorsPercentage: number;
  }> {
    this.results = [];
    this.errors = 0;
    this.startTime = Date.now();

    const { duration, concurrency, rampUp = 0, targetRps } = this.config;

    // Create queue of requests
    const startTime = Date.now();
    let requestCount = 0;
    let activeRequests = 0;

    const executeRequest = async () => {
      activeRequests++;

      try {
        const reqStart = performance.now();
        await requestFn();
        const reqDuration = performance.now() - reqStart;

        this.results.push(reqDuration);
      } catch (error) {
        this.errors++;
        logger.warn('Load test request failed', error instanceof Error ? error : new Error(String(error)));
      } finally {
        activeRequests--;
        requestCount++;
      }
    };

    // Ramp up: gradually increase concurrency
    const rampUpDuration = rampUp > 0 ? rampUp : 0;
    const rampUpSteps = Math.min(concurrency, 10);
    const stepDuration = rampUpDuration / rampUpSteps;
    const targetConcurrency = concurrency;

    // Execute requests
    while (Date.now() - startTime < duration) {
      // Calculate current concurrency based on ramp-up
      let currentConcurrency = targetConcurrency;

      if (rampUpDuration > 0) {
        const elapsedRampUp = Math.min(Date.now() - startTime, rampUpDuration);
        currentConcurrency = Math.ceil((targetConcurrency * elapsedRampUp) / rampUpDuration);
      }

      // Add requests to reach target concurrency
      while (activeRequests < currentConcurrency) {
        executeRequest().catch(err => logger.error('Request execution error', err));
      }

      // Rate limiting
      if (targetRps) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        const maxRequests = Math.floor(elapsedSeconds * targetRps);

        if (requestCount >= maxRequests) {
          await this.sleep(10); // Small delay
        }
      } else {
        await this.sleep(10);
      }
    }

    // Wait for remaining requests
    while (activeRequests > 0) {
      await this.sleep(10);
    }

    // Calculate statistics
    const sorted = this.results.slice().sort((a, b) => a - b);
    const totalRequests = this.results.length + this.errors;
    const successfulRequests = this.results.length;
    const failedRequests = this.errors;
    const avgResponseTime = this.results.length > 0 ? this.results.reduce((a, b) => a + b, 0) / this.results.length : 0;
    const minResponseTime = sorted[0] || 0;
    const maxResponseTime = sorted[sorted.length - 1] || 0;
    const p95ResponseTime = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99ResponseTime = sorted[Math.floor(sorted.length * 0.99)] || 0;
    const totalDurationSeconds = duration / 1000;
    const requestsPerSecond = totalRequests / totalDurationSeconds;
    const errorsPercentage = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      errorsPercentage
    };
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Compare two benchmarks
 */
export function compareBenchmarks(baseline: BenchmarkResult, current: BenchmarkResult): {
  meanChange: number;
  p95Change: number;
  p99Change: number;
  throughputChange: number;
  isSlower: boolean;
} {
  const meanChange = ((current.mean - baseline.mean) / baseline.mean) * 100;
  const p95Change = ((current.p95 - baseline.p95) / baseline.p95) * 100;
  const p99Change = ((current.p99 - baseline.p99) / baseline.p99) * 100;
  const throughputChange = ((current.throughput - baseline.throughput) / baseline.throughput) * 100;

  return {
    meanChange,
    p95Change,
    p99Change,
    throughputChange,
    isSlower: meanChange > 5 // Consider 5% increase as slowdown
  };
}

/**
 * Performance budgets (for CI/CD gates)
 */
export interface PerformanceBudget {
  maxResponseTime: number; // ms
  maxP95ResponseTime: number; // ms
  maxP99ResponseTime: number; // ms
  minThroughput: number; // ops/sec
  maxErrorRate: number; // percentage
}

export function validateAgainstBudget(
  result: BenchmarkResult,
  budget: PerformanceBudget
): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  if (result.max > budget.maxResponseTime) {
    violations.push(`Max response time ${result.max.toFixed(2)}ms exceeds budget ${budget.maxResponseTime}ms`);
  }

  if (result.p95 > budget.maxP95ResponseTime) {
    violations.push(`P95 response time ${result.p95.toFixed(2)}ms exceeds budget ${budget.maxP95ResponseTime}ms`);
  }

  if (result.p99 > budget.maxP99ResponseTime) {
    violations.push(`P99 response time ${result.p99.toFixed(2)}ms exceeds budget ${budget.maxP99ResponseTime}ms`);
  }

  if (result.throughput < budget.minThroughput) {
    violations.push(`Throughput ${result.throughput.toFixed(2)} ops/sec below budget ${budget.minThroughput} ops/sec`);
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}
