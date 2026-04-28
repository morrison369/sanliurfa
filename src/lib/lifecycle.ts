/**
 * Process Lifecycle — Graceful Shutdown Handlers
 *
 * PM2 SIGTERM gönderdiğinde (deploy, restart) DB pool ve Redis client'ı düzgün
 * kapat — aksi halde ortada kalan in-flight query'ler abort olur, connection
 * leak olur, restart süresi uzar.
 *
 * Kullanım: bu modül sadece **import edilmesi yeterlidir** — module-level
 * `process.on(...)` register self-side effect olarak çalışır. Sunucu entry
 * point (Astro adapter standalone) startup'ında bir kez import edilir.
 */

import { logger } from './logging';

let shuttingDown = false;
const cleanupHandlers: Array<() => Promise<void>> = [];

/**
 * Yeni bir cleanup handler kaydet. SIGTERM/SIGINT alındığında sırayla çalıştırılır.
 *
 * Örnek:
 * ```ts
 * registerShutdownHandler(async () => {
 *   await pool.end();
 *   logger.info('Postgres pool closed');
 * });
 * ```
 */
export function registerShutdownHandler(handler: () => Promise<void>): void {
  cleanupHandlers.push(handler);
}

async function gracefulShutdown(signal: string, exitCode = 0): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`[lifecycle] ${signal} received — initiating graceful shutdown`);

  // PM2 timeout default 1.6s — buna göre tüm cleanup'ları kısa tut
  const SHUTDOWN_TIMEOUT_MS = 8000;
  const timeout = setTimeout(() => {
    logger.error('[lifecycle] Shutdown timeout — force exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  // unref so timer doesn't keep process alive on its own
  timeout.unref();

  try {
    for (const handler of cleanupHandlers) {
      try {
        await handler();
      } catch (err) {
        logger.error(
          '[lifecycle] Shutdown handler failed',
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }
    logger.info('[lifecycle] Graceful shutdown complete');
    clearTimeout(timeout);
    process.exit(exitCode);
  } catch (err) {
    logger.error(
      '[lifecycle] Unexpected shutdown error',
      err instanceof Error ? err : new Error(String(err)),
    );
    clearTimeout(timeout);
    process.exit(1);
  }
}

// Module-level signal handlers — bir kez kaydet
let registered = false;
function registerSignalHandlers(): void {
  if (registered) return;
  registered = true;

  process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

  // Uncaught exceptions: log + graceful shutdown (production'da crash yerine)
  process.on('uncaughtException', (err) => {
    logger.error('[lifecycle] Uncaught exception', err);
    void gracefulShutdown('uncaughtException', 1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(
      '[lifecycle] Unhandled rejection',
      reason instanceof Error ? reason : new Error(String(reason)),
    );
    // Reject'ler crash'e değer mi tartışmalı — sadece log, exit etme
  });

  logger.info('[lifecycle] Signal handlers registered (SIGTERM, SIGINT)');
}

// Sadece test ortamında değilken kaydet (Vitest test'lerini bozmasın)
if (process.env.NODE_ENV !== 'test') {
  registerSignalHandlers();
}

/**
 * Boot-time observability bootstrap (Sentry).
 */
if (process.env.NODE_ENV !== 'test') {
  // Sentry init — SENTRY_DSN env varsa aktif, yoksa silent skip.
  void import('./observability/sentry')
    .then(({ initSentry }) => initSentry())
    .catch((err) => logger.warn('[lifecycle] Sentry init skipped', { error: String(err) }));
}
