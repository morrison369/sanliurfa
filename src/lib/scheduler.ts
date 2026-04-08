/**
 * Scheduled Tasks Sistemi - Otomatik işlemler
 * Daily stats, cache cleanup, webhook retry'ları, vb.
 */

import { logger } from './logging';
import { calculateDailyStats } from './analytics';
import { cleanupOldAuditLogs } from './audit';
import { retryFailedDeliveries } from './webhooks';
import { metricsCollector } from './metrics';

interface ScheduledTask {
  name: string;
  cronPattern: string;
  enabled: boolean;
  handler: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
}

class TaskScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private running = false;

  /**
   * Task'i kaydet
   */
  registerTask(task: ScheduledTask): void {
    this.tasks.set(task.name, task);
    logger.info('Task kaydedildi', { taskName: task.name, cronPattern: task.cronPattern });
  }

  /**
   * Simple cron pattern executor (minute ve hour destekler)
   * Ornek: *\/5 = her 5 dakikada bir, 0 = saat basinda
   */
  private shouldRunTask(cronPattern: string): boolean {
    const now = new Date();
    const minute = now.getMinutes();
    const hour = now.getHours();

    const parts = cronPattern.split(' ');
    if (parts.length < 2) return false;

    const [minutePattern, hourPattern] = parts;

    // Minute kontrolü
    const matchMinute = this.patternMatches(minute, minutePattern);
    // Hour kontrolü
    const matchHour = this.patternMatches(hour, hourPattern);

    return matchMinute && matchHour;
  }

  /**
   * Cron pattern'ını kontrol et (basit versiyon)
   */
  private patternMatches(value: number, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern === '0') return value === 0;
    if (pattern.startsWith('*/')) {
      const interval = parseInt(pattern.substring(2));
      return value % interval === 0;
    }
    if (pattern.includes(',')) {
      return pattern.split(',').map(Number).includes(value);
    }
    return parseInt(pattern) === value;
  }

  /**
   * Scheduler'ı başlat
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('Scheduler zaten çalışıyor');
      return;
    }

    this.running = true;
    logger.info('Task scheduler başlatıldı', { taskCount: this.tasks.size });

    // Her dakika kontrol et
    const timer = setInterval(async () => {
      try {
        for (const [taskName, task] of this.tasks) {
          if (!task.enabled) continue;

          if (this.shouldRunTask(task.cronPattern)) {
            const lastRun = task.lastRun ? new Date(task.lastRun).getTime() : 0;
            const now = Date.now();

            // En az 1 dakika arayla çalışsın (duplicate execution'ı önle)
            if (now - lastRun < 60000) {
              continue;
            }

            try {
              const startTime = Date.now();
              await task.handler();
              const duration = Date.now() - startTime;

              task.lastRun = new Date();
              logger.info('Task tamamlandı', {
                taskName,
                duration: `${duration}ms`,
                nextRun: task.cronPattern
              });
            } catch (error) {
              logger.error(`Task hatası: ${taskName}`, error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
      } catch (error) {
        logger.error('Scheduler iteration hatası', error instanceof Error ? error : new Error(String(error)));
      }
    }, 60000); // Her 60 saniye kontrol et

    this.timers.set('main', timer);
  }

  /**
   * Scheduler'ı durdur
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }

    this.running = false;
    logger.info('Task scheduler durduruldu');
  }

  /**
   * Task durumunu al
   */
  getStatus(): { running: boolean; tasks: Array<{ name: string; enabled: boolean; lastRun?: string }> } {
    return {
      running: this.running,
      tasks: Array.from(this.tasks.values()).map(t => ({
        name: t.name,
        enabled: t.enabled,
        lastRun: t.lastRun?.toISOString()
      }))
    };
  }
}

// Global scheduler instance
export const scheduler = new TaskScheduler();

/**
 * Varsayılan task'ları kaydet
 */
export function registerDefaultTasks(): void {
  // Günlük istatistikleri hesapla (her gün 00:05'te)
  scheduler.registerTask({
    name: 'Calculate Daily Stats',
    cronPattern: '5 0', // 00:05
    enabled: true,
    handler: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await calculateDailyStats(yesterday);
    }
  });

  // Eski audit log'larını temizle (her pazartesi 02:00'de)
  scheduler.registerTask({
    name: 'Cleanup Old Audit Logs',
    cronPattern: '0 2', // 02:00 (pazartesi kontrolü DB'de)
    enabled: true,
    handler: async () => {
      const deleted = await cleanupOldAuditLogs(90); // 90 gün eski
      logger.info('Audit log cleanup tamamlandı', { deletedCount: deleted });
    }
  });

  // Başarısız webhook deliveries'i retry et (her 15 dakikada bir)
  scheduler.registerTask({
    name: 'Retry Failed Webhooks',
    cronPattern: '*/15 *', // Her 15 dakika
    enabled: true,
    handler: async () => {
      const retried = await retryFailedDeliveries();
      if (retried > 0) {
        logger.debug('Webhook retry tamamlandı', { retriedCount: retried });
      }
    }
  });

  // Metrics'i temizle (her saat başında)
  scheduler.registerTask({
    name: 'Cleanup Old Metrics',
    cronPattern: '0 *', // Her saat başında
    enabled: true,
    handler: async () => {
      // Metrics zaten auto-cleanup yapıyor ama ek kontrol
      const metrics = metricsCollector.getMetrics();
      logger.debug('Metrics status', {
        totalRequests: metrics.totalRequests,
        slowRequests: metrics.slowRequests
      });
    }
  });

  logger.info('Varsayılan task\'lar kaydedildi');
}

/**
 * Scheduler'ı initialize et (uygulama başında çalışmalı)
 */
export async function initializeScheduler(): Promise<void> {
  try {
    registerDefaultTasks();
    await scheduler.start();
    logger.info('Task scheduler initialized');
  } catch (error) {
    logger.error('Task scheduler initialize hatası', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
