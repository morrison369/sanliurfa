import { logger } from './logging';
/**
 * Hata Takip Altyapısı
 *
 * Sentry entegrasyonu ve özel hata raporlama sistemi.
 * Sentry yapılandırılmamışsa zarif bir şekilde geri dönüş yapar.
 */

// Sentry tipi tanımlamaları (opsiyonel bağımlılık)
interface SentryLike {
  init: (options: Record<string, unknown>) => void;
  captureException: (error: Error, context?: Record<string, unknown>) => string;
  captureMessage: (message: string, level?: string) => string;
  setContext: (key: string, context: Record<string, unknown>) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: Record<string, unknown> | null) => void;
  addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  startTransaction: (context: Record<string, unknown>) => TransactionLike | undefined;
}

interface TransactionLike {
  finish: () => void;
  setTag: (key: string, value: string) => void;
}

interface Breadcrumb {
  message?: string;
  category?: string;
  level?: 'info' | 'warning' | 'error' | 'debug';
  data?: Record<string, unknown>;
  timestamp?: number;
}

interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };
}

interface TrackingConfig {
  enabled: boolean;
  dsn?: string;
  environment?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
}

// Sentry SDK'sı yüklü değilse boş implementasyon
let sentryInstance: SentryLike | null = null;
let isInitialized = false;

/**
 * Hata takip sistemini yapılandırır
 */
export function initErrorTracking(config?: Partial<TrackingConfig>): void {
  if (isInitialized) {
    return;
  }

  const trackingConfig: TrackingConfig = {
    enabled: process.env.NODE_ENV === 'production',
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    sampleRate: 1.0,
    tracesSampleRate: 0.1,
    ...config,
  };

  // Sentry DSN yapılandırılmamışsa atla
  if (!trackingConfig.dsn) {
    console.debug(
      '[HataTakip] Sentry DSN yapılandırılmamış, geliştirme modunda çalışıyor',
    );
    isInitialized = true;
    return;
  }

  // Sentry SDK'sını dinamik olarak yükle
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/browser') as SentryLike;

    Sentry.init({
      dsn: trackingConfig.dsn,
      environment: trackingConfig.environment,
      tracesSampleRate: trackingConfig.tracesSampleRate,
      integrations: [],
    });

    sentryInstance = Sentry;
    isInitialized = true;

    console.debug('[HataTakip] Sentry başarıyla başlatıldı');
  } catch (error) {
    logger.warn('[HataTakip] Sentry SDK yüklenemedi, yerel takip kullanılacak:', error);
    isInitialized = true;
  }
}

/**
 * Hata yakalama ve raporlama
 */
export function captureException(error: Error, context?: ErrorContext): string {
  const eventId = generateEventId();

  if (sentryInstance) {
    try {
      // Kullanıcı bağlamını ekle
      if (context?.user) {
        sentryInstance.setUser({
          id: context.user.id,
          email: context.user.email,
          username: context.user.username,
        });
      }

      // Etiketleri ekle
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          sentryInstance?.setTag(key, value);
        });
      }

      // Ek verileri ekle
      if (context?.extra) {
        sentryInstance.setContext('extra_data', context.extra);
      }

      return sentryInstance.captureException(error, { eventId });
    } catch (trackingError) {
      logger.error('[HataTakip] Sentry raporlama hatası:', trackingError);
    }
  }

  // Sentry yoksa konsola yazdır
  logger.error(`[HataTakip] ${error.message}`, {
    eventId,
    stack: error.stack,
    context,
  });

  return eventId;
}

/**
 * Mesaj raporu gönderir
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' | 'debug' = 'info'): string {
  const eventId = generateEventId();

  if (sentryInstance) {
    try {
      return sentryInstance.captureMessage(message, level);
    } catch (trackingError) {
      logger.error('[HataTakip] Sentry mesaj raporlama hatası:', trackingError);
    }
  }

  // Sentry yoksa konsola yazdır
  const logLevel = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
  console[logLevel](`[HataTakip] ${level.toUpperCase()}: ${message}`, { eventId });

  return eventId;
}

/**
 * Kullanıcı bağlamını ayarlar
 */
export function setUserContext(user: { id?: string; email?: string; username?: string } | null): void {
  if (sentryInstance) {
    try {
      sentryInstance.setUser(user);
    } catch (error) {
      logger.error('[HataTakip] Kullanıcı bağlamı ayarlama hatası:', error);
    }
  }
}

/**
 * İz bırakır (breadcrumb)
 * Kullanıcı aksiyonlarını ve sistem olaylarını takip eder
 */
export function addBreadcrumb(breadcrumb: Breadcrumb): void {
  if (sentryInstance) {
    try {
      sentryInstance.addBreadcrumb({
        ...breadcrumb,
        timestamp: breadcrumb.timestamp || Date.now() / 1000,
      });
    } catch (error) {
      logger.error('[HataTakip]Breadcrumb ekleme hatası:', error);
    }
  }

  // Geliştirme modunda breadcrumb'ları logla
  if (process.env.NODE_ENV !== 'production') {
    console.debug(
      `[HataTakip] Breadcrumb: [${breadcrumb.category || 'genel'}] ${breadcrumb.message}`,
      breadcrumb.data,
    );
  }
}

