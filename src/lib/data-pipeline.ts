/**
 * Phase 26: Data Pipeline & ETL
 * Define and execute data transformations, pipeline registry, health monitoring
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface Extractor {
  name: string;
  extract(input?: any): Promise<any[]>;
}

export interface Transformer {
  name: string;
  transform(data: any[]): Promise<any[]>;
}

export interface Loader {
  name: string;
  load(data: any[]): Promise<number>; // returns records loaded
}

export interface PipelineResult {
  success: boolean;
  recordsExtracted: number;
  recordsTransformed: number;
  recordsLoaded: number;
  duration: number;
  errors: string[];
}

export interface PipelineRun {
  pipelineId: string;
  startedAt: number;
  completedAt: number;
  result: PipelineResult;
}

// ==================== PIPELINE ====================

export class Pipeline {
  id: string;
  name: string;
  private extractors: Extractor[] = [];
  private transformers: Transformer[] = [];
  private loaders: Loader[] = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  /**
   * Add extractor
   */
  addExtractor(extractor: Extractor): this {
    this.extractors.push(extractor);
    return this;
  }

  /**
   * Add transformer
   */
  addTransformer(transformer: Transformer): this {
    this.transformers.push(transformer);
    return this;
  }

  /**
   * Add loader
   */
  addLoader(loader: Loader): this {
    this.loaders.push(loader);
    return this;
  }

  /**
   * Execute pipeline
   */
  async execute(input?: any): Promise<PipelineResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      // Extract phase
      let data: any[] = [];
      for (const extractor of this.extractors) {
        try {
          const extracted = await extractor.extract(input);
          data = data.concat(extracted);
        } catch (err) {
          const message = `Extractor '${extractor.name}' failed: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(message);
          logger.error('Pipeline extractor error', err instanceof Error ? err : new Error(message));
        }
      }

      const recordsExtracted = data.length;

      // Transform phase
      for (const transformer of this.transformers) {
        try {
          data = await transformer.transform(data);
        } catch (err) {
          const message = `Transformer '${transformer.name}' failed: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(message);
          logger.error('Pipeline transformer error', err instanceof Error ? err : new Error(message));
        }
      }

      const recordsTransformed = data.length;

      // Load phase
      let recordsLoaded = 0;
      for (const loader of this.loaders) {
        try {
          recordsLoaded += await loader.load(data);
        } catch (err) {
          const message = `Loader '${loader.name}' failed: ${err instanceof Error ? err.message : String(err)}`;
          errors.push(message);
          logger.error('Pipeline loader error', err instanceof Error ? err : new Error(message));
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        recordsExtracted,
        recordsTransformed,
        recordsLoaded,
        duration,
        errors
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`Pipeline execution failed: ${message}`);

      logger.error('Pipeline failed', err instanceof Error ? err : new Error(message), { pipelineId: this.id });

      return {
        success: false,
        recordsExtracted: 0,
        recordsTransformed: 0,
        recordsLoaded: 0,
        duration,
        errors
      };
    }
  }
}

// ==================== PIPELINE REGISTRY ====================

export class PipelineRegistry {
  private pipelines = new Map<string, Pipeline>();

  /**
   * Register pipeline
   */
  register(pipeline: Pipeline): void {
    this.pipelines.set(pipeline.id, pipeline);
    logger.debug('Pipeline registered', { id: pipeline.id, name: pipeline.name });
  }

  /**
   * Get pipeline
   */
  get(id: string): Pipeline | null {
    return this.pipelines.get(id) || null;
  }

  /**
   * List all pipelines
   */
  list(): { id: string; name: string }[] {
    return Array.from(this.pipelines.values()).map(p => ({ id: p.id, name: p.name }));
  }

  /**
   * Execute pipeline by ID
   */
  async execute(pipelineId: string, input?: any): Promise<PipelineResult> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      return {
        success: false,
        recordsExtracted: 0,
        recordsTransformed: 0,
        recordsLoaded: 0,
        duration: 0,
        errors: [`Pipeline not found: ${pipelineId}`]
      };
    }

    return pipeline.execute(input);
  }
}

// ==================== PIPELINE MONITOR ====================

export class PipelineMonitor {
  private history: PipelineRun[] = [];
  private readonly maxHistory = 1000;

  /**
   * Record pipeline run
   */
  recordRun(pipelineId: string, result: PipelineResult): void {
    this.history.push({
      pipelineId,
      startedAt: Date.now() - result.duration,
      completedAt: Date.now(),
      result
    });

    // Keep only recent runs
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  /**
   * Get pipeline history
   */
  getHistory(pipelineId: string, limit: number = 50): PipelineRun[] {
    return this.history
      .filter(r => r.pipelineId === pipelineId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get health status
   */
  getHealthStatus(pipelineId: string): 'healthy' | 'degraded' | 'failed' {
    const runs = this.history.filter(r => r.pipelineId === pipelineId).slice(-10);

    if (runs.length === 0) return 'healthy';

    const successCount = runs.filter(r => r.result.success).length;
    const successRate = (successCount / runs.length) * 100;

    if (successRate >= 80) return 'healthy';
    if (successRate >= 50) return 'degraded';
    return 'failed';
  }

  /**
   * Get statistics
   */
  getStats(): { totalRuns: number; successRate: number; avgDuration: number } {
    if (this.history.length === 0) {
      return { totalRuns: 0, successRate: 0, avgDuration: 0 };
    }

    const successCount = this.history.filter(r => r.result.success).length;
    const totalDuration = this.history.reduce((sum, r) => sum + r.result.duration, 0);

    return {
      totalRuns: this.history.length,
      successRate: (successCount / this.history.length) * 100,
      avgDuration: totalDuration / this.history.length
    };
  }

  /**
   * Get pipeline stats
   */
  getPipelineStats(pipelineId: string): { runs: number; successRate: number; lastRun?: PipelineRun } {
    const runs = this.history.filter(r => r.pipelineId === pipelineId);

    if (runs.length === 0) {
      return { runs: 0, successRate: 0 };
    }

    const successCount = runs.filter(r => r.result.success).length;

    return {
      runs: runs.length,
      successRate: (successCount / runs.length) * 100,
      lastRun: runs[runs.length - 1]
    };
  }
}

// ==================== EXPORTS ====================

export const pipelineRegistry = new PipelineRegistry();
export const pipelineMonitor = new PipelineMonitor();
