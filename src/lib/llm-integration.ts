/**
 * Phase 127: LLM Integration & Orchestration
 * Integration with external LLM APIs (Claude, GPT, etc.) with caching and cost tracking
 */

import { logger } from './logger';
import { redis } from './cache';

interface LLMRequest {
  id: string;
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  stopSequences?: string[];
  systemPrompt?: string;
  createdAt: number;
}

interface LLMResponse {
  id: string;
  requestId: string;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  finishReason: 'stop' | 'length' | 'error';
  latencyMs: number;
  cached: boolean;
}

interface ModelConfig {
  name: string;
  maxTokens: number;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  rateLimit: number; // requests per minute
}

interface CostBreakdown {
  inputTokenCost: number;
  outputTokenCost: number;
  totalCost: number;
  model: string;
}

class LLMClient {
  private requests = new Map<string, LLMRequest>();
  private responseCache = new Map<string, LLMResponse>();
  private counter = 0;

  private models: Record<string, ModelConfig> = {
    'claude-3-opus': {
      name: 'Claude 3 Opus',
      maxTokens: 200000,
      costPer1kInputTokens: 0.015,
      costPer1kOutputTokens: 0.075,
      rateLimit: 60
    },
    'claude-3-sonnet': {
      name: 'Claude 3 Sonnet',
      maxTokens: 200000,
      costPer1kInputTokens: 0.003,
      costPer1kOutputTokens: 0.015,
      rateLimit: 600
    },
    'claude-3-haiku': {
      name: 'Claude 3 Haiku',
      maxTokens: 200000,
      costPer1kInputTokens: 0.00025,
      costPer1kOutputTokens: 0.00125,
      rateLimit: 600
    }
  };

  async generate(config: {
    model: string;
    prompt: string;
    maxTokens: number;
    temperature?: number;
    topP?: number;
    systemPrompt?: string;
  }): Promise<LLMResponse> {
    const {
      model,
      prompt,
      maxTokens,
      temperature = 0.7,
      topP = 0.9,
      systemPrompt = ''
    } = config;

    const requestId = `llm-${Date.now()}-${++this.counter}`;
    const startTime = Date.now();

    // Check cache
    const cacheKey = `sanliurfa:llm:${model}:${prompt}`;
    const cached = redis.get(cacheKey);
    if (cached) {
      logger.debug('LLM response retrieved from cache', { model, promptLength: prompt.length });
      const response = JSON.parse(cached);
      response.cached = true;
      response.latencyMs = Date.now() - startTime;
      return response;
    }

    const request: LLMRequest = {
      id: requestId,
      model,
      prompt,
      maxTokens,
      temperature,
      topP,
      systemPrompt,
      createdAt: Date.now()
    };

    this.requests.set(requestId, request);

    // Simulate LLM response (in production, would call actual API)
    const estimatedInputTokens = Math.ceil(prompt.split(/\s+/).length * 1.3);
    const estimatedOutputTokens = Math.ceil(maxTokens * 0.5);

    const response: LLMResponse = {
      id: `resp-${Date.now()}`,
      requestId,
      content: `Generated response based on prompt: "${prompt.slice(0, 50)}..."`,
      model,
      usage: {
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        totalTokens: estimatedInputTokens + estimatedOutputTokens
      },
      finishReason: 'stop',
      latencyMs: Math.random() * 2000 + 500,
      cached: false
    };

    this.responseCache.set(requestId, response);

    // Cache response
    redis.setex(cacheKey, 3600, JSON.stringify(response));

    logger.info('LLM generation completed', {
      model,
      tokens: response.usage.totalTokens,
      latencyMs: response.latencyMs
    });

    return response;
  }

  async generateStreaming(
    config: {
      model: string;
      prompt: string;
      maxTokens: number;
      temperature?: number;
    },
    onChunk: (chunk: string) => void
  ): Promise<LLMResponse> {
    const requestId = `llm-stream-${Date.now()}-${++this.counter}`;
    let content = '';
    let tokenCount = 0;

    // Simulate streaming
    const words = config.prompt.split(/\s+/).slice(0, 10);
    for (const word of words) {
      onChunk(word + ' ');
      content += word + ' ';
      tokenCount++;

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    return {
      id: `resp-${Date.now()}`,
      requestId,
      content: content.trim(),
      model: config.model,
      usage: {
        inputTokens: config.prompt.split(/\s+/).length,
        outputTokens: tokenCount,
        totalTokens: config.prompt.split(/\s+/).length + tokenCount
      },
      finishReason: 'stop',
      latencyMs: tokenCount * 10,
      cached: false
    };
  }

  getAvailableModels(): string[] {
    return Object.keys(this.models);
  }

  getModelConfig(model: string): ModelConfig | null {
    return this.models[model] || null;
  }

  countTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
}

class PromptOptimizer {
  private counter = 0;

