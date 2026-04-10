/**
 * Phase 17: Advanced API Gateway
 * Routing, versioning, rate limiting, API key management, request transformation
 */

import { logger } from './logging';
import { createHmac, randomBytes } from 'crypto';

// ==================== API VERSIONING ====================

export interface APIRoute {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  version: string; // '1.0', '2.0', etc.
  handler: (req: any) => Promise<any>;
  deprecated?: boolean;
  deprecatedIn?: string;
  removedIn?: string;
}

/**
 * API Gateway with versioning support
 */
export class APIGateway {
  private routes = new Map<string, APIRoute>();
  private routeHistory = new Map<string, APIRoute[]>();
  private versionMigrations = new Map<string, (data: any) => any>();

  /**
   * Register API route
   */
  registerRoute(route: APIRoute): void {
    const key = `${route.method} ${route.path}:${route.version}`;
    this.routes.set(key, route);

    // Track route history for versioning
    const historyKey = `${route.method} ${route.path}`;
    if (!this.routeHistory.has(historyKey)) {
      this.routeHistory.set(historyKey, []);
    }
    this.routeHistory.get(historyKey)!.push(route);

    logger.debug('Route registered', { path: route.path, version: route.version });
  }

  /**
   * Register version migration (for upgrading payloads)
   */
  registerMigration(fromVersion: string, toVersion: string, fn: (data: any) => any): void {
    const key = `${fromVersion}->${toVersion}`;
    this.versionMigrations.set(key, fn);
  }

  /**
   * Route request to appropriate handler
   */
  async route(method: string, path: string, version: string, req: any): Promise<any> {
    let route = this.routes.get(`${method} ${path}:${version}`);

    // Fallback to latest version if exact version not found
    if (!route) {
      const allVersions = this.routeHistory.get(`${method} ${path}`) || [];
      if (allVersions.length > 0) {
        route = allVersions[allVersions.length - 1];
      }
    }

    if (!route) {
      throw new Error(`Route not found: ${method} ${path}:${version}`);
    }

    // Apply migration if needed
    if (version !== route.version) {
      req.body = this.migratePayload(version, route.version, req.body);
    }

    // Check if deprecated
    if (route.deprecated) {
      logger.warn('Deprecated API version used', {
        path: route.path,
        version: route.version,
        removedIn: route.removedIn
      });
    }

    return route.handler(req);
  }

  /**
   * Migrate payload between versions
   */
  private migratePayload(fromVersion: string, toVersion: string, data: any): any {
    const key = `${fromVersion}->${toVersion}`;
    const migration = this.versionMigrations.get(key);

    if (migration) {
      return migration(data);
    }

    return data; // No migration available
  }

  /**
   * List all routes
   */
  listRoutes(): APIRoute[] {
    return Array.from(this.routes.values());
  }

  /**
   * Get route history for deprecation tracking
   */
  getRouteHistory(path: string, method: string): APIRoute[] {
    return this.routeHistory.get(`${method} ${path}`) || [];
  }
}

// ==================== API KEY MANAGEMENT ====================

export interface APIKey {
  key: string;
  name: string;
  userId: string;
  permissions: string[]; // 'read', 'write', 'admin'
  rateLimit: number; // requests per minute
  isActive: boolean;
  createdAt: number;
  lastUsed?: number;
  expiresAt?: number;
}

/**
 * Manage API keys for third-party integrations
 */
export class APIKeyManager {
  private keys = new Map<string, APIKey>();
  private keyIndex = new Map<string, string>(); // hash -> key ID

  /**
   * Generate new API key
   */
  generateKey(userId: string, name: string, permissions: string[], rateLimit: number = 100): APIKey {
    const key = `sk_${randomBytes(24).toString('hex')}`;
    const keyHash = createHmac('sha256', 'api-key-salt').update(key).digest('hex');

    const apiKey: APIKey = {
      key: keyHash,
      name,
      userId,
      permissions,
      rateLimit,
      isActive: true,
      createdAt: Date.now()
    };

    this.keys.set(keyHash, apiKey);
    this.keyIndex.set(keyHash, keyHash);

    logger.info('API key generated', { name, userId });

    return { ...apiKey, key }; // Return unhashed key once
  }

