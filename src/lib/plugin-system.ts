/**
 * Phase 27: Plugin & Extension System
 * Plugin lifecycle management, extension points, hook system
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type PluginStatus = 'registered' | 'installed' | 'active' | 'inactive' | 'error';
export type ExtensionHandler = (data: any) => Promise<any>;

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  extensionPoints: string[];
  permissions: string[];
  active?: boolean;
}

// ==================== PLUGIN REGISTRY ====================

export class PluginRegistry {
  private plugins = new Map<string, PluginManifest>();

  /**
   * Register plugin
   */
  register(plugin: PluginManifest): void {
    this.plugins.set(plugin.id, { ...plugin, active: false });
    logger.debug('Plugin registered', { id: plugin.id, name: plugin.name });
  }

  /**
   * Get plugin
   */
  get(pluginId: string): PluginManifest | null {
    return this.plugins.get(pluginId) || null;
  }

  /**
   * List all plugins
   */
  list(): PluginManifest[] {
    return Array.from(this.plugins.values());
  }

  /**
   * List active plugins
   */
  listActive(): PluginManifest[] {
    return Array.from(this.plugins.values()).filter(p => p.active);
  }

  /**
   * Update plugin
   */
  private updatePlugin(pluginId: string, updates: Partial<PluginManifest>): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      this.plugins.set(pluginId, { ...plugin, ...updates });
    }
  }

  /**
   * Activate plugin
   */
  activate(pluginId: string): void {
    this.updatePlugin(pluginId, { active: true });
  }

  /**
   * Deactivate plugin
   */
  deactivate(pluginId: string): void {
    this.updatePlugin(pluginId, { active: false });
  }
}

// ==================== PLUGIN LIFECYCLE ====================

export class PluginLifecycle {
  private statuses = new Map<string, PluginStatus>();
  private registry: PluginRegistry;

  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }

  /**
   * Install plugin
   */
  install(pluginId: string): boolean {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      this.statuses.set(pluginId, 'error');
      return false;
    }

    try {
      this.statuses.set(pluginId, 'installed');
      logger.info('Plugin installed', { id: pluginId, name: plugin.name });
      return true;
    } catch (err) {
      this.statuses.set(pluginId, 'error');
      logger.error('Plugin installation failed', err instanceof Error ? err : new Error(String(err)), { pluginId });
      return false;
    }
  }

  /**
   * Activate plugin
   */
  activate(pluginId: string): boolean {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      this.statuses.set(pluginId, 'error');
      return false;
    }

    try {
      this.registry.activate(pluginId);
      this.statuses.set(pluginId, 'active');
      logger.info('Plugin activated', { id: pluginId, name: plugin.name });
      return true;
    } catch (err) {
      this.statuses.set(pluginId, 'error');
      logger.error('Plugin activation failed', err instanceof Error ? err : new Error(String(err)), { pluginId });
      return false;
    }
  }

  /**
   * Deactivate plugin
   */
  deactivate(pluginId: string): boolean {
    const plugin = this.registry.get(pluginId);
    if (!plugin) {
      return false;
    }

    try {
      this.registry.deactivate(pluginId);
      this.statuses.set(pluginId, 'inactive');
      logger.info('Plugin deactivated', { id: pluginId });
      return true;
    } catch (err) {
      logger.error('Plugin deactivation failed', err instanceof Error ? err : new Error(String(err)), { pluginId });
      return false;
    }
  }

  /**
   * Uninstall plugin
   */
  uninstall(pluginId: string): boolean {
    try {
      this.deactivate(pluginId);
      this.statuses.delete(pluginId);
      logger.info('Plugin uninstalled', { id: pluginId });
      return true;
    } catch (err) {
      logger.error('Plugin uninstall failed', err instanceof Error ? err : new Error(String(err)), { pluginId });
      return false;
    }
  }

  /**
   * Get plugin status
   */
  getStatus(pluginId: string): PluginStatus {
    return this.statuses.get(pluginId) || 'registered';
  }
}

// ==================== EXTENSION POINT MANAGER ====================

export class ExtensionPointManager {
  private handlers = new Map<string, Map<string, ExtensionHandler>>(); // extensionPoint -> hookId -> handler
  private hookCounter = 0;

  // Built-in extension points
  private static readonly EXTENSION_POINTS = [
    'before:search',
    'after:review',
    'before:render',
    'on:login',
    'before:api-call',
    'after:api-response'
  ];

  /**
   * Register handler for extension point
   */
  register(extensionPoint: string, handler: ExtensionHandler): string {
    if (!this.handlers.has(extensionPoint)) {
      this.handlers.set(extensionPoint, new Map());
    }

    const hookId = `hook-${++this.hookCounter}`;
    this.handlers.get(extensionPoint)!.set(hookId, handler);

    logger.debug('Extension handler registered', { extensionPoint, hookId });
    return hookId;
  }

  /**
   * Unregister handler
   */
  unregister(hookId: string): void {
    for (const [, handlers] of this.handlers) {
      handlers.delete(hookId);
    }
  }

  /**
   * Execute all handlers for extension point
   */
  async execute<T>(extensionPoint: string, data: T): Promise<T> {
    const handlers = this.handlers.get(extensionPoint);
    if (!handlers || handlers.size === 0) {
      return data;
    }

    let result = data;

    for (const [, handler] of handlers) {
      try {
        result = await handler(result);
      } catch (err) {
        logger.error(
          'Extension handler error',
          err instanceof Error ? err : new Error(String(err)),
          { extensionPoint }
        );
        // Continue executing other handlers despite error
      }
    }

    return result;
  }

  /**
   * List all extension points
   */
  listExtensionPoints(): string[] {
    return ExtensionPointManager.EXTENSION_POINTS;
  }

  /**
   * Get handler count for extension point
   */
  getHandlerCount(extensionPoint: string): number {
    return this.handlers.get(extensionPoint)?.size || 0;
  }

  /**
   * Get all active handlers
   */
  getActiveHandlers(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [point, handlers] of this.handlers) {
      if (handlers.size > 0) {
        result[point] = handlers.size;
      }
    }
    return result;
  }
}

// ==================== EXPORTS ====================

const pluginRegistry = new PluginRegistry();
export { pluginRegistry };

export const pluginLifecycle = new PluginLifecycle(pluginRegistry);
export const extensionPointManager = new ExtensionPointManager();
