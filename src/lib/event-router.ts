/**
 * Phase 135: Advanced Event Routing & Filtering
 * Pattern-based routing, content filtering, and transformation pipelines
 */

import { logger } from './logger';

interface RoutingRuleDefinition {
  id: string;
  pattern: string;
  filter?: (event: any) => boolean;
  destination: string;
  priority: number;
  enabled: boolean;
}

interface RoutingResult {
  matched: boolean;
  destination: string | null;
  transformedEvent: any;
  matchedRules: string[];
}

interface FilterMetrics {
  totalEvents: number;
  matchedEvents: number;
  hitRate: number;
  transformationLatency: number;
}

class EventRouter {
  private rules: Map<string, RoutingRuleDefinition> = new Map();
  private counter = 0;
  private metrics: FilterMetrics = {
    totalEvents: 0,
    matchedEvents: 0,
    hitRate: 0,
    transformationLatency: 0
  };

  addRule(config: {
    pattern: string;
    filter?: (event: any) => boolean;
    destination: string;
    priority?: number;
  }): string {
    const id = `rule-${Date.now()}-${++this.counter}`;
    const rule: RoutingRuleDefinition = {
      id,
      pattern: config.pattern,
      filter: config.filter,
      destination: config.destination,
      priority: config.priority || 0,
      enabled: true
    };

    this.rules.set(id, rule);
    logger.debug('Routing rule added', { id, pattern: config.pattern });
    return id;
  }

  matchPattern(eventType: string, pattern: string): boolean {
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');

    return new RegExp(`^${regex}$`).test(eventType);
  }

  route(event: any): RoutingResult {
    const startTime = Date.now();
    this.metrics.totalEvents++;

    const sortedRules = Array.from(this.rules.values())
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority);

    const matchedRules: string[] = [];
    let destination: string | null = null;

    for (const rule of sortedRules) {
      if (this.matchPattern(event.type, rule.pattern)) {
        if (!rule.filter || rule.filter(event)) {
          matchedRules.push(rule.id);
          destination = rule.destination;
          break;
        }
      }
    }

    if (matchedRules.length > 0) {
      this.metrics.matchedEvents++;
    }

    this.metrics.transformationLatency = Date.now() - startTime;
    this.metrics.hitRate = this.metrics.matchedEvents / this.metrics.totalEvents;

    logger.debug('Event routed', {
      eventType: event.type,
      destination,
      rules: matchedRules.length
    });

    return {
      matched: matchedRules.length > 0,
      destination,
      transformedEvent: event,
      matchedRules
    };
  }

  removeRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);
    if (deleted) {
      logger.debug('Routing rule removed', { ruleId });
    }
    return deleted;
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      logger.debug('Routing rule disabled', { ruleId });
    }
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      logger.debug('Routing rule enabled', { ruleId });
    }
  }

  getMetrics(): FilterMetrics {
    return { ...this.metrics };
  }

  getRules(): RoutingRuleDefinition[] {
    return Array.from(this.rules.values());
  }
}

class ContentFilter {
  private counter = 0;

  filter(event: any, criteria: Record<string, any>): boolean {
    for (const [key, expectedValue] of Object.entries(criteria)) {
      const actualValue = this.getNestedValue(event, key);

      if (expectedValue instanceof RegExp) {
        if (!expectedValue.test(String(actualValue))) {
          return false;
        }
      } else if (typeof expectedValue === 'function') {
        if (!expectedValue(actualValue)) {
          return false;
        }
      } else if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  filterByRange(event: any, field: string, min: number, max: number): boolean {
    const value = this.getNestedValue(event, field);
    return typeof value === 'number' && value >= min && value <= max;
  }

  filterByArrayInclusion(event: any, field: string, values: any[]): boolean {
    const value = this.getNestedValue(event, field);
    return values.includes(value);
  }
}

class EventTransformer {
  private transformers = new Map<string, (event: any) => any>();

  registerTransformer(name: string, transform: (event: any) => any): void {
    this.transformers.set(name, transform);
    logger.debug('Transformer registered', { name });
  }

  transform(event: any, transformerName: string): any {
    const transformer = this.transformers.get(transformerName);
    if (!transformer) {
      logger.warn('Transformer not found', { name: transformerName });
      return event;
    }

    return transformer(event);
  }

  chainTransformers(event: any, transformerNames: string[]): any {
    let result = event;

    for (const name of transformerNames) {
      result = this.transform(result, name);
    }

    return result;
  }

  mapFields(event: any, mapping: Record<string, string>): any {
    const result: any = { ...event };

    for (const [oldKey, newKey] of Object.entries(mapping)) {
      if (oldKey in result) {
        result[newKey] = result[oldKey];
        delete result[oldKey];
      }
    }

    return result;
  }

  enrichWithDefaults(event: any, defaults: Record<string, any>): any {
    return { ...defaults, ...event };
  }

  flattenNested(event: any, prefix: string = ''): any {
    const result: any = {};

    for (const [key, value] of Object.entries(event)) {
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(result, this.flattenNested(value, newKey));
      } else {
        result[newKey] = value;
      }
    }

    return result;
  }
}

class RoutingRuleRegistry {
  private rules: RoutingRuleDefinition[] = [];

  addRule(rule: RoutingRuleDefinition): void {
    this.rules.push(rule);
  }

  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }

  listRules(): RoutingRuleDefinition[] {
    return [...this.rules];
  }
}

export const eventRouter = new EventRouter();
export const contentFilter = new ContentFilter();
export const eventTransformer = new EventTransformer();
export const routingRule = new RoutingRuleRegistry();

export type { RoutingRuleDefinition as RoutingRule, RoutingResult, FilterMetrics };