  /**
   * Validate API key
   */
  validateKey(key: string): { valid: boolean; key?: APIKey; error?: string } {
    const keyHash = createHmac('sha256', 'api-key-salt').update(key).digest('hex');
    const apiKey = this.keys.get(keyHash);

    if (!apiKey) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (!apiKey.isActive) {
      return { valid: false, error: 'API key is inactive' };
    }

    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return { valid: false, error: 'API key has expired' };
    }

    return { valid: true, key: apiKey };
  }

  /**
   * Revoke API key
   */
  revokeKey(keyHash: string): void {
    const key = this.keys.get(keyHash);
    if (key) {
      key.isActive = false;
      logger.info('API key revoked', { name: key.name });
    }
  }

  /**
   * Get user's API keys
   */
  getUserKeys(userId: string): APIKey[] {
    const userKeys: APIKey[] = [];

    for (const key of this.keys.values()) {
      if (key.userId === userId) {
        userKeys.push({...key, key: '***'});  // Don't return unhashed key
      }
    }

    return userKeys;
  }

  /**
   * Track API key usage
   */
  recordUsage(keyHash: string): void {
    const key = this.keys.get(keyHash);
    if (key) {
      key.lastUsed = Date.now();
    }
  }
}

// ==================== REQUEST TRANSFORMATION ====================

export interface RequestTransformer {
  name: string;
  transform: (req: any) => any;
  enabled: boolean;
}

/**
 * Transform requests (e.g., add fields, normalize data)
 */
export class RequestTransformationPipeline {
  private transformers: RequestTransformer[] = [];

  /**
   * Add transformer
   */
  addTransformer(transformer: RequestTransformer): void {
    this.transformers.push(transformer);
  }

  /**
   * Apply all transformations
   */
  apply(req: any): any {
    let transformed = req;

    for (const transformer of this.transformers) {
      if (transformer.enabled) {
        transformed = transformer.transform(transformed);
      }
    }

    return transformed;
  }

  /**
   * Enable/disable transformer
   */
  setTransformerEnabled(name: string, enabled: boolean): void {
    const transformer = this.transformers.find(t => t.name === name);
    if (transformer) {
      transformer.enabled = enabled;
    }
  }
}

// ==================== RESPONSE TRANSFORMATION ====================

/**
 * Transform responses for consistency across API versions
 */
export class ResponseTransformationPipeline {
  private formatters = new Map<string, (data: any) => any>();

  /**
   * Register response formatter for version
   */
  registerFormatter(version: string, formatter: (data: any) => any): void {
    this.formatters.set(version, formatter);
  }

  /**
   * Format response for version
   */
  format(version: string, data: any): any {
    const formatter = this.formatters.get(version);
    return formatter ? formatter(data) : data;
  }
}

// ==================== REQUEST VALIDATION ====================

export interface RequestValidator {
  name: string;
  validate: (req: any) => { valid: boolean; errors?: string[] };
}

/**
 * Validate API requests before processing
 */
export class RequestValidationPipeline {
  private validators: RequestValidator[] = [];

  /**
   * Add validator
   */
  addValidator(validator: RequestValidator): void {
    this.validators.push(validator);
  }

  /**
   * Validate request
   */
  validate(req: any): { valid: boolean; errors?: string[] } {
    const allErrors: string[] = [];

    for (const validator of this.validators) {
      const result = validator.validate(req);
      if (!result.valid && result.errors) {
        allErrors.push(...result.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined
    };
  }
}

// ==================== EXPORTS ====================

export const apiGateway = new APIGateway();
export const apiKeyManager = new APIKeyManager();
export const requestTransformationPipeline = new RequestTransformationPipeline();
export const responseTransformationPipeline = new ResponseTransformationPipeline();
export const requestValidationPipeline = new RequestValidationPipeline();