  optimize(prompt: string): {
    original: string;
    optimized: string;
    tokensSaved: number;
  } {
    const originalTokens = this.countTokens(prompt);

    let optimized = prompt
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b(the|a|an)\b/gi, '');

    const optimizedTokens = this.countTokens(optimized);

    logger.debug('Prompt optimized', {
      originalTokens,
      optimizedTokens,
      saved: originalTokens - optimizedTokens
    });

    return {
      original: prompt,
      optimized,
      tokensSaved: originalTokens - optimizedTokens
    };
  }

  createTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{${key}}`, value);
    }
    return result;
  }

  validatePrompt(prompt: string, options: {
    maxTokens?: number;
    minTokens?: number;
  } = {}): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const tokens = this.countTokens(prompt);

    if (options.maxTokens && tokens > options.maxTokens) {
      issues.push(`Prompt exceeds max tokens: ${tokens} > ${options.maxTokens}`);
    }
    if (options.minTokens && tokens < options.minTokens) {
      issues.push(`Prompt below min tokens: ${tokens} < ${options.minTokens}`);
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  private countTokens(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }
}

class ResponseProcessor {
  process(response: LLMResponse): {
    text: string;
    confidence: number;
    metadata: Record<string, any>;
  } {
    return {
      text: response.content,
      confidence: 0.95,
      metadata: {
        model: response.model,
        tokens: response.usage.totalTokens,
        finishReason: response.finishReason
      }
    };
  }

  extractJSON(response: LLMResponse): Record<string, any> | null {
    try {
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      logger.warn('Failed to extract JSON from response', { error });
    }
    return null;
  }

  parseStructuredOutput(response: LLMResponse, schema: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key] of Object.entries(schema)) {
      const regex = new RegExp(`${key}:\\s*([^\\n]+)`, 'i');
      const match = response.content.match(regex);
      if (match) {
        result[key] = match[1].trim();
      }
    }

    return result;
  }

  handleError(error: unknown): {
    message: string;
    retriable: boolean;
    backoffMs: number;
  } {
    let message = 'Unknown error';
    let retriable = false;
    let backoffMs = 1000;

    if (error instanceof Error) {
      message = error.message;

      if (message.includes('rate limit')) {
        retriable = true;
        backoffMs = 60000;
      } else if (message.includes('timeout')) {
        retriable = true;
        backoffMs = 5000;
      }
    }

    return { message, retriable, backoffMs };
  }
}

class CostTracker {
  private costs = new Map<string, CostBreakdown>();
  private counter = 0;

  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    modelConfigs: Record<string, ModelConfig>
  ): CostBreakdown {
    const config = modelConfigs[model];
    if (!config) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputTokenCost = (inputTokens / 1000) * config.costPer1kInputTokens;
    const outputTokenCost = (outputTokens / 1000) * config.costPer1kOutputTokens;
    const totalCost = inputTokenCost + outputTokenCost;

    const breakdown: CostBreakdown = {
      inputTokenCost,
      outputTokenCost,
      totalCost,
      model
    };

    const costId = `cost-${Date.now()}-${++this.counter}`;
    this.costs.set(costId, breakdown);

    logger.debug('Cost calculated', {
      model,
      inputTokens,
      outputTokens,
      totalCost: totalCost.toFixed(6)
    });

    return breakdown;
  }

  getMonthlySpend(model?: string): number {
    let total = 0;
    for (const cost of this.costs.values()) {
      if (!model || cost.model === model) {
        total += cost.totalCost;
      }
    }
    return total;
  }

  getSpendByModel(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const cost of this.costs.values()) {
      result[cost.model] = (result[cost.model] || 0) + cost.totalCost;
    }
    return result;
  }

  estimateCost(
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
    modelConfigs: Record<string, ModelConfig>
  ): number {
    const config = modelConfigs[model];
    if (!config) return 0;

    const inputCost = (estimatedInputTokens / 1000) * config.costPer1kInputTokens;
    const outputCost = (estimatedOutputTokens / 1000) * config.costPer1kOutputTokens;
    return inputCost + outputCost;
  }
}

export const llmClient = new LLMClient();
export const promptOptimizer = new PromptOptimizer();
export const responseProcessor = new ResponseProcessor();
export const costTracker = new CostTracker();

export { LLMRequest, LLMResponse, ModelConfig, CostBreakdown };
