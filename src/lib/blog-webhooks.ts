/**
 * Blog Webhook Sistemi
 * Yeni yazı yayınlandığında webhook çağrısı gönder
 * Abone sistemi, analytics, sosyal medya entegrasyonu için
 */

import { queryMany } from './postgres';
import { logger } from './logging';
import { fetchWithTimeout } from './http';

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
      url: `https://sanliurfa.com/blog/${slug}`
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
      url: `https://sanliurfa.com/blog/${postSlug}#comment-${commentId}`
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
      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateSignature(event),
          'X-Webhook-ID': generateId(),
          'User-Agent': 'Sanliurfa-Blog-Webhook/1.0'
        },
        body: JSON.stringify(event)
      }, 10000);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      logger.info('Webhook gönderildi', { url, event: event.type });
      return;
    } catch (err) {
      logger.warn(
        `Webhook gönderimi başarısız (Deneme ${attempt}/${retries})`,
        { url, event: event.type, error: err instanceof Error ? err.message : String(err) }
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
  const secret = process.env.BLOG_WEBHOOK_SECRET || 'default-secret';
  const payload = JSON.stringify(event);

  // SHA256 hash oluştur
  const crypto = require('crypto');
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Webhook ID oluştur
 */
function generateId(): string {
  return `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Webhook kayıt ekle (admin API'ye entegre edilecek)
 */
export async function registerWebhook(url: string): Promise<boolean> {
  if (!url.startsWith('https://')) {
    logger.warn('Webhook URL HTTPS olmak zorundadır', { url });
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
