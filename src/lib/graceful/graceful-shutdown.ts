/**
 * Graceful Shutdown Handler
 * Ensures clean shutdown on SIGTERM/SIGINT signals
 */

import { pool } from '../postgres';
import { logger } from '../logging';

interface ShutdownHandler {
  name: string;
  handler: () => Promise<void> | void;
  priority: number; // Lower number = higher priority (executed first)
}

class GracefulShutdown {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private shutdownTimeout = 30000; // 30 seconds

  constructor() {
    this.setupSignalHandlers();
  }

  /**
   * Register a shutdown handler
   */
  register(name: string, handler: () => Promise<void> | void, priority = 10): void {
    this.handlers.push({ name, handler, priority });
    this.handlers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Setup OS signal handlers
   */
  private setupSignalHandlers(): void {
    // SIGTERM - Kubernetes, Docker, systemd
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Starting graceful shutdown...');
      this.shutdown('SIGTERM');
    });

    // SIGINT - Ctrl+C
    process.on('SIGINT', () => {
      logger.info('SIGINT received. Starting graceful shutdown...');
      this.shutdown('SIGINT');
    });

    // Uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      this.shutdown('uncaughtException');
    });

    // Unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.shutdown('unhandledRejection');
    });
  }

  /**
   * Perform graceful shutdown
   */
  private async shutdown(signal: string): Promise<void> {
    if (this.isShuttingDown) {
      logger.info('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    logger.info(`🛑 Initiating graceful shutdown due to ${signal}...`);

    // Set a force exit timeout
    const forceExitTimeout = setTimeout(() => {
      logger.error('⚠️ Forced shutdown due to timeout');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Execute all registered handlers
      for (const { name, handler } of this.handlers) {
        try {
          logger.info(`   Cleaning up: ${name}...`);
          await handler();
          logger.info(`   ✓ ${name} cleaned up`);
        } catch (error) {
          logger.error(`   ✗ ${name} cleanup failed:`, error);
        }
      }

      logger.info('✅ Graceful shutdown completed');
      clearTimeout(forceExitTimeout);
      process.exit(0);
    } catch (error) {
      logger.error('❌ Error during shutdown:', error);
      clearTimeout(forceExitTimeout);
      process.exit(1);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  getIsShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Set shutdown timeout
   */
  setShutdownTimeout(ms: number): void {
    this.shutdownTimeout = ms;
  }
}

// Singleton instance
export const gracefulShutdown = new GracefulShutdown();

// Default cleanup handlers
export function registerDefaultCleanupHandlers(): void {
  // Database connections
  gracefulShutdown.register('Database Pool', async () => {
    await pool.end();
    logger.info('   Database connections closed');
  }, 1); // High priority - close DB first

  // Redis (if used)
  gracefulShutdown.register('Redis Connection', async () => {
    try {
      const { redis } = await import('./redis');
      if (redis) {
        await redis.quit();
        logger.info('   Redis connection closed');
      }
    } catch {
      // Redis not configured
    }
  }, 2);

  // Message brokers
  gracefulShutdown.register('Message Brokers', async () => {
    try {
      const { messageBroker } = await import('./index') as any;
      if (messageBroker) {
        await messageBroker.disconnect();
        logger.info('   Message brokers disconnected');
      }
    } catch {
      // Not configured
    }
  }, 3);

  // WebSocket connections
  gracefulShutdown.register('WebSocket Server', async () => {
    try {
      const { websocketManager } = await import('./index') as any;
      if (websocketManager) {
        websocketManager.closeAll();
        logger.info('   WebSocket connections closed');
      }
    } catch {
      // Not configured
    }
  }, 4);

  // Flush logs
  gracefulShutdown.register('Log Flush', async () => {
    // Ensure all logs are written
    await new Promise(resolve => setTimeout(resolve, 100));
  }, 100); // Low priority - do last
}

export default gracefulShutdown;

