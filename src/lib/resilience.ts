/**
 * Phase 31: Resilience & Circuit Breaker
 * Circuit breaker pattern, retry with backoff, bulkhead isolation, timeout management
 */

import { logger } from './logging';

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private lastFailure?: number;
  private config: CircuitBreakerConfig;

  constructor(private name: string, config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: config?.failureThreshold ?? 5,
      successThreshold: config?.successThreshold ?? 2,
      timeout: config?.timeout ?? 60000
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailure || 0) > this.config.timeout) {
        this.state = 'half-open';
        this.successes = 0;
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.state = 'closed';
        logger.info('Circuit breaker closed', { name: this.name });
      }
    }
  }

  private onFailure(): void {
    this.lastFailure = Date.now();
    this.failures++;
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open';
      logger.warn('Circuit breaker opened', { name: this.name, failures: this.failures });
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return { failures: this.failures, successes: this.successes, state: this.state, lastFailure: this.lastFailure };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
  }
}

export class RetryManager {
  async retry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T> {
    const cfg: RetryConfig = {
      maxAttempts: config?.maxAttempts ?? 3,
      baseDelayMs: config?.baseDelayMs ?? 100,
      backoffMultiplier: config?.backoffMultiplier ?? 2,
      maxDelayMs: config?.maxDelayMs ?? 10000
    };

    let lastError: any;
    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (attempt < cfg.maxAttempts) {
          const delay = Math.min(cfg.baseDelayMs * Math.pow(cfg.backoffMultiplier, attempt - 1), cfg.maxDelayMs);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }

  async retryWithFallback<T>(fn: () => Promise<T>, fallback: () => T, config?: Partial<RetryConfig>): Promise<T> {
    try {
      return await this.retry(fn, config);
    } catch (err) {
      logger.warn('Retry exhausted, using fallback', err instanceof Error ? err : new Error(String(err)));
      return fallback();
    }
  }
}

export class BulkheadManager {
  private pools = new Map<string, { active: number; queue: Promise<any>[] }>();

  async acquire(poolName: string, maxConcurrent: number): Promise<() => void> {
    if (!this.pools.has(poolName)) {
      this.pools.set(poolName, { active: 0, queue: [] });
    }

    const pool = this.pools.get(poolName)!;
    while (pool.active >= maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    pool.active++;
    return () => {
      pool.active--;
    };
  }

  getUsage(poolName: string) {
    const pool = this.pools.get(poolName);
    return {
      active: pool?.active ?? 0,
      queued: pool?.queue.length ?? 0,
      max: 0
    };
  }
}

export class TimeoutManager {
  async withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, message?: string): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(message || `Operation timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}

export const retryManager = new RetryManager();
export const bulkheadManager = new BulkheadManager();
export const timeoutManager = new TimeoutManager();