/**
 * Performans izleme - Transaction başlatır
 */
export function startPerformanceTracking(
  name: string,
  op: string = 'custom',
  tags?: Record<string, string>,
): { finish: () => void; setTag: (key: string, value: string) => void } | null {
  if (!sentryInstance) {
    return null;
  }

  try {
    const transaction = sentryInstance.startTransaction({
      name,
      op,
      tags,
    });

    if (!transaction) {
      return null;
    }

    return {
      finish: () => {
        transaction.finish();
      },
      setTag: (key: string, value: string) => {
        transaction.setTag(key, value);
      },
    };
  } catch (error) {
    logger.error('[HataTakip] Performans izleme başlatma hatası:', error);
    return null;
  }
}

/**
 * API hatası yakalama
 */
export function captureApiError(
  endpoint: string,
  error: Error,
  statusCode?: number,
  requestData?: Record<string, unknown>,
): string {
  return captureException(error, {
    tags: {
      'api.endpoint': endpoint,
      ...(statusCode ? { 'api.status_code': String(statusCode) } : {}),
    },
    extra: {
      request_data: requestData,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Kullanıcı aksiyonu takibi
 */
export function trackUserAction(action: string, data?: Record<string, unknown>): void {
  addBreadcrumb({
    message: action,
    category: 'kullanici_aksiyonu',
    level: 'info',
    data,
  });
}

/**
 * Sayfa görünümü takibi
 */
export function trackPageView(page: string, referrer?: string): void {
  addBreadcrumb({
    message: `Sayfa görüntülendi: ${page}`,
    category: 'navigasyon',
    level: 'info',
    data: {
      page,
      referrer,
      timestamp: new Date().toISOString(),
    },
  });

  captureMessage(`Sayfa görüntülendi: ${page}`, 'info');
}

/**
 * Hata sınıflandırma - Kritikalite seviyesi belirler
 */
export function classifyError(error: Error): 'critical' | 'error' | 'warning' | 'info' {
  // Kritik hatalar - sistem çökmesine neden olabilir
  if (
    error.message.includes('database') ||
    error.message.includes('connection') ||
    error.message.includes('memory') ||
    error.message.includes('OOM')
  ) {
    return 'critical';
  }

  // API hataları
  if (
    error.message.includes('500') ||
    error.message.includes('502') ||
    error.message.includes('503')
  ) {
    return 'error';
  }

  // Kullanıcı tarafında çözülebilecek hatalar
  if (
    error.message.includes('404') ||
    error.message.includes('validation') ||
    error.message.includes('permission')
  ) {
    return 'warning';
  }

  return 'info';
}

/**
 * Benzersiz olay ID'si üretir
 */
function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `event-${timestamp}-${random}`;
}

/**
 * Hata raporlama - API endpoint'ine gönderir
 */
export async function reportErrorToApi(
  error: Error,
  context?: ErrorContext,
): Promise<boolean> {
  try {
    const eventId = captureException(error, context);

    // Özel API endpoint'ine rapor gönder
    const response = await fetch('/api/hata-raporla', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        message: error.message,
        stack: error.stack,
        name: error.name,
        context,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    });

    return response.ok;
  } catch (reportError) {
    logger.error('[HataTakip] API raporlama hatası:', reportError);
    return false;
  }
}

/**
 * Hata takip istatistikleri
 */
interface ErrorStats {
  totalErrors: number;
  lastError: Error | null;
  lastErrorTime: Date | null;
}

let errorStats: ErrorStats = {
  totalErrors: 0,
  lastError: null,
  lastErrorTime: null,
};

/**
 * Hata sayısını ve son hatayı takip eder
 */
export function getErrorStats(): ErrorStats {
  return { ...errorStats };
}

/**
 * Global hata yakalayıcıyı kurar
 */
export function setupGlobalErrorHandler(): void {
  // Beklenmeyen hataları yakala
  const originalOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    errorStats.totalErrors++;
    errorStats.lastError = error || new Error(String(message));
    errorStats.lastErrorTime = new Date();

    if (error) {
      captureException(error, {
        tags: { 'error.type': 'global_uncaught' },
        extra: {
          source,
          lineno,
          colno,
          message,
        },
      });
    }

    // Orijinal handler'ı da çağır
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }

    return false;
  };

  // Promise redlerini yakala
  const originalOnUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function (event: PromiseRejectionEvent) {
    errorStats.totalErrors++;
    errorStats.lastErrorTime = new Date();

    const error = event.reason instanceof Error
      ? event.reason
      : new Error(String(event.reason));

    errorStats.lastError = error;

    captureException(error, {
      tags: { 'error.type': 'unhandled_promise_rejection' },
    });

    // Orijinal handler'ı da çağır
    if (originalOnUnhandledRejection) {
      originalOnUnhandledRejection(event);
    }
  };
}

// Otomatik başlatma (istemci tarafında)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  initErrorTracking();
  setupGlobalErrorHandler();
}
