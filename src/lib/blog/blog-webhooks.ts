/**
 * Blog Webhook Sistemi
 * Yeni yazı yayınlandığında webhook çağrısı gönder
 * Abone sistemi, analytics, sosyal medya entegrasyonu için
 */

import { logger } from '../logger';
import { getPublicAppUrl } from '../public-app-url';
import { randomBytes, createHmac } from 'node:crypto';
import { validateExternalUrl } from '../security/safe-url';

export interface WebhookEvent {
  type: 'post.published' | 'post.updated' | 'post.deleted' | 'comment.approved';
  timestamp: string;
  data: Record<string, any>;
}

/**
 * Webhook dinleyicileri kaydet (admin tarafından yapılacak)
 * Örnek: https://example.com/webhooks/blog
 */
const REGISTERED_WEBHOOKS = process.env.BLOG_WEBHOOKS?.split(',') || [];
const PUBLIC_APP_URL = getPublicAppUrl();

/**
 * Yeni yazı webhook'unu gönder
 */
export async function triggerPostPublished(
  postId: number,
  title: string,
  slug: string,
  categoryId: number,
  excerpt: string,
  featuredImage?: string
): Promise<void> {
  const event: WebhookEvent = {
    type: 'post.published',
    timestamp: new Date().toISOString(),
    data: {
      postId,
      title,
      slug,
      categoryId,
      excerpt,
      featuredImage,
      url: `${PUBLIC_APP_URL}/blog/${slug}`
    }
  };

  await sendWebhooks(event);
}

/**
 * Yorum onaylandı webhook'unu gönder
 */
export async function triggerCommentApproved(
  commentId: number,
  postId: number,
  postSlug: string,
  authorName: string,
  content: string
): Promise<void> {
  const event: WebhookEvent = {
    type: 'comment.approved',
    timestamp: new Date().toISOString(),
    data: {
      commentId,
      postId,
      postSlug,
      authorName,
      content,
      url: `${PUBLIC_APP_URL}/blog/${postSlug}#comment-${commentId}`
    }
  };

  await sendWebhooks(event);
}

/**
 * Webhook'ları gönder
 */
async function sendWebhooks(event: WebhookEvent): Promise<void> {
  if (REGISTERED_WEBHOOKS.length === 0) {
    logger.debug('Webhook dinleyicisi kayıtlı değil');
    return;
  }

  const promises = REGISTERED_WEBHOOKS.map((url) => sendWebhook(url, event));

  try {
    const results = await Promise.allSettled(promises);

    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        logger.error(
          'Webhook gönderilemedi',
          result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
          { url: REGISTERED_WEBHOOKS[idx], event }
        );
      }
    });
  } catch (err) {
    logger.error('Webhook gönderimi başarısız', err instanceof Error ? err : new Error(String(err)), { event });
  }
}

/**
 * Tek bir webhook'u gönder (retry logic ile)
 */
async function sendWebhook(url: string, event: WebhookEvent, retries = 3): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateSignature(event),
          'X-Webhook-ID': generateId(),
          'User-Agent': 'Sanliurfa-Blog-Webhook/1.0'
        },
        body: JSON.stringify(event),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('Webhook gönderildi', { url, event: event.type });
      return;
    } catch (err) {
      logger.warn(
        `Webhook gönderimi başarısız (Deneme ${attempt}/${retries})`,
        Object.assign(new Error(`Webhook gönderimi başarısız (Deneme ${attempt}/${retries})`), { url, event: event.type, error: err instanceof Error ? err.message : String(err) })
      );

      // Son denemeden sonra hata at
      if (attempt === retries) {
        throw err;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Webhook imzası oluştur (doğrulama için)
 */
function generateSignature(event: WebhookEvent): string {
  const secret = process.env.BLOG_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('BLOG_WEBHOOK_SECRET environment variable is required');
  }
  return createHmac('sha256', secret).update(JSON.stringify(event)).digest('hex');
}

/**
 * Webhook ID oluştur
 */
function generateId(): string {
  return `wh_${Date.now()}_${randomBytes(6).toString('hex')}`;
}

/**
 * Webhook kayıt ekle (admin API'ye entegre edilecek)
 */
export async function registerWebhook(url: string): Promise<boolean> {
  const check = validateExternalUrl(url);
  if (!check.ok) {
    logger.warn('Güvensiz webhook URL engellendi', Object.assign(new Error('Güvensiz webhook URL'), { url, reason: check.reason }));
    return false;
  }

  REGISTERED_WEBHOOKS.push(url);
  logger.info('Webhook kayıt edildi', { url });

  // Test webhook gönder
  await sendWebhook(url, {
    type: 'post.published',
    timestamp: new Date().toISOString(),
    data: { test: true }
  }).catch((err) => {
    logger.error('Test webhook başarısız', err instanceof Error ? err : new Error(String(err)), { url });
  });

  return true;
}

/**
 * Webhook kaydını kaldır
 */
export function unregisterWebhook(url: string): boolean {
  const index = REGISTERED_WEBHOOKS.indexOf(url);
  if (index > -1) {
    REGISTERED_WEBHOOKS.splice(index, 1);
    logger.info('Webhook kaydı kaldırıldı', { url });
    return true;
  }
  return false;
}

/**
 * Tüm webhook'ları listele
 */
export function listWebhooks(): string[] {
  return [...REGISTERED_WEBHOOKS];
}


